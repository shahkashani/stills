const { getVideoLength, getRandomTimestamp, shell } = require('./utils');

class ContentGif {
  constructor({ width = 540, duration = 2 } = {}) {
    this.width = width;
    this.duration = duration;
  }

  generate(input, output) {
    console.log(`📹 Processing ${output}`);

    const length = getVideoLength(input);
    const sec = getRandomTimestamp(length);
    const outputFile = `${output} @ ${sec.toFixed(0)}s.gif`;

    const duration = this.duration;
    const width = this.width;

    console.log(`🥚 Generating GIF ${outputFile}`);

    shell(
      `ffmpeg -ss ${sec} -t ${duration} -i "${input}" -v warning -filter_complex "[0:v] fps=12,scale=w=${width}:h=-1,split [a][b];[a] palettegen=reserve_transparent=off:stats_mode=single [p];[b][p] paletteuse=new=1" "${outputFile}"`
    );

    return outputFile;
  }
}

module.exports = ContentGif;
