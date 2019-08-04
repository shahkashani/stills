const microsofComputerVision = require('microsoft-computer-vision');
const { readFileSync } = require('fs');
const { get, upperFirst } = require('lodash');

class DescriptionAzure {
  constructor({ token, region = 'eastus' }) {
    this.token = token;
    this.region = region;
  }

  get name() {
    return 'azure';
  }

  async get(file) {
    try {
      const data = readFileSync(file);
      const result = await microsofComputerVision.describeImage({
        'Ocp-Apim-Subscription-Key': this.token,
        'request-origin': this.region,
        'max-candidates': '1',
        'content-type': 'application/octet-stream',
        body: data
      });
      return upperFirst(get(result, 'description.captions[0].text'));
    } catch (err) {
      return null;
    }
  }
}

module.exports = DescriptionAzure;
