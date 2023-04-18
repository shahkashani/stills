const instance = require('./instance');
const fs = require('fs');
const canvas = require('canvas');

class Humans {
  constructor(buffer) {
    this.buffer = buffer;
  }

  get instance() {
    if (!this.localInstance) {
      this.localInstance = instance.get();
    }
    return this.localInstance;
  }

  async detect() {
    let result;
    while (!result) {
      try {
        const tensor = this.instance.tf.node.decodeImage(this.buffer);
        result = await this.instance.detect(tensor);
        tensor.dispose();
      } catch (err) {
        console.error(err);
      }
    }
    return result;
  }

  async draw(
    output,
    base,
    drawFn,
    { composite = 'lighten', background = 'black' } = {}
  ) {
    const inputImage = await canvas.loadImage(base || output);
    const outFile = fs.createWriteStream(output);
    const { width, height } = inputImage;
    const outputCanvas = new canvas.Canvas(width, height);
    const ctx = outputCanvas.getContext('2d');

    if (background) {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);
    }

    drawFn(ctx, outputCanvas);

    return new Promise((resolve, reject) => {
      const combinedCanvas = new canvas.Canvas(width, height);
      const combinedCtx = combinedCanvas.getContext('2d');
      if (composite) {
        // https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/globalCompositeOperation
        combinedCtx.globalCompositeOperation = composite;
      }
      combinedCtx.drawImage(inputImage, 0, 0);
      combinedCtx.drawImage(outputCanvas, 0, 0);
      outFile.on('finish', () => resolve());
      outFile.on('error', (err) => reject(err));
      const stream = combinedCanvas.createPNGStream();
      stream.pipe(outFile);
    });
  }

  async drawCircles(ctx, annotations) {
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 5;
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    const sizeX = Math.abs(annotations[3][0] - annotations[1][0]) / 2;
    const sizeY = Math.abs(annotations[4][1] - annotations[2][1]) / 2;
    ctx.ellipse(
      annotations[0][0],
      annotations[0][1],
      sizeX,
      sizeY,
      0,
      0,
      2 * Math.PI
    );
    ctx.stroke();
    ctx.fill();
  }

  async drawFace(output, base) {
    return await this.draw(output, base, async (result, ctx) => {
      for (const face of result.face) {
        const silhouette = face.annotations.silhouette;
        const points = [...silhouette, silhouette[0]];
        this.lines(ctx, points, {
          fillPolygons: true,
          useDepth: false,
          color: 'black'
        });
      }
    });
  }

  async drawMesh(output, base, alpha = 1, color) {
    const triangulation = this.instance.faceTriangulation;
    const opt = {
      fillPolygons: false,
      useDepth: !color,
      color,
      alpha
    };
    return await this.draw(output, base, async (result, ctx) => {
      for (const face of result.face) {
        for (let i = 0; i < triangulation.length / 3; i++) {
          const points = [
            triangulation[i * 3 + 0],
            triangulation[i * 3 + 1],
            triangulation[i * 3 + 2]
          ].map((index) => face.mesh[index]);
          this.lines(ctx, points, opt);
        }
      }
    });
  }

  async drawEyes(output, base) {
    return await this.draw(output, base, async (result, ctx) => {
      for (const face of result.face) {
        await this.drawCircles(ctx, face.annotations.leftEyeIris);
        await this.drawCircles(ctx, face.annotations.rightEyeIris);
      }
    });
  }

  colorDepth(z, opt) {
    if (!opt.useDepth || typeof z === 'undefined') {
      return opt.color;
    }
    const rgb = Uint8ClampedArray.from([127 + 2 * z, 127 - 2 * z, 255]);
    const color = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${opt.alpha})`;
    return color;
  }

  lines(ctx, points, localOptions) {
    if (points.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (const pt of points) {
      ctx.strokeStyle = this.colorDepth(pt[2] || 0, localOptions);
      ctx.lineTo(Math.trunc(pt[0]), Math.trunc(pt[1]));
    }
    ctx.stroke();
    if (localOptions.fillPolygons) {
      ctx.closePath();
      ctx.fill();
    }
  }

  linesCoords(ctx, points, localOptions) {
    if (points.length < 2) {
      return;
    }
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    if (localOptions.fillPolygons) {
      ctx.fillStyle = localOptions.color;
    }
    for (const pt of points) {
      ctx.strokeStyle = this.colorDepth(pt[2] || 0, localOptions);
      ctx.lineTo(Math.trunc(pt.x), Math.trunc(pt.y));
    }
    ctx.stroke();
    if (localOptions.fillPolygons) {
      ctx.closePath();
      ctx.fill();
    }
  }
}

module.exports = Humans;
