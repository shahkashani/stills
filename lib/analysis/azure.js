const {
  ComputerVisionClient
} = require('@azure/cognitiveservices-computervision');
const { CognitiveServicesCredentials } = require('@azure/ms-rest-azure-js');

const { get } = require('lodash');
const createReadStream = require('fs').createReadStream;

class AnalysisAzure {
  constructor({ token, url, minCaptionConfidence = 0.1 }) {
    this.url = url;
    this.minCaptionConfidence = minCaptionConfidence;

    const cognitiveServiceCredentials = new CognitiveServicesCredentials(token);
    this.client = new ComputerVisionClient(
      cognitiveServiceCredentials,
      this.url
    );
  }

  get name() {
    return 'azure';
  }

  async get(images) {
    try {
      const infos = [];
      for (const image of images) {
        const file = image.getFrames()[0].original;
        const options = {
          maxCandidates: 1,
          language: 'en'
        };
        const result = await this.client.describeImageInStream(
          () => createReadStream(file),
          options
        );
        console.log(result);
        const tags = get(result, 'tags', []);
        const captionInfo = get(result, 'captions[0]');
        const captionText = (captionInfo || {}).text;
        const captionConfidence = (captionInfo || 0).confidence;
        const confidenceText = Math.floor(100 * captionConfidence);
        const text =
          captionText && captionConfidence > this.minCaptionConfidence
            ? `${confidenceText}% sure it\'s ${captionText}`
            : null;
        const info = {
          text,
          tags
        };
        infos.push(info);
      }
      return infos;
    } catch (err) {
      console.error(`Azure error: ${err}`);
      return null;
    }
  }
}

module.exports = AnalysisAzure;
