import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

const L = 2.6, W0 = 0.56, H0 = 0.33, B = 0.1, BH = 0.09;
const NX = 10, NY = 3, NZ = 4;
const BX = [-1.42, 1.42], BY = [0, 0.74], BZ = [-0.62, 0.62];
const PI = Math.PI;

export const SPECIES = {
  chromodoris: {
    body: '#2b4fc4', body2: '#1a2c80', foot: '#c4cdea', edge: '#f4a02a', inner: '#f6f1e6',
    stripes: [{ th: PI / 2, w: 11, c: '#10121b' }, { th: PI / 2 - 0.52, w: 7, c: '#10121b' }, { th: PI / 2 + 0.52, w: 7, c: '#10121b' }],
    rhino: '#ee8526', rhinoTip: '#f9b44c', gill: '#ee8526', gillTip: '#ffc75e', sheen: '#a9bcff', atten: '#3b5bd0'
  },
  hypselodoris: {
    body: '#7d4cbd', body2: '#56298f', foot: '#dccdee', edge: '#f6f2fb', inner: '#f5d23a',
    stripes: [{ th: PI / 2, w: 4, c: '#f5d23a' }, { th: PI / 2 - 0.36, w: 4, c: '#f5d23a' }, { th: PI / 2 + 0.36, w: 4, c: '#f5d23a' }, { th: PI / 2 - 0.72, w: 3, c: '#f5d23a' }, { th: PI / 2 + 0.72, w: 3, c: '#f5d23a' }],
    rhino: '#e2502a', rhinoTip: '#ff9150', gill: '#e2502a', gillTip: '#ffb760', sheen: '#e2c8ff', atten: '#8a4fd0'
  },
  goniobranchus: {
    body: '#f6ece7', body2: '#ecd9d2', foot: '#f8f1ed', edge: '#d3283b', inner: '#fbf6f2',
    stripes: [], spots: { n: 90, c: '#b52158', r: [3, 10] },
    rhino: '#f3e7e2', rhinoTip: '#d3283b', gill: '#f3e7e2', gillTip: '#d3283b', sheen: '#ffd6dc', atten: '#e8a0a8'
  }
};

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

function paintTexture(sp) {
  const W = 1024, H = 512, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const Y = th => th / (PI * 2) * H;
  const gr = g.createLinearGradient(0, 0, 0, H / 2);
  gr.addColorStop(0, sp.body2); gr.addColorStop(0.5, sp.body); gr.addColorStop(1, sp.body2);
  g.fillStyle = gr; g.fillRect(0, 0, W, H / 2);
  g.fillStyle = sp.foot; g.fillRect(0, H / 2, W, H / 2);
  g.lineCap = 'round';
  for (const s of sp.stripes) {
    g.strokeStyle = s.c; g.lineWidth = s.w;
    g.beginPath(); g.moveTo(W * 0.08, Y(s.th)); g.lineTo(W * 0.92, Y(s.th)); g.stroke();
  }
  if (sp.spots) {
    const r = rng(7);
    g.fillStyle = sp.spots.c;
    for (let i = 0; i < sp.spots.n; i++) {
      const x = W * (0.07 + 0.86 * r()), th = 0.42 + (PI - 0.84) * r();
      const rad = sp.spots.r[0] + (sp.spots.r[1] - sp.spots.r[0]) * r();
      g.beginPath(); g.ellipse(x, Y(th), rad * 1.4, rad, 0, 0, PI * 2); g.fill();
    }
  }
  const band = (t0, t1, col) => { g.fillStyle = col; g.fillRect(0, Y(t0), W, Y(t1) - Y(t0)); };
  band(0.15, 0.33, sp.inner); band(PI - 0.33, PI - 0.15, sp.inner);
  band(0, 0.15, sp.edge); band(PI - 0.15, PI + 0.15, sp.edge); band(2 * PI - 0.15, 2 * PI, sp.edge);
  g.fillStyle = sp.inner; g.fillRect(W * 0.03, 0, W * 0.035, H / 2); g.fillRect(W * 0.935, 0, W * 0.035, H / 2);
  g.fillStyle = sp.edge; g.fillRect(0, 0, W * 0.03, H); g.fillRect(W * 0.97, 0, W * 0.03, H);
  g.filter = 'blur(1.6px)'; g.drawImage(c, 0, 0); g.filter = 'none';
  const r2 = rng(3);
  for (let i = 0; i < 5000; i++) {
    g.fillStyle = r2() < 0.5 ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)';
    const s = 1 + r2() * 2.5;
    g.fillRect(r2() * W, r2() * H * 0.5, s, s);
  }
  const t = new THREE.CanvasTexture(c);
  t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

