import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/controls/OrbitControls.js";
import {
  VRMUtils,
  VRMLoaderPlugin,
} from "https://cdn.jsdelivr.net/npm/@pixiv/three-vrm@3.4.0/lib/three-vrm.module.js";

const canvas = document.getElementById("vrmCanvas");
const isFittingRoom = !!document.querySelector(".stage") && !document.querySelector(".vrm-stage");
const stage =
  document.querySelector(".vrm-stage") ||
  document.querySelector(".stage") ||
  canvas.parentElement ||
  document.body;
const hint = document.getElementById("vrmHint");
const setHint = (text) => {
  if (!hint) return;
  hint.classList.add("show");
  hint.textContent = text;
  console.log("[vrm:hint]", text);
};
if (hint) {
  hint.classList.add("show");
  hint.textContent = "VRM 加载中...";
}
const config = (window.MONDAY_CONFIG && window.MONDAY_CONFIG.vrm) || {};
const OFFSET_KEY = "monday_vrm_offset";
const LOCKED_OFFSET_KEY = "monday_vrm_offset_locked";
const MOVE_ENABLED_KEY = "monday_vrm_move_enabled";

let renderer = null;
try {
  renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
  });
} catch (error) {
  if (hint) {
    setHint(`WebGL 初始化失败：${error.message || error}`);
  }
  throw error;
}
const pixelRatioMax = config.pixelRatioMax || 1.5;
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelRatioMax));
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();

const cameraConfig = config.camera || {};
const camera = new THREE.PerspectiveCamera(cameraConfig.fov || 28, 1, 0.1, 100);
camera.position.set(...(cameraConfig.position || [0, 1.6, 2.0]));

const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = false;
controls.enableZoom = true;
controls.enableRotate = true;
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 1.2;
controls.maxDistance = 4.0;
controls.enabled = true;

const zoomReadout = document.getElementById("zoomReadout");
const updateZoomReadout = () => {
  if (!zoomReadout) return;
  const dist = controls.getDistance();
  zoomReadout.textContent = `距离: ${dist.toFixed(2)}`;
  console.log("[vrm:zoom]", dist.toFixed(2));
};
const defaultDistance = 2.35;
const applyDefaultDistance = () => {
  const dir = camera.position.clone().sub(controls.target).normalize();
  camera.position.copy(controls.target).add(dir.multiplyScalar(defaultDistance));
  camera.updateProjectionMatrix();
  controls.update();
  updateZoomReadout();
};

renderer.domElement.style.pointerEvents = "auto";
if (stage && stage.style) {
  stage.style.pointerEvents = "auto";
}
setHint("拖拽旋转 · 滚轮缩放 · WASD 移动");
renderer.domElement.addEventListener("pointerdown", () => {
  renderer.domElement.style.cursor = "grabbing";
});
renderer.domElement.addEventListener("pointerup", () => {
  renderer.domElement.style.cursor = "grab";
});
renderer.domElement.addEventListener(
  "wheel",
  () => {
    updateZoomReadout();
  },
  { passive: true }
);


const persistOffset = () => {
  try {
    window.localStorage.setItem(
      OFFSET_KEY,
      JSON.stringify([MODEL_OFFSET.x, MODEL_OFFSET.y, MODEL_OFFSET.z])
    );
  } catch {
    // ignore storage failures
  }
};

const persistLockedOffset = () => {
  try {
    window.localStorage.setItem(
      LOCKED_OFFSET_KEY,
      JSON.stringify([LOCKED_OFFSET.x, LOCKED_OFFSET.y, LOCKED_OFFSET.z])
    );
  } catch {
    // ignore storage failures
  }
};

const updateReadout = () => {
  const readout = document.getElementById("offsetReadout");
  if (!readout) return;
  readout.textContent = `offset: (${MODEL_OFFSET.x.toFixed(2)}, ${MODEL_OFFSET.y.toFixed(2)}, ${MODEL_OFFSET.z.toFixed(2)})`;
};

const updateButtons = () => {
  const btn = document.getElementById("moveToggleBtn");
  if (!btn) return;
  btn.textContent = moveEnabled ? "关闭位移" : "开启位移";
};

const updateMoveEnabled = (enabled) => {
  moveEnabled = enabled;
  try {
    window.localStorage.setItem(MOVE_ENABLED_KEY, String(enabled));
  } catch {
    // ignore storage failures
  }
  if (!moveEnabled) {
    MODEL_OFFSET.copy(LOCKED_OFFSET);
    persistOffset();
  }
  updateReadout();
  updateButtons();
};

const initDebugPanel = () => {
  const moveBtn = document.getElementById("moveToggleBtn");
  const saveBtn = document.getElementById("saveOffsetBtn");
  if (moveBtn) {
    moveBtn.addEventListener("click", () => {
      updateMoveEnabled(!moveEnabled);
    });
  }
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      LOCKED_OFFSET.copy(MODEL_OFFSET);
      persistLockedOffset();
      updateMoveEnabled(false);
    });
  }
  updateButtons();
  updateReadout();
};

