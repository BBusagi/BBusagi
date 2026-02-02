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
};
if (hint) {
  hint.classList.add("show");
  hint.textContent = "VRM 加载中...";
}
const config = (window.MONDAY_CONFIG && window.MONDAY_CONFIG.vrm) || {};

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
controls.enabled = isFittingRoom;

renderer.domElement.style.pointerEvents = "auto";
if (stage && stage.style) {
  stage.style.pointerEvents = "auto";
}
if (isFittingRoom) {
  setHint("可滚轮缩放、拖拽旋转");
  renderer.domElement.addEventListener("pointerdown", () => {
    renderer.domElement.style.cursor = "grabbing";
  });
  renderer.domElement.addEventListener("pointerup", () => {
    renderer.domElement.style.cursor = "grab";
  });
  renderer.domElement.addEventListener("wheel", () => {
    setHint("滚轮缩放生效");
    clearTimeout(renderer.domElement.__hintTimer);
    renderer.domElement.__hintTimer = setTimeout(() => {
      setHint("可滚轮缩放、拖拽旋转");
    }, 1200);
  }, { passive: true });
}

const ambient = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambient);

const keyLight = new THREE.DirectionalLight(0xfff1e6, 1.2);
keyLight.position.set(1.2, 2.8, 2.2);
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0x5de8ff, 0.8);
rimLight.position.set(-1.8, 1.6, -1.6);
scene.add(rimLight);

let currentVrm = null;
const clock = new THREE.Clock();
const modelConfig = config.model || {};
const MODEL_OFFSET = new THREE.Vector3(...(modelConfig.offset || [0, 0, 0]));
const MODEL_Y_ROTATION = modelConfig.yRotation ?? 0;
const MODEL_BASE_Y_ROTATION = MODEL_Y_ROTATION;

const loader = new GLTFLoader();
loader.register((parser) => new VRMLoaderPlugin(parser));

const loadModel = () => {
  const modelUrl = config.modelUrl || "./models/monday.vrm";
  loader.load(
    modelUrl,
    (gltf) => {
      const vrm = gltf.userData.vrm;
      VRMUtils.removeUnnecessaryVertices(gltf.scene);

      currentVrm = vrm;
      vrm.scene.rotation.y = MODEL_Y_ROTATION;

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
      vrm.scene.position.add(MODEL_OFFSET);

      const lookAtYRatio = cameraConfig.lookAtYRatio || 0.7;
      const headTarget = new THREE.Vector3(0, scaledSize.y * lookAtYRatio, 0);
      camera.lookAt(headTarget);
      controls.target.copy(headTarget);
      controls.update();
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
    const bob = Math.sin(t * 0.8) * 0.02;
    const sway = Math.sin(t * 0.3) * 0.08;
    currentVrm.scene.position.y = bob;
    currentVrm.scene.rotation.y = MODEL_BASE_Y_ROTATION + sway;

    const neck = currentVrm.humanoid?.getNormalizedBoneNode("neck");
    if (neck) {
      neck.rotation.x = Math.sin(t * 0.6) * 0.05;
    }

    currentVrm.update(delta);
  }

  controls.update();
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

animate();
