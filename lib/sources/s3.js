const {
  S3Client,
  ListObjectsCommand,
  GetObjectCommand
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { sample } = require('lodash');
const { parse } = require('path');

class SourceS3 {
  constructor({ accessKeyId, secretAccessKey, bucket, filter }) {
    this.client = new S3Client({
      region: 'us-east-1',
      credentials: {
        accessKeyId,
        secretAccessKey
      }
    });
    this.bucket = bucket;
    this.filter = filter;
  }

  async getVideoUrl(object, expiresIn = 600) {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: object.Key
    });
    return await getSignedUrl(this.client, command, { expiresIn });
  }

  async getVideoObjects() {
    const command = new ListObjectsCommand({
      Bucket: this.bucket
    });
    const { Contents } = await this.client.send(command);
    return Contents;
  }

  getOutput(videoUrl) {
    const { pathname } = new URL(videoUrl);
    const { name } = parse(decodeURIComponent(pathname));
    return name;
  }

  async getAllNames() {
    const videos = await this.getVideoObjects();
    return videos.map((video) => {
      const { name } = parse(video.Key);
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
    let videos = await this.getVideoObjects();
    if (this.filter) {
      videos = videos.filter(this.filter);
    }
    console.log(`📼 There are ${videos.length} videos in here`);
    const video = epName
      ? this.getByName(videos, epName)
      : this.getRandom(videos);
    const input = await this.getVideoUrl(video);
    const output = this.getOutput(input);
    return {
      name: output,
      input,
      output
    };
  }
}

module.exports = SourceS3;
