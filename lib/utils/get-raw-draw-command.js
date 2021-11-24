module.exports = (frame, draw, { fill = '', effects = '' } = {}) => {
  const { width, height } = frame.getInfo();
  const drawString = Array.isArray(draw) ? draw.join(' ') : draw;
  return `convert "${frame.file}" \\( -size ${width}x${height} xc:transparent -fill "${fill}" ${drawString} ${effects} \\) -composite "${frame.file}"`;
};