function profile(u) {
  const s = Math.max(0, Math.sin(PI * u));
  return { s, Wu: W0 * Math.pow(s, 0.5) * (0.92 + 0.12 * u), Hu: H0 * Math.pow(s, 0.55) };
}
function topY(x, z) {
  const { Wu, Hu } = profile(x / L + 0.5);
  const c = Math.min(1, Math.abs(z) / Wu);
  return B + Hu * Math.pow(Math.sqrt(1 - c * c), 0.75);
}

function buildBody() {
  const nu = 120, nt = 60, pos = [], uv = [], rim = [], idx = [];
  for (let iu = 0; iu <= nu; iu++) {
    const u = iu / nu, x = (u - 0.5) * L, { s, Wu, Hu } = profile(u);
    for (let it = 0; it <= nt; it++) {
      const th = it / nt * PI * 2, c = Math.cos(th), sn = Math.sin(th);
      let y, z;
      if (sn >= 0) { z = Wu * c; y = B + Hu * Math.pow(sn, 0.75); }
      else { z = Wu * c * (0.8 + 0.2 * c * c); y = B - BH * Math.pow(s, 0.3) * Math.pow(-sn, 0.6); }
      pos.push(x, y, z); uv.push(u, it / nt);
      rim.push(Math.pow(Math.abs(c), 6) * (sn >= 0 ? 1 : 0.7));
    }
  }
  for (let iu = 0; iu < nu; iu++) for (let it = 0; it < nt; it++) {
    const a = iu * (nt + 1) + it, b = a + nt + 1, c = a + 1, d = b + 1;
    idx.push(a, b, c, b, d, c);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  return { geo, rim: new Float32Array(rim) };
}

function colorize(geo, h, c0, c1, start) {
  const p = geo.attributes.position, n = p.count, col = new Float32Array(n * 3), hf = new Float32Array(n);
  const a = new THREE.Color(c0), b = new THREE.Color(c1), t = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const f = Math.min(1, Math.max(0, p.getY(i) / h));
    hf[i] = f;
    const k = THREE.MathUtils.smoothstep(f, start, 1);
    t.copy(a).lerp(b, k);
    col[i * 3] = t.r; col[i * 3 + 1] = t.g; col[i * 3 + 2] = t.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.userData.hf = hf;
}

function merge(list) {
  let nv = 0, ni = 0;
  for (const g of list) { nv += g.attributes.position.count; ni += g.index.count; }
  const pos = new Float32Array(nv * 3), col = new Float32Array(nv * 3), hf = new Float32Array(nv), ph = new Float32Array(nv), idx = new Uint32Array(ni);
  let ov = 0, oi = 0;
  list.forEach((g, gi) => {
    const n = g.attributes.position.count;
    pos.set(g.attributes.position.array, ov * 3);
    col.set(g.attributes.color.array, ov * 3);
    hf.set(g.userData.hf, ov);
    ph.fill(g.userData.ph ?? gi * 1.7, ov, ov + n);
    const ix = g.index.array;
    for (let i = 0; i < ix.length; i++) idx[oi + i] = ix[i] + ov;
    ov += n; oi += ix.length;
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  return { geo, hf, ph };
}

function buildRhinos(sp) {
  const list = [], h = 0.36, xr = 0.84, zr = 0.15;
  for (const side of [1, -1]) {
    const pts = [];
    for (let k = 0; k <= 32; k++) {
      const t = k / 32;
      let r = 0.062 * Math.pow(1 - t, 0.45) + 0.006;
      if (t > 0.28 && t < 0.95) r *= 1 + 0.24 * Math.max(0, Math.sin((t - 0.28) * PI * 12));
      pts.push(new THREE.Vector2(r, t * h));
    }
    const g = new THREE.LatheGeometry(pts, 18);
    colorize(g, h, sp.rhino, sp.rhinoTip, 0.45);
    g.rotateZ(0.38); g.rotateX(side * 0.24);
    g.translate(xr, topY(xr, side * zr) - 0.035, side * zr);
    g.userData.ph = side > 0 ? 0 : 2.1;
    list.push(g);
  }
  return merge(list);
}

function buildGills(sp) {
  const list = [], n = 9, gx = -0.78, R = 0.13, m = new THREE.Matrix4();
  for (let k = 0; k < n; k++) {
    const phi = k / n * PI * 2 + 0.2;
    const back = 0.5 - 0.5 * Math.cos(phi);
    const h = 0.21 + 0.1 * back, pts = [];
    for (let j = 0; j <= 22; j++) {
      const t = j / 22;
      const r = 0.06 * Math.pow(Math.sin(PI * (0.06 + 0.9 * t)), 0.7) * (1 + 0.32 * Math.max(0, Math.sin(t * PI * 8)));
      pts.push(new THREE.Vector2(Math.max(0.002, r), t * h));
    }
    const g = new THREE.LatheGeometry(pts, 10);
    colorize(g, h, sp.gill, sp.gillTip, 0.35);
    g.scale(1, 1, 0.42); g.rotateY(-phi);
    m.makeRotationAxis(new THREE.Vector3(-Math.sin(phi), 0, Math.cos(phi)), -0.62);
    g.applyMatrix4(m);
    const x = gx + R * Math.cos(phi), z = R * Math.sin(phi);
    g.translate(x, topY(x, z) - 0.03, z);
    g.userData.ph = phi * 1.3;
    list.push(g);
  }
  return merge(list);
}

function weldGroups(arr) {
  const map = new Map();
  for (let i = 0; i < arr.length / 3; i++) {
    const k = Math.round(arr[i * 3] * 1e4) + ',' + Math.round(arr[i * 3 + 1] * 1e4) + ',' + Math.round(arr[i * 3 + 2] * 1e4);
    let l = map.get(k); if (!l) map.set(k, l = []); l.push(i);
  }
  return [...map.values()].filter(l => l.length > 1);
}
function fixNormals(geo, groups) {
  const n = geo.attributes.normal.array;
  for (const g of groups) {
    let x = 0, y = 0, z = 0;
    for (const i of g) { x += n[i * 3]; y += n[i * 3 + 1]; z += n[i * 3 + 2]; }
    const l = Math.hypot(x, y, z) || 1;
    for (const i of g) { n[i * 3] = x / l; n[i * 3 + 1] = y / l; n[i * 3 + 2] = z / l; }
  }
}

function buildEnv(renderer) {
  const s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.BoxGeometry(12, 12, 12), new THREE.MeshBasicMaterial({ color: 0xbdb3a6, side: THREE.BackSide })));
  const panel = (w, h, x, y, z, k) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.98, 0.95).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); s.add(m);
  };
  panel(6, 2, 0, 5.5, 1, 5); panel(2, 4, -5.5, 2, 2, 3); panel(3, 2, 4, 2, -4, 2); panel(8, 1, 0, 1, 5.5, 1.6);
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(s, 0.04).texture;
  pm.dispose();
  return tex;
}

