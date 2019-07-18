const fs = require('fs-extra')
const path = require('path')
const webpack = require('webpack')
const merge = require('webpack-merge')
const PrebuildWebpackPlugin = require('../index.js')

const getConfig = type => {
  return {
    context: path.resolve(__dirname, `fixtures/${type}`),
    output: {
      path: path.resolve(__dirname, `fixtures/${type}/dist`)
    }
  }
}

describe('PrebuildWebpackPlugin', () => {
  describe('matched files', () => {
    it('returns empty array if no matcher provided', done => {
      const config = merge(getConfig('basic'), {
        plugins: [
          new PrebuildWebpackPlugin({
            build: () => {}
          })
        ]
      })

      const compiler = webpack(config)
      compiler.run(async (err, stats) => {
        if (err) return done(err)
        const matchedFiles = await stats.compilation.options.plugins[0]
          .matchedFilesCache
        expect(matchedFiles).toStrictEqual(undefined)
        done()
      })
    })

    it('returns matched files given a proper `files.pattern` matcher', done => {
      const config = merge(getConfig('files'), {
        plugins: [
          new PrebuildWebpackPlugin({
            files: {
              pattern: '**/*.json',
              options: { cwd: getConfig('files').context }
            },
            build: () => {}
          })
        ]
      })

      const compiler = webpack(config)
      compiler.run(async (err, stats) => {
        if (err) return done(err)
        const matchedFiles = await stats.compilation.options.plugins[0]
          .matchedFilesCache
        expect(matchedFiles.length).toBe(3)
        done()
      })
    })
  })

  describe('build', () => {
    const outputDir = path.resolve(getConfig('basic').context, '.output')
    const filePath = path.join(outputDir, 'io.txt')
    const fileMsg = 'I/O test...'

    beforeEach(() => fs.ensureDirSync(outputDir))

    afterEach(() => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
    })

    it('throws when not provided a build argument', () => {
      expect(() => {
        merge(getConfig('basic'), {
          plugins: [new PrebuildWebpackPlugin({})]
        })
      }).toThrow()
    })

    it('properly performs I/O', done => {
      const config = merge(getConfig('basic'), {
        plugins: [
          new PrebuildWebpackPlugin({
            build: () => {
              fs.writeFile(filePath, new Uint8Array(Buffer.from(fileMsg)))
            }
          })
        ]
      })

      const compiler = webpack(config)
      compiler.run(() => {
        expect(fs.existsSync(filePath)).toBe(true)
        expect(fs.readFileSync(filePath, { encoding: 'utf8' })).toBe(fileMsg)
        done()
      })
    })

    it('works when provided a synchronous callback function', done => {
      const config = merge(getConfig('basic'), {
        plugins: [
          new PrebuildWebpackPlugin({
            build: () => {
              fs.writeFileSync(filePath, new Uint8Array(Buffer.from(fileMsg)))
            }
          })
        ]
      })

      const compiler = webpack(config)
      compiler.run(() => {
        expect(fs.existsSync(filePath)).toBe(true)
        expect(fs.readFileSync(filePath, { encoding: 'utf8' })).toBe(fileMsg)
        done()
      })
    })
  })

  describe('watch', () => {
    jest.setTimeout(10000)

    xit('provides a changed file', done => {
      const config = merge(getConfig('files'), {
        mode: 'development',
        plugins: [
          new PrebuildWebpackPlugin({
            files: {
              pattern: '**/*.json',
              options: { cwd: getConfig('files').context, realpath: true },
              addFilesAsDependencies: true
            },
            build: () => {},
            watch: (compiler, compilation, changedFile) => {
              console.log(changedFile)
              expect(changedFile.length).toBe(1)
              done()
            }
          })
        ],
        watch: true,
        watchOptions: {
          poll: 300
        }
      })
      const compiler = webpack(config)
      const watching = compiler.watch({}, (err, stats) => {})

      setTimeout(() => {
        fs.writeFileSync(
          path.resolve(getConfig('files').context, 'one.json'),
          '{"one" : "one"}'
        )
      }, 3000)

      setTimeout(() => {
        watching.close(() => {
          done()
        })
      }, 8000)
    })
  })
})
