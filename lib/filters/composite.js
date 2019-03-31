var composites = require('gif-composites');
var fs = require('fs');

class FilterComposite {
  get name() {
    return 'composite';
  }

  async apply(file) {
    return new Promise((resolve, reject) => {
      fs.readFile(file, function(err, buffer) {
        composites.min(buffer, function(err, tracerBuffer) {
          fs.writeFileSync(file, tracerBuffer);
          resolve();
        });
      });
    });
  }
}

module.exports = FilterComposite;
