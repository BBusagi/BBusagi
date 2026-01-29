import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const CONFIG = {
  fog: { color: 0x0b0f14, near: 6, far: 18 },
  camera: { fov: 45, near: 0.1, far: 100, position: [5, 4, 6] },
  renderer: { antialias: true, maxPixelRatio: 2 },
  lighting: {
    ambient: { color: 0xffffff, intensity: 0.6 },
    key: { color: 0xffffff, intensity: 0.9, position: [5, 6, 3] },
    fill: { color: 0xffffff, intensity: 0.4, position: [-5, -2, -4] },
  },
  cube: { size: 3, rimSize: 3.04 },
  texture: { size: 512, pad: 36, gap: 18, cellRadius: 18, frameRadius: 28 },
  marks: {
    oColor: "#7dff9b",
    xColor: "#ff7a8c",
    strokeWidth: 10,
    oScale: 0.32,
    xMarginScale: 0.28,
  },
  colors: {
    U: "#ffffff",
    D: "#ffd500",
    F: "#00a651",
    B: "#0047ab",
    L: "#ff5800",
    R: "#c41e3a",
  },
  ui: {
    bg: "#1b2230",
    panel: "#2a2f38",
    border: "#1c2330",
  },
};

const FACE_ORDER = ["R", "L", "U", "D", "F", "B"];
const FACE_STICKERS = {
  U: Array(9).fill(CONFIG.colors.U),
  D: Array(9).fill(CONFIG.colors.D),
  F: Array(9).fill(CONFIG.colors.F),
  B: Array(9).fill(CONFIG.colors.B),
  L: Array(9).fill(CONFIG.colors.L),
  R: Array(9).fill(CONFIG.colors.R),
};

const CORNER_GROUPS = [
  [
    ["U", 8],
    ["R", 0],
    ["F", 2],
  ],
  [
    ["U", 6],
    ["L", 2],
    ["F", 0],
  ],
  [
    ["U", 0],
    ["L", 0],
    ["B", 2],
  ],
  [
    ["U", 2],
    ["R", 2],
    ["B", 0],
  ],
  [
    ["D", 2],
    ["R", 6],
    ["F", 8],
  ],
  [
    ["D", 0],
    ["L", 8],
    ["F", 6],
  ],
  [
    ["D", 6],
    ["L", 6],
    ["B", 8],
  ],
  [
    ["D", 8],
    ["R", 8],
    ["B", 6],
  ],
];

const EDGE_GROUPS = [
  [
    ["U", 7],
    ["F", 1],
  ],
  [
    ["U", 5],
    ["R", 1],
  ],
  [
    ["U", 1],
    ["B", 1],
  ],
  [
    ["U", 3],
    ["L", 1],
  ],
  [
    ["D", 1],
    ["F", 7],
  ],
  [
    ["D", 5],
    ["R", 7],
  ],
  [
    ["D", 7],
    ["B", 7],
  ],
  [
    ["D", 3],
    ["L", 7],
  ],
  [
    ["F", 5],
    ["R", 3],
  ],
  [
    ["F", 3],
    ["L", 5],
  ],
  [
    ["B", 3],
    ["R", 5],
  ],
  [
    ["B", 5],
    ["L", 3],
  ],
];

function buildLinkMap(groups) {
  const map = new Map();
  for (const group of groups) {
    for (const [faceKey, idx] of group) {
      map.set(`${faceKey}-${idx}`, group);
    }
  }
  return map;
}

const LINK_MAP = buildLinkMap([...CORNER_GROUPS, ...EDGE_GROUPS]);

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawFace(ctx, faceKey, faceState) {
  const { size, pad, gap, cellRadius, frameRadius } = CONFIG.texture;
  const cell = (size - pad * 2 - gap * 2) / 3;
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = CONFIG.ui.bg;
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = CONFIG.ui.panel;
  roundRect(ctx, pad, pad, size - pad * 2, size - pad * 2, frameRadius);
  ctx.fill();

  for (let y = 0; y < 3; y++) {
    for (let x = 0; x < 3; x++) {
      const cx = pad + x * (cell + gap);
      const cy = pad + y * (cell + gap);
      const idx = y * 3 + x;
      ctx.fillStyle = FACE_STICKERS[faceKey][idx];
      roundRect(ctx, cx, cy, cell, cell, cellRadius);
      ctx.fill();
      ctx.strokeStyle = CONFIG.ui.border;
      ctx.lineWidth = 6;
      ctx.stroke();

      const state = faceState[idx];
      if (state === 1) {
        const r = cell * CONFIG.marks.oScale;
        const ox = cx + cell / 2;
        const oy = cy + cell / 2;
        ctx.strokeStyle = CONFIG.marks.oColor;
        ctx.lineWidth = CONFIG.marks.strokeWidth;
        ctx.beginPath();
        ctx.arc(ox, oy, r, 0, Math.PI * 2);
        ctx.stroke();
      } else if (state === 2) {
        const margin = cell * CONFIG.marks.xMarginScale;
        ctx.strokeStyle = CONFIG.marks.xColor;
        ctx.lineWidth = CONFIG.marks.strokeWidth;
        ctx.beginPath();
        ctx.moveTo(cx + margin, cy + margin);
        ctx.lineTo(cx + cell - margin, cy + cell - margin);
        ctx.moveTo(cx + cell - margin, cy + margin);
        ctx.lineTo(cx + margin, cy + cell - margin);
        ctx.stroke();
      }
    }
  }
}

