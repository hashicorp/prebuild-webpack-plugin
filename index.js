const path = require('path')
const { promisify } = require('util')
const glob = promisify(require('glob'))
const minimatch = require('minimatch')
const debug = require('debug')('prebuild-webpack-plugin')

const PLUGIN_NAME = 'PrebuildWebpackPlugin'

module.exports = class PrebuildWebpackPlugin {
  constructor({
    build,
    files = {},
    watch = () => {},
    clearCacheOnUpdate = false,
    compilationNameFilter
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
    this.compilationNameFilter = compilationNameFilter
    this.clearCacheOnUpdate = clearCacheOnUpdate
  }

  // If the user provided a `files: { pattern }` config, this function will
  // go and fetch all the matching files from the filesystem.
  async getMatchedFiles() {
    if (!this.files.pattern) return []
    if (this.matchedFilesCache) return this.matchedFilesCache

    debug('start: get matched files')
    // glob resolves from either `options.cwd` or `process.cwd()` if not provided
    // we replicate this option so we can return an absolute path
    const root =
      this.files.options && this.files.options.cwd
        ? this.files.options.cwd
        : process.cwd()

    // run the glob matcher and set the cache
    const files = await glob(this.files.pattern, this.files.options)
    this.matchedFilesCache = files
    debug('finish: get matched files')

    // glob returns paths relative to the root, but we want absolute paths, so we join
    // the root on before returning
    return files.map(f => path.join(root, f))
  }

  // Getting the file that changes per watch trigger is a bit involved when it comes
  // to getting it out of the webpack compilation object - this abstracts out the process.
  getChangedFile(compiler) {
    const { watchFileSystem } = compiler
    const watcher = watchFileSystem.watcher || watchFileSystem.wfs.watcher
    const changedFile = Object.keys(watcher.mtimes)
    return changedFile
  }

  // If a compilation name is given, returns whether the current compilation matches
  // If not, returns false
  filterCompilation(compilation) {
    if (!compilation.name || !this.compilationNameFilter) return false
    return compilation.name !== this.compilationNameFilter
  }

  // If the user provided a matcher, we filter for those files to pass into the function
  // Otherwise we just run the function.
  async runInitialBuild(compiler, compilation) {
    const matchedFiles = await this.getMatchedFiles()
    return this.build(compiler, compilation, matchedFiles)
  }

  // "apply" is the main entrypoint for webpack plugins
  apply(compiler) {
    // The "beforeRun" hook runs only on single webpack build, triggering only once
    compiler.hooks.beforeRun.tapPromise(PLUGIN_NAME, async compilation => {
      if (this.filterCompilation(compilation)) return Promise.resolve()
      debug(`running "beforeRun" hook for compilation: ${compilation.name}`)
      this.runInitialBuild(compiler, compilation)
    })

    // The "watchRun" hook runs only when using 'watch mode' with webpack, triggering
    // every time that webpack recompiles on a change triggered by the watcher
    compiler.hooks.watchRun.tapPromise(PLUGIN_NAME, async compilation => {
      if (this.filterCompilation(compilation)) return Promise.resolve()
      debug(`running "watchRun" hook for compilation: ${compilation.name}`)

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

      // Since "watchRun" runs every time webpack compiles in watch mode, we limit the
      // initial build to the first execution.
      if (this.firstRun) {
        this.firstRun = false
        this.runInitialBuild(compiler, compilation)
      }

      // At this point we're done unless we have a file pattern matcher passed in
      if (!this.files.pattern) return Promise.resolve()

      // If so, we get the file that was just changed, if there was one changed
      const changedFile = this.getChangedFile(compiler)
      if (!changedFile.length) return Promise.resolve()

      // If the changed file doesn't match the provided pattern, we're done
      const changedMatch = minimatch.match(changedFile, this.files.pattern)
      if (!changedMatch.length) return Promise.resolve()

      // If it does, we run the user-provided watch function
      return this.watch(compiler, compilation, changedMatch)
    })

    // The "emit" hook runs before webpack is about to write out assets, at the end
    // of the compile process.
    compiler.hooks.emit.tapPromise(PLUGIN_NAME, async compilation => {
      if (this.filterCompilation(compilation)) return Promise.resolve()
      debug(`running "emit" hook for compilation: ${compilation.name}`)

      // Grab the matched files so we can add them as dependencies
      // If there are none, we're done
      const matchedFiles = await this.getMatchedFiles()
      if (!matchedFiles.length) return Promise.resolve()

      // Add all matched files as dependencies to webpack so that they are
      if (this.files.addFilesAsDependencies) {
        matchedFiles.map(f => compilation.fileDependencies.add(f))
      }

      return Promise.resolve()
    })
  }
}