export function createJelly(container, opts = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const canvas = renderer.domElement;
  canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline:none';
  container.appendChild(canvas);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#ebe3d6');
  scene.environment = buildEnv(renderer);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);

  scene.add(new THREE.HemisphereLight(0xfff6ea, 0x9a8f80, 0.5));
  const key = new THREE.DirectionalLight(0xfff3e4, 2.2);
  key.position.set(-2.5, 6, 3); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -3.5, right: 3.5, top: 3.5, bottom: -3.5, near: 0.5, far: 20 });
  key.shadow.bias = -0.0005; key.shadow.normalBias = 0.02;
  scene.add(key);
  const rimL = new THREE.DirectionalLight(0xdfe8ff, 0.8); rimL.position.set(3, 2, -4); scene.add(rimL);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: 0.14 }));
  ground.rotation.x = -PI / 2; ground.receiveShadow = true; scene.add(ground);
  const blobTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(60,45,30,0.55)'); gr.addColorStop(0.5, 'rgba(60,45,30,0.2)'); gr.addColorStop(1, 'rgba(60,45,30,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false }));
  blob.rotation.x = -PI / 2; blob.position.y = 0.002; scene.add(blob);

  // ---------- meshes
  let sp = SPECIES[opts.species] || SPECIES.chromodoris;
  const bodyB = buildBody();
  const bodyMat = new THREE.MeshPhysicalMaterial({
    map: paintTexture(sp), roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08,
    sheen: 0.25, sheenRoughness: 0.5, sheenColor: new THREE.Color(sp.sheen),
    transmission: 0.18, thickness: 0.6, ior: 1.36, attenuationColor: new THREE.Color(sp.atten), attenuationDistance: 1.2,
    envMapIntensity: 1.1
  });
  const appMat = () => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.1, sheen: 0.4, sheenColor: new THREE.Color('#ffffff'), transmission: 0.1, thickness: 0.2, envMapIntensity: 1.1 });
  const body = new THREE.Mesh(bodyB.geo, bodyMat);
  const parts = [];
  function addPart(mesh, kind, extra) {
    mesh.castShadow = true; mesh.frustumCulled = false; scene.add(mesh);
    const rest = mesh.geometry.attributes.position.array.slice();
    parts.push({ mesh, kind, rest, tmp: new Float32Array(rest.length), groups: weldGroups(rest), ...extra });
  }
  addPart(body, 'body', { rim: bodyB.rim });
  let rh = buildRhinos(sp), gl = buildGills(sp);
  const rhMesh = new THREE.Mesh(rh.geo, appMat()); addPart(rhMesh, 'rhino', { hf: rh.hf, ph: rh.ph });
  const glMesh = new THREE.Mesh(gl.geo, appMat()); addPart(glMesh, 'gill', { hf: gl.hf, ph: gl.ph });
  const pickables = [body, rhMesh, glMesh];

  // ---------- lattice particles
  const N = NX * NY * NZ, id = (i, j, k) => i + NX * (j + NY * k);
  const R0 = new Float32Array(N * 3), X = new Float32Array(N * 3), V = new Float32Array(N * 3), P = new Float32Array(N * 3), D = new Float32Array(N * 3), nC = new Float32Array(N);
  for (let k = 0; k < NZ; k++) for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
    const p = id(i, j, k) * 3;
    R0[p] = BX[0] + (BX[1] - BX[0]) * i / (NX - 1);
    R0[p + 1] = BY[0] + (BY[1] - BY[0]) * j / (NY - 1);
    R0[p + 2] = BZ[0] + (BZ[1] - BZ[0]) * k / (NZ - 1);
  }
  X.set(R0);
  const clusters = [];
  for (let k0 = 0; k0 <= NZ - 3; k0++) for (let i0 = 0; i0 <= NX - 3; i0++) {
    const ids = [];
    for (let k = k0; k < k0 + 3; k++) for (let j = 0; j < NY; j++) for (let i = i0; i < i0 + 3; i++) ids.push(id(i, j, k));
    let cx = 0, cy = 0, cz = 0;
    for (const a of ids) { cx += R0[a * 3]; cy += R0[a * 3 + 1]; cz += R0[a * 3 + 2]; }
    cx /= ids.length; cy /= ids.length; cz /= ids.length;
    const q = new Float32Array(ids.length * 3), Aqq = new Float64Array(9);
    ids.forEach((a, n) => {
      q[n * 3] = R0[a * 3] - cx; q[n * 3 + 1] = R0[a * 3 + 1] - cy; q[n * 3 + 2] = R0[a * 3 + 2] - cz;
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) Aqq[r * 3 + c] += q[n * 3 + r] * q[n * 3 + c];
      nC[a]++;
    });
    clusters.push({ ids, q, inv: inv3(Aqq), quat: [0, 0, 0, 1] });
  }
  const gq = new Float32Array(N * 3);
  { let cx = 0, cy = 0, cz = 0; for (let a = 0; a < N; a++) { cx += R0[a * 3]; cy += R0[a * 3 + 1]; cz += R0[a * 3 + 2]; }
    cx /= N; cy /= N; cz /= N; for (let a = 0; a < N; a++) { gq[a * 3] = R0[a * 3] - cx; gq[a * 3 + 1] = R0[a * 3 + 1] - cy; gq[a * 3 + 2] = R0[a * 3 + 2] - cz; } }

  let alpha = 0.2, beta = 0.4, damp = 1.2;
  function setParams({ softness, wobble }) {
    if (softness != null) { alpha = 0.12 * Math.pow(0.05, softness); beta = 0.3 + 0.55 * softness; }
    if (wobble != null) damp = 4 + (0.35 - 4) * wobble;
  }
  setParams({ softness: opts.softness ?? 0.65, wobble: opts.wobble ?? 0.7 });

  const Rm = new Float64Array(9), Apq = new Float64Array(9), Al = new Float64Array(9), M = new Float64Array(9);
  function solveCluster(cl) {
    const { ids, q } = cl, n = ids.length;
    let cx = 0, cy = 0, cz = 0;
    for (const a of ids) { cx += P[a * 3]; cy += P[a * 3 + 1]; cz += P[a * 3 + 2]; }
    cx /= n; cy /= n; cz /= n;
    Apq.fill(0);
    for (let m = 0; m < n; m++) {
      const a = ids[m], px = P[a * 3] - cx, py = P[a * 3 + 1] - cy, pz = P[a * 3 + 2] - cz;
      const qx = q[m * 3], qy = q[m * 3 + 1], qz = q[m * 3 + 2];
      Apq[0] += px * qx; Apq[1] += px * qy; Apq[2] += px * qz;
      Apq[3] += py * qx; Apq[4] += py * qy; Apq[5] += py * qz;
      Apq[6] += pz * qx; Apq[7] += pz * qy; Apq[8] += pz * qz;
    }
    extractRotation(Apq, cl.quat, 4, Rm);
    mul3(Apq, cl.inv, Al);
    const det = det3(Al);
    if (det > 1e-5) { const s = 1 / Math.cbrt(det); for (let i = 0; i < 9; i++) M[i] = beta * Al[i] * s + (1 - beta) * Rm[i]; }
    else M.set(Rm);
    for (let m = 0; m < n; m++) {
      const a = ids[m], qx = q[m * 3], qy = q[m * 3 + 1], qz = q[m * 3 + 2];
      D[a * 3] += cx + M[0] * qx + M[1] * qy + M[2] * qz - P[a * 3];
      D[a * 3 + 1] += cy + M[3] * qx + M[4] * qy + M[5] * qz - P[a * 3 + 1];
      D[a * 3 + 2] += cz + M[6] * qx + M[7] * qy + M[8] * qz - P[a * 3 + 2];
    }
  }

  let grab = null;
  const tgt = new THREE.Vector3();
  function step(h) {
    const df = Math.exp(-damp * h);
    let cx = 0, cz = 0;
    for (let a = 0; a < N; a++) { cx += X[a * 3]; cz += X[a * 3 + 2]; }
    cx /= N; cz /= N;
    for (let a = 0; a < N; a++) {
      const p = a * 3;
      V[p + 1] -= 14 * h;
      V[p] -= cx * 2.2 * h; V[p + 2] -= cz * 2.2 * h;
      V[p] *= df; V[p + 1] *= df; V[p + 2] *= df;
      const sp2 = V[p] * V[p] + V[p + 1] * V[p + 1] + V[p + 2] * V[p + 2];
      if (sp2 > 900) { const s = 30 / Math.sqrt(sp2); V[p] *= s; V[p + 1] *= s; V[p + 2] *= s; }
      P[p] = X[p] + V[p] * h; P[p + 1] = X[p + 1] + V[p + 1] * h; P[p + 2] = X[p + 2] + V[p + 2] * h;
    }
    if (grab && grab.active) for (const g of grab.list) {
      const p = g.a * 3, k = g.w * 0.25;
      P[p] += (tgt.x + g.ox - P[p]) * k; P[p + 1] += (Math.max(0, tgt.y + g.oy) - P[p + 1]) * k; P[p + 2] += (tgt.z + g.oz - P[p + 2]) * k;
    }
    for (let it = 0; it < 1; it++) {
      D.fill(0);
      for (const cl of clusters) solveCluster(cl);
      for (let a = 0; a < N * 3; a++) P[a] += D[a] / nC[(a / 3) | 0] * alpha;
    }
    // gentle uprighting toward rest orientation
    let gx = 0, gy = 0, gz = 0;
    for (let a = 0; a < N; a++) { gx += P[a * 3]; gy += P[a * 3 + 1]; gz += P[a * 3 + 2]; }
    gx /= N; gy /= N; gz /= N;
    const up = grab && grab.active ? 0 : 0.0012;
    for (let a = 0; a < N; a++) {
      const p = a * 3;
      P[p] += (gx + gq[p] - P[p]) * up; P[p + 1] += (gy + gq[p + 1] - P[p + 1]) * up; P[p + 2] += (gz + gq[p + 2] - P[p + 2]) * up;
    }
    for (let a = 0; a < N; a++) {
      const p = a * 3;
      if (P[p + 1] < 0) {
        P[p + 1] = 0;
        P[p] = X[p] + (P[p] - X[p]) * 0.45; P[p + 2] = X[p + 2] + (P[p + 2] - X[p + 2]) * 0.45;
      }
      P[p] = Math.max(-3.4, Math.min(3.4, P[p])); P[p + 2] = Math.max(-2.4, Math.min(2.4, P[p + 2])); P[p + 1] = Math.min(5, P[p + 1]);
      V[p] = (P[p] - X[p]) / h; V[p + 1] = (P[p + 1] - X[p + 1]) / h; V[p + 2] = (P[p + 2] - X[p + 2]) / h;
      X[p] = P[p]; X[p + 1] = P[p + 1]; X[p + 2] = P[p + 2];
    }
  }

  // ---------- deform
  const fx0 = BX[0], fsx = (NX - 1) / (BX[1] - BX[0]), fy0 = BY[0], fsy = (NY - 1) / (BY[1] - BY[0]), fz0 = BZ[0], fsz = (NZ - 1) / (BZ[1] - BZ[0]);
  function ffd(src, dst) {
    for (let v = 0; v < src.length; v += 3) {
      let fx = (src[v] - fx0) * fsx, fy = (src[v + 1] - fy0) * fsy, fz = (src[v + 2] - fz0) * fsz;
      const i = Math.min(NX - 2, Math.max(0, fx | 0)), j = Math.min(NY - 2, Math.max(0, fy | 0)), k = Math.min(NZ - 2, Math.max(0, fz | 0));
      const tx = fx - i, ty = fy - j, tz = fz - k;
      let x = 0, y = 0, z = 0;
      for (let c = 0; c < 8; c++) {
        const di = c & 1, dj = (c >> 1) & 1, dk = (c >> 2) & 1;
        const w = (di ? tx : 1 - tx) * (dj ? ty : 1 - ty) * (dk ? tz : 1 - tz);
        const p = id(i + di, j + dj, k + dk) * 3;
        x += X[p] * w; y += X[p + 1] * w; z += X[p + 2] * w;
      }
      dst[v] = x; dst[v + 1] = y; dst[v + 2] = z;
    }
  }
  function animateRest(part, t) {
    const { rest, tmp } = part;
    if (part.kind === 'body') {
      const rim = part.rim, br = 1 + 0.018 * Math.sin(t * 1.3);
      for (let v = 0, n = 0; v < rest.length; v += 3, n++) {
        const x = rest[v], z = rest[v + 2], side = z > 0 ? 0 : 1.7;
        tmp[v] = x;
        tmp[v + 1] = B + (rest[v + 1] - B) * br + rim[n] * 0.032 * Math.sin(x * 6.5 - t * 2.4 + side);
        tmp[v + 2] = z * (1 + rim[n] * 0.02 * Math.sin(x * 5 - t * 1.9 + side));
      }
    } else {
      const { hf, ph } = part, amp = part.kind === 'gill' ? 0.04 : 0.022, sp1 = part.kind === 'gill' ? 1.8 : 1.15;
      for (let v = 0, n = 0; v < rest.length; v += 3, n++) {
        const f = hf[n] * hf[n];
        tmp[v] = rest[v] + Math.sin(t * sp1 + ph[n]) * amp * f;
        tmp[v + 1] = rest[v + 1];
        tmp[v + 2] = rest[v + 2] + Math.cos(t * sp1 * 0.8 + ph[n] * 1.3) * amp * 0.8 * f;
      }
    }
  }
  function updateMeshes(t) {
    for (const part of parts) {
      animateRest(part, t);
      const geo = part.mesh.geometry;
      ffd(part.tmp, geo.attributes.position.array);
      geo.attributes.position.needsUpdate = true;
      geo.computeVertexNormals();
      fixNormals(geo, part.groups);
      geo.computeBoundingSphere();
    }
  }

  // ---------- lattice viz
  const latGeo = new THREE.BufferGeometry();
  latGeo.setAttribute('position', new THREE.BufferAttribute(X, 3));
  const edges = [];
  for (let k = 0; k < NZ; k++) for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
    if (i < NX - 1) edges.push(id(i, j, k), id(i + 1, j, k));
    if (j < NY - 1) edges.push(id(i, j, k), id(i, j + 1, k));
    if (k < NZ - 1) edges.push(id(i, j, k), id(i, j, k + 1));
  }
  latGeo.setIndex(edges);
  const lattice = new THREE.Group();
  lattice.add(new THREE.LineSegments(latGeo, new THREE.LineBasicMaterial({ color: 0x2b2620, transparent: true, opacity: 0.35, depthTest: false })));
  lattice.add(new THREE.Points(latGeo, new THREE.PointsMaterial({ color: 0x2b2620, size: 5, sizeAttenuation: false, depthTest: false })));
  lattice.children.forEach(c => { c.frustumCulled = false; c.renderOrder = 10; });
  lattice.visible = false; scene.add(lattice);

  // ---------- interactions
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane();
  let lastInteract = performance.now(), down = null;
  function setNdc(e) { const r = canvas.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); }
  function pick(e) { setNdc(e); return ray.intersectObjects(pickables, false)[0] || null; }
  function weights(pt, sigma) {
    const out = [];
    for (let a = 0; a < N; a++) {
      const dx = X[a * 3] - pt.x, dy = X[a * 3 + 1] - pt.y, dz = X[a * 3 + 2] - pt.z;
      const w = Math.exp(-(dx * dx + dy * dy + dz * dz) / (sigma * sigma));
      if (w > 0.04) out.push({ a, w, ox: dx, oy: dy, oz: dz });
    }
    return out;
  }
  function poke(point, normal, s = 1) {
    for (const g of weights(point, 0.5)) {
      const p = g.a * 3;
      V[p] += (-normal.x * 9) * g.w * s; V[p + 1] += (-normal.y * 9 - 5) * g.w * s; V[p + 2] += (-normal.z * 9) * g.w * s;
    }
  }
  function centerOf() { let x = 0, y = 0, z = 0; for (let a = 0; a < N; a++) { x += X[a * 3]; y += X[a * 3 + 1]; z += X[a * 3 + 2]; } return new THREE.Vector3(x / N, y / N, z / N); }
  function hop() {
    const c = centerOf(), wy = (Math.random() - 0.5) * 3.2, wx = (Math.random() - 0.5) * 1.2;
    for (let a = 0; a < N; a++) {
      const p = a * 3, rx = X[p] - c.x, ry = X[p + 1] - c.y, rz = X[p + 2] - c.z;
      V[p] += wy * rz; V[p + 2] += -wy * rx + wx * ry; V[p + 1] += 4.6 - wx * rz;
    }
  }
  function onDown(e) {
    lastInteract = performance.now();
    const hit = pick(e);
    down = { x: e.clientX, y: e.clientY, t: performance.now(), hit };
    if (hit) {
      plane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()).negate(), hit.point);
      tgt.copy(hit.point);
      grab = { list: weights(hit.point, 0.3), active: false };
      canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = 'grabbing';
    }
  }
  function onMove(e) {
    if (grab) {
      lastInteract = performance.now();
      if (!grab.active && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) grab.active = true;
      if (grab.active) { setNdc(e); ray.ray.intersectPlane(plane, tgt); }
    } else if (e.pointerType === 'mouse') {
      canvas.style.cursor = pick(e) ? 'grab' : 'pointer';
    }
  }
  function onUp(e) {
    if (!down) return;
    const tap = performance.now() - down.t < 350 && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 7;
    if (tap) { if (down.hit) poke(down.hit.point, down.hit.face.normal); else hop(); }
    grab = null; down = null; lastInteract = performance.now();
    canvas.style.cursor = 'grab';
  }
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);

  let autoJiggle = opts.autoJiggle ?? true, nextAuto = 0;
  function autoPoke(now) {
    if (!autoJiggle || grab || now - lastInteract < 3500 || now < nextAuto) return;
    nextAuto = now + 2600 + Math.random() * 1600;
    const pos = body.geometry.attributes.position, nor = body.geometry.attributes.normal;
    for (let tries = 0; tries < 20; tries++) {
      const i = (Math.random() * pos.count) | 0;
      if (nor.getY(i) > 0.6) {
        poke(new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)), new THREE.Vector3(nor.getX(i), nor.getY(i), nor.getZ(i)), 0.7);
        return;
      }
    }
  }

  // ---------- layout
  function resize() {
    const w = container.clientWidth || 1, h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const portrait = w / h < 1;
    const d = portrait ? 5.6 / Math.pow(w / h, 0.75) : 5.6;
    const dir = new THREE.Vector3(0.52, 0.5, 0.7).normalize();
    camera.position.copy(dir.multiplyScalar(d)).add(new THREE.Vector3(0, 0.2, 0));
    camera.lookAt(portrait ? 0 : 0.35, portrait ? -0.25 : 0.15, portrait ? 0 : -0.25);
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize); ro.observe(container); resize();

  let raf = 0, last = performance.now(), acc = 0, fc = 0; const dbg = { slow: 1 };
  const H = 1 / 240;
  function frame(now) {
    raf = requestAnimationFrame(frame); fc++;
    acc += Math.min(0.05, (now - last) / 1000) * dbg.slow; last = now;
    autoPoke(now);
    let n = 0;
    while (acc >= H && n < 12) { step(H); acc -= H; n++; }
    const t = now / 1000;
    updateMeshes(t);
    const c = centerOf();
    blob.position.x = c.x; blob.position.z = c.z;
    const lift = Math.max(0, c.y - 0.3);
    blob.scale.set(3.4 + lift, 1.6 + lift, 1);
    blob.material.opacity = Math.max(0, 0.9 - lift * 0.5);
    if (lattice.visible) latGeo.attributes.position.needsUpdate = true;
    renderer.render(scene, camera);
  }
  updateMeshes(0);
  raf = requestAnimationFrame(frame);

  return {
    setParams,
    setAutoJiggle(v) { autoJiggle = !!v; },
    setLattice(v) { lattice.visible = !!v; },
    setSpecies(name) {
      sp = SPECIES[name] || sp;
      bodyMat.map.dispose(); bodyMat.map = paintTexture(sp); bodyMat.sheenColor.set(sp.sheen); bodyMat.attenuationColor.set(sp.atten); bodyMat.needsUpdate = true;
      const recolor = (part, c0, c1, start) => {
        const col = part.mesh.geometry.attributes.color, a = new THREE.Color(c0), b = new THREE.Color(c1), t = new THREE.Color();
        for (let i = 0; i < col.count; i++) { t.copy(a).lerp(b, THREE.MathUtils.smoothstep(part.hf[i], start, 1)); col.setXYZ(i, t.r, t.g, t.b); }
        col.needsUpdate = true;
      };
      recolor(parts[1], sp.rhino, sp.rhinoTip, 0.45); recolor(parts[2], sp.gill, sp.gillTip, 0.35);
      lastInteract = 0; nextAuto = 0; hop();
    },
    drop() {
      const c = centerOf(), ang = (Math.random() - 0.5) * 0.5;
      const cs = Math.cos(ang), sn = Math.sin(ang);
      for (let a = 0; a < N; a++) {
        const p = a * 3, ry = X[p + 1] - c.y, rz = X[p + 2] - c.z, rx = X[p] - c.x;
        X[p + 1] = c.y + ry * cs - rx * sn + 1.6; X[p] = c.x + rx * cs + ry * sn;
        X[p + 2] = c.z + rz; V[p] = V[p + 1] = V[p + 2] = 0;
      }
      lastInteract = performance.now();
    },
    reset() { X.set(R0); V.fill(0); clusters.forEach(c => { c.quat = [0, 0, 0, 1]; }); lastInteract = performance.now(); },
    dispose() {
      cancelAnimationFrame(raf); ro.disconnect();
      canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointercancel', onUp);
      renderer.dispose(); canvas.remove();
    }
  };
}

