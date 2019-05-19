const path = require("path");
const crypto = require("crypto");

const { PrebuildWebpackPlugin } = require("../../../index.js");

// function extractFrontMatter(files) {
//   return Promise.all(files.map(f => fs.readFile(f, "utf8")))
//     .then(fileContents => {
//       const fmPaths = files.map(f =>
//         generateFrontmatterPath(f, this.nextConfig)
//       );
//       const frontMatter = fileContents.map(content => matter(content).data);
//       return Promise.all(
//         fmPaths.map(fmPath => fs.ensureDir(path.dirname(fmPath)))
//       ).then(() => [frontMatter, fmPaths]);
//     })
//     .then(([contents, fmPaths]) => {
//       return Promise.all(
//         contents.map((content, idx) => {
//           fs.writeFile(fmPaths[idx], JSON.stringify(content));
//         })
//       );
//     });
// }

// function generateFrontmatterPath(filePath, nextConfig) {
//   return path.join(nextConfig.dir, `__mdx-front-matter/${md5(filePath)}.json`);
// }

// function md5(str) {
//   return crypto
//     .createHash("md5")
//     .update(str)
//     .digest("hex");
// }

module.exports = {
  mode: "development",
  watch: true,
  plugins: [
    new PrebuildWebpackPlugin({
      files: {
        pattern: "**/*.json",
        options: { cwd: path.resolve(__dirname), realpath: true },
        addFilesAsDependencies: true
      },
      build: () => {
        console.log("building from plugin");
      },
      watch: (compiler, compilation, changedFile) => {
        debugger;
      }
    })
  ]
};
