/* global hljs */

window.onunload = () => {};

function codeText(container, includeHidden = true) {
	const code = container.querySelector("code");
	if (window.ace && code.classList.contains("editable")) {
		return window.ace.edit(code).getValue();
	}
	return includeHidden ? code.textContent : code.innerText;
}

function mdbook_something_else_has_focus(event) {
	const target = event.composedPath()[0] || event.target;
	if (target.classList.contains("checkbox-img")) return false;
	return (
		/^(?:input|select|textarea)$/i.test(target.nodeName) ||
		target.isContentEditable
	);
}

function iconButton(className, title, icon) {
	const button = document.createElement("button");
	button.type = "button";
	button.className = className;
	button.title = title;
	button.setAttribute("aria-label", title);
	const image = document.createElement("span");
	image.className = `icon ${icon}`;
	image.setAttribute("aria-hidden", "true");
	button.append(image);
	return button;
}

function buttonTray(pre) {
	let tray = pre.querySelector(":scope > .buttons");
	if (!tray) {
		tray = document.createElement("div");
		tray.className = "buttons";
		pre.prepend(tray);
	}
	return tray;
}

async function copyText(text) {
	if (navigator.clipboard && window.isSecureContext) {
		await navigator.clipboard.writeText(text);
		return;
	}

	const textarea = document.createElement("textarea");
	textarea.value = text;
	textarea.setAttribute("readonly", "");
	textarea.style.position = "fixed";
	textarea.style.opacity = "0";
	document.body.append(textarea);
	textarea.select();
	const copied = document.execCommand("copy");
	textarea.remove();
	if (!copied) throw new Error("Copy command failed");
}

function setupCodeBlocks() {
	hljs.configure({ tabReplace: "    ", languages: [] });
	const codeBlocks = Array.from(document.querySelectorAll("pre > code"));

	for (const code of codeBlocks) {
		const pre = code.parentElement;
		const languageClass = Array.from(code.classList).find((name) =>
			name.startsWith("language-"),
		);
		const language = languageClass?.slice(9);
		if (pre.classList.contains("playground")) {
			pre.dataset.language = "Rust";
		} else if (language) {
			pre.dataset.language =
				language === "sh" || language === "bash"
					? "Terminal"
					: language.toUpperCase();
		}
		if (pre.dataset.language) {
			const header = document.createElement("span");
			header.className = "code-header";
			header.textContent = pre.dataset.language;
			pre.insertBefore(header, code);
		}

		if (window.ace && code.classList.contains("editable")) {
			code.classList.remove("language-rust");
		} else {
			hljs.highlightBlock(code);
		}
		code.classList.add("hljs");
	}

	for (const code of document.querySelectorAll("code.hljs")) {
		if (!code.querySelector(".boring")) continue;
		code.classList.add("hide-boring");
		const button = iconButton("boring-button", "Show hidden lines", "icon-eye");
		button.addEventListener("click", () => {
			const hidden = code.classList.toggle("hide-boring");
			button.title = hidden ? "Show hidden lines" : "Hide lines";
			button.setAttribute("aria-label", button.title);
			button.firstElementChild.className = `icon ${hidden ? "icon-eye" : "icon-eye-off"}`;
		});
		buttonTray(code.parentElement).append(button);
	}

	if (window.playground_copyable) {
		for (const code of document.querySelectorAll("pre > code:first-of-type")) {
			const pre = code.parentElement;
			const button = iconButton(
				"clip-button",
				"Copy to clipboard",
				"icon-copy",
			);
			const tooltip = document.createElement("span");
			tooltip.className = "tooltiptext";
			button.append(tooltip);
			button.addEventListener("click", async () => {
				try {
					await copyText(codeText(pre, false));
					tooltip.textContent = "Copied";
				} catch {
					tooltip.textContent = "Copy failed";
				}
				button.classList.add("tooltipped");
				window.setTimeout(() => button.classList.remove("tooltipped"), 1500);
			});
			buttonTray(pre).prepend(button);
		}
	}

	setupPlaygrounds();
}

