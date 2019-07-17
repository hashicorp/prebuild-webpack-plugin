const { promisify } = require('util')
const glob = promisify(require('glob'))
const minimatch = require('minimatch')
const debug = require('debug')('prebuild-webpack-plugin')

module.exports = class PrebuildWebpackPlugin {
  constructor({
    build,
    files = {},
    watch = () => {},
    clearCacheOnUpdate = false
  } = {}) {
    if (!build) {
      throw new Error(
        'The PrebuildWebpackPlugin expects a build argument. Please provide one.'
      )
    }

    this.firstRun = true

    this.build = build
    this.files = files
    this.watch = watch
    this.clearCacheOnUpdate = clearCacheOnUpdate
    this.matchedFilesCache = null
  }

  get matchedFiles() {
    debug('start: get matched files')
    return (async () => {
      if (this.matchedFilesCache) return this.matchedFilesCache
      const files = this.files.pattern
        ? await glob(
            this.files.pattern,
            this.files.options
              ? { ...this.files.options, realpath: true }
              : { realpath: true }
          )
        : []
      debug('finish: get matched files')
      this.matchedFilesCache = files
      return files
    })()
  }

  getChangedFile(compiler) {
    const { watchFileSystem } = compiler
    const watcher = watchFileSystem.watcher || watchFileSystem.wfs.watcher
    const changedFile = Object.keys(watcher.mtimes)
    return changedFile
  }

  apply(compiler) {
    compiler.hooks.beforeRun.tapPromise(
      'PrebuildWebpackPlugin',
      async compilation => {
        debug('running beforeRun hook')
        const matchedFiles = await this.matchedFiles
        return this.build(compiler, compilation, matchedFiles)
      }
    )

    compiler.hooks.watchRun.tapPromise(
      'PrebuildWebpackPlugin',
      async compilation => {
        // Next.js-specific Optimization
        // As documented here: https://nextjs.org/docs#customizing-webpack-config
        // Next.js executes webpack twice, once for the server, and once for the client
        // To prevent doing work 2x, we choose (arbitrarily) the 'client' run,
        // immediately returning on anything else
        if (compilation.name && compilation.name !== 'client') {
          return Promise.resolve()
        }

        debug(`running watchRun hook for compilation: ${compilation.name}`)

        // By default we cache the matched files for speed. This has the drawback of
        // potentially having issues with new files that are added. If you're willing
        // to take the perf hit on every update in exchange for better new file detection
        // you can enable this option and we'll clear the cache each watch round.
        // TODO: if we can get webpack to tell us when a new file was added, we could optimize
        // this such that it only ran in this condition.
        if (this.clearCacheOnUpdate) {
          debug('clearing matched files cache')
          this.matchedFilesCache = null
        }

        if (this.firstRun) {
          this.firstRun = false
          const matchedFiles = await this.matchedFiles
          return this.build(compiler, compilation, matchedFiles)
        }

        if (!this.files.pattern) return Promise.resolve()

        const changedFile = this.getChangedFile(compiler)

        if (!changedFile.length) return Promise.resolve()

        if (this.files.pattern) {
          const changedMatch = minimatch.match(changedFile, this.files.pattern)
          if (!changedMatch.length) return Promise.resolve()
          return this.watch(compiler, compilation, changedMatch)
        }

        return this.watch(compiler, compilation, changedFile)
      }
    )

    compiler.hooks.emit.tapAsync(
      'PrebuildWebpackPlugin',
      async (compilation, callback) => {
        const matchedFiles = await this.matchedFiles
        if (!matchedFiles.length) callback()

        if (this.files.addFilesAsDependencies) {
          matchedFiles.map(f => compilation.fileDependencies.add(f))
        }

        callback()
      }
    )
  }
}
