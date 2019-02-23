const glob = require('glob');
const {
  loadDescriptors,
  findFaces,
  recognizeFaces
} = require('../face-detection');
const { basename } = require('path');
const { map, difference, sampleSize } = require('lodash');
const { unlinkSync } = require('fs');

class FaceDetectionPlugin {
  constructor({ minMatches, descriptorsFolder }) {
    const descriptorFiles = glob.sync(`${descriptorsFolder}/*.json`);
    this.isRecognizeFaces = descriptorFiles.length > 0;
    this.descriptors = this.isRecognizeFaces
      ? this.loadDescriptors(descriptorFiles)
      : [];
    this.minMatches = minMatches;
  }

  get name() {
    return 'face-detection';
  }

  async runFaceDetection(files) {
    console.log('👤 No faces trained, running in face detection mode.');
    const result = await findFaces(files);
    return files.filter(file => result[file]);
  }

  async runFaceRecognition(files) {
    const names = map(this.descriptors, 'name').join(', ');
    console.log(`🦄 Running face recognition for ${names}!`);
    const result = await recognizeFaces(this.descriptors, files);
    return files.filter(file => result[file].length > 0);
  }

  loadDescriptors(files) {
    return files.map(file => ({
      name: basename(file, '.json'),
      descriptors: loadDescriptors(file)
    }));
  }

  getNumKeepNonMatches(numMatches, numNonMatches) {
    const numIdeal = Math.floor(numMatches / this.minMatches);
    return Math.max(0, Math.min(numIdeal - numMatches, numNonMatches));
  }

  deleteFiles(files) {
    files.forEach(file => {
      console.log(`❌ Deleting non-match ${basename(file)}...`);
      try {
        unlinkSync(file);
      } catch (err) {
        console.log(`🐛 Oops: ${err}`);
      }
    });
  }

  async run(files) {
    const matches = this.isRecognizeFaces
      ? await this.runFaceRecognition(files)
      : await this.runFaceDetection(files);

    const nonMatches = difference(files, matches);
    const numKeepNonMatches = this.getNumKeepNonMatches(
      matches.length,
      nonMatches.length
    );
    const keepNonMatches = sampleSize(nonMatches, numKeepNonMatches);
    const results = [...matches, ...keepNonMatches];
    this.deleteFiles(difference(nonMatches, keepNonMatches));
    console.log(
      `📈 Found ${
        matches.length
      } matches, keeping ${numKeepNonMatches} others. Achieved ${(matches.length /
        results.length) *
        100}% matches.`
    );
    return results;
  }
}

module.exports = FaceDetectionPlugin;
