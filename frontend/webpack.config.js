const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');
const dotenv = require('dotenv');

dotenv.config();

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    entry: './src/main.tsx',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: isProduction ? 'js/[name].[contenthash:8].js' : 'js/[name].js',
      chunkFilename: isProduction ? 'js/[name].[contenthash:8].chunk.js' : 'js/[name].chunk.js',
      clean: true,
      publicPath: '/',
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    module: {
      rules: [
        {
          test: /\.(ts|tsx)$/,
          exclude: /node_modules/,
          use: {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
            },
          },
        },
        {
          test: /\.css$/,
          use: [
            isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
            'css-loader',
            'postcss-loader',
          ],
        },
        {
          test: /\.(png|jpe?g|gif|svg|webp|ico)$/i,
          type: 'asset/resource',
          generator: {
            filename: 'assets/images/[name].[hash:8][ext]',
          },
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/i,
          type: 'asset/resource',
          generator: {
            filename: 'assets/fonts/[name].[hash:8][ext]',
          },
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './public/index.html',
        filename: 'index.html',
        favicon: path.resolve(__dirname, 'public/favicon.ico'),
      }),
      new CopyWebpackPlugin({
        patterns: [
          {
            from: 'public',
            to: '',
            globOptions: {
              ignore: ['**/index.html', '**/favicon.ico'],
            },
          },
        ],
      }),
      new webpack.DefinePlugin({
        'process.env.REACT_APP_API_URL': JSON.stringify(process.env.REACT_APP_API_URL || ''),
      }),
      ...(isProduction
        ? [
            new MiniCssExtractPlugin({
              filename: 'css/[name].[contenthash:8].css',
              chunkFilename: 'css/[name].[contenthash:8].chunk.css',
            }),
          ]
        : []),
    ],
    devServer: {
      static: {
        directory: path.join(__dirname, 'public'),
      },
      historyApiFallback: {
        disableDotRule: true,
        htmlAcceptHeaders: ['text/html', '*/*'],
      },
      port: 3000,
      hot: true,
      open: false,
      proxy: [
        {
          context: ['/api'],
          target: 'http://localhost:5000',
          changeOrigin: true,
        },
      ],
    },
    optimization: {
      splitChunks: {
        chunks: 'all',
        name: false,
      },
      runtimeChunk: 'single',
    },
    performance: {
      hints: false,
    },
  };
};
