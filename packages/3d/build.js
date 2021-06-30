const Bundler = require('parcel-bundler');
const express = require('express');
const { resolve } = require('path');

const bundler = new Bundler(resolve(__dirname, './index.html'), {});
const app = express();
app.use(bundler.middleware());

bundler.once('bundled', () => {
  process.exit(0);
});
