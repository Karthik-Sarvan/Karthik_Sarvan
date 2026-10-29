import * as THREE from "three";

export function makeRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function canvas2d(w: number, h: number) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("2d context unavailable");
  return { canvas, ctx };
}

function finish(
  canvas: HTMLCanvasElement,
  renderer: THREE.WebGLRenderer,
  repeat: number,
  srgb: boolean,
) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.anisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy());
  texture.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/** Derive a tangent-space normal map from the luminance of an albedo canvas. */
function normalFromCanvas(source: HTMLCanvasElement, strength = 2.2) {
  const size = 256;
  const { ctx: smallCtx } = canvas2d(size, size);
  smallCtx.drawImage(source, 0, 0, size, size);
  const src = smallCtx.getImageData(0, 0, size, size).data;
  const height = new Float32Array(size * size);
  for (let i = 0; i < size * size; i++) {
    height[i] = (src[i * 4] * 0.299 + src[i * 4 + 1] * 0.587 + src[i * 4 + 2] * 0.114) / 255;
  }
  const { canvas, ctx } = canvas2d(size, size);
  const out = ctx.createImageData(size, size);
  const at = (x: number, y: number) => height[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx =
        at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1) -
        (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1));
      const dy =
        at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1) -
        (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1));
      const nx = dx * strength;
      const ny = dy * strength;
      const len = Math.hypot(nx, ny, 1);
      const index = (y * size + x) * 4;
      out.data[index] = ((nx / len) * 0.5 + 0.5) * 255;
      out.data[index + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      out.data[index + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      out.data[index + 3] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);
  return canvas;
}

