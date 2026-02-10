import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/loaders/GLTFLoader.js";
import { FBXLoader } from "https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/loaders/FBXLoader.js";
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
let mixer = null;
let currentAction = null;
let hipsBasePosition = null;
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
const fbxLoader = new FBXLoader();

const applyIdlePose = (vrm) => {
  const humanoid = vrm.humanoid;
  if (!humanoid) return;
  humanoid.resetPose();
};

const loadModel = () => {
  const modelUrl = config.modelUrl || "./models/monday.vrm";
  loader.load(
    modelUrl,
    (gltf) => {
      const vrm = gltf.userData.vrm;
      VRMUtils.removeUnnecessaryVertices(gltf.scene);
      VRMUtils.combineSkeletons(gltf.scene);
      VRMUtils.combineMorphs(vrm);

      currentVrm = vrm;
      vrm.scene.rotation.y = MODEL_Y_ROTATION;
      resetShoulderRot();
      applyIdlePose(vrm);

      vrm.scene.traverse((obj) => {
        obj.frustumCulled = false;
      });

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
      const hips = currentVrm.humanoid?.getNormalizedBoneNode("hips");
      hipsBasePosition = hips ? hips.position.clone() : null;

      const lookAtYRatio = cameraConfig.lookAtYRatio || 0.7;
      const headTarget = new THREE.Vector3(0, scaledSize.y * lookAtYRatio, 0);
      camera.lookAt(headTarget);
      controls.target.copy(headTarget);
      controls.update();
      applyDefaultDistance();
      scene.add(vrm.scene);

      mixer = new THREE.AnimationMixer(vrm.scene);
      initAnimationPanel();

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

const initAnimationPanel = () => {
  const panel = document.getElementById("animPanel");
  if (!panel || !mixer) return;
  if (!autoListenerAttached) {
    mixer.addEventListener("finished", () => {
      if (!autoMode) return;
      scheduleNextAuto(autoRunId);
    });
    autoListenerAttached = true;
  }
  panel.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-anim]");
    if (!btn) return;
    const fileName = btn.getAttribute("data-anim");
    if (!fileName) return;
    if (fileName !== "__AUTO__") {
      stopAuto();
    }
    if (fileName === "__AUTO__") {
      if (autoMode) {
        stopAuto();
      } else {
        autoMode = true;
        autoRunId += 1;
        autoPool = buildAutoPool();
        if (!autoPool.length) {
          setHint("未找到可用动画");
          autoMode = false;
          return;
        }
        updateAutoButton(true);
        scheduleNextAuto(autoRunId, true);
      }
      return;
    }
    if (fileName === "__TPOSE__") {
      if (currentAction) {
        currentAction.fadeOut(0.2);
        currentAction = null;
      }
      currentVrm?.humanoid?.resetNormalizedPose();
      console.log("[vrm:anim] reset to T-pose");
      return;
    }
    playFbxAnimation(fileName);
  });
};

const MIXAMO_TO_VRM = {
  mixamorigHips: "hips",
  mixamorigSpine: "spine",
  mixamorigSpine1: "chest",
  mixamorigSpine2: "upperChest",
  mixamorigSpine3: "upperChest",
  mixamorigNeck: "neck",
  mixamorigHead: "head",
  mixamorigLeftShoulder: "leftShoulder",
  mixamorigLeftArm: "leftUpperArm",
  mixamorigLeftForeArm: "leftLowerArm",
  mixamorigLeftHand: "leftHand",
  mixamorigLeftHandThumb1: "leftThumbMetacarpal",
  mixamorigLeftHandThumb2: "leftThumbProximal",
  mixamorigLeftHandThumb3: "leftThumbDistal",
  mixamorigLeftHandIndex1: "leftIndexProximal",
  mixamorigLeftHandIndex2: "leftIndexIntermediate",
  mixamorigLeftHandIndex3: "leftIndexDistal",
  mixamorigLeftHandMiddle1: "leftMiddleProximal",
  mixamorigLeftHandMiddle2: "leftMiddleIntermediate",
  mixamorigLeftHandMiddle3: "leftMiddleDistal",
  mixamorigLeftHandRing1: "leftRingProximal",
  mixamorigLeftHandRing2: "leftRingIntermediate",
  mixamorigLeftHandRing3: "leftRingDistal",
  mixamorigLeftHandPinky1: "leftLittleProximal",
  mixamorigLeftHandPinky2: "leftLittleIntermediate",
  mixamorigLeftHandPinky3: "leftLittleDistal",
  mixamorigRightShoulder: "rightShoulder",
  mixamorigRightArm: "rightUpperArm",
  mixamorigRightForeArm: "rightLowerArm",
  mixamorigRightHand: "rightHand",
  mixamorigRightHandThumb1: "rightThumbMetacarpal",
  mixamorigRightHandThumb2: "rightThumbProximal",
  mixamorigRightHandThumb3: "rightThumbDistal",
  mixamorigRightHandIndex1: "rightIndexProximal",
  mixamorigRightHandIndex2: "rightIndexIntermediate",
  mixamorigRightHandIndex3: "rightIndexDistal",
  mixamorigRightHandMiddle1: "rightMiddleProximal",
  mixamorigRightHandMiddle2: "rightMiddleIntermediate",
  mixamorigRightHandMiddle3: "rightMiddleDistal",
  mixamorigRightHandRing1: "rightRingProximal",
  mixamorigRightHandRing2: "rightRingIntermediate",
  mixamorigRightHandRing3: "rightRingDistal",
  mixamorigRightHandPinky1: "rightLittleProximal",
  mixamorigRightHandPinky2: "rightLittleIntermediate",
  mixamorigRightHandPinky3: "rightLittleDistal",
  mixamorigLeftUpLeg: "leftUpperLeg",
  mixamorigLeftLeg: "leftLowerLeg",
  mixamorigLeftFoot: "leftFoot",
  mixamorigLeftToeBase: "leftToes",
  mixamorigRightUpLeg: "rightUpperLeg",
  mixamorigRightLeg: "rightLowerLeg",
  mixamorigRightFoot: "rightFoot",
  mixamorigRightToeBase: "rightToes",
};