function inv3(m) {
  const [a, b, c, d, e, f, g, h, i] = m;
  const A = e * i - f * h, Bc = -(d * i - f * g), C = d * h - e * g;
  const det = a * A + b * Bc + c * C || 1e-9;
  return new Float64Array([A / det, -(b * i - c * h) / det, (b * f - c * e) / det, Bc / det, (a * i - c * g) / det, -(a * f - c * d) / det, C / det, -(a * h - b * g) / det, (a * e - b * d) / det]);
}
function mul3(a, b, o) {
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) o[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c];
}
function det3(m) { return m[0] * (m[4] * m[8] - m[5] * m[7]) - m[1] * (m[3] * m[8] - m[5] * m[6]) + m[2] * (m[3] * m[7] - m[4] * m[6]); }
function quatToMat(q, m) {
  const [x, y, z, w] = q;
  m[0] = 1 - 2 * (y * y + z * z); m[1] = 2 * (x * y - w * z); m[2] = 2 * (x * z + w * y);
  m[3] = 2 * (x * y + w * z); m[4] = 1 - 2 * (x * x + z * z); m[5] = 2 * (y * z - w * x);
  m[6] = 2 * (x * z - w * y); m[7] = 2 * (y * z + w * x); m[8] = 1 - 2 * (x * x + y * y);
}
function extractRotation(A, q, iters, R) {
  for (let it = 0; it < iters; it++) {
    quatToMat(q, R);
    let ox = 0, oy = 0, oz = 0, dn = 0;
    for (let j = 0; j < 3; j++) {
      const rx = R[j], ry = R[3 + j], rz = R[6 + j], ax = A[j], ay = A[3 + j], az = A[6 + j];
      ox += ry * az - rz * ay; oy += rz * ax - rx * az; oz += rx * ay - ry * ax;
      dn += rx * ax + ry * ay + rz * az;
    }
    const s = 1 / (Math.abs(dn) + 1e-9);
    ox *= s; oy *= s; oz *= s;
    const w = Math.hypot(ox, oy, oz);
    if (w < 1e-9) break;
    const h = Math.sin(w / 2) / w, bx = ox * h, by = oy * h, bz = oz * h, bw = Math.cos(w / 2);
    const [ax, ay, az, aw] = q;
    let nx = bw * ax + bx * aw + by * az - bz * ay;
    let ny = bw * ay - bx * az + by * aw + bz * ax;
    let nz = bw * az + bx * ay - by * ax + bz * aw;
    let nw = bw * aw - bx * ax - by * ay - bz * az;
    const l = Math.hypot(nx, ny, nz, nw);
    q[0] = nx / l; q[1] = ny / l; q[2] = nz / l; q[3] = nw / l;
  }
  quatToMat(q, R);
}
