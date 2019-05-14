const { promisify } = require("util");
const glob = promisify(require("glob"));

class PrebuildWepbackPlugin {
  constructor({ build, files = {}, watch = () => {} } = {}) {
    if (!build) {
      throw new Error(
        "The PrebuildWebpackPlugin expects a build argument. Please provide one."
      );
    }

    this.build = build;
    this.files = files;
    this.firstRun = true;
    this.watch = watch;
  }

  get matchedFiles() {
    return (async () => {
      return this.files.pattern
        ? await glob(
            this.files.pattern,
            this.files.options ? this.files.options : {}
          )
        : [];
    })();
  }

  set changedFile(changedFile) {
    this._changedFile = changedFile;
  }

  get changedFile() {
    return this._changedFile;
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

        this.changedFile = compilation.watchFileSystem.watcher.mtimes;
        if (!this.changedFile.length) return Promise.resolve();
        return this.watch(compiler, compilation, this.changedFile);
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

export default PrebuildWepbackPlugin;
