/* global hljs, ClipboardJS */

// Fix back button cache problem
window.onunload = () => {};

// Global variable, shared between modules
function playground_text(playground, hidden = true) {
	const code_block = playground.querySelector("code");

	if (window.ace && code_block.classList.contains("editable")) {
		const editor = window.ace.edit(code_block);
		return editor.getValue();
	} else if (hidden) {
		return code_block.textContent;
	} else {
		return code_block.innerText;
	}
}

/**
 * Helper for global keypress handlers so they don't trigger when certain elements are active.
 * @returns {boolean} True if the keypress handler should be skipped.
 */
function mdbook_something_else_has_focus(e) {
	// Check composedPath in case the event happened from something generated
	// from the shadowDOM.
	const target = e.composedPath()[0] || e.target;
	// If this is the `checkbox-img` input which has the focus, we want to handle it here.
	if (target.classList.contains("checkbox-img")) {
		return false;
	}
	return /^(?:input|select|textarea)$/i.test(target.nodeName);
}

(function codeSnippets() {
	function fetch_with_timeout(url, options, timeout = 6000) {
		return Promise.race([
			fetch(url, options),
			new Promise((_, reject) =>
				setTimeout(() => reject(new Error("timeout")), timeout),
			),
		]);
	}

	const playgrounds = Array.from(document.querySelectorAll(".playground"));
	if (playgrounds.length > 0) {
		fetch_with_timeout("https://play.rust-lang.org/meta/crates", {
			headers: {
				"Content-Type": "application/json",
			},
			method: "POST",
			mode: "cors",
		})
			.then((response) => response.json())
			.then((response) => {
				// get list of crates available in the rust playground
				const playground_crates = response.crates.map((item) => item.id);
				playgrounds.forEach((block) => {
					handle_crate_list_update(block, playground_crates);
				});
			});
	}

	function handle_crate_list_update(playground_block, playground_crates) {
		// update the play buttons after receiving the response
		update_play_button(playground_block, playground_crates);

		// and install on change listener to dynamically update ACE editors
		if (window.ace) {
			const code_block = playground_block.querySelector("code");
			if (code_block.classList.contains("editable")) {
				const editor = window.ace.edit(code_block);
				editor.addEventListener("change", () => {
					update_play_button(playground_block, playground_crates);
				});
				// add Ctrl-Enter command to execute rust code
				editor.commands.addCommand({
					name: "run",
					bindKey: {
						win: "Ctrl-Enter",
						mac: "Ctrl-Enter",
					},
					exec: (_editor) => run_rust_code(playground_block),
				});
			}
		}
	}

	// updates the visibility of play button based on `no_run` class and
	// used crates vs ones available on https://play.rust-lang.org
	function update_play_button(pre_block, playground_crates) {
		const play_button = pre_block.querySelector(".play-button");

		// skip if code is `no_run`
		if (pre_block.querySelector("code").classList.contains("no_run")) {
			play_button.classList.add("hidden");
			return;
		}

		// get list of `extern crate`'s from snippet
		const txt = playground_text(pre_block);
		const re = /extern\s+crate\s+([a-zA-Z_0-9]+)\s*;/g;
		const snippet_crates = [];
		let item = re.exec(txt);
		while (item) {
			snippet_crates.push(item[1]);
			item = re.exec(txt);
		}

		// check if all used crates are available on play.rust-lang.org
		const all_available = snippet_crates.every(
			(elem) => playground_crates.indexOf(elem) > -1,
		);

		if (all_available) {
			play_button.classList.remove("hidden");
			play_button.hidden = false;
		} else {
			play_button.classList.add("hidden");
		}
	}

	function run_rust_code(code_block) {
		let result_block = code_block.querySelector(".result");
		if (!result_block) {
			result_block = document.createElement("code");
			result_block.className = "result hljs language-bash";

			code_block.append(result_block);
		}

		const text = playground_text(code_block);
		const classes = code_block.querySelector("code").classList;
		let edition = "2015";
		classes.forEach((className) => {
			if (className.startsWith("edition")) {
				edition = className.slice(7);
			}
		});
		const params = {
			version: "stable",
			optimize: "0",
			code: text,
			edition: edition,
		};

		if (text.indexOf("#![feature") !== -1) {
			params.version = "nightly";
		}

		result_block.innerText = "Running...";

		fetch_with_timeout("https://play.rust-lang.org/evaluate.json", {
			headers: {
				"Content-Type": "application/json",
			},
			method: "POST",
			mode: "cors",
			body: JSON.stringify(params),
		})
			.then((response) => response.json())
			.then((response) => {
				if (response.result.trim() === "") {
					result_block.innerText = "No output";
					result_block.classList.add("result-no-output");
				} else {
					result_block.innerText = response.result;
					result_block.classList.remove("result-no-output");
				}
			})
			.catch(
				(error) =>
					(result_block.innerText = `Playground Communication: ${error.message}`),
			);
	}

	// Syntax highlighting Configuration
	hljs.configure({
		tabReplace: "    ", // 4 spaces
		languages: [], // Languages used for auto-detection
	});

	const code_nodes = Array.from(document.querySelectorAll("code"))
		// Don't highlight `inline code` blocks in headers.
		.filter((node) => !node.parentElement.classList.contains("header"));

	if (window.ace) {
		// language-rust class needs to be removed for editable
		// blocks or highlightjs will capture events
		code_nodes
			.filter((node) => node.classList.contains("editable"))
			.forEach((block) => {
				block.classList.remove("language-rust");
			});

		code_nodes
			.filter((node) => !node.classList.contains("editable"))
			.forEach((block) => {
				hljs.highlightBlock(block);
			});
	} else {
		code_nodes.forEach((block) => {
			hljs.highlightBlock(block);
		});
	}

	// Adding the hljs class gives code blocks the color css
	// even if highlighting doesn't apply
	code_nodes.forEach((block) => {
		block.classList.add("hljs");
	});

	Array.from(document.querySelectorAll("code.hljs")).forEach((block) => {
		const lines = Array.from(block.querySelectorAll(".boring"));
		// If no lines were hidden, return
		if (!lines.length) {
			return;
		}
		block.classList.add("hide-boring");

		const buttons = document.createElement("div");
		buttons.className = "buttons";
		buttons.innerHTML =
			'<button title="Show hidden lines" \
aria-label="Show hidden lines"></button>';
		buttons.firstChild.innerHTML = document.getElementById("fa-eye").innerHTML;

		// add expand button
		const pre_block = block.parentNode;
		pre_block.insertBefore(buttons, pre_block.firstChild);

		buttons.firstChild.addEventListener("click", function (e) {
			if (this.title === "Show hidden lines") {
				this.innerHTML = document.getElementById("fa-eye-slash").innerHTML;
				this.title = "Hide lines";
				this.setAttribute("aria-label", e.target.title);

				block.classList.remove("hide-boring");
			} else if (this.title === "Hide lines") {
				this.innerHTML = document.getElementById("fa-eye").innerHTML;
				this.title = "Show hidden lines";
				this.setAttribute("aria-label", e.target.title);

				block.classList.add("hide-boring");
			}
		});
	});

	if (window.playground_copyable) {
		Array.from(document.querySelectorAll("pre code")).forEach((block) => {
			const pre_block = block.parentNode;
			if (!pre_block.classList.contains("playground")) {
				let buttons = pre_block.querySelector(".buttons");
				if (!buttons) {
					buttons = document.createElement("div");
					buttons.className = "buttons";
					pre_block.insertBefore(buttons, pre_block.firstChild);
				}

				const clipButton = document.createElement("button");
				clipButton.className = "clip-button";
				clipButton.title = "Copy to clipboard";
				clipButton.setAttribute("aria-label", clipButton.title);
				clipButton.innerHTML = '<i class="tooltiptext"></i>';

				buttons.insertBefore(clipButton, buttons.firstChild);
			}
		});
	}

	// Process playground code blocks
	Array.from(document.querySelectorAll(".playground")).forEach((pre_block) => {
		// Add play button
		let buttons = pre_block.querySelector(".buttons");
		if (!buttons) {
			buttons = document.createElement("div");
			buttons.className = "buttons";
			pre_block.insertBefore(buttons, pre_block.firstChild);
		}

		const runCodeButton = document.createElement("button");
		runCodeButton.className = "play-button";
		runCodeButton.hidden = true;
		runCodeButton.title = "Run this code";
		runCodeButton.setAttribute("aria-label", runCodeButton.title);
		runCodeButton.innerHTML = document.getElementById("fa-play").innerHTML;

		buttons.insertBefore(runCodeButton, buttons.firstChild);
		runCodeButton.addEventListener("click", () => {
			run_rust_code(pre_block);
		});

		if (window.playground_copyable) {
			const copyCodeClipboardButton = document.createElement("button");
			copyCodeClipboardButton.className = "clip-button";
			copyCodeClipboardButton.innerHTML = '<i class="tooltiptext"></i>';
			copyCodeClipboardButton.title = "Copy to clipboard";
			copyCodeClipboardButton.setAttribute(
				"aria-label",
				copyCodeClipboardButton.title,
			);

			buttons.insertBefore(copyCodeClipboardButton, buttons.firstChild);
		}

		const code_block = pre_block.querySelector("code");
		if (window.ace && code_block.classList.contains("editable")) {
			const undoChangesButton = document.createElement("button");
			undoChangesButton.className = "reset-button";
			undoChangesButton.title = "Undo changes";
			undoChangesButton.setAttribute("aria-label", undoChangesButton.title);
			undoChangesButton.innerHTML += document.getElementById(
				"fa-clock-rotate-left",
			).innerHTML;

			buttons.insertBefore(undoChangesButton, buttons.firstChild);

			undoChangesButton.addEventListener("click", () => {
				const editor = window.ace.edit(code_block);
				editor.setValue(editor.originalCode);
				editor.clearSelection();
			});
		}
	});
})();

