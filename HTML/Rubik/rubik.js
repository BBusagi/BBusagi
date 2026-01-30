import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const CFG = {
  fog: [0x0b0f14, 6, 18],
  cam: [45, 0.1, 100, 5, 4, 6],
  lights: [
    [0xffffff, 0.6, 0, 0, 0],
    [0xffffff, 0.9, 5, 6, 3],
    [0xffffff, 0.4, -5, -2, -4],
  ],
  cube: [3, 3.04],
  tex: [512, 36, 18, 18, 28],
  marks: { o: "#23D984", x: "#d67284", w: 10, oScale: 0.32, xGap: 0.28 },
  ui: { bg: "#1b2230", panel: "#2a2f38", border: "#1c2330" },
  colors: {
    U: "#ffffff",
    D: "#ffd500",
    F: "#00a651",
    B: "#0047ab",
    L: "#ff5800",
    R: "#c41e3a",
  },
};

const ORDER = ["R", "L", "U", "D", "F", "B"];
const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];
const GROUPS = [
  [["U", 8], ["R", 0], ["F", 2]],
  [["U", 6], ["L", 2], ["F", 0]],
  [["U", 0], ["L", 0], ["B", 2]],
  [["U", 2], ["R", 2], ["B", 0]],
  [["D", 2], ["R", 6], ["F", 8]],
  [["D", 0], ["L", 8], ["F", 6]],
  [["D", 6], ["L", 6], ["B", 8]],
  [["D", 8], ["R", 8], ["B", 6]],
  [["U", 7], ["F", 1]],
  [["U", 5], ["R", 1]],
  [["U", 1], ["B", 1]],
  [["U", 3], ["L", 1]],
  [["D", 1], ["F", 7]],
  [["D", 5], ["R", 7]],
  [["D", 7], ["B", 7]],
  [["D", 3], ["L", 7]],
  [["F", 5], ["R", 3]],
  [["F", 3], ["L", 5]],
  [["B", 3], ["R", 5]],
  [["B", 5], ["L", 3]],
];

const STICKERS = Object.fromEntries(
  Object.entries(CFG.colors).map(([k, v]) => [k, Array(9).fill(v)])
);

const LINK = (() => {
  const m = new Map();
  for (const g of GROUPS) for (const [f, i] of g) m.set(`${f}-${i}`, g);
  return m;
})();

const rr = (ctx, x, y, w, h, r) => {
  const R = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + R, y);
  ctx.arcTo(x + w, y, x + w, y + h, R);
  ctx.arcTo(x + w, y + h, x, y + h, R);
  ctx.arcTo(x, y + h, x, y, R);
  ctx.arcTo(x, y, x + w, y, R);
  ctx.closePath();
};

