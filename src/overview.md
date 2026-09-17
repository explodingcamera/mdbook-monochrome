# Monochrome

A clean, minimal theme for mdBook

Monochrome changes mdBook's layout, typography, and navigation. It includes light and dark modes, a page outline, and a collapsible sidebar on mobile.

It works with your existing Markdown and mdBook setup.

## Install the theme

Download [`mdbook-monochrome.zip`](https://github.com/explodingcamera/mdbook-monochrome/releases/latest/download/mdbook-monochrome.zip) and extract it next to your book's `book.toml`.

The extracted files should look like this:

```text
my-book/
├── book.toml
├── src/
└── theme/
    ├── book.js
    ├── index.hbs
    └── css/
```

## Preview your book

Start mdBook's development server:

```sh
mdbook serve --open
```

mdBook rebuilds the book as you edit.

## Update the theme

Download the latest archive and replace the existing `theme` directory.

See [customization](./customization.md) to adjust the colors or sidebar, and use the [demo](./demo.md) as a formatting reference.
