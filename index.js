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

  getChangedFile(compiler) {
    const { watchFileSystem } = compiler;
    const watcher = watchFileSystem.watcher || watchFileSystem.wfs.watcher;
    return Object.keys(watcher.mtimes);
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

        // Next.js-specific Optimization
        // As documented here: https://nextjs.org/docs#customizing-webpack-config
        // Next.js executes webpack twice, once for the server, and once for the client
        // To prevent doing work 2x, we choose (arbitrarily) the 'client' run,
        // immediately returning on anything else
        if (compilation.name && compilation.name !== "client") {
          return Promise.resolve();
        }

        if (!this.files.pattern) return Promise.resolve();

        const changedFile = this.getChangedFile(compiler);

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
