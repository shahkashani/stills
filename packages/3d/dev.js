const { resolve } = require('path');
const createServer = require('./server');
const Bundler = require('parcel-bundler');

(async () => {
  const { app } = await createServer({ isBuild: true });
  const bundler = new Bundler(resolve(__dirname, './index.html'), {});
  app.use(bundler.middleware());
})();
