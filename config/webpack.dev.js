/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const HOST = process.env.HOST || 'localhost';
const PORT = process.env.PORT || '9000';
const EXPRESS_PORT = process.env.EXPRESS_PORT || 9001;

module.exports = merge(common('development'), {
  mode: 'development',
  devtool: 'eval-source-map',
  devServer: {
    contentBase: './dist',
    host: HOST,
    port: PORT,
    compress: true,
    inline: true,
    historyApiFallback: true,
    hot: true,
    overlay: true,
    open: true,
    proxy: [
      {
        // NOTE: Any future backend-only routes added to server.js need to be listed here:
        context: [
          '/login',
          '/login/callback',
          '/cluster-api',
          '/inventory-api',
          '/inventory-payload-api',
        ],
        target: `http://localhost:${EXPRESS_PORT}`,
      },
    ],
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        include: [
          path.resolve(__dirname, '../src'),
          path.resolve(__dirname, '../node_modules/patternfly'),
          path.resolve(__dirname, '../node_modules/@patternfly/patternfly'),
          path.resolve(__dirname, '../node_modules/@patternfly/react-styles/css'),
          path.resolve(__dirname, '../node_modules/@patternfly/react-core/dist/styles/base.css'),
          path.resolve(
            __dirname,
            '../node_modules/@patternfly/react-core/dist/esm/@patternfly/patternfly'
          ),
          path.resolve(
            __dirname,
            '../node_modules/@patternfly/react-core/node_modules/@patternfly/react-styles/css'
          ),
          path.resolve(
            __dirname,
            '../node_modules/@patternfly/react-table/node_modules/@patternfly/react-styles/css'
          ),
          path.resolve(
            __dirname,
            '../node_modules/@patternfly/react-inline-edit-extension/node_modules/@patternfly/react-styles/css'
          ),
        ],
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
});
