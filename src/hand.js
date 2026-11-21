import * as THREE from 'three';

// 手的局部坐标：掌心朝下，手指指向 +z（观众方向），小臂向后上方伸出。
export const PALM = new THREE.Vector3(0, -0.2, 0.1); // 掌心藏物的位置
export const TIP = new THREE.Vector3(0, -0.24, 0.4); // 指尖捏物的位置

function capsuleZ(r, len) {
  const g = new THREE.CapsuleGeometry(r, len, 6, 14);
  g.rotateX(Math.PI / 2);
  g.translate(0, 0, len / 2);
  return g;
}

/** sign = +1 画面右侧的手，-1 画面左侧的手（拇指都朝内） */
export function makeHand(sign, { x = 0, y = 1, z = 0, c = 0.4 } = {}) {
  const hand = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0xe8b999, roughness: 0.62 });
  const sleeve = new THREE.MeshStandardMaterial({ color: 0x1d1d1f, roughness: 0.85 });
  const cuff = new THREE.MeshStandardMaterial({ color: 0xf5f5f7, roughness: 0.7 });

  const palm = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), skin);
  palm.scale.set(0.33, 0.13, 0.37);
  hand.add(palm);

  const lens = [0.25, 0.29, 0.27, 0.21];
  const knuckles = [];
  for (let i = 0; i < 4; i++) {
    const L = lens[sign > 0 ? i : 3 - i];
    const p1 = new THREE.Group();
    p1.position.set(-0.225 + i * 0.15, 0, 0.27);
    p1.add(new THREE.Mesh(capsuleZ(0.07, L), skin));
    const p2 = new THREE.Group();
    p2.position.z = L + 0.03;
    p2.add(new THREE.Mesh(capsuleZ(0.064, L * 0.85), skin));
    p1.add(p2);
    hand.add(p1);
    knuckles.push([p1, p2]);
  }

  const thumb = new THREE.Group();
  thumb.position.set(-sign * 0.27, -0.03, -0.08);
  thumb.rotation.y = -sign * 0.85;
  thumb.add(new THREE.Mesh(capsuleZ(0.078, 0.3), skin));
  hand.add(thumb);

  const arm = new THREE.Group();
  arm.position.set(0, 0.02, -0.3);
  arm.rotation.x = Math.PI + 0.42;
  const cuffMesh = new THREE.Mesh(capsuleZ(0.19, 0.16), cuff);
  cuffMesh.position.z = 0.12;
  const sleeveMesh = new THREE.Mesh(capsuleZ(0.2, 2.6), sleeve);
  sleeveMesh.position.z = 0.36;
  arm.add(cuffMesh, sleeveMesh);
  hand.add(arm);

  hand.userData.mats = [skin, sleeve, cuff];
  hand.userData.c = c;
  hand.userData.onProp = (key, v) => {
    if (key !== 'c') return;
    for (const [p1, p2] of knuckles) {
      p1.rotation.x = 0.12 + v * 1.15;
      p2.rotation.x = 0.18 + v * 1.4;
    }
    thumb.rotation.x = v * 0.5;
  };
  hand.userData.onProp('c', c);
  // 翻掌（绕 z 轴转）时小臂不跟着甩，始终朝后上方
  arm.rotation.order = 'ZYX';
  hand.userData.onApply = () => (arm.rotation.z = -hand.rotation.z);
  hand.position.set(x, y, z);
  return hand;
}

/**
 * 移动手，并让 carried 里的物体保持在手的局部偏移处一起走。
 * carried: [[object, Vector3 偏移], ...]
 */
export function moveHand(tl, hand, props, dur = 0.6, carried = [], opt = {}) {
  tl.to(hand, props, dur, opt);
  const g = (k) => tl.get(hand, k);
  const e = new THREE.Euler(g('rx'), g('ry'), g('rz'), hand.rotation.order);
  for (const [obj, off] of carried) {
    const v = off.clone().applyEuler(e);
    tl.to(obj, { x: g('x') + v.x, y: g('y') + v.y, z: g('z') + v.z }, dur, opt);
  }
}
