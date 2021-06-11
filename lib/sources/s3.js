const AWS = require('aws-sdk');

const { sample } = require('lodash');

const url = require('url');
const path = require('path');

class SourceS3 {
  constructor({ accessKeyId, secretAccessKey, bucket, filter }) {
    AWS.config.update({
      accessKeyId,
      secretAccessKey
    });
    this.bucket = bucket;
    this.filter = filter;
    this.s3 = new AWS.S3();
  }

  getVideoUrl(object, expires = 600) {
    const params = {
      Bucket: this.bucket,
      Key: object.Key,
      Expires: expires
    };
    return this.s3.getSignedUrl('getObject', params);
  }

  getVideoObjects() {
    var params = {
      Bucket: this.bucket
    };
    return new Promise((resolve, reject) => {
      this.s3.listObjects(params, function (err, data) {
        if (err) {
          reject(err);
          return;
        }
        if (data) {
          resolve(data.Contents);
        }
      });
    });
  }

  getOutput(videoUrl) {
    const { pathname } = url.parse(videoUrl);
    const { name } = path.parse(decodeURIComponent(pathname));
    return name;
  }

  async getAllNames() {
    const videos = await this.getVideoObjects();
    return videos.map((video) => {
      const { name } = path.parse(video.Key);
      return name;
    });
  }

  getRandom(videos) {
    return sample(videos);
  }

  getByName(videos, name) {
    return videos.find(({ Key: key }) => key.indexOf(name) === 0);
  }

  getByFilter(videos, filter) {
    return sample(videos.filter(filter));
  }

  async get(epName = null) {
    const videos = await this.getVideoObjects();
    console.log(`📼 There are ${videos.length} videos in here`);
    // @todo Add filter back in here
    const video = epName
      ? this.getByName(videos, epName)
      : this.getRandom(videos);
    const input = this.getVideoUrl(video);
    const output = this.getOutput(input);
    return {
      name: output,
      input,
      output
    };
  }
}

module.exports = SourceS3;