function setupPlaygrounds() {
	const playgrounds = Array.from(document.querySelectorAll(".playground"));
	if (!playgrounds.length) return;

	for (const playground of playgrounds) {
		const tray = buttonTray(playground);
		const runButton = iconButton("play-button", "Run this code", "icon-play");
		runButton.hidden = true;
		runButton.addEventListener("click", () => runRust(playground));
		tray.append(runButton);

		const code = playground.querySelector("code");
		if (window.ace && code.classList.contains("editable")) {
			const resetButton = iconButton(
				"reset-button",
				"Undo changes",
				"icon-rotate-ccw",
			);
			resetButton.addEventListener("click", () => {
				const editor = window.ace.edit(code);
				editor.setValue(editor.originalCode);
				editor.clearSelection();
			});
			tray.prepend(resetButton);
		}
	}

	fetchWithTimeout("https://play.rust-lang.org/meta/crates", {
		headers: { "Content-Type": "application/json" },
		method: "POST",
		mode: "cors",
	})
		.then((response) => response.json())
		.then((response) => {
			const crates = response.crates.map((item) => item.id);
			for (const playground of playgrounds) {
				updatePlayButton(playground, crates);
				const code = playground.querySelector("code");
				if (window.ace && code.classList.contains("editable")) {
					const editor = window.ace.edit(code);
					editor.addEventListener("change", () =>
						updatePlayButton(playground, crates),
					);
					editor.commands.addCommand({
						name: "run",
						bindKey: { win: "Ctrl-Enter", mac: "Ctrl-Enter" },
						exec: () => runRust(playground),
					});
				}
			}
		})
		.catch(() => {});
}

function fetchWithTimeout(url, options, timeout = 6000) {
	const controller = new AbortController();
	const timer = window.setTimeout(() => controller.abort(), timeout);
	return fetch(url, { ...options, signal: controller.signal }).finally(() =>
		window.clearTimeout(timer),
	);
}

function updatePlayButton(playground, availableCrates) {
	const code = playground.querySelector("code");
	const button = playground.querySelector(".play-button");
	if (code.classList.contains("no_run")) return;
	const usedCrates = Array.from(
		codeText(playground).matchAll(/extern\s+crate\s+([a-zA-Z_0-9]+)\s*;/g),
		(match) => match[1],
	);
	button.hidden = !usedCrates.every((name) => availableCrates.includes(name));
}

async function runRust(playground) {
	let result = playground.querySelector("code.result");
	if (!result) {
		result = document.createElement("code");
		result.className = "result hljs language-bash";
		playground.append(result);
	}

	const text = codeText(playground);
	const editionClass = Array.from(
		playground.querySelector("code").classList,
	).find((name) => name.startsWith("edition"));
	result.textContent = "Running…";
	result.classList.remove("result-no-output");

	try {
		const response = await fetchWithTimeout(
			"https://play.rust-lang.org/evaluate.json",
			{
				headers: { "Content-Type": "application/json" },
				method: "POST",
				mode: "cors",
				body: JSON.stringify({
					version: text.includes("#![feature") ? "nightly" : "stable",
					optimize: "0",
					code: text,
					edition: editionClass ? editionClass.slice(7) : "2015",
				}),
			},
		);
		const output = (await response.json()).result.trim();
		result.textContent = output || "No output";
		result.classList.toggle("result-no-output", !output);
	} catch (error) {
		result.textContent = `Playground communication: ${error.message}`;
	}
}

function setupSidebar() {
	const sidebar = document.getElementById("mdbook-sidebar");
	const checkbox = document.getElementById("mdbook-sidebar-toggle-anchor");
	const button = document.getElementById("mdbook-sidebar-toggle");
	const backdrop = document.getElementById("mdbook-sidebar-backdrop");
	if (!sidebar || !checkbox || !button) return;

	function update() {
		const visible = checkbox.checked;
		document.documentElement.classList.toggle("sidebar-visible", visible);
		sidebar.hidden = !visible;
		sidebar.setAttribute("aria-hidden", String(!visible));
		button.setAttribute("aria-expanded", String(visible));
		for (const link of sidebar.querySelectorAll("a")) {
			link.tabIndex = visible ? 0 : -1;
		}
		try {
			localStorage.setItem("mdbook-sidebar", visible ? "visible" : "hidden");
		} catch {}
	}

	button.addEventListener("click", () => {
		checkbox.checked = !checkbox.checked;
		checkbox.dispatchEvent(new Event("change", { bubbles: true }));
	});
	backdrop?.addEventListener("click", () => {
		checkbox.checked = false;
		update();
	});
	checkbox.addEventListener("change", update);
	update();

	const desktop = window.matchMedia("(min-width: 1081px)");
	const syncViewport = (event) => {
		checkbox.checked = event.matches;
		update();
	};
	desktop.addEventListener("change", syncViewport);
}

