import {
  BufferAttribute,
  BufferGeometry,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  Scene,
  WebGLRenderer,
  sRGBEncoding
} from 'three';

import Human from '@vladmandic/human';

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
  constructor(triangulation) {
    super();
    this.positions = new Float32Array(478 * 3);
    this.uvs = new Float32Array(478 * 2);
    this.setAttribute('position', new BufferAttribute(this.positions, 3));
    this.setAttribute('uv', new BufferAttribute(this.uvs, 2));
    this.setIndex(triangulation);
  }

  update(face, width, height) {
    let ptr = 0;
    for (const p of face.mesh) {
      this.positions[ptr + 0] = -p[0] + width / 2;
      this.positions[ptr + 1] = height - p[1] - height / 2;
      this.positions[ptr + 2] = -p[2];
      ptr += 3;
    }
    ptr = 0;
    for (const p of face.meshRaw) {
      this.uvs[ptr + 0] = 0 + p[0];
      this.uvs[ptr + 1] = 1 - p[1];
      ptr += 2;
    }
    this.attributes.position.needsUpdate = true; // vertices
    this.attributes.uv.needsUpdate = true; // textures
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
      reject();
    };
    image.src = url;
  });
};

const process = async (url) => {
  const image = await getImage(url);
  const canvas = document.createElement('canvas');
  const renderer = new WebGLRenderer({ antialias: true, alpha: true, canvas });
  renderer.setClearColor(0x000000);
  renderer.outputEncoding = sRGBEncoding;
  renderer.autoClear = false;
  const camera = new OrthographicCamera();
  const scene = new Scene();

  resize(image, renderer, camera);
  const res = await human.detect(image);

  if (res && res.face && res.face.length > 0) {
    for (const face of res.face) {
      const faceGeometry = new FaceGeometry(human.faceTriangulation);
      const mesh = new Mesh(faceGeometry);
      mesh.material = new MeshBasicMaterial({
        color: 0xffffff,
        wireframe: true
      });
      scene.add(mesh);
      faceGeometry.update(face, image.width, image.height);
    }
  }
  renderer.render(scene, camera);
  await save(url, image, canvas);
};

const save = async (url, image, canvas) => {
  const { width, height } = image;
  const output = document.createElement('canvas');
  const ctx = output.getContext('2d');
  output.width = width;
  output.height = height;

  ctx.drawImage(image, 0, 0);
  ctx.drawImage(canvas, 0, 0);

  document.getElementById('output').appendChild(output);

  const base64 = output.toDataURL().split(';base64,')[1];
  await fetch('/save', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      filename: url,
      image: base64
    })
  });
};

const getFiles = async () => {
  const response = await fetch('/inputs');
  if (!response.ok) {
    return [];
  }
  return await response.json();
};

const main = async () => {
  await human.load();

  const files = await getFiles();

  for (const file of files) {
    await process(`/${file}`);
  }

  console.timeStamp('done');
};

window.onload = main;
