const { getImageInfo } = require('./utils');
const text2png = require('text2png');
const wrap = require('wordwrap')(60);
const { writeFileSync, unlinkSync } = require('fs');
const { exec } = require('shelljs');

class FilterAnnotate {
  constructor({ text, style = {} }) {
    this.text = text;
    this.style = style;
  }

  get name() {
    return 'annotate';
  }

  async apply(file) {
    const { width: imageWidth, height: imageHeight } = getImageInfo(file);
    const annotationFile = `${file}-annotation.png`;
    const quoteImage = text2png(wrap(this.text), this.style);
    writeFileSync(annotationFile, quoteImage);

    const { width: annotationWidth, height: annotationHeight } = getImageInfo(
      annotationFile
    );

    const newAnnotationHeight =
      annotationHeight / (annotationWidth / imageWidth);
    const totalHeight = newAnnotationHeight + imageHeight;

    const cmd = `convert "${file}" -background white -extent x${totalHeight} -coalesce null: \\( -resize ${imageWidth}x "${annotationFile}" \\) -geometry +0+${imageHeight} -layers Composite "${file}"`;
    const result = exec(cmd, { silent: true });
    if (result.code !== 0) {
      console.log(`🐞 Oops: ${result.stderr}\n> ${cmd}`);
    }

    unlinkSync(annotationFile);
  }
}

module.exports = FilterAnnotate;
