const {
  ComputerVisionClient
} = require('@azure/cognitiveservices-computervision');
const { CognitiveServicesCredentials } = require('@azure/ms-rest-azure-js');

const { get } = require('lodash');

class AnalysisAzure {
  constructor({ token, url, minCaptionConfidence = 0.1 }) {
    this.minCaptionConfidence = minCaptionConfidence;
    const cognitiveServiceCredentials = new CognitiveServicesCredentials(token);
    this.client = new ComputerVisionClient(cognitiveServiceCredentials, url);
  }

  get name() {
    return 'azure';
  }

  async get(images) {
    try {
      const infos = [];
      for (const image of images) {
        const buffer = image.getFrames()[0].originalBuffer;
        const options = {
          maxCandidates: 1,
          language: 'en'
        };
        const result = await this.client.describeImageInStream(
          () => buffer,
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
