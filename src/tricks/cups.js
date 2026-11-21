import * as THREE from 'three';
import { makeHand, moveHand, PALM, TIP } from '../hand.js';

// 三仙归洞：两只碗、三颗球，外加观众不知道的第四颗。
const BH = 0.55; // 碗高
const LX = -1.7, RX = 1.7; // 左右碗的位置
const BR = 0.16; // 球半径
const BACK = new THREE.Vector3(0, -0.1, -0.42); // 握碗时，球夹在碗背后的指缝里

function makeBowl(mat) {
  // 原点在碗底（倒扣时朝上的那一面），碗身向下展开
  const pts = [[0, 0], [0.3, 0], [0.31, -0.06], [0.37, -0.1], [0.55, -0.26], [0.67, -0.42], [0.72, -BH]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const bowl = new THREE.Mesh(new THREE.LatheGeometry(pts, 64), mat);
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.72, 0.018, 8, 64),
    new THREE.MeshStandardMaterial({ color: 0x0071e3, roughness: 0.3 }),
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = -BH + 0.01;
  const line = rim.clone();
  line.scale.setScalar(0.52);
  line.position.y = -0.1;
  bowl.add(rim, line);
  return bowl;
}

export default {
  id: 'cups',
  name: '三仙归洞',
  tag: '中国传统戏法',
  blurb: '三颗球隔空钻进同一只碗',
  keys: ['暗藏第四颗球', '假传与假放', '扣碗时带球入碗'],
  camera: { pos: [0, 5.2, 9.2], target: [0, 0.7, 0] },

  build(ctx) {
    const { tl, root } = ctx;

    const bowlMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff, roughness: 0.22, clearcoat: 0.6, side: THREE.DoubleSide,
    });
    ctx.ghost(bowlMat, 0.2);
    const bowlL = makeBowl(bowlMat), bowlR = makeBowl(bowlMat);
    bowlL.position.set(LX, BH, 0);
    bowlR.position.set(RX, BH, 0);

    const ballGeo = new THREE.SphereGeometry(BR, 32, 20);
    const makeBall = (x, z) => {
      const b = new THREE.Mesh(ballGeo, new THREE.MeshStandardMaterial({ color: 0xd70015, roughness: 0.45 }));
      b.position.set(x, BR, z);
      ctx.secret(b);
      return b;
    };
    const FZ = 1.3;
    const b1 = makeBall(-0.5, FZ), b2 = makeBall(0, FZ), b3 = makeBall(0.5, FZ);

    const HOME = { R: { x: 3.1, y: 1.1, z: 0.5, c: 0.45 }, L: { x: -3.1, y: 1.1, z: 0.5, c: 0.35 } };
    const RH = makeHand(1, HOME.R), LH = makeHand(-1, HOME.L);
    [...RH.userData.mats, ...LH.userData.mats].forEach((m) => ctx.ghost(m, 0.26));

    // 第四颗球：开场就藏在右手里。解密模式下染成橙色，方便一路追踪。
    const extra = makeBall(0, 0);
    extra.userData.p = 1;
    extra.position.copy(RH.position).add(PALM);
    ctx.onXray((on) => extra.material.color.setHex(on ? 0xff9f0a : 0xd70015));

    root.add(bowlL, bowlR, b1, b2, b3, extra, RH, LH);

    // 三颗球最终在右碗下的位置
    const REST = {
      extra: { x: RX + 0.2, y: BR, z: -0.08 },
      b1: { x: RX - 0.17, y: BR, z: -0.14 },
      b2: { x: RX, y: BR, z: 0.24 },
    };

    const H = (hand, props, dur, carried, opt) => moveHand(tl, hand, props, dur, carried, opt);
    const home = (hand, carried) =>
      H(hand, { ...(hand === RH ? HOME.R : HOME.L), rx: 0, ry: 0, rz: 0 }, 0.7, carried);
    const grip = (hand, bowl, carried) => {
      H(hand, { x: tl.get(bowl, 'x'), y: BH + 0.12, z: -0.05, c: 0.75 }, 0.6, carried);
      tl.wait(0.6);
    };
    // 放下碗；load = [球, 落点] 时顺势把手里的球带进碗底
    const setDown = (hand, bowl, carried, load) => {
      H(hand, { y: BH + 0.12, z: -0.05, rx: 0 }, 0.6, carried);
      tl.to(bowl, { y: BH, z: 0, rx: 0 }, 0.6);
      if (load) {
        tl.to(load[0], load[1], 0.5);
        tl.to(load[0], { p: 0 }, 0, { at: 0.6 });
      }
      tl.wait(0.75);
    };
    // 把碗口翻向观众，亮出碗里是空的
    const showInside = (hand, bowl, carried, load) => {
      grip(hand, bowl, carried);
      H(hand, { y: 1.95, z: 0.05, rx: -1.15 }, 0.6, carried);
      tl.to(bowl, { y: 1.8, z: 0.15, rx: -1.15 }, 0.6);
      tl.wait(1.4);
      setDown(hand, bowl, load ? [] : carried, load);
    };
    // 把碗提起来，露出桌面上的球
    const lift = (hand, bowl, carried) => {
      grip(hand, bowl, carried);
      H(hand, { y: BH + 1.42, z: -0.95 }, 0.6, carried);
      tl.to(bowl, { y: BH + 1.3, z: -0.9 }, 0.6);
      tl.wait(1.7);
    };

    // 假传：右手捏起球，假装放进左手，其实留在自己掌心
    const fakePass = (ball) => {
      const bx = tl.get(ball, 'x');
      H(RH, { x: bx, y: BR - TIP.y, z: FZ - TIP.z, c: 0.6 }, 0.6);
      tl.wait(0.65);
      H(LH, { x: -0.35, y: 1.0, z: 0.9, rz: Math.PI, c: 0.1 }, 0.7);
      H(RH, { x: 0.5, y: 1.5, z: 0.9 }, 0.7, [[ball, TIP]]);
      tl.wait(0.7);
      H(RH, { x: -0.3, y: 1.42, z: 0.75 }, 0.45, [[ball, TIP]]);
      tl.wait(0.45);
      tl.to(ball, { p: 1 }, 0, { at: 0.1 });
      H(RH, { c: 0.5 }, 0.3, [[ball, PALM]]);
      tl.to(LH, { c: 1 }, 0.3);
      tl.wait(0.4);
      H(RH, { x: 1.4, y: 1.2, z: 0.7 }, 0.6, [[ball, PALM]]);
      H(LH, { x: -0.7, y: 1.3, z: 0.9 }, 0.6);
      tl.wait(0.9);
    };
    // 左手一扬、张开：球“消失”
    const vanish = () => {
      H(LH, { x: 0.1, y: 1.6, z: 0.7 }, 0.45);
      tl.wait(0.45);
      H(LH, { x: 0.45, y: 1.45, c: 0 }, 0.3);
      tl.wait(1.0);
      home(LH);
    };

    // ---- 1 ----
    tl.step(
      '亮碗',
      '两只碗扣在桌上，面前摆着三颗球。魔术师把碗一只只翻开给你看：里面什么都没有。',
      '右手指缝里一开始就夹着第四颗球（橙色）。扣回右碗的那一下，它被顺势带进了碗底。',
    );
    tl.wait(0.8);
    showInside(LH, bowlL, []);
    home(LH);
    showInside(RH, bowlR, [[extra, BACK]], [extra, REST.extra]);
    home(RH);
    tl.wait(0.9);

    // ---- 2 ----
    tl.step(
      '第一颗：交到左手',
      '右手捏起第一颗球，放进左手，左手握紧。',
      '这一下叫“假传”。球只是从右手指尖滚回了右手掌心，左手握住的是个空拳。',
    );
    fakePass(b1);

    // ---- 3 ----
    tl.step(
      '第一颗：飞进右碗',
      '左手朝右碗一扬，张开，球没了。掀开右碗，它已经在里面。',
      '碗里这颗是事先藏好的第四颗。扣回碗时，掌心里的第一颗又被带了进去。从这里起，魔术师始终比观众多走一步。',
    );
    vanish();
    lift(RH, bowlR, [[b1, BACK]]);
    setDown(RH, bowlR, [], [b1, REST.b1]);
    home(RH);
    tl.wait(0.8);

    // ---- 4 ----
    tl.step(
      '第二颗：如法炮制',
      '第二颗球同样交到左手，一扬就消失。再掀右碗，里面变成了两颗。',
      '观众看到的两颗，是第四颗加第一颗。第二颗此刻在右手掌心，放碗时也进去了，碗里其实已经有三颗。',
    );
    fakePass(b2);
    vanish();
    lift(RH, bowlR, [[b2, BACK]]);
    setDown(RH, bowlR, [], [b2, REST.b2]);
    home(RH);
    tl.wait(0.8);

    // ---- 5 ----
    tl.step(
      '第三颗：塞进左碗',
      '左手掀起左碗一角，右手把最后一颗球塞到碗下。',
      '这一下叫“假放”。手指伸到碗沿下做了个放的动作，球却缩回掌心带了出来。左碗是空的。',
    );
    H(LH, { x: LX, y: BH + 0.12, z: -0.05, c: 0.75 }, 0.6);
    H(RH, { x: 0.5, y: BR - TIP.y, z: FZ - TIP.z, c: 0.6 }, 0.6);
    tl.wait(0.65);
    tl.to(bowlL, { y: BH + 0.24, rz: 0.4 }, 0.45);
    H(LH, { y: BH + 0.38, rz: 0.4 }, 0.45);
    H(RH, { x: 0.2, y: 0.9, z: 0.6, ry: -Math.PI / 2 }, 0.5, [[b3, TIP]]);
    tl.wait(0.5);
    H(RH, { x: -0.78, y: 0.44, z: 0.05 }, 0.55, [[b3, TIP]]);
    tl.wait(0.75);
    tl.to(b3, { p: 1 }, 0, { at: 0.1 });
    H(RH, { c: 0.5 }, 0.3, [[b3, PALM]]);
    tl.wait(0.4);
    H(RH, { x: 0.3, y: 1.0, z: 0.6, ry: 0 }, 0.6, [[b3, PALM]]);
    tl.to(bowlL, { y: BH, rz: 0 }, 0.45, { at: 0.15 });
    H(LH, { y: BH + 0.12, rz: 0 }, 0.45, [], { at: 0.15 });
    tl.wait(0.75);
    home(LH);
    tl.wait(0.9);

    // ---- 6 ----
    tl.step(
      '三仙归洞',
      '右手在两碗之间一挥。翻开左碗：空的。掀开右碗：三颗球聚在一起。',
      '右碗的三颗早就到齐了。观众以为的“第三颗”还夹在右手里，收场时悄悄揣进口袋。四颗球，演的是三颗的戏。',
    );
    H(RH, { x: -0.9, y: 1.5, z: 0.5 }, 0.5, [[b3, PALM]]);
    tl.wait(0.5);
    H(RH, { x: 1.1, y: 1.5, z: 0.5 }, 0.7, [[b3, PALM]]);
    tl.wait(0.9);
    showInside(LH, bowlL, []);
    home(LH);
    lift(RH, bowlR, [[b3, BACK]]);
    H(RH, { x: 3.1, y: BH + 0.12, z: -1.25 }, 0.7, [[b3, BACK]]);
    tl.to(bowlR, { x: 3.1, y: BH, z: -1.2 }, 0.7);
    tl.wait(0.8);
    home(RH, [[b3, PALM]]);
    tl.wait(2.2);
  },
};
