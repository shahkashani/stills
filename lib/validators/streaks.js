const getStreaks = require('../utils/get-streaks');
const getImageScenes = require('../utils/get-image-scenes');
const ContentStill = require('../content/still');
const { parse } = require('path');
const { map } = require('lodash');
const { unlinkSync } = require('fs');

class ValidatorStreaks {
  constructor({
    minFaces = 1,
    minStreak = 0.8,
    isAutoRepair = true,
    autoRepairMaxDeletion = 0.3,
    minSceneLength = 5,
    replaceFrames = null
  } = {}) {
    this.minFaces = minFaces;
    this.minStreak = minStreak;
    this.isAutoRepair = isAutoRepair;
    this.autoRepairMaxDeletion = autoRepairMaxDeletion;
    this.minSceneLength = minSceneLength;
    this.replaceFrames = replaceFrames;
  }

  get name() {
    return 'streaks';
  }

  getReplaceFrames = (num) => {
    const { file, seconds, secondsApart } = this.replaceFrames;
    const { name, dir } = parse(file);
    const still = new ContentStill({
      seconds,
      secondsApart
    });
    const results = still.generate(file, `${dir}/${name}`, num);
    return map(results, 'file');
  };

  async repairStreaks(image, streaks) {
    const maxDeletion = Math.floor(
      this.autoRepairMaxDeletion * image.frames.length
    );
    console.log(
      '👨‍🎤 Attempts to repair streaks.',
      JSON.stringify(streaks, null, 2)
    );
    const totalFrames = streaks.reduce(
      (memo, gap) => memo + gap.indexes.length,
      0
    );
    if (totalFrames > maxDeletion) {
      console.log(
        `👨‍🎤 Image requires ${totalFrames} deletions and the max is ${maxDeletion}, giving up.`,
        streaks
      );
      return false;
    }

    const deleteFrames = [];
    for (const gap of streaks) {
      for (const index of gap.indexes) {
        deleteFrames.push(index);
      }
    }

    console.log(`👨‍🎤 Ready to close ${deleteFrames.length} gaps!`);

    if (this.replaceFrames) {
      const files = this.getReplaceFrames(deleteFrames.length);
      for (let i = 0; i < deleteFrames.length; i += 1) {
        console.log(`👨‍🎤 Replacing frame index`, deleteFrames[i]);
        image.replaceFrame(deleteFrames[i], files[i], false);
        unlinkSync(files[i]);
      }
    } else {
      for (const deleteFrame of deleteFrames) {
        console.log(`👨‍🎤 Deleting frame index`, deleteFrame);
        image.deleteFrame(deleteFrame);
      }
    }

    image.collapse();
    return true;
  }

  getSceneLength = (streaks) => {
    return streaks.reduce((memo, streak) => memo + streak.count, 0);
  };

  // Maybe it's better to find the maximum number of faces within a frame,
  // and then return the streaks that have less than this number of faces.
  getInvalidStreaks = (streaks) => {
    const results = [];
    for (const streak of streaks) {
      const sceneLength = this.getSceneLength(streak);
      if (sceneLength < this.minSceneLength) {
        console.log(
          `👨‍🎤 This entire scene is too short (${sceneLength}, should be at least ${this.minSceneLength}).`
        );
        results.push(...streak);
      } else {
        const minimumLength = Math.round(sceneLength * this.minStreak);
        const shortStreaks = streak.filter(
          ({ count }) => count < minimumLength
        );
        results.push(...shortStreaks);
      }
    }
    return results;
  };

  getCounts = async (image) => {
    const frames = image.getFrames();
    const counts = [];
    for (const frame of frames) {
      const humans = await frame.detectHumans();
      counts.push(humans.face.length);
    }
    return counts;
  };

  getMaxFaces = (counts) => {
    return Math.max(...counts);
  };

  async validate(image) {
    console.log(`👨‍🎤 Running streaks validator`);
    console.log(`👨‍🎤 Getting counts`);

    const counts = await this.getCounts(image);
    let numFaces = this.getMaxFaces(counts);
    if (numFaces < this.minFaces) {
      console.log(
        `👨‍🎤 Not enough faces (${numFaces} of ${this.minFaces}), giving up.`
      );
      return false;
    }

    console.log(`👨‍🎤 Getting scenes`);
    const scenes = await getImageScenes(image);

    console.log(`👨‍🎤 Calculating streaks`);
    const streaks = getStreaks(counts, scenes);

    console.log('👨‍🎤', JSON.stringify(streaks, null, 2));

    const invalidStreaks = this.getInvalidStreaks(streaks);

    if (invalidStreaks.length > 0 && this.isAutoRepair) {
      const isRepaired = await this.repairStreaks(image, invalidStreaks);
      if (isRepaired) {
        numFaces = this.getMaxFaces(await this.getCounts(image));
        if (numFaces < this.minFaces) {
          console.log(
            `👨‍🎤 After repair, not enough faces (${numFaces} of ${this.minFaces}), giving up.`
          );
          return false;
        }
        return true;
      }
      return false;
    }

    return invalidStreaks.length === 0;
  }
}

module.exports = ValidatorStreaks;