const remapMixamoClipToVrm = (fbx, clip) => {
  if (!currentVrm) return clip;
  const tracks = [];
  const rigCache = new Map();
  const hipsSrc = fbx.getObjectByName("mixamorigHips");
  const hipsDst = currentVrm.humanoid?.getNormalizedBoneNode("hips");
  let hipsScale = 1;
  if (hipsSrc && hipsDst) {
    const srcPos = new THREE.Vector3();
    const dstPos = new THREE.Vector3();
    hipsSrc.getWorldPosition(srcPos);
    hipsDst.getWorldPosition(dstPos);
    const srcY = Math.max(0.001, Math.abs(srcPos.y));
    const dstY = Math.max(0.001, Math.abs(dstPos.y));
    hipsScale = dstY / srcY;
  }

  for (const track of clip.tracks) {
    const [srcName, prop] = track.name.split(".");
    const vrmBoneName = MIXAMO_TO_VRM[srcName];
    if (!vrmBoneName) continue;
    const srcNode = fbx.getObjectByName(srcName);
    const dstNode = currentVrm.humanoid?.getNormalizedBoneNode(vrmBoneName);
    if (!srcNode || !dstNode) continue;

    let cache = rigCache.get(srcName);
    if (!cache) {
      const restRotationInverse = new THREE.Quaternion();
      const parentRestWorldRotation = new THREE.Quaternion();
      srcNode.getWorldQuaternion(restRotationInverse).invert();
      if (srcNode.parent) {
        srcNode.parent.getWorldQuaternion(parentRestWorldRotation);
      } else {
        parentRestWorldRotation.identity();
      }
      cache = { restRotationInverse, parentRestWorldRotation };
      rigCache.set(srcName, cache);
    }

    if (prop === "position") {
      if (vrmBoneName !== "hips") continue;
      const posTrack = track.clone();
      posTrack.name = `${dstNode.name}.position`;
      for (let i = 0; i < posTrack.values.length; i += 3) {
        posTrack.values[i] *= hipsScale;
        posTrack.values[i + 1] *= hipsScale;
        posTrack.values[i + 2] *= hipsScale;
      }
      tracks.push(posTrack);
      continue;
    }

    if (prop === "quaternion") {
      const times = track.times;
      const values = track.values;
      const mapped = new Float32Array(values.length);
      const q = new THREE.Quaternion();
      for (let i = 0; i < values.length; i += 4) {
        q.set(values[i], values[i + 1], values[i + 2], values[i + 3]);
        q.premultiply(cache.parentRestWorldRotation).multiply(cache.restRotationInverse);
        mapped[i] = q.x;
        mapped[i + 1] = q.y;
        mapped[i + 2] = q.z;
        mapped[i + 3] = q.w;
      }
      const qTrack = new THREE.QuaternionKeyframeTrack(
        `${dstNode.name}.quaternion`,
        times,
        mapped
      );
      tracks.push(qTrack);
      continue;
    }

    if (prop === "rotation") {
      const times = track.times;
      const values = track.values;
      const mapped = new Float32Array((values.length / 3) * 4);
      const euler = new THREE.Euler();
      const q = new THREE.Quaternion();
      for (let i = 0, j = 0; i < values.length; i += 3, j += 4) {
        euler.set(values[i], values[i + 1], values[i + 2], "XYZ");
        q.setFromEuler(euler);
        q.premultiply(cache.parentRestWorldRotation).multiply(cache.restRotationInverse);
        mapped[j] = q.x;
        mapped[j + 1] = q.y;
        mapped[j + 2] = q.z;
        mapped[j + 3] = q.w;
      }
      const qTrack = new THREE.QuaternionKeyframeTrack(
        `${dstNode.name}.quaternion`,
        times,
        mapped
      );
      tracks.push(qTrack);
    }
  }
  return new THREE.AnimationClip(`${clip.name}_vrm`, clip.duration, tracks);
};

