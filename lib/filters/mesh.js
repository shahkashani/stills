const runner = require('../../packages/3d/runner');
const { getAsStills } = require('./utils');
const { resolve } = require('path');

class FilterMesh {
  constructor({
    masks,
    runnerArgs = ['--no-sandbox', '--disable-setuid-sandbox']
  } = {}) {
    this.runnerArgs = runnerArgs;
    this.masks = masks;
  }

  get name() {
    return 'mesh';
  }

  async apply(file) {
    const [stills, deleteStills, collapse] = getAsStills(file);
    const images = stills.map((file) => resolve(process.cwd(), file));
    await runner.run({
      config: {
        images,
        masks: this.masks,
        opacity: 1
      },
      runnerArgs: this.runnerArgs
    });
    collapse();
    deleteStills();
  }
}

module.exports = FilterMesh;