(function sidebar() {
	const sidebar = document.getElementById("mdbook-sidebar");
	const sidebarLinks = document.querySelectorAll("#mdbook-sidebar a");
	const sidebarToggleButton = document.getElementById("mdbook-sidebar-toggle");
	const sidebarCheckbox = document.getElementById(
		"mdbook-sidebar-toggle-anchor",
	);

	/* Because we cannot change the `display` using only CSS after/before the transition, we
       need JS to do it. We change the display to prevent the browsers search to find text inside
       the collapsed sidebar. */
	if (!document.documentElement.classList.contains("sidebar-visible")) {
		sidebar.style.display = "none";
	}
	sidebarToggleButton.addEventListener("click", () => {
		sidebarCheckbox.checked = !sidebarCheckbox.checked;
		sidebarCheckbox.dispatchEvent(new Event("change", { bubbles: true }));
	});

	function updateSidebarAccessibility(visible) {
		Array.from(sidebarLinks).forEach((link) => {
			link.setAttribute("tabIndex", visible ? 0 : -1);
		});
		sidebarToggleButton.setAttribute("aria-expanded", visible);
		sidebar.setAttribute("aria-hidden", !visible);
	}

	function showSidebar() {
		sidebar.style.display = "";
		document.documentElement.classList.add("sidebar-visible");
		updateSidebarAccessibility(true);
		try {
			localStorage.setItem("mdbook-sidebar", "visible");
		} catch {
			// Ignore error.
		}
	}

	function hideSidebar() {
		document.documentElement.classList.remove("sidebar-visible");
		updateSidebarAccessibility(false);
		sidebar.style.display = "none";
		try {
			localStorage.setItem("mdbook-sidebar", "hidden");
		} catch {
			// Ignore error.
		}
	}

	// Toggle sidebar
	sidebarCheckbox.addEventListener("change", function sidebarToggle() {
		if (sidebarCheckbox.checked) {
			showSidebar();
		} else {
			hideSidebar();
		}
	});

	updateSidebarAccessibility(sidebarCheckbox.checked);
})();

