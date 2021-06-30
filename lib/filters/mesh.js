const runner = require('../../packages/3d/runner');
const { getAsStills } = require('./utils');
const { resolve } = require('path');

class FilterMesh {
  constructor({ args = ['--no-sandbox', '--disable-setuid-sandbox'] } = {}) {
    this.args = args;
  }

  get name() {
    return 'mesh';
  }

  async apply(file) {
    const [stills, deleteStills, collapse] = getAsStills(file);
    const files = stills.map((file) => resolve(process.cwd(), file));
    await runner.run({
      files,
      args: this.args
    });
    collapse();
    deleteStills();
  }
}

module.exports = FilterMesh;
