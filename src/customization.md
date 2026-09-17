# Customization

Adjust the theme's colors with a stylesheet in your own book. Keeping your overrides there makes it easier to update the theme.

## Add a custom stylesheet

Create `custom.css` next to `book.toml`, then add it to your configuration:

```toml
[output.html]
additional-css = ["custom.css"]
```

Use `html:root` as the selector so your values take precedence over the theme defaults.

## Color tokens

The theme's CSS variables control background, text, and border colors:

| Variable                  | Purpose                                       |
| ------------------------- | --------------------------------------------- |
| `--mono-canvas`           | Page and sidebar background                   |
| `--mono-surface`          | Quotes, search results, and subtle panels     |
| `--mono-surface-raised`   | Inputs and raised panels                      |
| `--mono-code-header`      | Fenced code block header background           |
| `--mono-code-border`      | Fenced code block border                      |
| `--mono-text`             | Body text                                     |
| `--mono-heading`          | Section headings and prominent interface text |
| `--mono-title`            | Chapter title                                 |
| `--mono-muted`            | Descriptions and secondary navigation         |
| `--mono-subtle`           | Hints and part titles                         |
| `--mono-border`           | Dividers and subtle borders                   |
| `--mono-border-strong`    | Input and panel borders                       |
| `--mono-accent`           | Active navigation                             |
| `--mono-link`             | Links and inline code text                    |
| `--mono-inline-code`      | Inline code background                        |
| `--mono-selection`        | Selected text background                      |
| `--sidebar-title-display` | Desktop sidebar title visibility              |
| `--sidebar-title-space`   | Space reserved for the desktop sidebar title  |
| `--content-title-display` | Desktop content title visibility              |

Override both color modes with [`light-dark()`](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/light-dark):

```css
html:root {
  --mono-canvas: light-dark(#ffffff, #0a0a0a);
  --mono-text: light-dark(#202124, #dddddd);
  --mono-accent: light-dark(#006f78, #7ddbe8);
  --mono-link: light-dark(#075fc7, #77aaff);
}
```

The first value is used in light mode and the second in dark mode.

## Title placement

The book title appears above the sidebar on large screens. To put it above the content instead, add these values to your custom stylesheet:

```css
html:root {
  --sidebar-title-display: none;
  --sidebar-title-space: 0px;
  --content-title-display: block;
}
```

## Sidebar levels

Use nested entries in `SUMMARY.md` to create numbered levels such as `1.1`:

```md
1. [Overview](./overview.md)
   1. [Customization](./customization.md)
```

Monochrome keeps nested chapters expanded so the full book structure remains visible.

## Repository links

Use mdBook's standard options to link to the repository and the current page's source file:

```toml
[output.html]
git-repository-url = "https://github.com/owner/project"
edit-url-template = "https://github.com/owner/project/edit/main/{path}"
```

Monochrome shows these links below the page content.
