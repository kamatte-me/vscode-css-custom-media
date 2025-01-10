# VSCode Extension - CSS Custom Media Query Support

Extension for CSS [Custom Media Query](https://www.w3.org/TR/mediaqueries-5/#custom-mq) draft syntax support.


To use the `@custom-media` syntax in production, you need a tool to process the custom media queries, as they are part of a draft specification and not yet natively supported by all browsers.

Consider using one of the following tools:

- [PostCSS](https://postcss.org/) with [postcss-custom-media](https://www.npmjs.com/package/postcss-custom-media) plugin
- [Lightning CSS](https://lightningcss.dev/transpilation.html#custom-media-queries)

These tools transpile the custom media queries into standard CSS media queries that are compatible with current browsers.

## Features

- `@custom-media` syntax
- Autocomplete
- Go to definition
- Go to references
- Diagnostics
- Support file extensions: `.css`, `.scss`, `pcss` and `.postcss`

## Demo

![Demo](https://github.com/user-attachments/assets/29fffe20-18e9-4912-9b95-87779a8ebb45)

## Installation

[Install via the Visual Studio Code Marketplace](https://marketplace.visualstudio.com/items?itemName=kamatte-me.css-custom-media)
