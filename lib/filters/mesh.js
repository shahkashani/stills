const runner = require('../../packages/3d/runner');
const { getAsStills } = require('./utils');
const { resolve } = require('path');

class FilterMesh {
  get name() {
    return 'mesh';
  }

  async apply(file) {
    const [stills, deleteStills, getAtIndex, collapse] = getAsStills(file);
    const files = stills.map((file) => resolve(process.cwd(), file));
    await runner.run({
      files,
      output: __dirname
    });
    collapse();
    deleteStills();
  }
}

module.exports = FilterMesh;
