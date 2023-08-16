const path = require('path');

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'orasql-to-json.js',
    globalObject: 'this',
    library: {
        name: 'orasqlJson',
        type: 'umd',
      },
  },
  externals: {
    lodash: {
      commonjs: 'ohm-js',
      commonjs2: 'ohm-js',
      amd: 'ohm-js',
      root: '_',
    },
  },
};