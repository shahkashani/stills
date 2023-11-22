const loadSrt = require('./load-srt');

const CACHE_PREFIX = 'srt';

class CaptionLoader {
  constructor({ folder, redis, episodes }) {
    this.folder = folder;
    this.episodes = episodes;
    this.redis = redis;
    this.cache = {};
  }

  getKey(episode) {
    return `${CACHE_PREFIX}-${episode.toLowerCase()}`;
  }

  async getCaptionFs(episode) {
    return loadSrt(`${this.folder}/${episode}.srt`);
  }

  async getCaption(episode, existingData, index) {
    if (!existingData) {
      return this.getCaptionFs(episode);
    }
    const key = this.getKey(episode);
    const data = existingData && existingData[index];
    if (data) {
      return JSON.parse(data);
    } else {
      const srts = await this.getCaptionFs(episode);
      await this.redis.set(key, JSON.stringify(srts));
      return srts;
    }
  }

  async getAllCaptions() {
    if (Object.keys(this.cache) > 0) {
      return this.cache;
    }
    const existingData = this.redis
      ? await this.redis.mGet(this.episodes.map((e) => this.getKey(e)))
      : null;

    this.cache = await this.episodes.reduce(
      async (memo, name, index) => ({
        ...(await memo),
        [name]: await this.getCaption(name, existingData, index)
      }),
      Promise.resolve({})
    );
    return this.cache;
  }
}

module.exports = CaptionLoader;