window.addEventListener("keydown", (event) => {
  if (!moveEnabled) return;
  if (event.target && ["INPUT", "TEXTAREA"].includes(event.target.tagName)) {
    return;
  }
  const step = event.shiftKey ? 0.08 : 0.03;
  switch (event.key.toLowerCase()) {
    case "w":
      MODEL_OFFSET.y += step;
      break;
    case "s":
      MODEL_OFFSET.y -= step;
      break;
    case "a":
      MODEL_OFFSET.x -= step;
      break;
    case "d":
      MODEL_OFFSET.x += step;
      break;
    default:
      return;
  }
  persistOffset();
  updateReadout();
});

const leftArmPad = document.getElementById("leftArmPad");
const rightArmPad = document.getElementById("rightArmPad");
let leftArmDrag = false;
let rightArmDrag = false;
let leftArmBaseX = 0;
let rightArmBaseX = 0;
let leftArmStartX = 0;
let rightArmStartX = 0;
let leftArmStartY = 0;
let rightArmStartY = 0;

const attachArmControls = () => {
  const leftUpperArm = currentVrm?.humanoid?.getNormalizedBoneNode("leftUpperArm");
  const rightUpperArm = currentVrm?.humanoid?.getNormalizedBoneNode("rightUpperArm");
  const leftLowerArm = currentVrm?.humanoid?.getNormalizedBoneNode("leftLowerArm");
  const rightLowerArm = currentVrm?.humanoid?.getNormalizedBoneNode("rightLowerArm");
  if (!leftUpperArm || !rightUpperArm) return;

  const startDrag = (side, event) => {
    event.preventDefault();
    if (side === "left") {
      leftArmDrag = true;
      leftArmStartX = leftUpperArm.rotation.y;
      leftArmStartY = event.clientY;
      leftArmPad?.classList.add("active");
    } else {
      rightArmDrag = true;
      rightArmStartX = rightUpperArm.rotation.y;
      rightArmStartY = event.clientY;
      rightArmPad?.classList.add("active");
    }
  };

  const stopDrag = () => {
    leftArmDrag = false;
    rightArmDrag = false;
    leftArmPad?.classList.remove("active");
    rightArmPad?.classList.remove("active");
  };

  const onMove = (event) => {
    if (!leftArmDrag && !rightArmDrag) return;
    if (leftArmDrag && leftUpperArm) {
      const dy = event.clientY - leftArmStartY;
      const next = THREE.MathUtils.clamp(leftArmStartX + dy * 0.01, -1.4, 0.6);
      leftUpperArm.rotation.y = next;
      if (leftLowerArm) {
        leftLowerArm.rotation.y = THREE.MathUtils.clamp(next * 0.4, -0.6, 0.4);
      }
    }
    if (rightArmDrag && rightUpperArm) {
      const dy = event.clientY - rightArmStartY;
      const next = THREE.MathUtils.clamp(rightArmStartX + dy * 0.01, -0.6, 1.4);
      rightUpperArm.rotation.y = next;
      if (rightLowerArm) {
        rightLowerArm.rotation.y = THREE.MathUtils.clamp(next * 0.4, -0.4, 0.6);
      }
    }
  };

  leftArmPad?.addEventListener("pointerdown", (e) => startDrag("left", e));
  rightArmPad?.addEventListener("pointerdown", (e) => startDrag("right", e));
  window.addEventListener("pointerup", stopDrag);
  window.addEventListener("pointermove", onMove);
};

const ambient = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambient);

const keyLight = new THREE.DirectionalLight(0xfff1e6, 1.2);
keyLight.position.set(1.2, 2.8, 2.2);
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0x5de8ff, 0.8);
rimLight.position.set(-1.8, 1.6, -1.6);
scene.add(rimLight);

