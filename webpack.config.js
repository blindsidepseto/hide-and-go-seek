/* eslint-disable @typescript-eslint/no-var-requires */
const CopyWebpackPlugin = require('copy-webpack-plugin');
const path = require('path');
// eslint-disable-next-line import/extensions
const { version } = require('./package.json');

// Cache-busting: BBB adds ?version=<manifest version> to the plugin's script URL
// (akka-bbb-apps Plugins.scala, createFinalJavascriptEntrypointUrl), so browsers fetch the new
// file after each release instead of a cached copy. The version comes from package.json.

module.exports = {
  entry: './src/index.tsx',
  output: {
    filename: 'HideAndGoSeek.js',
    library: 'HideAndGoSeek',
    libraryTarget: 'umd',
    publicPath: '/',
    globalObject: 'this',
  },
  devServer: {
    allowedHosts: 'all',
    port: 4701,
    host: '0.0.0.0',
    hot: false,
    liveReload: false,
    client: {
      overlay: false,
    },
    setupMiddlewares: (middlewares, devServer) => {
      if (!devServer) {
        throw new Error('webpack-dev-server is not defined');
      }

      // Serve manifest.json from the project root when requested at /manifest.json
      devServer.app.get('/manifest.json', (req, res) => {
        res.sendFile(path.resolve(__dirname, 'manifest.json'));
      });

      return middlewares;
    },
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.jsx', '.tsx', '.ts'],
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'manifest.json',
          to: './',
          transform: (content) => {
            const manifest = JSON.parse(content.toString());
            return `${JSON.stringify({ ...manifest, version }, null, 2)}\n`;
          },
        },
      ],
    }),
  ],
};
