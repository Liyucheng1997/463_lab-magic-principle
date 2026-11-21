import * as THREE from 'three';
import './tokens.css';
import './style.css';
import { createStage } from './stage.js';
import { Timeline } from './timeline.js';
import cups from './tricks/cups.js';
import coin from './tricks/coin.js';
import rings from './tricks/rings.js';
import saw from './tricks/saw.js';

const TRICKS = [cups, coin, rings, saw];
const $ = (s) => document.querySelector(s);
const stage = createStage($('#view'));

const S = { trick: null, tl: null, root: null, t: 0, playing: false, speed: 1, xray: false, step: -1, xfns: [] };

const ICON = {
  play: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
  pause: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>',
  replay: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 1 0 2.6-5.9"/><path d="M4 4v5h5"/></svg>',
};

// ---------- 魔术装载 ----------
function makeCtx(root, tl) {
  const ctx = {
    root, tl,
    /** 注册透视开关的回调，并立即按当前状态调用一次 */
    onXray(fn) {
      S.xfns.push(fn);
      fn(S.xray);
    },
    /** 解密模式下把这个材质变成半透明 */
    ghost(mat, alpha = 0.22) {
      ctx.onXray((on) => {
        mat.transparent = on;
        mat.opacity = on ? alpha : 1;
        mat.depthWrite = !on;
        mat.needsUpdate = true;
      });
    },
    /**
     * 可以被“藏起来”的物体：时间轴上 p = 1 表示正被藏着。
     * 表演模式下藏着的物体不可见；解密模式下可见并带蓝色描边。
     */
    secret(mesh) {
      const halo = new THREE.Mesh(
        mesh.geometry,
        new THREE.MeshBasicMaterial({ color: 0x0a84ff, side: THREE.BackSide }),
      );
      halo.scale.setScalar(1.24);
      halo.userData.noShadow = true;
      mesh.add(halo);
      const refresh = () => {
        const hidden = (mesh.userData.p ?? 0) >= 0.5;
        mesh.visible = S.xray || !hidden;
        halo.visible = S.xray && hidden;
      };
      mesh.userData.onProp = refresh;
      ctx.onXray(refresh);
    },
  };
  return ctx;
}

function load(trick) {
  if (S.root) {
    stage.scene.remove(S.root);
    S.root.traverse((o) => {
      o.geometry?.dispose();
      o.material?.dispose();
    });
  }
  S.xfns = [];
  S.trick = trick;
  S.root = new THREE.Group();
  S.tl = new Timeline();
  trick.build(makeCtx(S.root, S.tl));
  S.tl.end();
  S.root.traverse((o) => {
    if (o.isMesh && !o.userData.noShadow) o.castShadow = o.receiveShadow = true;
  });
  stage.scene.add(S.root);
  stage.flyTo(trick.camera);

  S.t = 0;
  S.step = -1;
  S.playing = true;
  buildTrack();
  $('#keys').innerHTML = trick.keys.map((k) => `<span>${k}</span>`).join('');
  document.querySelectorAll('.trick').forEach((el) => el.classList.toggle('on', el.dataset.id === trick.id));
  history.replaceState(null, '', '#' + trick.id);
}

// ---------- 界面 ----------
$('#tricks').innerHTML = TRICKS.map(
  (t) => `<button class="trick" type="button" data-id="${t.id}">
    <span class="trick-tag">${t.tag}</span>
    <strong>${t.name}</strong>
    <span class="trick-blurb">${t.blurb}</span>
  </button>`,
).join('');
$('#tricks').addEventListener('click', (e) => {
  const el = e.target.closest('.trick');
  if (el) load(TRICKS.find((t) => t.id === el.dataset.id));
});

function buildTrack() {
  const { steps, duration } = S.tl;
  $('#track').innerHTML = steps
    .map((s, i) => `<div class="tseg" style="flex:${(s.t1 - s.t0) / duration}" title="${i + 1}. ${s.title}"><i></i></div>`)
    .join('');
}