function createFaceTexture(faceKey, faceState, renderer) {
  const { size } = CONFIG.texture;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  drawFace(ctx, faceKey, faceState);
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  texture.needsUpdate = true;
  return { ctx, texture, faceKey };
}

function getStickerIndexFromUV(uv) {
  const { size, pad, gap } = CONFIG.texture;
  const cell = (size - pad * 2 - gap * 2) / 3;
  const px = uv.x * size;
  const py = (1 - uv.y) * size;
  for (let y = 0; y < 3; y++) {
    for (let x = 0; x < 3; x++) {
      const cx = pad + x * (cell + gap);
      const cy = pad + y * (cell + gap);
      if (px >= cx && px <= cx + cell && py >= cy && py <= cy + cell) {
        return y * 3 + x;
      }
    }
  }
  return null;
}

export function initRubikGame({ mount, resetButton, onTurnChange }) {
  if (!mount) throw new Error("Missing mount element");
  let currentPlayerState = 1;
  if (onTurnChange) onTurnChange(currentPlayerState);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(CONFIG.fog.color, CONFIG.fog.near, CONFIG.fog.far);

  const camera = new THREE.PerspectiveCamera(
    CONFIG.camera.fov,
    window.innerWidth / window.innerHeight,
    CONFIG.camera.near,
    CONFIG.camera.far
  );
  camera.position.set(...CONFIG.camera.position);

  const renderer = new THREE.WebGLRenderer({ antialias: CONFIG.renderer.antialias });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, CONFIG.renderer.maxPixelRatio));
  mount.appendChild(renderer.domElement);

  const ambient = new THREE.AmbientLight(CONFIG.lighting.ambient.color, CONFIG.lighting.ambient.intensity);
  scene.add(ambient);

  const key = new THREE.DirectionalLight(CONFIG.lighting.key.color, CONFIG.lighting.key.intensity);
  key.position.set(...CONFIG.lighting.key.position);
  scene.add(key);

  const fill = new THREE.DirectionalLight(CONFIG.lighting.fill.color, CONFIG.lighting.fill.intensity);
  fill.position.set(...CONFIG.lighting.fill.position);
  scene.add(fill);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;

  const faceState = {
    U: Array(9).fill(0),
    D: Array(9).fill(0),
    F: Array(9).fill(0),
    B: Array(9).fill(0),
    L: Array(9).fill(0),
    R: Array(9).fill(0),
  };

  const faceTextures = {};
  const materials = FACE_ORDER.map((key) => {
    const faceTex = createFaceTexture(key, faceState[key], renderer);
    faceTextures[key] = faceTex;
    return new THREE.MeshStandardMaterial({ map: faceTex.texture });
  });

  const cube = new THREE.Mesh(new THREE.BoxGeometry(CONFIG.cube.size, CONFIG.cube.size, CONFIG.cube.size), materials);
  cube.castShadow = true;
  cube.receiveShadow = true;
  scene.add(cube);

  const rim = new THREE.Mesh(
    new THREE.BoxGeometry(CONFIG.cube.rimSize, CONFIG.cube.rimSize, CONFIG.cube.rimSize),
    new THREE.MeshStandardMaterial({
      color: 0x0b0f14,
      metalness: 0.05,
      roughness: 0.8,
      opacity: 0.35,
      transparent: true,
    })
  );
  scene.add(rim);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  function redrawFaces(faceKeys) {
    for (const key of faceKeys) {
      const faceTex = faceTextures[key];
      drawFace(faceTex.ctx, key, faceState[key]);
      faceTex.texture.needsUpdate = true;
    }
  }

  function handlePointerDown(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObject(cube, false);
    if (!hits.length) return;
    const hit = hits[0];
    if (!hit.uv) return;
    const faceIndex = hit.faceIndex ?? -1;
    if (faceIndex < 0) return;
    const side = Math.floor(faceIndex / 2);
    const faceKey = FACE_ORDER[side];
    const idx = getStickerIndexFromUV(hit.uv);
    if (idx === null) return;

    const group = LINK_MAP.get(`${faceKey}-${idx}`);
    if (group) {
      for (const [f, i] of group) {
        if (faceState[f][i] !== 0) return;
      }
      const facesToRedraw = new Set();
      for (const [f, i] of group) {
        faceState[f][i] = currentPlayerState;
        facesToRedraw.add(f);
      }
      redrawFaces(facesToRedraw);
      currentPlayerState = currentPlayerState === 1 ? 2 : 1;
      if (onTurnChange) onTurnChange(currentPlayerState);
    } else {
      if (faceState[faceKey][idx] !== 0) return;
      faceState[faceKey][idx] = currentPlayerState;
      redrawFaces(new Set([faceKey]));
      currentPlayerState = currentPlayerState === 1 ? 2 : 1;
      if (onTurnChange) onTurnChange(currentPlayerState);
    }
  }

  function handleResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function animate() {
    requestAnimationFrame(animate);
    rim.rotation.copy(cube.rotation);
    controls.update();
    renderer.render(scene, camera);
  }

  renderer.domElement.addEventListener("pointerdown", handlePointerDown);
  window.addEventListener("resize", handleResize);

  if (resetButton) {
    resetButton.addEventListener("click", () => {
      for (const key of Object.keys(faceState)) {
        faceState[key].fill(0);
      }
      redrawFaces(new Set(Object.keys(faceTextures)));
      currentPlayerState = 1;
      if (onTurnChange) onTurnChange(currentPlayerState);
    });
  }

  animate();

  return {
    scene,
    camera,
    renderer,
    cube,
    dispose() {
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("resize", handleResize);
    },
  };
}