const playFbxAnimation = (fileName, options = {}) => {
  if (!currentVrm || !mixer) return;
  const url = `./animation/${encodeURIComponent(fileName)}`;
  fbxLoader.load(
    url,
    (fbx) => {
      if (options.autoRunId !== undefined) {
        if (!autoMode || options.autoRunId !== autoRunId) return;
      }
      const clip = fbx.animations && fbx.animations[0];
      if (!clip) {
        console.warn("[vrm:anim] no animation clip in", fileName);
        return;
      }
      const mapped = remapMixamoClipToVrm(fbx, clip);
      if (mapped.tracks.length === 0) {
        console.warn("[vrm:anim] no usable tracks after remap", fileName);
        return;
      }
      const prevAction = currentAction;
      currentAction = mixer.clipAction(mapped);
      if (options.loopOnce) {
        currentAction.setLoop(THREE.LoopOnce, 1);
        currentAction.clampWhenFinished = true;
      } else {
        currentAction.setLoop(THREE.LoopRepeat, Infinity);
        currentAction.clampWhenFinished = false;
      }
      currentAction.reset().play();
      if (prevAction && prevAction !== currentAction) {
        prevAction.crossFadeTo(currentAction, 0.25, false);
      } else {
        currentAction.fadeIn(0.2);
      }
      console.log("[vrm:anim] playing", fileName);
    },
    undefined,
    (err) => {
      console.error("[vrm:anim] failed to load", fileName, err);
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
let autoMode = false;
let autoTimer = null;
let autoPool = [];
let autoRunId = 0;
let autoListenerAttached = false;
let lastAutoFile = null;

const buildAutoPool = () => {
  const panel = document.getElementById("animPanel");
  if (!panel) return [];
  return Array.from(panel.querySelectorAll("[data-anim]"))
    .map((btn) => btn.getAttribute("data-anim"))
    .filter((fileName) => fileName && fileName !== "__TPOSE__" && fileName !== "__AUTO__");
};

const pickAutoFile = () => {
  if (!autoPool.length) return null;
  if (autoPool.length === 1) return autoPool[0];
  let next = autoPool[Math.floor(Math.random() * autoPool.length)];
  if (next === lastAutoFile) {
    next = autoPool[(autoPool.indexOf(next) + 1) % autoPool.length];
  }
  return next;
};

const updateAutoButton = (active) => {
  const panel = document.getElementById("animPanel");
  const autoBtn = panel?.querySelector('[data-anim="__AUTO__"]');
  if (!autoBtn) return;
  autoBtn.classList.toggle("is-active", active);
};

const stopAuto = () => {
  if (!autoMode) return;
  autoMode = false;
  autoRunId += 1;
  if (autoTimer) {
    clearTimeout(autoTimer);
    autoTimer = null;
  }
  updateAutoButton(false);
};

const scheduleNextAuto = (runId, immediate = false) => {
  if (!autoMode || runId !== autoRunId) return;
  if (autoTimer) {
    clearTimeout(autoTimer);
    autoTimer = null;
  }
  const delay = immediate ? 100 : 250 + Math.random() * 450;
  autoTimer = setTimeout(() => {
    if (!autoMode || runId !== autoRunId) return;
    const next = pickAutoFile();
    if (!next) {
      stopAuto();
      return;
    }
    lastAutoFile = next;
    playFbxAnimation(next, { loopOnce: true, autoRunId: runId });
  }, delay);
};

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

  if (mixer) {
    mixer.update(delta);
  }

  if (currentVrm && hipsBasePosition) {
    const hips = currentVrm.humanoid?.getNormalizedBoneNode("hips");
    if (hips) {
      hips.position.copy(hipsBasePosition);
    }
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