let currentVrm = null;
let modelBasePosition = new THREE.Vector3(0, 0, 0);
const clock = new THREE.Clock();
const modelConfig = config.model || {};
const readStoredVector = (key) => {
  try {
    return JSON.parse(window.localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
};
const baseOffset = modelConfig.offset || [0, 0, 0];
const lockedOffset = readStoredVector(LOCKED_OFFSET_KEY) || baseOffset;
const storedOffset = readStoredVector(OFFSET_KEY) || lockedOffset;
const MODEL_OFFSET = new THREE.Vector3(...storedOffset);
const LOCKED_OFFSET = new THREE.Vector3(...lockedOffset);
let moveEnabled = window.localStorage.getItem(MOVE_ENABLED_KEY) === "true";
const MODEL_Y_ROTATION = modelConfig.yRotation ?? 0;
const MODEL_BASE_Y_ROTATION = MODEL_Y_ROTATION;
const SHOULDER_ROT_KEY = "monday_vrm_shoulder_rot";

const resetShoulderRot = () => {
  try {
    window.localStorage.removeItem(SHOULDER_ROT_KEY);
  } catch {
    // ignore
  }
};

const loader = new GLTFLoader();
loader.register((parser) => new VRMLoaderPlugin(parser));

const applyIdlePose = (vrm) => {
  const humanoid = vrm.humanoid;
  if (!humanoid) return;

  // Get the arm bones
  const leftUpperArm = humanoid.getNormalizedBoneNode("leftUpperArm");
  const rightUpperArm = humanoid.getNormalizedBoneNode("rightUpperArm");
  const leftLowerArm = humanoid.getNormalizedBoneNode("leftLowerArm");
  const rightLowerArm = humanoid.getNormalizedBoneNode("rightLowerArm");

  // Rotate the arms down and slightly out to avoid clipping
  if (leftUpperArm) {
    leftUpperArm.rotation.x = -0.2;  // A bit forward
    leftUpperArm.rotation.y = -0.2;  // A bit out
    leftUpperArm.rotation.z = -1.5; // Rotate down
  }
  if (rightUpperArm) {
    rightUpperArm.rotation.x = -0.2;  // A bit forward
    rightUpperArm.rotation.y = 0.2;   // A bit out
    rightUpperArm.rotation.z = 1.5;  // Rotate down
  }
  if (leftLowerArm) {
    leftLowerArm.rotation.z = -0.2;
  }
  if (rightLowerArm) {
    rightLowerArm.rotation.z = 0.2;
  }
};

const loadModel = () => {
  const modelUrl = config.modelUrl || "./models/monday.vrm";
  loader.load(
    modelUrl,
    (gltf) => {
      const vrm = gltf.userData.vrm;
      VRMUtils.removeUnnecessaryVertices(gltf.scene);

      currentVrm = vrm;
      vrm.scene.rotation.y = MODEL_Y_ROTATION;
      resetShoulderRot();
      applyIdlePose(vrm);

      const box = new THREE.Box3().setFromObject(vrm.scene);
      const size = box.getSize(new THREE.Vector3());
      const targetHeight = config.targetHeight || 1.9;
      const scale = targetHeight / size.y;
      vrm.scene.scale.setScalar(scale);

      box.setFromObject(vrm.scene);
      const center = box.getCenter(new THREE.Vector3());
      const scaledSize = box.getSize(new THREE.Vector3());
      vrm.scene.position.sub(center);
      vrm.scene.position.y += scaledSize.y / 2;
      modelBasePosition.copy(vrm.scene.position);
      vrm.scene.position.add(MODEL_OFFSET);

      const lookAtYRatio = cameraConfig.lookAtYRatio || 0.7;
      const headTarget = new THREE.Vector3(0, scaledSize.y * lookAtYRatio, 0);
      camera.lookAt(headTarget);
      controls.target.copy(headTarget);
      controls.update();
      applyDefaultDistance();
      scene.add(vrm.scene);

      if (hint) {
        hint.classList.remove("show");
        hint.textContent = "";
      }
    },
    undefined,
    (err) => {
      if (hint) {
        setHint(`VRM 加载失败：${err?.message || "请检查模型与路径"}`);
      }
    }
  );
};

const resize = () => {
  const width = stage.clientWidth;
  const height = stage.clientHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
};

new ResizeObserver(resize).observe(stage);
resize();
loadModel();

let running = true;

const animate = () => {
  if (!running) return;
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  const t = clock.elapsedTime;

  if (currentVrm) {
    const bob = Math.sin(t * 0.8) * 0.01;
    const sway = Math.sin(t * 0.3) * 0.04;
    currentVrm.scene.position.copy(modelBasePosition);
    currentVrm.scene.position.x = modelBasePosition.x + MODEL_OFFSET.x;
    currentVrm.scene.position.y = modelBasePosition.y + MODEL_OFFSET.y + bob;
    currentVrm.scene.position.z = modelBasePosition.z + MODEL_OFFSET.z;
    currentVrm.scene.rotation.y = MODEL_BASE_Y_ROTATION + sway;


    const neck = currentVrm.humanoid?.getNormalizedBoneNode("neck");
    if (neck) {
      neck.rotation.x = Math.sin(t * 0.6) * 0.05;
    }

    currentVrm.update(delta);
  }

  controls.update();
  updateZoomReadout();
  renderer.render(scene, camera);
};

const start = () => {
  if (running) return;
  running = true;
  clock.start();
  animate();
};

const stop = () => {
  running = false;
};

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stop();
  } else {
    start();
  }
});

initDebugPanel();
updateMoveEnabled(moveEnabled);

animate();
