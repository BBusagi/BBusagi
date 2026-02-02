import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/loaders/GLTFLoader.js";
import {
  VRMUtils,
  VRMLoaderPlugin,
} from "https://cdn.jsdelivr.net/npm/@pixiv/three-vrm@3.4.0/lib/three-vrm.module.js";

const canvas = document.getElementById("vrmCanvas");
const stage = document.querySelector(".vrm-stage");
const hint = document.getElementById("vrmHint");

const renderer = new THREE.WebGLRenderer({
  canvas,
  alpha: true,
  antialias: true,
});
renderer.setPixelRatio(window.devicePixelRatio || 1);
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
camera.position.set(0, 1.6, 2.0);

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
const MODEL_OFFSET = new THREE.Vector3(0, 0, 0);
const MODEL_Y_ROTATION = 0;
const MODEL_BASE_Y_ROTATION = MODEL_Y_ROTATION;

const loader = new GLTFLoader();
loader.register((parser) => new VRMLoaderPlugin(parser));

const loadModel = () => {
  const modelUrl = "./models/monday.vrm";
  loader.load(
    modelUrl,
    (gltf) => {
      const vrm = gltf.userData.vrm;
      VRMUtils.removeUnnecessaryVertices(gltf.scene);

      currentVrm = vrm;
      vrm.scene.rotation.y = MODEL_Y_ROTATION;

      const box = new THREE.Box3().setFromObject(vrm.scene);
      const size = box.getSize(new THREE.Vector3());
      const targetHeight = 1.9;
      const scale = targetHeight / size.y;
      vrm.scene.scale.setScalar(scale);

      box.setFromObject(vrm.scene);
      const center = box.getCenter(new THREE.Vector3());
      const scaledSize = box.getSize(new THREE.Vector3());
      vrm.scene.position.sub(center);
      vrm.scene.position.y += scaledSize.y / 2;
      vrm.scene.position.add(MODEL_OFFSET);

      const headTarget = new THREE.Vector3(0, scaledSize.y * 0.7, 0);
      camera.lookAt(headTarget);
      scene.add(vrm.scene);

      hint.classList.remove("show");
      hint.textContent = "";
    },
    undefined,
    () => {
      hint.classList.add("show");
      hint.textContent = "未找到 VRM：请放置 models/monday.vrm";
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

const animate = () => {
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

  renderer.render(scene, camera);
};

animate();
