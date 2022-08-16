const { createSVGWindow } = require('svgdom');
const window = createSVGWindow();
const { SVG, registerWindow } = require('@svgdotjs/svg.js');
registerWindow(window, window.document);

module.exports = SVG;