(function chapterNavigation() {
	function zoomOutImages() {
		for (const elem of Array.from(
			document.querySelectorAll("input.checkbox-img"),
		)) {
			elem.checked = false;
		}
	}

	document.addEventListener("keydown", (e) => {
		if (
			e.altKey ||
			e.ctrlKey ||
			e.metaKey ||
			window.search?.hasFocus() ||
			mdbook_something_else_has_focus(e)
		) {
			return;
		}

		const html = document.querySelector("html");

		function next() {
			const nextButton = document.querySelector(".mobile-nav-chapters.next");
			if (nextButton) {
				window.location.href = nextButton.href;
			}
		}
		function prev() {
			const previousButton = document.querySelector(
				".mobile-nav-chapters.previous",
			);
			if (previousButton) {
				window.location.href = previousButton.href;
			}
		}
		// Usually needs the Shift key to be pressed
		switch (e.key) {
			case "Escape":
				zoomOutImages();
				break;
		}

		// Rest of the keys are only active when the Shift key is not pressed
		if (e.shiftKey) {
			return;
		}

		switch (e.key) {
			case "ArrowRight":
				e.preventDefault();
				if (html.dir === "rtl") {
					prev();
				} else {
					next();
				}
				break;
			case "ArrowLeft":
				e.preventDefault();
				if (html.dir === "rtl") {
					next();
				} else {
					prev();
				}
				break;
		}
	});
})();

