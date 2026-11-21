import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export function createStage(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;

  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  camera.position.set(0, 4.4, 7.6);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxPolarAngle = Math.PI / 2 - 0.02;
  controls.minDistance = 3;
  controls.maxDistance = 30;
  controls.enablePan = false;

  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8a90, 0.7));
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(3.5, 9, 5.5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  key.shadow.radius = 5;
  Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 24 });
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.5);
  fill.position.set(-5, 4, -3);
  scene.add(fill);

  // 圆台：桌面在 y = 0
  const tableMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3c, roughness: 0.92 });
  const table = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.2, 0.3, 96), tableMat);
  table.position.y = -0.15;
  table.receiveShadow = true;
  scene.add(table);
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(5.2, 0.03, 8, 128),
    new THREE.MeshStandardMaterial({ color: 0x8e8e93, roughness: 0.4, metalness: 0.6 }),
  );
  rim.rotation.x = Math.PI / 2;
  scene.add(rim);

  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    // 窄屏时拉远一点，保证整张桌面入镜
    camera.fov = w / h < 1 ? 52 : 36;
    // 画面整体上移一点，给底部的解说卡片让位
    camera.setViewOffset(w, h, 0, h * 0.1, w, h);
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(container);
  resize();

  let fly = null;
  function flyTo({ pos, target }, dur = 0.9) {
    // 竖屏时水平视野窄，按比例把机位拉远，保证道具都在画面里
    const k = Math.max(1, 0.64 /(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect));
    const q1 = new THREE.Vector3(...target);
    fly = {
      t: 0, dur,
      p0: camera.position.clone(), p1: new THREE.Vector3(...pos).sub(q1).multiplyScalar(k).add(q1),
      q0: controls.target.clone(), q1,
    };
  }
  renderer.domElement.addEventListener('pointerdown', () => (fly = null));

  function render(dt) {
    if (fly) {
      fly.t = Math.min(1, fly.t + dt / fly.dur);
      const k = 1 - Math.pow(1 - fly.t, 3);
      camera.position.lerpVectors(fly.p0, fly.p1, k);
      controls.target.lerpVectors(fly.q0, fly.q1, k);
      if (fly.t >= 1) fly = null;
    }
    controls.update();
    renderer.render(scene, camera);
  }

  function setTheme(dark) {
    scene.background = new THREE.Color(dark ? 0x000000 : 0xf5f5f7);
    tableMat.color.setHex(dark ? 0x2c2c2e : 0x3a3a3c);
  }

  return { scene, camera, renderer, flyTo, render, setTheme };
}
