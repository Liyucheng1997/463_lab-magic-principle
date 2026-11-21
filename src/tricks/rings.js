import * as THREE from 'three';
import { makeHand, moveHand } from '../hand.js';

// 中国连环：一只“钥匙环”带缺口，缺口始终握在手里。
const KX = 0.6, KY = 2.0; // 钥匙环圆心
const RR = 0.6, TUBE = 0.035, GAP = 0.3;
const HANG = 1.15; // 挂住时，完整环圆心到钥匙环圆心的距离

export default {
  id: 'rings',
  name: '中国连环',
  tag: '舞台经典',
  blurb: '两只完整的铁环互相穿过',
  keys: ['钥匙环上的缺口', '握住缺口的手不松', '只让观众检查完整的环'],
  camera: { pos: [0.2, 2.9, 9.8], target: [0.2, 2.2, 0] },

  build(ctx) {
    const { tl, root } = ctx;
    const steel = new THREE.MeshStandardMaterial({ color: 0xd9d9de, metalness: 1, roughness: 0.2 });

    const key = new THREE.Mesh(new THREE.TorusGeometry(RR, TUBE, 14, 120, Math.PI * 2 - GAP), steel);
    key.rotation.z = Math.PI / 2 + GAP / 2; // 缺口朝正上方
    key.position.set(KX, KY, 0);

    // 表演模式下把缺口补上（现实里它被手指挡住）；解密模式下露出缺口并标出两端
    const filler = new THREE.Mesh(new THREE.TorusGeometry(RR, TUBE, 14, 16, GAP), steel);
    filler.rotation.z = Math.PI / 2 - GAP / 2;
    filler.position.copy(key.position);
    const marks = new THREE.Group();
    for (const a of [Math.PI / 2 - GAP / 2, Math.PI / 2 + GAP / 2]) {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 16, 12),
        new THREE.MeshBasicMaterial({ color: 0x0a84ff }),
      );
      m.position.set(KX + RR * Math.cos(a), KY + RR * Math.sin(a), 0);
      m.userData.noShadow = true;
      marks.add(m);
    }
    ctx.onXray((on) => {
      filler.visible = !on;
      marks.visible = on;
    });

    // 完整的环挂在一个以钥匙环圆心为轴的支点上，转动支点 = 沿着钥匙环滑动
    const pivot = new THREE.Group();
    pivot.position.set(KX, KY, 0);
    pivot.rotation.z = Math.PI / 2;
    const solid = new THREE.Mesh(new THREE.TorusGeometry(RR, TUBE, 14, 120), steel);
    solid.position.set(0.3, 1.7, 0);
    pivot.add(solid);

    const RH = makeHand(1, { x: KX, y: KY + RR + 0.1, z: -0.12, c: 1 });
    const LH = makeHand(-1, { x: KX - 1.7, y: KY + 0.3 + 0.7, z: -0.12, c: 1 });
    [...RH.userData.mats, ...LH.userData.mats].forEach((m) => ctx.ghost(m, 0.26));
    root.add(key, filler, marks, pivot, RH, LH);

    const H = (hand, props, dur, opt) => moveHand(tl, hand, props, dur, [], opt);
    // 左手提着完整环的顶端，一起移动（支点在 90° 时：局部 x = 世界上方，局部 y = 世界左方）
    const carry = (lx, ly, dur, extra = {}) => {
      tl.to(solid, { x: lx, y: ly, ...extra }, dur);
      H(LH, { x: KX - ly, y: KY + lx + 0.7 }, dur);
    };

    tl.step(
      '两只铁环',
      '两只亮闪闪的铁环，各自完整，互相敲得叮当响。',
      '右手那只是“钥匙环”，上面有一道缺口，一直握在手心里。左手那只才是完整的。',
    );
    tl.wait(0.8);
    for (let i = 0; i < 2; i++) {
      carry(0.3, 1.22, 0.35);
      tl.wait(0.4);
      carry(0.3, 1.7, 0.35);
      tl.wait(0.6);
    }
    tl.wait(0.5);

    tl.step(
      '一敲就穿',
      '左手的环举到右手的环上方，往下一敲，穿了进去。',
      '钢铁没有被穿透，是完整的环从缺口滑了进去。缺口正好在握拳的位置，手指一松一合就过去了。',
    );
    carry(1.5, 0, 0.9, { rx: Math.PI / 2 });
    tl.wait(1.1);
    carry(0.9, 0, 0.3);
    tl.wait(0.8);

    tl.step(
      '套在一起',
      '左手松开，一只环挂在另一只上晃荡，怎么看都是套死的。',
      '握着缺口的右手始终不动。真要请观众检查，递出去的永远是完整的那只。',
    );
    H(LH, { x: -2.6, y: 1.8, z: 0.4, c: 0.35 }, 0.8);
    tl.to(solid, { x: HANG }, 0.8);
    tl.to(pivot, { rz: -Math.PI / 2 - 0.3 }, 0.8, { ease: 'in' });
    tl.wait(0.8);
    tl.to(pivot, { rz: -Math.PI / 2 + 0.18 }, 0.4);
    tl.wait(0.4);
    tl.to(pivot, { rz: -Math.PI / 2 - 0.08 }, 0.35);
    tl.wait(0.35);
    tl.to(pivot, { rz: -Math.PI / 2 }, 0.3);
    tl.wait(2.0);

    tl.step(
      '再解开',
      '左手捏住下面的环往上一带，两只环又分开了。',
      '原路返回：把完整的环转回缺口的位置，滑出来。整套连环术靠的就是这道缺口和一只不松开的手。',
    );
    const at = (phi, d = HANG) => ({
      x: KX + d * Math.cos(phi), y: KY + d * Math.sin(phi) + 0.12, z: 0.5,
    });
    H(LH, { ...at(-Math.PI / 2), c: 0.9 }, 0.7);
    tl.wait(0.9);
    for (let i = 1; i <= 4; i++) {
      const phi = -Math.PI / 2 + (i * Math.PI) / 4;
      tl.to(pivot, { rz: phi }, 0.3, { ease: 'lin' });
      H(LH, at(phi), 0.3, { ease: 'lin' });
      tl.wait(0.3);
    }
    tl.to(solid, { x: 1.6 }, 0.35);
    H(LH, at(Math.PI / 2, 1.6), 0.35);
    tl.wait(0.5);
    tl.to(solid, { x: 0.3, y: 1.7, rx: 0 }, 0.8);
    H(LH, { x: KX - 1.7, y: KY + 1.0, z: -0.12, c: 1 }, 0.8);
    tl.wait(2.6);
  },
};
