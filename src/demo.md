# Demo

A sample of the text, code, and other elements you might include in a book.

## Typography

Use **bold** for emphasis, _italics_ for a term you're introducing, and `inline code` for filenames or commands. Links connect related pages, such as the [quick start](./quick-start.md).

Strikethrough can mark a revision: the preview server runs on port ~~3000~~ 8000.

### Heading level three

Headings divide a chapter into sections and appear in the page outline.

#### Heading level four

Use a deeper heading when a section needs its own subsections.

## Lists

- Book source
  - Markdown chapters
  - Images and other assets
- Theme files
- Book configuration

1. Create a chapter in the source directory.
2. Add it to `SUMMARY.md`.
3. Preview the book in your browser.

- [x] Write the first draft
- [ ] Review the examples
- [ ] Publish the book

Chapter
: A Markdown file listed in the book's `SUMMARY.md`.

## Quotes and admonitions

> Keep each chapter focused on a topic. Link to related material when readers need more context.

> [!NOTE]
> The page outline is generated from the headings in each chapter.

> [!TIP]
> Leave `mdbook serve --open` running while you write to preview your edits.

> [!WARNING]
> Building a book replaces its output directory. Keep your source files outside that directory.

## Code

### Rust playground

```rust
fn main() {
    let chapters = ["Overview", "Quick start", "Demo"];

    for chapter in chapters {
        println!("{chapter}");
    }
}
```

### Configuration

```toml
[book]
title = "My documentation"

[output.html]
theme = "mdbook-monochrome/theme"
sidebar-header-nav = true
```

### Shell

```sh
mdbook serve --open
```

## Table

| File | Purpose |
| --- | --- |
| `book.toml` | Book settings and theme configuration |
| `src/SUMMARY.md` | Chapter order and hierarchy |
| `src/overview.md` | The opening chapter of this demo |

## Keyboard input

Press <kbd>/</kbd> or <kbd>S</kbd> to search and <kbd>Esc</kbd> to close the dialog.

## Collapsible content

<details>
<summary>Where does mdBook put the generated files?</summary>

By default, mdBook writes the generated site to `book/`. You can choose another directory with `build-dir` in the `[build]` section of `book.toml`.

</details>

## Footnote

Footnotes let you add context without interrupting a paragraph.[^demo]

[^demo]: They work well for references or short asides. Keep information readers need to follow the chapter in the main text.
