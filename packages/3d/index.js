import {
  BufferAttribute,
  BufferGeometry,
  DirectionalLight,
  Float32BufferAttribute,
  HemisphereLight,
  Mesh,
  MeshPhongMaterial,
  OrthographicCamera,
  Scene,
  TextureLoader,
  WebGLRenderer,
  sRGBEncoding
} from 'three';

import Human from '@vladmandic/human';
import { sample } from 'lodash';
import uvs from './utils/uvs';

const userConfig = {
  backend: 'wasm',
  async: false,
  profile: false,
  warmup: 'full',
  modelBasePath: '/',
  wasmPath:
    'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@3.7.0/dist/',
  filter: { enabled: false },
  face: {
    enabled: true,
    detector: { rotation: false, maxDetected: 10 },
    mesh: { enabled: true },
    iris: { enabled: true },
    description: { enabled: false },
    emotion: { enabled: false }
  },
  hand: { enabled: false },
  gesture: { enabled: false },
  body: { enabled: false },
  object: { enabled: false }
};

class FaceGeometry extends BufferGeometry {
  constructor(triangulation, face = null) {
    super();
    this.positions = new Float32Array(478 * 3);
    this.setAttribute('position', new BufferAttribute(this.positions, 3));
    this.setAttribute('uv', new Float32BufferAttribute(uvs, 2));

    this.setIndex(triangulation);
    if (face) {
      this.update(face.face, face.width, face.height);
    }
  }

  update(face, width, height) {
    let ptr = 0;
    for (const p of face.mesh) {
      this.positions[ptr + 0] = -p[0] + width / 2;
      this.positions[ptr + 1] = height - p[1] - height / 2;
      this.positions[ptr + 2] = -p[2];
      ptr += 3;
    }
    this.attributes.position.needsUpdate = true;
    this.computeVertexNormals();
  }
}

const human = new Human(userConfig);

function resize(input, renderer, camera) {
  const width = input.width;
  const height = input.height;
  camera.left = width / 2;
  camera.right = -width / 2;
  camera.top = height / 2;
  camera.bottom = -height / 2;
  camera.near = -100;
  camera.far = 100;
  camera.zoom = 1;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

const getImage = async (url) => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      resolve(image);
    };
    image.onerror = () => {
      reject(`Could not load ${url}`);
    };
    image.src = url;
  });
};

const loadTexture = (url) => {
  return new Promise((resolve) => {
    new TextureLoader().load(url, resolve);
  });
};

const getElement = async (face, width, height, mask) => {
  let texture;

  if (mask) {
    texture = await loadTexture(mask.url);
    texture.encoding = sRGBEncoding;
    texture.anisotropy = 16;
  }
  const faceGeometry = new FaceGeometry(human.faceTriangulation, {
    face,
    width,
    height
  });
  const material = new MeshPhongMaterial({
    map: texture,
    wireframe: !texture
  });
  const mesh = new Mesh(faceGeometry, material);
  return mesh;
};

const process = async (imageConfig, config, mask) => {
  const image = await getImage(imageConfig.url);
  const { width, height } = image;
  const canvas = document.createElement('canvas');
  const renderer = new WebGLRenderer({ antialias: true, alpha: true, canvas });
  renderer.setClearColor(0x000000);
  renderer.outputEncoding = sRGBEncoding;
  renderer.autoClear = false;
  const camera = new OrthographicCamera();
  const scene = new Scene();
  const light = new HemisphereLight(0xffffff, 0xffffff, 0.2);
  scene.add(light);
  const directionalLight = new DirectionalLight(0xffffff, 1);
  directionalLight.position.set(width / 2, height / 4, -500).normalize();
  scene.add(directionalLight);

  resize(image, renderer, camera);
  const res = await human.detect(image);

  if (res && res.face && res.face.length > 0) {
    for (const face of res.face) {
      scene.add(await getElement(face, width, height, mask));
    }
  }
  renderer.render(scene, camera);
  return await save(imageConfig.output, image, canvas, config);
};

const save = async (url, image, canvas, config) => {
  const { width, height } = image;
  const output = document.createElement('canvas');
  const ctx = output.getContext('2d');
  output.width = width;
  output.height = height;

  ctx.drawImage(image, 0, 0);
  if (config.opacity) {
    ctx.globalAlpha = config.opacity;
  }
  ctx.drawImage(canvas, 0, 0);
  document.getElementById('output').appendChild(output);
  const base64 = output.toDataURL().split(';base64,')[1];
  const result = await fetch('/save', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      output: url,
      image: base64
    })
  });
  return await result.json();
};

const getConfig = async () => {
  const response = await fetch('/config');
  if (!response.ok) {
    return [];
  }
  return await response.json();
};

const main = async () => {
  await human.load();

  const config = await getConfig();
  console.log('Running with config', config);
  const results = [];

  const mask = Array.isArray(config.masks) ? sample(config.masks) : null;

  for (const image of config.images) {
    const result = await process(image, config, mask);
    results.push(result);
  }

  console.log({ results });
  console.timeStamp('done', { results });
};

window.onload = main;
