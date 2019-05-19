const { promisify } = require("util");
const glob = promisify(require("glob"));
const minimatch = require("minimatch");

class PrebuildWebpackPlugin {
  constructor({ build, files = {}, watch = () => {} } = {}) {
    if (!build) {
      throw new Error(
        "The PrebuildWebpackPlugin expects a build argument. Please provide one."
      );
    }

    this.firstRun = true;

    this.build = build;
    this.files = files;
    this.watch = watch;
  }

  get matchedFiles() {
    return (async () => {
      return this.files.pattern
        ? await glob(
            this.files.pattern,
            this.files.options
              ? { ...this.files.options, realpath: true }
              : { realpath: true }
          )
        : [];
    })();
  }

  apply(compiler) {
    compiler.hooks.beforeRun.tapPromise(
      "PrebuildWebpackPlugin",
      async compilation => {
        const matchedFiles = await this.matchedFiles;
        return this.build(compiler, compilation, matchedFiles);
      }
    );

    compiler.hooks.watchRun.tapPromise(
      "PrebuildWebpackPlugin",
      async compilation => {
        const matchedFiles = await this.matchedFiles;
        if (this.firstRun) {
          this.firstRun = false;
          return this.build(compiler, compilation, matchedFiles);
        }

        if (!this.files.pattern) return Promise.resolve();

        const changedFile = Object.keys(
          compilation.watchFileSystem.watcher.mtimes
        );

        if (!changedFile.length) return Promise.resolve();

        if (this.files.pattern) {
          const changedMatch = minimatch.match(changedFile, this.files.pattern);
          if (!changedMatch.length) return Promise.resolve();
          return this.watch(compiler, compilation, changedMatch);
        }

        return this.watch(compiler, compilation, changedFile);
      }
    );

    compiler.hooks.emit.tapAsync(
      "PrebuildWebpackPlugin",
      async (compilation, callback) => {
        const matchedFiles = await this.matchedFiles;
        if (!matchedFiles.length) callback();

        if (this.files.addFilesAsDependencies) {
          matchedFiles.map(f => compilation.fileDependencies.add(f));
        }

        callback();
      }
    );
  }
}

module.exports = {
  PrebuildWebpackPlugin
};
