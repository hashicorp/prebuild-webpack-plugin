# Prebuild Webpack Plugin

![build status](https://img.shields.io/circleci/build/github/hashicorp/prebuild-webpack-plugin.svg?style=flat-square)

## The Problem

In some cases, you may need to do some file processing/manipulation before your webpack build starts. For instance, if you needed to transform files or do some I/O for certain files before webpack's build process starts, this plugin provides a nice interface for completing these specific tasks

## Installation

```shell
npm install --save prebuild-webpack-plugin
```

## Usage

```javascript
plugins: [
    new PrebuildPlugin({
      build: (compiler, compilation, matchedFiles) => {
        // function that runs on compile, as well as when dev mode starts for the first time only
      },
      watch: (compiler, compilation, changedFile) => {
        // function that runs each time webpack rebuilds in dev mode. if `files.pattern` is provided,
        // this function will only fire if the most recently changed file matches the specified pattern
      },
      // the files object allows for file matching, providing an array
      // of matching files as the last parameter to the `build` option.
      files: { pattern: '**/*.md', options: {}, addFilesAsDependencies: true },
    }),
    ...
]
```

## Options

### build

> function(compiler: any, compilation: any, matchedFiles: string[]): Promise\<any\> | required

A function that's called **once**, before webpack runs initial build.

- `compiler`: An instance of the webpack compiler.
- `compilation`: An instance of the webpack compilation.
- `matchedFiles`: Returns matches from `files.pattern` if present.

### watch

> function(compiler: any, compilation: any, changedFile: string[]): Promise\<any\> | optional

A function that's called **each time webpack rebuilds** in dev mode. If `files.pattern` is provided, this function only fires when the last changed file matches with provided pattern.

- `compiler`: An instance of the webpack compiler.
- `compilation`: An instance of the webpack compilation.
- `changedFile`: Most recently changed file from previous compilation.

### files

> `object` | optional

| Property                 | Type      | Description                                                                                                                              |
| ------------------------ | --------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `pattern`                | `string`  | A [minimatch](https://github.com/isaacs/minimatch) glob pattern. Matched files are provided as the last parameter to the `build` option. |
| `options`                | `object`  | All valid object properties are documented [here](https://github.com/isaacs/node-glob#option).                                           |
| `addFilesAsDependencies` | `boolean` | Flag indicating whether or not to explicitly add matched files to webpack's dependency tree.                                             |

### clearCacheOnUpdate

> `boolean` | optional | default: `false`

This plugin will read matched files on initial bootup only, at the moment. As such, if you add a new file to the tree, there may be issues with getting it to respond properly to updates without restarting your build process. If you set this option to `true`, the plugin will re-read the file tree every time a watch update event triggers. This will incur a reasonably large performance penalty, but properly handle newly added files consistently.

### compilationNameFilter

> `string` | optional

Some webpack build systems such as [next.js](https://nextjs.org/docs#customizing-webpack-config) run multiple webpack configs, one for the client and one for the server. If you only need your plugin to execute for one specific compilation, you can pass in the name of that compilation and the logic will only run for it. If you do happen to be using next.js, you want to pass in `client` here.