export function initRubikGame({ mount, resetButton, onTurnChange, onScoreChange, onGameEnd, onReset }) {
  if (!mount) throw new Error("Missing mount element");

  const [texSize, pad, gap, cellR, frameR] = CFG.tex;
  const cell = (texSize - pad * 2 - gap * 2) / 3;
  const faceState = Object.fromEntries(ORDER.map((k) => [k, Array(9).fill(0)]));
  const scores = { 1: 0, 2: 0 };
  const scored = new Set();
  let current = 1;
  let gameOver = false;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(...CFG.fog);
  scene.background = new THREE.Color(0x3a3f48);

  const camera = new THREE.PerspectiveCamera(CFG.cam[0], window.innerWidth / window.innerHeight, CFG.cam[1], CFG.cam[2]);
  camera.position.set(CFG.cam[3], CFG.cam[4], CFG.cam[5]);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x3a3f48, 1);
  mount.appendChild(renderer.domElement);

  for (const [c, i, x, y, z] of CFG.lights) {
    const light = x === 0 && y === 0 && z === 0 ? new THREE.AmbientLight(c, i) : new THREE.DirectionalLight(c, i);
    if (light.position) light.position.set(x, y, z);
    scene.add(light);
  }

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;

  const drawFace = (ctx, key) => {
    ctx.clearRect(0, 0, texSize, texSize);
    ctx.fillStyle = CFG.ui.bg;
    ctx.fillRect(0, 0, texSize, texSize);
    ctx.fillStyle = CFG.ui.panel;
    rr(ctx, pad, pad, texSize - pad * 2, texSize - pad * 2, frameR);
    ctx.fill();

    const state = faceState[key];
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        const idx = y * 3 + x;
        const cx = pad + x * (cell + gap);
        const cy = pad + y * (cell + gap);
        ctx.fillStyle = STICKERS[key][idx];
        rr(ctx, cx, cy, cell, cell, cellR);
        ctx.fill();
        ctx.strokeStyle = CFG.ui.border;
        ctx.lineWidth = 6;
        ctx.stroke();

        const v = state[idx];
        if (v === 1) {
          ctx.strokeStyle = CFG.marks.o;
          ctx.lineWidth = CFG.marks.w;
          ctx.beginPath();
          ctx.arc(cx + cell / 2, cy + cell / 2, cell * CFG.marks.oScale, 0, Math.PI * 2);
          ctx.stroke();
        } else if (v === 2) {
          const m = cell * CFG.marks.xGap;
          ctx.strokeStyle = CFG.marks.x;
          ctx.lineWidth = CFG.marks.w;
          ctx.beginPath();
          ctx.moveTo(cx + m, cy + m);
          ctx.lineTo(cx + cell - m, cy + cell - m);
          ctx.moveTo(cx + cell - m, cy + m);
          ctx.lineTo(cx + m, cy + cell - m);
          ctx.stroke();
        }
      }
    }
  };

  const faceTextures = {};
  const materials = ORDER.map((key) => {
    const canvas = document.createElement("canvas");
    canvas.width = texSize;
    canvas.height = texSize;
    const ctx = canvas.getContext("2d");
    drawFace(ctx, key);
    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    texture.needsUpdate = true;
    faceTextures[key] = { ctx, texture };
    return new THREE.MeshStandardMaterial({ map: texture });
  });

  const cube = new THREE.Mesh(new THREE.BoxGeometry(CFG.cube[0], CFG.cube[0], CFG.cube[0]), materials);
  scene.add(cube);
  const rim = new THREE.Mesh(
    new THREE.BoxGeometry(CFG.cube[1], CFG.cube[1], CFG.cube[1]),
    new THREE.MeshStandardMaterial({ color: 0x0b0f14, metalness: 0.05, roughness: 0.8, opacity: 0.35, transparent: true })
  );
  scene.add(rim);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  const redraw = (keys) => {
    for (const key of keys) {
      drawFace(faceTextures[key].ctx, key);
      faceTextures[key].texture.needsUpdate = true;
    }
  };

  const scoreFace = (key) => {
    const state = faceState[key];
    let changed = false;
    for (let i = 0; i < LINES.length; i++) {
      const [a, b, c] = LINES[i];
      const v = state[a];
      if (v && v === state[b] && v === state[c]) {
        const tag = `${key}-${i}-${v}`;
        if (!scored.has(tag)) {
          scored.add(tag);
          scores[v] += 1;
          changed = true;
        }
      }
    }
    if (changed && onScoreChange) onScoreChange({ o: scores[1], x: scores[2] });
  };

  const boardFull = () => ORDER.every((k) => !faceState[k].includes(0));

  const getIndexFromUV = (uv) => {
    const px = uv.x * texSize;
    const py = (1 - uv.y) * texSize;
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        const cx = pad + x * (cell + gap);
        const cy = pad + y * (cell + gap);
        if (px >= cx && px <= cx + cell && py >= cy && py <= cy + cell) return y * 3 + x;
      }
    }
    return null;
  };

  const applyMove = (faceKey, idx) => {
    const group = LINK.get(`${faceKey}-${idx}`);
    const targets = group ?? [[faceKey, idx]];
    for (const [f, i] of targets) if (faceState[f][i] !== 0) return null;
    for (const [f, i] of targets) faceState[f][i] = current;
    return new Set(targets.map(([f]) => f));
  };

  const onPointerDown = (event) => {
    if (gameOver) return;
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObject(cube, false)[0];
    if (!hit?.uv || hit.faceIndex == null) return;

    const faceKey = ORDER[Math.floor(hit.faceIndex / 2)];
    const idx = getIndexFromUV(hit.uv);
    if (idx == null) return;

    const facesToRedraw = applyMove(faceKey, idx);
    if (!facesToRedraw) return;
    redraw(facesToRedraw);
    for (const f of facesToRedraw) scoreFace(f);

    if (boardFull()) {
      gameOver = true;
      if (onGameEnd) {
        const winner = scores[1] === scores[2] ? 0 : scores[1] > scores[2] ? 1 : 2;
        onGameEnd({ winner, scores: { o: scores[1], x: scores[2] } });
      }
      return;
    }

    current = current === 1 ? 2 : 1;
    if (onTurnChange) onTurnChange(current);
  };

  const onResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };

  const reset = () => {
    for (const key of ORDER) faceState[key].fill(0);
    redraw(new Set(ORDER));
    current = 1;
    gameOver = false;
    scored.clear();
    scores[1] = 0;
    scores[2] = 0;
    onScoreChange?.({ o: 0, x: 0 });
    onTurnChange?.(current);
    onReset?.();
  };

  renderer.domElement.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("resize", onResize);
  resetButton?.addEventListener("click", reset);

  const animate = () => {
    requestAnimationFrame(animate);
    rim.rotation.copy(cube.rotation);
    controls.update();
    renderer.render(scene, camera);
  };
  animate();
  onTurnChange?.(current);

  return {
    scene,
    camera,
    renderer,
    cube,
    reset,
    dispose() {
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("resize", onResize);
    },
  };
}
