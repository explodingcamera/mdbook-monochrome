# Quick start

Add Monochrome to an existing mdBook project.

## Install the theme

From the directory containing your book's `book.toml`, clone the theme:

```sh
git clone --depth 1 https://github.com/explodingcamera/mdbook-monochrome.git
```

## Configure mdBook

Set the theme path in `book.toml` and enable the page outline:

```toml
[book]
title = "My documentation"

[output.html]
theme = "mdbook-monochrome/theme"
sidebar-header-nav = true
```

## Preview your book

Start mdBook's development server to open your book in a browser:

```sh
mdbook serve --open
```

mdBook rebuilds the book as you edit, so you can preview changes while writing.

## Update the theme

Pull the latest changes into the cloned directory:

```sh
git -C mdbook-monochrome pull
```

## Next steps

See [customization](./customization.md) to adjust the colors or sidebar, and use the [demo](./demo.md) as a reference for formatting content.
