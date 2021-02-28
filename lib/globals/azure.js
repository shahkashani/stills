const microsofComputerVision = require('microsoft-computer-vision');
const { get, upperFirst } = require('lodash');
const sharp = require('sharp');

class GlobalsAzure {
  constructor({ token, region = 'eastus' }) {
    this.token = token;
    this.region = region;
  }

  get name() {
    return 'azure';
  }

  async get(files) {
    try {
      const infos = [];
      for (const file of files) {
        const body = await sharp(file).jpg().resize(200).toBuffer();
        const result = await microsofComputerVision.describeImage({
          body,
          'Ocp-Apim-Subscription-Key': this.token,
          'request-origin': this.region,
          'max-candidates': '1',
          'content-type': 'application/octet-stream',
        });
        const info = {
          text: upperFirst(get(result, 'description.captions[0].text')),
          tags: get(result, 'description.tags', [])
        };
        infos.push(info);
      }
      return infos;
    } catch (err) {
      return null;
    }
  }
}

module.exports = GlobalsAzure;
