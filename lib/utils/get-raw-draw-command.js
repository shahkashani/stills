module.exports = (
  frame,
  draw,
  { fill = '', effects = '', strokeColor = '', strokeWidth = 0 } = {}
) => {
  const { width, height } = frame.getInfo();
  const strokeCmd =
    strokeColor && strokeWidth > 0
      ? `-stroke "${strokeColor}" -strokewidth ${strokeWidth}`
      : '';
  const drawString = Array.isArray(draw) ? draw.join(' ') : draw;
  return `convert "${frame.file}" \\( -size ${width}x${height} xc:transparent ${strokeCmd} -fill "${fill}" ${drawString} ${effects} \\) -composite "${frame.file}"`;
};
