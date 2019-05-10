# Prebuild Webpack Plugin

## The Problem

Describe problem...

## The Solution

Describe solution...

## Installation

```
npm install --save prebuild-webpack-plugin
```

## Usage

```js
plugins: [
    new PrebuildPlugin({
      // if present, provides an array to `build` of all files relative to the project root
      // that match this pattern, ignoring X, and only fires `watch` if the changedFile matches
      files: { matcher: /\.md$/, ignore: ['node_modules', 'docs/**/*'], addFilesAsDependencies: true },
      // function that runs on compile, and when dev mode starts for the first time only
      build: (compiler, compilation, matchedFiles = []) => {},
      // function that runs each time webpack rebuilds in dev mode
      watch: (compiler, compilation, changedFile) => {}
    }),
    ...
]
```

## Options

### fileOptions

> `object` | optional

| Property                 | Type       | Description                                                                                  |
| ------------------------ | ---------- | -------------------------------------------------------------------------------------------- |
| `matcher`                | `RegExp`   | If provided, provides an array of matched files to the `build` function.                     |
| `ignore`                 | `string[]` | Accepts a list of string paths or glob patterns to exclude from any matched files.           |
| `addFilesAsDependencies` | `boolean`  | Flag indicating whether or not to explicitly add matched files to webpack's dependency tree. |

### build

> function(compiler: any, compilation: any, matchedFiles: string[]): Promise\<any\>

A function that's called **once**, before webpack runs initial build

- `compiler`: An instance of the webpack compiler
- `compilation`: An instance of the webpack compilation
- `matchedFiles`: Returns matches from `files.matcher` if present.

### watch

> function(compiler: any, compilation: any, changedFile: string[]): Promise\<any\>

A function that's called each time webpack rebuilds in dev mode. If `files.matcher` is present, this function will only run if `changedFile` matches `files.matcher`.

- `compiler`: An instance of the webpack compiler
- `compilation`: An instance of the webpack compilation
- `changedFile`: Most recently changed file from previous compilation
