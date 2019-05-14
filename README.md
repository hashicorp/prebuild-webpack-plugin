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
      build: (compiler, compilation, matchedFiles) => {
        // function that runs on compile, and when dev mode starts for the first time only
      },
      watch: (compiler, compilation, changedFile) => {
        // function that runs each time webpack rebuilds in dev mode
      },
      // the files object allows for file matching, providing an array
      // of matching files as the last parameter to the `build` option
      files: { matcher: '**/*.md', options: {}, addFilesAsDependencies: true }
    }),
    ...
]
```

## Options

### build

> function(compiler: any, compilation: any, matchedFiles: string[]): Promise\<any\> | required

A function that's called **once**, before webpack runs initial build

- `compiler`: An instance of the webpack compiler
- `compilation`: An instance of the webpack compilation
- `matchedFiles`: Returns matches from `files.matcher` if present.

### watch

> function(compiler: any, compilation: any, changedFile: string[]): Promise\<any\> | optional

A function that's called **each time webpack rebuilds** in dev mode.

- `compiler`: An instance of the webpack compiler
- `compilation`: An instance of the webpack compilation
- `changedFile`: Most recently changed file from previous compilation

### files

> `object` | optional

| Property                 | Type      | Description                                                                                                                             |
| ------------------------ | --------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `pattern`                | `string`  | A [minimatch](https://github.com/isaacs/minimatch) glob pattern. Matched files are provided as the last parameter to the `build` option |
| `options`                | `object`  | All valid value documented [here](https://github.com/isaacs/node-glob#option)                                                           |
| `addFilesAsDependencies` | `boolean` | Flag indicating whether or not to explicitly add matched files to webpack's dependency tree.                                            |
