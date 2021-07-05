const {
  existsSync,
  mkdirSync,
  copyFileSync,
  writeFileSync,
  unlinkSync
} = require('fs');
const { parse } = require('path');
const PATH_KEYS = ['images', 'masks'];

const copyFiles = (folder, files) => {
  if (!existsSync(folder)) {
    mkdirSync(folder);
  }
  return files.map((file) => {
    const { base } = parse(file);
    const output = `${folder}/${base}`;
    copyFileSync(file, output);
    return {
      name: base,
      path: output,
      output: file,
      url: `/${base}`
    };
  });
};

const createConfig = async (folder, data) => {
  const filename = `${folder}/config.json`;
  const config = { ...data };
  const cleanupFiles = [];
  for (const key of PATH_KEYS) {
    if (Array.isArray(config[key])) {
      config[key] = copyFiles(folder, config[key]);
      cleanupFiles.push.apply(cleanupFiles, config[key]);
    }
  }
  const cleanUp = () => {
    cleanupFiles.forEach(({ path }) => unlinkSync(path));
  };
  writeFileSync(filename, JSON.stringify(config));
  return [filename, cleanUp];
};

module.exports = createConfig;
