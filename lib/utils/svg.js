const getSvg = async () => {
  const { createSVGWindow } = await import('svgdom');
  const window = createSVGWindow();
  const { SVG, registerWindow } = require('@svgdotjs/svg.js');
  registerWindow(window, window.document);
  return SVG;
};

module.exports = getSvg;
