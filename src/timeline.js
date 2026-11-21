// 关键帧时间轴：所有动画都是 (对象, 属性) 上的若干线段，任意时刻可直接求值，
// 所以能随意拖动进度、跳步、倒放。编排时必须按时间先后给同一属性添加线段。

const EASE = {
  lin: (k) => k,
  io: (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2),
  out: (k) => 1 - Math.pow(1 - k, 3),
  in: (k) => k * k,
};

const BUILTIN = {
  x: ['position', 'x'], y: ['position', 'y'], z: ['position', 'z'],
  rx: ['rotation', 'x'], ry: ['rotation', 'y'], rz: ['rotation', 'z'],
};

function read(obj, key) {
  if (BUILTIN[key]) return obj[BUILTIN[key][0]][BUILTIN[key][1]];
  if (key === 's') return obj.scale.x;
  return obj.userData[key] ?? 0;
}

function write(obj, key, v) {
  if (BUILTIN[key]) obj[BUILTIN[key][0]][BUILTIN[key][1]] = v;
  else if (key === 's') obj.scale.setScalar(v);
  else {
    obj.userData[key] = v;
    obj.userData.onProp?.(key, v);
  }
}

export class Timeline {
  constructor() {
    this.t = 0; // 编排游标
    this.channels = new Map();
    this.steps = [];
    this.duration = 0;
  }

  _ch(obj, key) {
    let m = this.channels.get(obj);
    if (!m) this.channels.set(obj, (m = {}));
    if (!m[key]) {
      const v = read(obj, key);
      m[key] = { init: v, cur: v, segs: [] };
    }
    return m[key];
  }

  /** 编排时某属性的当前目标值 */
  get(obj, key) {
    return this._ch(obj, key).cur;
  }

  /** 从游标 + at 处开始，用 dur 秒把属性补间到目标值；不移动游标 */
  to(obj, props, dur = 0.6, { at = 0, ease = 'io' } = {}) {
    const t0 = this.t + at;
    for (const key in props) {
      const ch = this._ch(obj, key);
      ch.segs.push({ t0, t1: t0 + dur, v0: ch.cur, v1: props[key], ease: EASE[ease] });
      ch.cur = props[key];
    }
    return this;
  }

  wait(d) {
    this.t += d;
    return this;
  }

  step(title, see, secret) {
    this.steps.push({ title, see, secret, t0: this.t, t1: this.t });
    return this;
  }

  end() {
    this.duration = this.t;
    this.steps.forEach((s, i) => (s.t1 = this.steps[i + 1]?.t0 ?? this.duration));
  }

  stepAt(t) {
    for (let i = this.steps.length - 1; i >= 0; i--) if (t >= this.steps[i].t0) return i;
    return 0;
  }

  apply(t) {
    for (const [obj, m] of this.channels) {
      for (const key in m) {
        const ch = m[key];
        let v = ch.init;
        for (const s of ch.segs) {
          if (t < s.t0) break;
          v = t >= s.t1 ? s.v1 : s.v0 + (s.v1 - s.v0) * s.ease((t - s.t0) / (s.t1 - s.t0));
        }
        write(obj, key, v);
      }
      obj.userData.onApply?.();
    }
  }
}
