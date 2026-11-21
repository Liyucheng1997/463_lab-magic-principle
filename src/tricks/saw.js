import * as THREE from 'three';

// 人体切割：箱子里其实有两个人。
function limb(a, b, r, mat) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, A.distanceTo(B), 6, 14), mat);
  m.position.copy(A).add(B).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  return m;
}

export default {
  id: 'saw',
  name: '人体切割',
  tag: '大型幻术',
  blurb: '把助手锯成两半再拼回去',
  keys: ['箱子里有两个人', '台面比看上去厚', '锯片落在两人之间'],
  camera: { pos: [0, 3.4, 9.2], target: [0, 1.4, 0] },

  build(ctx) {
    const { tl, root } = ctx;
    const boxMat = new THREE.MeshStandardMaterial({ color: 0x0071e3, roughness: 0.45 });
    const slabMat = new THREE.MeshStandardMaterial({ color: 0x1d1d1f, roughness: 0.6 });
    const metal = new THREE.MeshStandardMaterial({ color: 0xd9d9de, metalness: 1, roughness: 0.25 });
    const skin = new THREE.MeshStandardMaterial({ color: 0xe8b999, roughness: 0.62 });
    const hair = new THREE.MeshStandardMaterial({ color: 0x1d1d1f, roughness: 0.8 });
    const bodyA = new THREE.MeshStandardMaterial({ color: 0x30a0ff, roughness: 0.7 });
    const bodyB = new THREE.MeshStandardMaterial({ color: 0xff9f0a, roughness: 0.7 });
    const shoe = new THREE.MeshStandardMaterial({ color: 0xd70015, roughness: 0.4 });
    ctx.ghost(boxMat, 0.16);
    ctx.ghost(slabMat, 0.3);

    const half = (dir) => {
      const g = new THREE.Group();
      const box = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.8, 0.9), boxMat);
      box.position.set(dir * 0.8, 1.5, 0);
      const slab = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.25, 1.1), slabMat);
      slab.position.set(dir * 0.85, 0.975, 0);
      g.add(box, slab);
      for (const x of [0.25, 1.45]) for (const z of [-0.42, 0.42]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.85, 12), metal);
        leg.position.set(dir * x, 0.425, z);
        g.add(leg);
      }
      return g;
    };
    const GL = half(-1), GR = half(1);

    // 助手 A：头露在左端，整个人蜷在左半箱里
    const head = new THREE.Group();
    head.position.set(-1.62, 1.55, 0);
    const face = new THREE.Mesh(new THREE.SphereGeometry(0.22, 28, 20), skin);
    face.position.x = -0.25;
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.235, 28, 20, 0, Math.PI * 2, 0, 1.9), hair);
    cap.position.x = -0.27;
    cap.rotation.z = 0.9;
    head.add(face, cap, limb([-0.1, 0, 0], [0.1, 0, 0], 0.08, skin));
    GL.add(head, limb([-1.42, 1.45, 0], [-0.82, 1.4, 0], 0.19, bodyA));
    for (const z of [-0.14, 0.14]) {
      GL.add(
        limb([-0.75, 1.42, z], [-1.12, 1.68, z], 0.11, bodyA),
        limb([-1.12, 1.68, z], [-0.5, 1.62, z], 0.09, bodyA),
      );
    }

    // 助手 B：只有一双脚露在右端，身体折叠在右半箱和台面里
    const feet = new THREE.Group();
    feet.position.set(1.62, 1.5, 0);
    for (const z of [-0.15, 0.15]) feet.add(limb([0.08, 0, z], [0.3, 0.04, z], 0.1, shoe));
    GR.add(feet);
    for (const z of [-0.15, 0.15]) {
      GR.add(
        limb([1.48, 1.52, z], [0.95, 1.66, z], 0.09, bodyB),
        limb([0.95, 1.66, z], [0.4, 1.52, z], 0.11, bodyB),
      );
    }
    GR.add(limb([0.36, 1.33, 0], [0.98, 1.3, 0], 0.17, bodyB));
    const headB = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 16), skin);
    headB.position.set(1.3, 1.32, 0);
    GR.add(headB);

    const blade = new THREE.Group();
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.3, 1.2), metal);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 1.3), slabMat.clone());
    grip.position.y = 0.7;
    blade.add(plate, grip);
    blade.position.set(0, 3.6, 0);
    root.add(GL, GR, blade);

    const wiggle = (obj, amp, n) => {
      for (let i = 0; i < n; i++) {
        tl.to(obj, { rz: i % 2 ? -amp : amp }, 0.25);
        tl.wait(0.25);
      }
      tl.to(obj, { rz: 0 }, 0.2);
      tl.wait(0.3);
    };

    tl.step(
      '助手躺进箱子',
      '助手躺进长箱，头从一端伸出来，脚从另一端伸出来，还朝你动了动。',
      '她一进箱就把腿蜷到了胸前（蓝色）。另一端那双脚属于第二位助手（橙色），她早就藏在加厚的台面里。',
    );
    tl.wait(0.8);
    wiggle(head, 0.25, 4);
    wiggle(feet, 0.3, 4);
    tl.wait(0.8);

    tl.step(
      '锯片落下',
      '一块钢板从正中间切下去，把箱子连人一起切断。',
      '锯片落下的位置正好是两个人之间的空当，谁也碰不到。',
    );
    tl.to(blade, { y: 1.75 }, 1.1, { ease: 'in' });
    tl.wait(2.0);
    tl.to(blade, { y: 3.6 }, 0.8);
    tl.wait(1.0);

    tl.step(
      '一分为二',
      '两半箱子被推开，中间空空荡荡。头还在笑，脚还在动。',
      '两半箱子里各有一个完整的人，分开多远都没关系。',
    );
    tl.to(GL, { x: -1.0 }, 1.2);
    tl.to(GR, { x: 1.0 }, 1.2);
    tl.wait(1.5);
    wiggle(feet, 0.3, 4);
    wiggle(head, 0.25, 4);
    tl.wait(0.8);

    tl.step(
      '拼回去',
      '两半箱子重新合拢，助手朝你点点头，完好无损。',
      '合拢之后，第二位助手缩回台面，第一位伸直双腿起身。观众始终只见过一个人。',
    );
    tl.to(GL, { x: 0 }, 1.2);
    tl.to(GR, { x: 0 }, 1.2);
    tl.wait(1.5);
    wiggle(head, 0.2, 2);
    tl.wait(2.2);
  },
};
