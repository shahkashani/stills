const microsofComputerVision = require('microsoft-computer-vision');
const { readFileSync } = require('fs');
const { get, upperFirst } = require('lodash');

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
        const data = readFileSync(file);
        const result = await microsofComputerVision.describeImage({
          'Ocp-Apim-Subscription-Key': this.token,
          'request-origin': this.region,
          'max-candidates': '1',
          'content-type': 'application/octet-stream',
          body: data
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
