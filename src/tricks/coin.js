import * as THREE from 'three';
import { makeHand, moveHand } from '../hand.js';

// 法式落币：看上去硬币被右手拿走，其实落回了左手。
const TIPC = new THREE.Vector3(0, -0.42, 0.38); // 指尖捏币
const PALMC = new THREE.Vector3(0, -0.17, 0.1); // 掌心藏币

export default {
  id: 'coin',
  name: '硬币消失',
  tag: '近景手法',
  blurb: '握进手里的硬币，一吹就没了',
  keys: ['法式落币', '错误引导', '空手握拳'],
  camera: { pos: [0, 3.6, 8.6], target: [0, 1.5, 0] },

  build(ctx) {
    const { tl, root } = ctx;
    const LH = makeHand(-1, { x: -0.5, y: 1.3, z: 0.5, c: 0.35 });
    LH.rotation.z = Math.PI; // 掌心朝上
    const RH = makeHand(1, { x: 2.7, y: 1.3, z: 0.5, c: 0.3 });
    [...RH.userData.mats, ...LH.userData.mats].forEach((m) => ctx.ghost(m, 0.26));

    const coin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 0.035, 48),
      new THREE.MeshStandardMaterial({ color: 0xe0b040, metalness: 1, roughness: 0.28 }),
    );
    coin.rotation.x = Math.PI / 2;
    coin.position.set(-0.5, 1.72, 0.88);
    ctx.secret(coin);
    root.add(LH, RH, coin);

    const H = (hand, props, dur, carried, opt) => moveHand(tl, hand, props, dur, carried, opt);

    tl.step(
      '一枚硬币',
      '左手指尖捏着一枚硬币，正面朝你。',
      '此刻没有任何机关。关键在下一步两只手交接的那半秒。',
    );
    tl.wait(0.8);
    H(LH, { y: 1.45 }, 0.5, [[coin, TIPC]]);
    tl.wait(0.5);
    H(LH, { y: 1.3 }, 0.5, [[coin, TIPC]]);
    tl.wait(1.2);

    tl.step(
      '右手来拿',
      '右手伸过来握住硬币，把它拿走。',
      '右手手指挡住硬币的瞬间，左手拇指一松，硬币落进左手掌心。右手握走的只是空气。',
    );
    H(RH, { x: -0.42, y: 2.02, z: 0.58, c: 0.25 }, 0.8);
    tl.wait(0.85);
    H(RH, { c: 0.95 }, 0.3);
    tl.to(coin, { p: 1 }, 0, { at: 0.12 });
    tl.to(coin, { x: -0.5, y: 1.47, z: 0.6, rx: 0 }, 0.25, { at: 0.05 });
    tl.wait(0.5);
    H(RH, { x: 1.3, y: 1.8, z: 0.7 }, 0.8);
    H(LH, { x: -1.6, y: 0.95, z: 0.6, rz: 1.9, c: 0.6 }, 0.9, [[coin, PALMC]]);
    tl.wait(1.3);

    tl.step(
      '吹一口气',
      '右手举高，搓一搓，慢慢张开：硬币不见了。',
      '你的目光一直跟着右手走，这就是错误引导。硬币躺在自然垂下的左手里，没人去看它。',
    );
    H(RH, { x: 1.2, y: 2.15, z: 0.7 }, 0.5);
    tl.wait(0.6);
    for (const dx of [0.12, -0.12, 0.1, 0]) {
      H(RH, { x: 1.2 + dx }, 0.16);
      tl.wait(0.16);
    }
    tl.wait(0.3);
    H(RH, { c: 0, rz: Math.PI }, 0.6);
    tl.wait(1.8);

    tl.step(
      '从空中抓回来',
      '左手往空中一抓，硬币又回到了指尖。',
      '左手把掌心的硬币推到指尖，看上去像是凭空抓出来的。它其实从没离开过这只手。',
    );
    H(LH, { x: -2.0, y: 2.3, z: 0.4, rz: Math.PI, c: 0.35 }, 0.8, [[coin, PALMC]]);
    H(RH, { x: 2.4, y: 1.4, z: 0.5, rz: 0, c: 0.3 }, 0.8);
    tl.wait(0.8);
    tl.to(coin, { x: -2.0, y: 2.72, z: 0.78, rx: Math.PI / 2 }, 0.25);
    tl.to(coin, { p: 0 }, 0, { at: 0.12 });
    tl.wait(0.7);
    H(LH, { x: -0.6, y: 1.5, z: 0.6 }, 0.8, [[coin, TIPC]]);
    tl.wait(2.4);
  },
};
