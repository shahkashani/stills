const microsofComputerVision = require('microsoft-computer-vision');
const { get } = require('lodash');
const sharp = require('sharp');

class AnalysisAzure {
  constructor({ token, minCaptionConfidence = 0.1, region = 'eastus' }) {
    this.token = token;
    this.region = region;
    this.minCaptionConfidence = minCaptionConfidence;
  }

  get name() {
    return 'azure';
  }

  async get(images) {
    try {
      const infos = [];
      for (const image of images) {
        const file = image.getFrames()[0].original;
        const body = await sharp(file).resize(200).toBuffer();
        const result = await microsofComputerVision.describeImage({
          body,
          'Ocp-Apim-Subscription-Key': this.token,
          'request-origin': this.region,
          'max-candidates': '1',
          'content-type': 'application/octet-stream'
        });
        const tags = get(result, 'description.tags', []);
        const captionInfo = get(result, 'description.captions[0]');
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