function setupOutline() {
	const sidebar = document.getElementById("mdbook-sidebar");
	const outline = sidebar?.querySelector(".on-this-page");
	for (const toggle of sidebar?.querySelectorAll(".chapter-fold-toggle") ||
		[]) {
		toggle.remove();
	}
	if (outline) document.body.append(outline);
}

function setupKeyboardNavigation() {
	document.addEventListener("keydown", (event) => {
		if (event.key === "Escape") {
			for (const image of document.querySelectorAll("input.checkbox-img")) {
				image.checked = false;
			}
		}
		if (
			event.shiftKey ||
			event.altKey ||
			event.ctrlKey ||
			event.metaKey ||
			window.search?.hasFocus() ||
			mdbook_something_else_has_focus(event)
		) {
			return;
		}
		const rtl = document.documentElement.dir === "rtl";
		const selector =
			event.key === "ArrowRight"
				? rtl
					? ".previous"
					: ".next"
				: event.key === "ArrowLeft"
					? rtl
						? ".next"
						: ".previous"
					: null;
		if (!selector) return;
		const link = document.querySelector(`.mobile-nav-chapters${selector}`);
		if (link) {
			event.preventDefault();
			window.location.href = link.href;
		}
	});
}

function setupTheme() {
	const buttons = document.querySelectorAll(
		"#monochrome-theme-toggle, .footer-theme-toggle",
	);
	if (!buttons.length) return;
	const preferredDark = window.matchMedia("(prefers-color-scheme: dark)");

	function savedTheme() {
		try {
			const value = localStorage.getItem("mdbook-theme");
			return value === "light" || value === "dark" ? value : null;
		} catch {
			return null;
		}
	}

	function isDark() {
		const html = document.documentElement;
		return (
			html.classList.contains("dark") ||
			(!html.classList.contains("light") && preferredDark.matches)
		);
	}

	function update() {
		const dark = isDark();
		for (const button of buttons) {
			button.querySelector(".icon").className =
				`icon ${dark ? "icon-moon" : "icon-sun"}`;
			button.title = dark ? "Switch to light mode" : "Switch to dark mode";
			button.setAttribute("aria-label", button.title);
			button.setAttribute("aria-pressed", String(dark));
		}
		document.getElementById("mdbook-highlight-css").disabled = dark;
		document.getElementById("mdbook-tomorrow-night-css").disabled = !dark;
		for (const editor of window.editors || []) {
			editor.setTheme(dark ? "ace/theme/tomorrow_night" : "ace/theme/dawn");
		}
		const color = document.querySelector('meta[name="theme-color"]');
		if (color)
			color.content = getComputedStyle(
				document.documentElement,
			).backgroundColor;
	}

	for (const button of buttons) {
		button.addEventListener("click", () => {
			const theme = isDark() ? "light" : "dark";
			document.documentElement.classList.remove("light", "dark");
			document.documentElement.classList.add(theme);
			try {
				localStorage.setItem("mdbook-theme", theme);
			} catch {}
			update();
		});
	}
	preferredDark.addEventListener("change", () => {
		if (!savedTheme()) update();
	});
	update();
}

function setupSearchDialog() {
	const dialog = document.getElementById("mdbook-search-wrapper");
	const toggle = document.getElementById("mdbook-search-toggle");
	if (!dialog || !toggle) return;
	let open = false;
	const background = [
		document.getElementById("mdbook-sidebar"),
		document.getElementById("mdbook-menu-bar"),
		document.getElementById("mdbook-content"),
		document.getElementById("monochrome-theme-toggle"),
		document.querySelector(".content-book-title"),
		document.querySelector(".on-this-page"),
	].filter(Boolean);

	function sync() {
		const nextOpen = !dialog.classList.contains("hidden");
		if (nextOpen === open) return;
		open = nextOpen;
		dialog.setAttribute("aria-hidden", String(!open));
		document.documentElement.classList.toggle("search-open", open);
		for (const element of background) element.inert = open;
		if (!open) toggle.focus();
	}

	dialog.addEventListener("click", (event) => {
		if (event.target === dialog) toggle.click();
	});
	new MutationObserver(sync).observe(dialog, { attributeFilter: ["class"] });
}

document.addEventListener("DOMContentLoaded", () => {
	setupOutline();
	setupSidebar();
	setupKeyboardNavigation();
	setupTheme();
	setupSearchDialog();
	setupCodeBlocks();
	document.querySelector(".menu-title")?.addEventListener("click", () => {
		document.scrollingElement.scrollTo({ top: 0, behavior: "smooth" });
	});
});
