const { promisify } = require("util");
const glob = promisify(require("glob"));

class PrebuildWepbackPlugin {
  constructor({ fileOptions = {}, build, watch } = {}) {
    this.fileOptions = fileOptions;
    this.build = build;
    this.watch = watch;
    this.firstRun = true;
  }

  get matchedFiles() {}

  apply(compiler) {
    compiler.hooks.beforeRun.tapPromise(
      "PrebuildWebpackPlugin",
      async compilation => {
        this.matchedFiles = this.fileOptions.matcher
          ? await glob(this.fileOptions.matcher)
          : [];

        return this.build(compiler, compilation, matchedFiles);
      }
    );

    compiler.hooks.watchRun.tapPromise(
      "PrebuildWebpackPlugin",
      async compilation => {
        if (this.firstRun) {
          this.firstRun = false;
          this.matchedFiles = this.fileOptions.matcher
            ? await glob(this.fileOptions.matcher)
            : [];
          return this.build(compiler, compilation, matchedFiles);
        }

        const changedFile = compilation.watchFileSystem.watcher.mtimes;
        if (!changedFile.length) return Promise.resolve();
        return this.watch(compiler, compilation, changedFile);
      }
    );

    compiler.hooks.emit.tapAsync(
      "PrebuildWebpackPlugin",
      (compilation, callback) => {
        if (!this.matchedFiles.length) callback();

        if (this.fileOptions.addFilesAsDependencies) {
          this.matchedFiles.map(f => compilation.fileDependencies.add(f));
        }

        callback();
      }
    );
  }
}

export default PrebuildWepbackPlugin;
