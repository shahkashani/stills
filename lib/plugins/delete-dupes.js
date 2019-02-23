const dropbox = require('../dropbox');
const { map, difference } = require('lodash');
const { basename } = require('path');
const { unlinkSync } = require('fs');

class DeleteDupesPlugin {
  async getDropboxImages() {
    const files = await dropbox.getPostedFiles();
    return map(files, 'name');
  }

  get name() {
    return 'dupes';
  }

  getIntersection(dropboxImages, files) {
    return files.filter(file => dropboxImages.indexOf(basename(file)) !== -1);
  }

  async run(files) {
    if (!dropbox.canConnect()) {
      return files;
    }
    const dropboxImages = await this.getDropboxImages();
    console.log(
      `🔍 Comparing dupes with ${dropboxImages.length} Dropbox images.`
    );
    const dupes = this.getIntersection(dropboxImages, files);
    dupes.forEach(dupe => {
      console.log(`❌ Deleting dupe ${basename(dupe)}...`);
      try {
        unlinkSync(dupe);
      } catch (err) {
        console.log(`🐞 Oops: ${err}`);
      }
    });
    return difference(files, dupes);
  }
}

module.exports = DeleteDupesPlugin;