function setXray(on) {
  S.xray = on;
  S.xfns.forEach((fn) => fn(on));
  $('#modeShow').classList.toggle('on', !on);
  $('#modeReveal').classList.toggle('on', on);
  $('#secretBox').hidden = !on;
  $('#hint').hidden = on;
}

function seek(t) {
  S.t = Math.max(0, Math.min(S.tl.duration, t));
}
function gotoStep(i) {
  const n = S.tl.steps.length;
  seek(S.tl.steps[Math.max(0, Math.min(n - 1, i))].t0);
}
function togglePlay() {
  if (S.t >= S.tl.duration) seek(0);
  S.playing = !S.playing;
}

$('#modeShow').onclick = () => setXray(false);
$('#modeReveal').onclick = () => setXray(true);
$('#resetCam').onclick = () => stage.flyTo(S.trick.camera);
$('#play').onclick = togglePlay;
$('#prev').onclick = () => {
  const s = S.tl.steps[S.step];
  // 一步刚开始时再按“上一步”才真正回到前一步，否则先回到本步开头
  gotoStep(S.t - s.t0 < 0.6 ? S.step - 1 : S.step);
};
$('#next').onclick = () => (S.step < S.tl.steps.length - 1 ? gotoStep(S.step + 1) : seek(S.tl.duration));
$('#speed').onclick = () => {
  S.speed = S.speed === 1 ? 0.5 : S.speed === 0.5 ? 0.25 : 1;
  $('#speed').textContent = S.speed === 1 ? '1×' : S.speed === 0.5 ? '0.5×' : '0.25×';
};

const track = $('#track');
const scrub = (e) => {
  const r = track.getBoundingClientRect();
  seek(((e.clientX - r.left) / r.width) * S.tl.duration);
};
track.addEventListener('pointerdown', (e) => {
  track.setPointerCapture(e.pointerId);
  S.playing = false;
  scrub(e);
});
track.addEventListener('pointermove', (e) => track.hasPointerCapture(e.pointerId) && scrub(e));

window.addEventListener('keydown', (e) => {
  if (e.target.closest('input, textarea')) return;
  if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
  else if (e.code === 'ArrowLeft') $('#prev').click();
  else if (e.code === 'ArrowRight') $('#next').click();
  else if (e.code === 'KeyX') setXray(!S.xray);
});

// 主题
const root = document.documentElement;
function setTheme(dark) {
  root.dataset.theme = dark ? 'dark' : 'light';
  $('#theme').textContent = dark ? '浅色' : '深色';
  stage.setTheme(dark);
}
$('#theme').onclick = () => setTheme(root.dataset.theme !== 'dark');
setTheme(matchMedia('(prefers-color-scheme: dark)').matches);

// ---------- 主循环 ----------
let playIcon = '';
function syncUI() {
  const { tl } = S;
  const i = tl.stepAt(S.t);
  if (i !== S.step) {
    S.step = i;
    const s = tl.steps[i];
    $('#stepIdx').textContent = `${i + 1} / ${tl.steps.length}`;
    $('#stepTitle').textContent = s.title;
    $('#see').textContent = s.see;
    $('#secret').textContent = s.secret;
  }
  track.querySelectorAll('.tseg i').forEach((el, k) => {
    const s = tl.steps[k];
    el.style.width = Math.max(0, Math.min(1, (S.t - s.t0) / (s.t1 - s.t0))) * 100 + '%';
  });
  const icon = S.playing ? 'pause' : S.t >= tl.duration ? 'replay' : 'play';
  if (icon !== playIcon) $('#play').innerHTML = ICON[(playIcon = icon)];
}

const clock = new THREE.Clock();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.1);
  if (S.playing) {
    S.t += dt * S.speed;
    if (S.t >= S.tl.duration) {
      S.t = S.tl.duration;
      S.playing = false;
    }
  }
  S.tl.apply(S.t);
  syncUI();
  stage.render(dt);
  requestAnimationFrame(frame);
}

setXray(false);
load(TRICKS.find((t) => '#' + t.id === location.hash) ?? TRICKS[0]);
frame();

// 调试用：在控制台里可以直接拖时间、切模式
window.__magic = { S, seek, setXray, load, TRICKS };
