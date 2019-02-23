const runPlugins = async (files, plugins) => {
  for (const plugin of plugins) {
    console.log(`\n🐎 Running plugin: ${plugin.name}`);
    files = await plugin.run(files);
    if (!Array.isArray(files)) {
      console.log(`👿 Yo, your plugin (${plugin.name}) must return an array`);
      console.log('👿 Instead I got:', files);
      process.exit(1);
    }
  }
};

module.exports = runPlugins;