function roughnessNoise(seed: number, low: number, high: number) {
  const { canvas, ctx } = canvas2d(256, 256);
  const rand = makeRandom(seed);
  const image = ctx.createImageData(256, 256);
  for (let i = 0; i < image.data.length; i += 4) {
    const v = low + rand() * (high - low);
    image.data[i] = v;
    image.data[i + 1] = v;
    image.data[i + 2] = v;
    image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

/* ------------------------------------------------------------------ */
/* Palette — faded Indian village paint, grimy and sun-bleached        */
/* ------------------------------------------------------------------ */

export const WALL_COLORS = [
  "#5c9c93", // faded teal
  "#c98f45", // ochre
  "#b05a3e", // terracotta
  "#3f5f93", // indigo
  "#cbd3a3", // lime wash
  "#c0738d", // dusty rose
  "#e3d6b4", // cream
  "#7e8f6b", // olive
];

export const NEON_COLORS = [0x22e0ff, 0xff2d8f, 0xffb24a, 0x46ff9b, 0xff4d3d, 0xa96bff];

/**
 * Painted plaster: base colour, damp rot, flaking patches that reveal the
 * coat underneath, soot, cracks and water streaks running down from above.
 */
function plasterAlbedo(hex: string, seed: number, grime = 1) {
  const { canvas, ctx } = canvas2d(512, 512);
  const rand = makeRandom(seed);
  const base = new THREE.Color(hex);
  const under = base.clone().lerp(new THREE.Color("#8d8073"), 0.72);

  ctx.fillStyle = `#${base.getHexString()}`;
  ctx.fillRect(0, 0, 512, 512);

  // uneven hand-painted tone
  for (let i = 0; i < 160; i++) {
    const c = base.clone().offsetHSL((rand() - 0.5) * 0.02, (rand() - 0.5) * 0.12, (rand() - 0.5) * 0.1);
    ctx.fillStyle = `rgba(${c.r * 255 | 0},${c.g * 255 | 0},${c.b * 255 | 0},0.22)`;
    const r = 30 + rand() * 120;
    ctx.beginPath();
    ctx.ellipse(rand() * 512, rand() * 512, r, r * (0.4 + rand() * 0.8), rand() * 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // flaked paint revealing bare plaster
  for (let i = 0; i < 46 * grime; i++) {
    const x = rand() * 512;
    const y = rand() * 512;
    const r = 6 + rand() * 34;
    ctx.fillStyle = `rgba(${under.r * 255 | 0},${under.g * 255 | 0},${under.b * 255 | 0},${0.5 + rand() * 0.4})`;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let s = 0; s <= 9; s++) {
      const a = (s / 9) * Math.PI * 2;
      const rr = r * (0.55 + rand() * 0.6);
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
  }

  // water streaks from the roofline
  for (let i = 0; i < 30 * grime; i++) {
    const x = rand() * 512;
    const w = 2 + rand() * 13;
    const h = 60 + rand() * 300;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "rgba(44,36,28,0.3)");
    g.addColorStop(1, "rgba(44,36,28,0)");
    ctx.fillStyle = g;
    ctx.save();
    ctx.translate(x, 0);
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  // soot near the ground
  const soot = ctx.createLinearGradient(0, 512, 0, 330);
  soot.addColorStop(0, "rgba(28,24,20,0.5)");
  soot.addColorStop(1, "rgba(28,24,20,0)");
  ctx.fillStyle = soot;
  ctx.fillRect(0, 330, 512, 182);

  // cracks
  ctx.strokeStyle = "rgba(40,32,26,0.45)";
  for (let i = 0; i < 20; i++) {
    ctx.lineWidth = 0.5 + rand() * 1.4;
    ctx.beginPath();
    let x = rand() * 512;
    let y = rand() * 512;
    ctx.moveTo(x, y);
    for (let s = 0; s < 6; s++) {
      x += (rand() - 0.5) * 80;
      y += rand() * 60;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // grit
  for (let i = 0; i < 4200; i++) {
    const v = rand() * 90;
    ctx.fillStyle = `rgba(${v},${v - 6},${v - 12},0.16)`;
    ctx.fillRect(rand() * 512, rand() * 512, 1.4, 1.4);
  }
  return canvas;
}

/** Wet city asphalt with painted lane markings and oil sheen. */
function asphaltAlbedo() {
  const { canvas, ctx } = canvas2d(512, 512);
  const rand = makeRandom(991);
  ctx.fillStyle = "#36363b";
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 14000; i++) {
    const v = 26 + rand() * 72;
    ctx.fillStyle = `rgba(${v},${v},${v + 4},${0.25 + rand() * 0.5})`;
    ctx.fillRect(rand() * 512, rand() * 512, 1 + rand() * 2.4, 1 + rand() * 2.4);
  }
  for (let i = 0; i < 24; i++) {
    const x = rand() * 512;
    const y = rand() * 512;
    const r = 20 + rand() * 70;
    const v = 30 + rand() * 26;
    ctx.fillStyle = `rgba(${v},${v},${v},0.55)`;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * (0.4 + rand() * 0.5), rand() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // faded centre line
  ctx.fillStyle = "rgba(214,190,96,0.5)";
  for (let y = 0; y < 512; y += 88) ctx.fillRect(250, y, 11, 48);
  ctx.strokeStyle = "rgba(14,14,16,0.6)";
  for (let i = 0; i < 26; i++) {
    ctx.lineWidth = 0.6 + rand() * 1.2;
    ctx.beginPath();
    let x = rand() * 512;
    let y = rand() * 512;
    ctx.moveTo(x, y);
    for (let s = 0; s < 7; s++) {
      x += (rand() - 0.5) * 70;
      y += (rand() - 0.5) * 70;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  return canvas;
}

/** Worn stone paving with mossy joints. */
function paveAlbedo() {
  const { canvas, ctx } = canvas2d(512, 512);
  const rand = makeRandom(313);
  ctx.fillStyle = "#3a3733";
  ctx.fillRect(0, 0, 512, 512);
  const cell = 64;
  for (let y = 0; y < 512; y += cell) {
    const offset = ((y / cell) % 2) * (cell / 2);
    for (let x = -cell; x < 512 + cell; x += cell) {
      const warm = rand();
      const r = 118 + warm * 48;
      const g = 110 + warm * 44;
      const b = 98 + warm * 38;
      ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
      ctx.fillRect(x + offset + 2, y + 2, cell - 4, cell - 4);
      ctx.fillStyle = `rgba(${(r - 48) | 0},${(g - 44) | 0},${(b - 40) | 0},0.5)`;
      for (let i = 0; i < 40; i++) {
        ctx.fillRect(x + offset + rand() * cell, y + rand() * cell, 1.6, 1.6);
      }
      if (rand() > 0.72) {
        ctx.fillStyle = `rgba(86,104,64,${0.1 + rand() * 0.2})`;
        ctx.fillRect(x + offset + 2, y + 2, cell - 4, cell - 4);
      }
    }
  }
  return canvas;
}

/** Packed earth, gravel and dust — the unpaved village ground. */
function groundAlbedo() {
  const { canvas, ctx } = canvas2d(1024, 1024);
  const rand = makeRandom(6061);
  ctx.fillStyle = "#6b5b47";
  ctx.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 46; i++) {
    const x = rand() * 1024;
    const y = rand() * 1024;
    const r = 70 + rand() * 230;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const warm = rand();
    g.addColorStop(0, `rgba(${(120 + warm * 50) | 0},${(102 + warm * 40) | 0},${(78 + warm * 30) | 0},0.4)`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  for (let i = 0; i < 30000; i++) {
    const x = rand() * 1024;
    const y = rand() * 1024;
    const size = 0.6 + Math.pow(rand(), 3) * 4.6;
    const v = rand();
    const r = 92 + v * 92;
    const g = 84 + v * 84;
    const b = 70 + v * 72;
    ctx.fillStyle = `rgba(${(r * 0.45) | 0},${(g * 0.45) | 0},${(b * 0.45) | 0},0.5)`;
    ctx.beginPath();
    ctx.ellipse(x + size * 0.4, y + size * 0.4, size, size * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
    ctx.beginPath();
    ctx.ellipse(x, y, size, size * 0.8, rand() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // dry grass tufts
  for (let i = 0; i < 900; i++) {
    const x = rand() * 1024;
    const y = rand() * 1024;
    ctx.strokeStyle = `rgba(${(120 + rand() * 50) | 0},${(118 + rand() * 42) | 0},${(62 + rand() * 40) | 0},0.5)`;
    ctx.lineWidth = 0.8;
    for (let b = 0; b < 4; b++) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rand() - 0.5) * 9, y - 3 - rand() * 8);
      ctx.stroke();
    }
  }
  return canvas;
}

/** Corrugated, rusted metal for shutters and roofs. */
function rustAlbedo() {
  const { canvas, ctx } = canvas2d(512, 512);
  const rand = makeRandom(4242);
  ctx.fillStyle = "#6a6f72";
  ctx.fillRect(0, 0, 512, 512);
  for (let x = 0; x < 512; x += 16) {
    const g = ctx.createLinearGradient(x, 0, x + 16, 0);
    g.addColorStop(0, "rgba(28,30,32,0.55)");
    g.addColorStop(0.5, "rgba(190,196,200,0.3)");
    g.addColorStop(1, "rgba(28,30,32,0.55)");
    ctx.fillStyle = g;
    ctx.fillRect(x, 0, 16, 512);
  }
  for (let i = 0; i < 180; i++) {
    const x = rand() * 512;
    const y = rand() * 512;
    const r = 8 + rand() * 60;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${(140 + rand() * 50) | 0},${(66 + rand() * 30) | 0},28,${0.4 + rand() * 0.5})`);
    g.addColorStop(1, "rgba(120,58,24,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  for (let i = 0; i < 4000; i++) {
    const v = rand() * 120;
    ctx.fillStyle = `rgba(${(v + 40) | 0},${(v * 0.6) | 0},${(v * 0.35) | 0},0.25)`;
    ctx.fillRect(rand() * 512, rand() * 512, 1.6, 1.6);
  }
  return canvas;
}

/** Painted, weathered timber for doors and carts. */
function woodAlbedo() {
  const { canvas, ctx } = canvas2d(512, 512);
  const rand = makeRandom(5150);
  ctx.fillStyle = "#6b4228";
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2600; i++) {
    const y = rand() * 512;
    const v = rand();
    ctx.strokeStyle = `rgba(${(120 + v * 70) | 0},${(72 + v * 48) | 0},${(42 + v * 32) | 0},0.35)`;
    ctx.lineWidth = 0.6 + rand() * 2.2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(170, y + (rand() - 0.5) * 12, 340, y + (rand() - 0.5) * 12, 512, y);
    ctx.stroke();
  }
  for (let x = 0; x < 512; x += 86) {
    ctx.fillStyle = "rgba(24,14,8,0.5)";
    ctx.fillRect(x, 0, 3, 512);
  }
  return canvas;
}

export function makeCloudTexture(renderer: THREE.WebGLRenderer) {
  const { canvas, ctx } = canvas2d(256, 256);
  const rand = makeRandom(1771);
  for (let i = 0; i < 26; i++) {
    const x = 60 + rand() * 136;
    const y = 90 + rand() * 76;
    const r = 26 + rand() * 54;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const a = 0.1 + rand() * 0.16;
    g.addColorStop(0, `rgba(255,255,255,${a})`);
    g.addColorStop(0.55, `rgba(246,248,255,${a * 0.5})`);
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  return texture;
}

/** Warm dusk-to-night equirect environment with city glow at the horizon. */
export function makeEnvironment(renderer: THREE.WebGLRenderer) {
  const { canvas, ctx } = canvas2d(1024, 512);
  const gradient = ctx.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, "#0a1020");
  gradient.addColorStop(0.4, "#243246");
  gradient.addColorStop(0.52, "#6b5668");
  gradient.addColorStop(0.58, "#2a2230");
  gradient.addColorStop(1, "#141116");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1024, 512);

  const rand = makeRandom(404);
  // sodium-lit city haze along the horizon
  for (let i = 0; i < 60; i++) {
    const x = rand() * 1024;
    const r = 30 + rand() * 120;
    const g = ctx.createRadialGradient(x, 268, 0, x, 268, r);
    const warm = rand();
    g.addColorStop(0, `rgba(${(255) | 0},${(150 + warm * 70) | 0},${(60 + warm * 60) | 0},0.34)`);
    g.addColorStop(1, "rgba(255,150,60,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, 268 - r, r * 2, r * 2);
  }
  // a couple of neon pools
  [[0x22, 0xe0, 0xff], [0xff, 0x2d, 0x8f]].forEach((rgb, i) => {
    const x = 240 + i * 520;
    const r = 180;
    const g = ctx.createRadialGradient(x, 250, 0, x, 250, r);
    g.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.3)`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, 250 - r, r * 2, r * 2);
  });
  const moon = ctx.createRadialGradient(300, 120, 0, 300, 120, 150);
  moon.addColorStop(0, "rgba(220,230,255,0.85)");
  moon.addColorStop(1, "rgba(180,200,255,0)");
  ctx.fillStyle = moon;
  ctx.fillRect(150, -30, 300, 300);

  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const target = pmrem.fromEquirectangular(texture);
  pmrem.dispose();
  return { envMap: target.texture, skyTexture: texture };
}

export interface WorldMaterials {
  walls: THREE.MeshStandardMaterial[];
  paperLight: THREE.MeshStandardMaterial;
  paperMid: THREE.MeshStandardMaterial;
  paperDark: THREE.MeshStandardMaterial;
  plaster: THREE.MeshStandardMaterial;
  concrete: THREE.MeshStandardMaterial;
  asphalt: THREE.MeshStandardMaterial;
  pave: THREE.MeshStandardMaterial;
  ground: THREE.MeshStandardMaterial;
  ink: THREE.MeshStandardMaterial;
  metal: THREE.MeshStandardMaterial;
  rust: THREE.MeshStandardMaterial;
  wood: THREE.MeshStandardMaterial;
  chrome: THREE.MeshStandardMaterial;
  rubber: THREE.MeshStandardMaterial;
  glass: THREE.MeshStandardMaterial;
  glassLit: THREE.MeshStandardMaterial;
  cloth: THREE.MeshStandardMaterial;
  foliage: THREE.MeshStandardMaterial;
  water: THREE.MeshStandardMaterial;
  neon: THREE.MeshStandardMaterial[];
  waterNormalMap: THREE.Texture;
  dispose: () => void;
}

export function createMaterials(
  renderer: THREE.WebGLRenderer,
  envMap: THREE.Texture,
): WorldMaterials {
  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(item: T) => {
    disposables.push(item);
    return item;
  };

  const detailRough = track(finish(roughnessNoise(21, 120, 235), renderer, 3, false));

  const makeWall = (hex: string, seed: number, repeat: number, grime = 1) => {
    const albedo = plasterAlbedo(hex, seed, grime);
    const map = track(finish(albedo, renderer, repeat, true));
    const normalMap = track(finish(normalFromCanvas(albedo, 2.4), renderer, repeat, false));
    const material = track(
      new THREE.MeshStandardMaterial({
        map,
        normalMap,
        roughnessMap: detailRough,
        roughness: 0.93,
        metalness: 0,
        envMap,
        envMapIntensity: 0.75,
      }),
    );
    material.normalScale = new THREE.Vector2(0.9, 0.9);
    return material;
  };

  const walls = WALL_COLORS.map((hex, index) => makeWall(hex, 31 + index * 17, 2.2, 1));

  const concreteAlbedo = plasterAlbedo("#9a948a", 777, 1.3);
  const concreteMap = track(finish(concreteAlbedo, renderer, 7, true));
  const concrete = track(
    new THREE.MeshStandardMaterial({
      map: concreteMap,
      normalMap: track(finish(normalFromCanvas(concreteAlbedo, 2.0), renderer, 7, false)),
      roughnessMap: detailRough,
      roughness: 0.96,
      metalness: 0,
      envMap,
      envMapIntensity: 0.55,
    }),
  );

  const asphaltCanvas = asphaltAlbedo();
  const asphaltMap = track(finish(asphaltCanvas, renderer, 24, true));
  const asphalt = track(
    new THREE.MeshStandardMaterial({
      map: asphaltMap,
      normalMap: track(finish(normalFromCanvas(asphaltCanvas, 1.5), renderer, 24, false)),
      roughnessMap: track(finish(roughnessNoise(77, 60, 185), renderer, 24, false)),
      roughness: 0.62,
      metalness: 0.12,
      envMap,
      envMapIntensity: 1.1,
    }),
  );

  const paveCanvas = paveAlbedo();
  const paveMap = track(finish(paveCanvas, renderer, 18, true));
  const pave = track(
    new THREE.MeshStandardMaterial({
      map: paveMap,
      normalMap: track(finish(normalFromCanvas(paveCanvas, 3.0), renderer, 18, false)),
      roughnessMap: detailRough,
      roughness: 0.82,
      metalness: 0.05,
      envMap,
      envMapIntensity: 0.7,
    }),
  );

  const groundCanvas = groundAlbedo();
  const groundMap = track(finish(groundCanvas, renderer, 60, true));
  const ground = track(
    new THREE.MeshStandardMaterial({
      map: groundMap,
      normalMap: track(finish(normalFromCanvas(groundCanvas, 2.6), renderer, 60, false)),
      roughnessMap: detailRough,
      roughness: 0.95,
      metalness: 0,
      envMap,
      envMapIntensity: 0.55,
    }),
  );

  const rustCanvas = rustAlbedo();
  const rustMap = track(finish(rustCanvas, renderer, 4, true));
  const rust = track(
    new THREE.MeshStandardMaterial({
      map: rustMap,
      normalMap: track(finish(normalFromCanvas(rustCanvas, 2.8), renderer, 4, false)),
      roughness: 0.72,
      metalness: 0.65,
      envMap,
      envMapIntensity: 1.0,
    }),
  );

  const woodCanvas = woodAlbedo();
  const wood = track(
    new THREE.MeshStandardMaterial({
      map: track(finish(woodCanvas, renderer, 3, true)),
      normalMap: track(finish(normalFromCanvas(woodCanvas, 2.0), renderer, 3, false)),
      roughness: 0.85,
      metalness: 0,
      envMap,
      envMapIntensity: 0.6,
    }),
  );

  const ink = track(
    new THREE.MeshStandardMaterial({ color: 0x24262b, roughness: 0.6, metalness: 0.35, envMap, envMapIntensity: 0.9 }),
  );
  const metal = track(
    new THREE.MeshStandardMaterial({ color: 0x9aa3ad, roughness: 0.36, metalness: 0.95, envMap, envMapIntensity: 1.3 }),
  );
  const chrome = track(
    new THREE.MeshStandardMaterial({ color: 0xe8edf2, roughness: 0.09, metalness: 1, envMap, envMapIntensity: 1.7 }),
  );
  const rubber = track(
    new THREE.MeshStandardMaterial({ color: 0x1a1b1e, roughness: 0.82, metalness: 0, envMap, envMapIntensity: 0.35 }),
  );
  const glass = track(
    new THREE.MeshStandardMaterial({ color: 0x1d2630, roughness: 0.06, metalness: 0.9, envMap, envMapIntensity: 1.6 }),
  );
  const glassLit = track(
    new THREE.MeshStandardMaterial({
      color: 0x2a2118,
      roughness: 0.3,
      metalness: 0.1,
      emissive: new THREE.Color(0xffb257),
      emissiveIntensity: 0,
    }),
  );
  const cloth = track(
    new THREE.MeshStandardMaterial({
      color: 0xc8503f,
      roughness: 0.95,
      metalness: 0,
      side: THREE.DoubleSide,
      envMap,
      envMapIntensity: 0.5,
    }),
  );
  const foliage = track(
    new THREE.MeshStandardMaterial({
      color: 0x4e7a3a,
      roughness: 0.88,
      metalness: 0,
      side: THREE.DoubleSide,
      envMap,
      envMapIntensity: 0.5,
    }),
  );

  const waterNormalMap = track(finish(normalFromCanvas(groundCanvas, 0.7), renderer, 7, false));
  const water = track(
    new THREE.MeshStandardMaterial({
      color: 0x16202b,
      roughness: 0.045,
      metalness: 0.85,
      normalMap: waterNormalMap,
      envMap,
      envMapIntensity: 1.9,
    }),
  );
  water.normalScale = new THREE.Vector2(0.3, 0.3);

  const neon = NEON_COLORS.map((hex) =>
    track(
      new THREE.MeshStandardMaterial({
        color: 0x0b0b0d,
        emissive: new THREE.Color(hex),
        emissiveIntensity: 1,
        roughness: 0.4,
        metalness: 0,
        toneMapped: true,
      }),
    ),
  );

  return {
    walls,
    paperLight: walls[6],
    paperMid: walls[0],
    paperDark: walls[2],
    plaster: walls[4],
    concrete,
    asphalt,
    pave,
    ground,
    ink,
    metal,
    rust,
    wood,
    chrome,
    rubber,
    glass,
    glassLit,
    cloth,
    foliage,
    water,
    neon,
    waterNormalMap,
    dispose: () => disposables.forEach((item) => item.dispose()),
  };
}