(function clipboard() {
	const clipButtons = document.querySelectorAll(".clip-button");

	function hideTooltip(elem) {
		elem.firstChild.innerText = "";
		elem.className = "clip-button";
	}

	function showTooltip(elem, msg) {
		elem.firstChild.innerText = msg;
		elem.className = "clip-button tooltipped";
	}

	const clipboardSnippets = new ClipboardJS(".clip-button", {
		text: (trigger) => {
			hideTooltip(trigger);
			const playground = trigger.closest("pre");
			return playground_text(playground, false);
		},
	});

	Array.from(clipButtons).forEach((clipButton) => {
		clipButton.addEventListener("mouseout", (e) => {
			hideTooltip(e.currentTarget);
		});
	});

	clipboardSnippets.on("success", (e) => {
		e.clearSelection();
		showTooltip(e.trigger, "Copied!");
	});

	clipboardSnippets.on("error", (e) => {
		showTooltip(e.trigger, "Clipboard error!");
	});
})();

(function scrollToTop() {
	const menuTitle = document.querySelector(".menu-title");

	menuTitle.addEventListener("click", () => {
		document.scrollingElement.scrollTo({ top: 0, behavior: "smooth" });
	});
})();

(() => {
	function movePageOutline() {
		const outline = document.querySelector("#mdbook-sidebar .on-this-page");
		if (outline) document.body.appendChild(outline);
	}

	function syncSidebarToViewport(event) {
		const toggle = document.getElementById("mdbook-sidebar-toggle-anchor");
		const sidebar = document.getElementById("mdbook-sidebar");
		if (!toggle || !sidebar) return;

		if (event.matches && !toggle.checked) {
			sidebar.style.display = "";
			toggle.checked = true;
			toggle.dispatchEvent(new Event("change", { bubbles: true }));
		} else if (!event.matches && toggle.checked) {
			toggle.checked = false;
			toggle.dispatchEvent(new Event("change", { bubbles: true }));
		}
	}

	function setupThemeToggle() {
		const toggle = document.getElementById("monochrome-theme-toggle");
		if (!toggle) return;
		const lightSyntax = document.getElementById("mdbook-highlight-css");
		const darkSyntax = document.getElementById("mdbook-tomorrow-night-css");

		function savedTheme() {
			try {
				const theme = localStorage.getItem("mdbook-theme");
				return theme === "light" || theme === "dark" ? theme : null;
			} catch {
				return null;
			}
		}

		function updateIcon() {
			const html = document.documentElement;
			const isDark =
				html.classList.contains("dark") ||
				(!html.classList.contains("light") &&
					window.matchMedia("(prefers-color-scheme: dark)").matches);
			toggle.classList.toggle("theme-toggle--toggled", isDark);
			toggle.title = isDark ? "Switch to light mode" : "Switch to dark mode";
			toggle.setAttribute("aria-label", toggle.title);
			toggle.setAttribute("aria-pressed", String(isDark));
			if (lightSyntax) lightSyntax.disabled = isDark;
			if (darkSyntax) darkSyntax.disabled = !isDark;

			if (window.editors) {
				const editorTheme = isDark
					? "ace/theme/tomorrow_night"
					: "ace/theme/dawn";
				window.editors.forEach((editor) => {
					editor.setTheme(editorTheme);
				});
			}
		}

		function applyTheme(theme, store = true) {
			const html = document.documentElement;
			html.classList.remove("light", "dark");
			html.classList.add(theme);

			if (store) {
				try {
					localStorage.setItem("mdbook-theme", theme);
				} catch {
					// Theme switching still works when storage is unavailable.
				}
			}

			const themeColor = document.querySelector('meta[name="theme-color"]');
			if (themeColor) {
				requestAnimationFrame(() => {
					themeColor.content = getComputedStyle(html).backgroundColor;
				});
			}
			updateIcon();
		}

		updateIcon();

		toggle.addEventListener("click", () => {
			const html = document.documentElement;
			const isDark =
				html.classList.contains("dark") ||
				(!html.classList.contains("light") &&
					window.matchMedia("(prefers-color-scheme: dark)").matches);
			applyTheme(isDark ? "light" : "dark");
		});

		window
			.matchMedia("(prefers-color-scheme: dark)")
			.addEventListener("change", () => {
				if (!savedTheme()) updateIcon();
			});
	}

	function setupSearchDismiss() {
		const wrapper = document.getElementById("mdbook-search-wrapper");
		const toggle = document.getElementById("mdbook-search-toggle");
		if (!wrapper || !toggle) return;
		const background = [
			document.getElementById("mdbook-sidebar"),
			document.getElementById("mdbook-menu-bar"),
			document.getElementById("mdbook-content"),
			document.getElementById("monochrome-theme-toggle"),
			document.querySelector(".content-book-title"),
			document.querySelector(".on-this-page"),
		].filter(Boolean);
		let open = false;

		function syncSearchState() {
			const nextOpen = !wrapper.classList.contains("hidden");
			if (nextOpen === open) return;
			open = nextOpen;
			wrapper.setAttribute("aria-hidden", String(!open));
			document.documentElement.classList.toggle("search-open", open);
			background.forEach((element) => {
				element.inert = open;
			});
			if (!open) toggle.focus();
		}

		wrapper.addEventListener("click", (event) => {
			if (event.target === wrapper) toggle.click();
		});

		new MutationObserver(syncSearchState).observe(wrapper, {
			attributeFilter: ["class"],
		});
		syncSearchState();
	}

	document.addEventListener("DOMContentLoaded", () => {
		movePageOutline();
		setupThemeToggle();
		setupSearchDismiss();

		const desktop = window.matchMedia("(min-width: 1081px)");
		syncSidebarToViewport(desktop);
		desktop.addEventListener("change", syncSidebarToViewport);
	});
})();
