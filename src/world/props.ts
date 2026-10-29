import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RIVER_HALF_WIDTH, RIVER_Z, STOPS, WORLD_HALF } from "../data/places";
import { MAIN_X, MAIN_Z, ROAD_MAIN, type Collider } from "./city";
import { makeRandom, type WorldMaterials } from "./materials";

export interface PropsBuild {
  group: THREE.Group;
  lampPositions: THREE.Vector3[];
  colliders: Collider[];
  update: (time: number, dt: number, player: THREE.Vector3) => void;
  setNight: (night: number) => void;
}

interface Person {
  walk: boolean;
  axis: "x" | "z";
  fixed: number;
  min: number;
  max: number;
  t: number;
  dir: number;
  speed: number;
  phase: number;
  scale: number;
  yaw: number;
  seed: number;
  x: number;
  z: number;
  stride: number;
  bounce: number;
  lean: number;
}

interface Dog {
  x: number;
  z: number;
  homeX: number;
  homeZ: number;
  tx: number;
  tz: number;
  yaw: number;
  sleeping: boolean;
  pause: number;
  phase: number;
  scale: number;
}

function merge(parts: THREE.BufferGeometry[]) {
  const merged = mergeGeometries(parts, false);
  parts.forEach((part) => part.dispose());
  if (!merged) throw new Error("merge failed");
  return merged;
}

function jitter(geometry: THREE.BufferGeometry, amount: number, seed: number) {
  const rand = makeRandom(seed);
  const position = geometry.attributes.position as THREE.BufferAttribute;
  const cache = new Map<string, [number, number, number]>();
  for (let i = 0; i < position.count; i++) {
    const key = `${position.getX(i).toFixed(3)}|${position.getY(i).toFixed(3)}|${position.getZ(i).toFixed(3)}`;
    let offset = cache.get(key);
    if (!offset) {
      offset = [(rand() - 0.5) * amount, (rand() - 0.5) * amount, (rand() - 0.5) * amount];
      cache.set(key, offset);
    }
    position.setXYZ(i, position.getX(i) + offset[0], position.getY(i) + offset[1], position.getZ(i) + offset[2]);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function poolTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.45)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function buildProps(
  materials: WorldMaterials,
  cityColliders: Collider[],
  low: boolean,
): PropsBuild {
  const group = new THREE.Group();
  const colliders: Collider[] = [];
  const rand = makeRandom(77031);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  /* Spatial grid for fast "is this spot inside a building?" checks. */
  const CELL = 24;
  const grid = new Map<string, Collider[]>();
  cityColliders.forEach((collider) => {
    for (let gx = Math.floor(collider.minX / CELL); gx <= Math.floor(collider.maxX / CELL); gx++) {
      for (let gz = Math.floor(collider.minZ / CELL); gz <= Math.floor(collider.maxZ / CELL); gz++) {
        const key = `${gx}|${gz}`;
        const list = grid.get(key) ?? [];
        list.push(collider);
        grid.set(key, list);
      }
    }
  });
  const blocked = (x: number, z: number, pad: number) => {
    const list = grid.get(`${Math.floor(x / CELL)}|${Math.floor(z / CELL)}`);
    if (!list) return false;
    return list.some(
      (c) => x > c.minX - pad && x < c.maxX + pad && z > c.minZ - pad && z < c.maxZ + pad,
    );
  };
  const nearRiver = (z: number, margin = 0) => Math.abs(z - RIVER_Z) < RIVER_HALF_WIDTH + margin;
  const onRoad = (x: number, z: number, extra = 0) =>
    MAIN_X.some((rx) => Math.abs(x - rx) < ROAD_MAIN / 2 + extra) ||
    MAIN_Z.some((rz) => Math.abs(z - rz) < ROAD_MAIN / 2 + extra);
  const addCollider = (x: number, z: number, r: number) =>
    colliders.push({ minX: x - r, maxX: x + r, minZ: z - r, maxZ: z + r });

  /* ---------------------------------------------------------------- */
  /* Pebbles, rocks, leaves, paper scraps                             */
  /* ---------------------------------------------------------------- */

  const stoneMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, metalness: 0.02 });

  const pebbleCount = low ? 1000 : 2600;
  const pebbles = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), stoneMaterial, pebbleCount);
  let placed = 0;
  for (let tries = 0; tries < pebbleCount * 4 && placed < pebbleCount; tries++) {
    const x = (rand() - 0.5) * WORLD_HALF * 2;
    const z = (rand() - 0.5) * WORLD_HALF * 2;
    if (nearRiver(z, 3) || blocked(x, z, 0.2)) continue;
    const road = onRoad(x, z);
    if (road && rand() > 0.3) continue;
    const s = 0.03 + Math.pow(rand(), 3) * 0.17;
    dummy.position.set(x, (road ? 0.16 : 0) + s * 0.35, z);
    dummy.rotation.set(rand() * 3, rand() * 3, rand() * 3);
    dummy.scale.set(s, s * 0.6, s * 1.15);
    dummy.updateMatrix();
    pebbles.setMatrixAt(placed, dummy.matrix);
    const v = 0.3 + rand() * 0.45;
    pebbles.setColorAt(placed, color.setRGB(v, v * 0.94, v * 0.84));
    placed++;
  }
  pebbles.count = placed;
  pebbles.receiveShadow = true;
  group.add(pebbles);

  const rockGeometry = jitter(new THREE.DodecahedronGeometry(1, 1), 0.35, 12);
  const rockCount = low ? 90 : 190;
  const rocks = new THREE.InstancedMesh(rockGeometry, stoneMaterial, rockCount);
  placed = 0;
  for (let tries = 0; tries < rockCount * 6 && placed < rockCount; tries++) {
    const riverSide = rand() > 0.45;
    const x = (rand() - 0.5) * WORLD_HALF * 2;
    const z = riverSide
      ? RIVER_Z + (rand() > 0.5 ? 1 : -1) * (RIVER_HALF_WIDTH + 2 + rand() * 9)
      : (rand() - 0.5) * WORLD_HALF * 2;
    if (!riverSide && (nearRiver(z, 2) || onRoad(x, z, 0.5))) continue;
    if (blocked(x, z, 0.8)) continue;
    const s = 0.25 + Math.pow(rand(), 2) * 0.8;
    const y = riverSide ? -0.3 - rand() * 0.8 : s * 0.3;
    dummy.position.set(x, y, z);
    dummy.rotation.set(rand() * 0.6, rand() * 6, rand() * 0.6);
    dummy.scale.set(s * (1 + rand() * 0.6), s * 0.7, s);
    dummy.updateMatrix();
    rocks.setMatrixAt(placed, dummy.matrix);
    const v = 0.32 + rand() * 0.38;
    rocks.setColorAt(placed, color.setRGB(v, v * 0.96, v * 0.88));
    if (!riverSide && s > 0.5) addCollider(x, z, s * 0.9);
    placed++;
  }
  rocks.count = placed;
  rocks.castShadow = true;
  rocks.receiveShadow = true;
  group.add(rocks);

  const leafMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.95,
    side: THREE.DoubleSide,
  });
  const leafCount = low ? 500 : 1400;
  const leaves = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.17, 0.09), leafMaterial, leafCount);
  placed = 0;
  for (let tries = 0; tries < leafCount * 3 && placed < leafCount; tries++) {
    const x = (rand() - 0.5) * WORLD_HALF * 2;
    const z = (rand() - 0.5) * WORLD_HALF * 2;
    if (nearRiver(z, 2) || blocked(x, z, 0.1)) continue;
    dummy.position.set(x, onRoad(x, z) ? 0.17 : 0.02, z);
    dummy.rotation.set(-Math.PI / 2 + (rand() - 0.5) * 0.3, 0, rand() * 6);
    const s = 0.7 + rand() * 0.9;
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();
    leaves.setMatrixAt(placed, dummy.matrix);
    const warm = rand();
    leaves.setColorAt(placed, color.setRGB(0.42 + warm * 0.3, 0.3 + warm * 0.26, 0.1 + warm * 0.12));
    placed++;
  }
  leaves.count = placed;
  leaves.receiveShadow = true;
  group.add(leaves);

  // folded paper scraps — tiny origami litter
  const scrapCount = low ? 80 : 180;
  const scraps = new THREE.InstancedMesh(new THREE.ConeGeometry(0.1, 0.03, 3), materials.paperLight, scrapCount);
  placed = 0;
  for (let tries = 0; tries < scrapCount * 4 && placed < scrapCount; tries++) {
    const x = (rand() - 0.5) * WORLD_HALF * 2;
    const z = (rand() - 0.5) * WORLD_HALF * 2;
    if (nearRiver(z, 2) || blocked(x, z, 0.1)) continue;
    dummy.position.set(x, onRoad(x, z) ? 0.18 : 0.03, z);
    dummy.rotation.set(rand() * 0.3, rand() * 6, rand() * 0.3);
    dummy.scale.setScalar(0.8 + rand());
    dummy.updateMatrix();
    scraps.setMatrixAt(placed, dummy.matrix);
    placed++;
  }
  scraps.count = placed;
  group.add(scraps);

  /* Puddles on the roads — wet reflections for the night. */
  const puddleMaterial = new THREE.MeshStandardMaterial({
    color: 0x161616,
    roughness: 0.04,
    metalness: 0.9,
    envMapIntensity: 1.6,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  });
  const puddleCount = low ? 30 : 60;
  const puddles = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 28), puddleMaterial, puddleCount);
  placed = 0;
  for (let tries = 0; tries < puddleCount * 5 && placed < puddleCount; tries++) {
    const alongX = rand() > 0.5;
    let x: number;
    let z: number;
    if (alongX) {
      z = MAIN_Z[Math.floor(rand() * MAIN_Z.length)] + (rand() - 0.5) * (ROAD_MAIN - 3);
      x = (rand() - 0.5) * WORLD_HALF * 1.9;
    } else {
      x = MAIN_X[Math.floor(rand() * MAIN_X.length)] + (rand() - 0.5) * (ROAD_MAIN - 3);
      z = (rand() - 0.5) * WORLD_HALF * 1.9;
    }
    if (nearRiver(z, 10)) continue;
    dummy.position.set(x, 0.165, z);
    dummy.rotation.set(-Math.PI / 2, 0, rand() * 6);
    dummy.scale.set(1.1 + rand() * 2.4, 0.7 + rand() * 1.4, 1);
    dummy.updateMatrix();
    puddles.setMatrixAt(placed, dummy.matrix);
    placed++;
  }
  puddles.count = placed;
  puddles.receiveShadow = true;
  group.add(puddles);

  /* ---------------------------------------------------------------- */
  /* Trees                                                            */
  /* ---------------------------------------------------------------- */

  const trunkGeometry = (() => {
    const trunk = new THREE.CylinderGeometry(0.13, 0.27, 3.4, 8, 3);
    trunk.translate(0, 1.7, 0);
    const branchA = new THREE.CylinderGeometry(0.05, 0.1, 1.6, 6);
    branchA.rotateZ(0.8);
    branchA.translate(0.5, 3.1, 0);
    const branchB = new THREE.CylinderGeometry(0.05, 0.09, 1.4, 6);
    branchB.rotateX(-0.75);
    branchB.translate(0, 3.0, 0.45);
    return jitter(merge([trunk, branchA, branchB]), 0.06, 4);
  })();
  const canopyGeometry = (() => {
    const blobs: THREE.BufferGeometry[] = [];
    const r = makeRandom(91);
    for (let i = 0; i < 6; i++) {
      const radius = 1.0 + r() * 0.8;
      const blob = new THREE.IcosahedronGeometry(radius, 1);
      blob.translate((r() - 0.5) * 2.4, 3.8 + r() * 1.5, (r() - 0.5) * 2.4);
      blobs.push(blob);
    }
    return jitter(merge(blobs), 0.38, 8);
  })();

  const treeCount = low ? 80 : 170;
  const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x5b4632, roughness: 0.95 });
  const trunks = new THREE.InstancedMesh(trunkGeometry, trunkMaterial, treeCount);
  const canopies = new THREE.InstancedMesh(canopyGeometry, materials.foliage, treeCount);
  canopies.material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.86,
    flatShading: true,
  });

  const treeSpots: [number, number][] = [];
  MAIN_Z.forEach((rz) => {
    for (let x = -WORLD_HALF + 10; x < WORLD_HALF; x += 15 + rand() * 12) {
      treeSpots.push([x, rz + (rand() > 0.5 ? 1 : -1) * (ROAD_MAIN / 2 + 1.4)]);
    }
  });
  for (let x = -WORLD_HALF; x < WORLD_HALF; x += 9 + rand() * 9) {
    treeSpots.push([x, RIVER_Z + (rand() > 0.5 ? 1 : -1) * (RIVER_HALF_WIDTH + 5 + rand() * 7)]);
  }
  for (let i = 0; i < 260; i++) {
    treeSpots.push([(rand() - 0.5) * WORLD_HALF * 2, (rand() - 0.5) * WORLD_HALF * 2]);
  }

  placed = 0;
  for (const [x, z] of treeSpots) {
    if (placed >= treeCount) break;
    if (nearRiver(z, 3) || blocked(x, z, 1.6)) continue;
    if (MAIN_X.some((rx) => Math.abs(x - rx) < ROAD_MAIN / 2 + 1)) continue;
    if (MAIN_Z.some((rz) => Math.abs(z - rz) < ROAD_MAIN / 2 + 0.6)) continue;
    if (STOPS.some((stop) => Math.hypot(stop.x - x, stop.z - z) < 8)) continue;
    const s = 0.75 + rand() * 0.75;
    dummy.position.set(x, 0, z);
    dummy.rotation.set(0, rand() * 6, 0);
    dummy.scale.set(s, s * (0.9 + rand() * 0.3), s);
    dummy.updateMatrix();
    trunks.setMatrixAt(placed, dummy.matrix);
    canopies.setMatrixAt(placed, dummy.matrix);
    const leafy = rand();
    canopies.setColorAt(placed, color.setRGB(0.16 + leafy * 0.18, 0.34 + leafy * 0.26, 0.14 + leafy * 0.12));
    addCollider(x, z, 0.45 * s);
    placed++;
  }
  trunks.count = placed;
  canopies.count = placed;
  trunks.castShadow = true;
  canopies.castShadow = true;
  canopies.receiveShadow = true;
  group.add(trunks, canopies);

  /* ---------------------------------------------------------------- */
  /* Street lamps + light pools                                       */
  /* ---------------------------------------------------------------- */

  const lampGeometry = (() => {
    const post = new THREE.CylinderGeometry(0.07, 0.11, 6.2, 8);
    post.translate(0, 3.1, 0);
    const base = new THREE.CylinderGeometry(0.18, 0.22, 0.5, 8);
    base.translate(0, 0.25, 0);
    const arm = new THREE.CylinderGeometry(0.035, 0.035, 1.8, 6);
    arm.rotateZ(Math.PI / 2);
    arm.translate(0.9, 6.1, 0);
    const head = new THREE.BoxGeometry(0.62, 0.14, 0.3);
    head.translate(1.75, 6.04, 0);
    return merge([post, base, arm, head]);
  })();
  const bulbOffset = new THREE.Vector3(1.75, 5.95, 0);

  const lampSpots: { x: number; z: number; yaw: number }[] = [];
  const lampStep = low ? 46 : 32;
  MAIN_Z.forEach((rz, index) => {
    for (let x = -WORLD_HALF + 12; x < WORLD_HALF; x += lampStep) {
      if (MAIN_X.some((rx) => Math.abs(x - rx) < ROAD_MAIN / 2 + 2)) continue;
      const side = (Math.floor(x / lampStep) + index) % 2 === 0 ? 1 : -1;
      lampSpots.push({ x, z: rz + side * (ROAD_MAIN / 2 + 0.7), yaw: side > 0 ? Math.PI / 2 : -Math.PI / 2 });
    }
  });
  MAIN_X.forEach((rx) => {
    for (let z = -WORLD_HALF + 20; z < WORLD_HALF + 20; z += lampStep) {
      if (nearRiver(z, 10)) continue;
      if (MAIN_Z.some((rz) => Math.abs(z - rz) < ROAD_MAIN / 2 + 2)) continue;
      lampSpots.push({ x: rx - (ROAD_MAIN / 2 + 0.7), z, yaw: 0 });
    }
  });

  const lamps = new THREE.InstancedMesh(lampGeometry, materials.ink, lampSpots.length);
  const bulbMaterial = new THREE.MeshStandardMaterial({
    color: 0x201a12,
    emissive: new THREE.Color(0xffb257),
    emissiveIntensity: 4,
  });
  const bulbs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.46, 0.06, 0.2), bulbMaterial, lampSpots.length);
  const poolMaterial = new THREE.MeshBasicMaterial({
    map: poolTexture(),
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    color: 0xffb673,
  });
  const pools = new THREE.InstancedMesh(new THREE.PlaneGeometry(11, 11), poolMaterial, lampSpots.length);
  const lampPositions: THREE.Vector3[] = [];

  lampSpots.forEach((spot, index) => {
    dummy.position.set(spot.x, 0, spot.z);
    dummy.rotation.set(0, spot.yaw, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    lamps.setMatrixAt(index, dummy.matrix);
    const bulb = bulbOffset.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), spot.yaw);
    bulb.add(new THREE.Vector3(spot.x, 0, spot.z));
    lampPositions.push(bulb.clone());
    dummy.position.copy(bulb);
    dummy.updateMatrix();
    bulbs.setMatrixAt(index, dummy.matrix);
    dummy.position.set(bulb.x, 0.19, bulb.z);
    dummy.rotation.set(-Math.PI / 2, 0, 0);
    dummy.updateMatrix();
    pools.setMatrixAt(index, dummy.matrix);
    addCollider(spot.x, spot.z, 0.3);
  });
  lamps.castShadow = true;
  pools.renderOrder = 2;
  group.add(lamps, bulbs, pools);

  /* ---------------------------------------------------------------- */
  /* People                                                           */
  /* ---------------------------------------------------------------- */

  // torso + hips only; head and limbs are separate so they can animate
  const bodyGeometry = merge([
    new THREE.CapsuleGeometry(0.2, 0.44, 5, 12).translate(0, 1.24, 0),
    new THREE.CapsuleGeometry(0.17, 0.15, 5, 12).rotateZ(Math.PI / 2).translate(0, 0.95, 0),
  ]);
  const headGeometry = merge([
    new THREE.CylinderGeometry(0.052, 0.062, 0.1, 8).translate(0, -0.1, 0),
    new THREE.SphereGeometry(0.113, 16, 12).scale(1, 1.14, 0.95),
    new THREE.SphereGeometry(0.118, 14, 10).scale(1, 1.05, 1).translate(0, 0.022, -0.012),
  ]);
  const thighGeometry = merge([new THREE.CapsuleGeometry(0.077, 0.32, 4, 10).translate(0, -0.2, 0)]);
  const shinGeometry = merge([
    new THREE.CapsuleGeometry(0.062, 0.3, 4, 10).translate(0, -0.19, 0),
    new THREE.BoxGeometry(0.1, 0.075, 0.25).translate(0, -0.38, 0.055),
  ]);
  const upperArmGeometry = new THREE.CapsuleGeometry(0.056, 0.22, 4, 8).translate(0, -0.14, 0);
  const foreArmGeometry = merge([
    new THREE.CapsuleGeometry(0.048, 0.2, 4, 8).translate(0, -0.13, 0),
    new THREE.SphereGeometry(0.055, 10, 8).translate(0, -0.26, 0),
  ]);

  const people: Person[] = [];
  const addWalker = (axis: "x" | "z", fixed: number, min: number, max: number) => {
    const t = min + rand() * (max - min);
    people.push({
      walk: true,
      axis,
      fixed,
      min,
      max,
      t,
      dir: rand() > 0.5 ? 1 : -1,
      speed: 0.9 + rand() * 0.6,
      phase: rand() * 6,
      scale: 0.88 + rand() * 0.2,
      yaw: 0,
      seed: rand() * 10,
      x: 0,
      z: 0,
      stride: 0.8 + rand() * 0.45,
      bounce: 0.8 + rand() * 0.5,
      lean: 0.02 + rand() * 0.05,
    });
  };
  const addStander = (x: number, z: number, yaw: number) => {
    if (blocked(x, z, 0.3)) return;
    people.push({
      walk: false,
      axis: "x",
      fixed: 0,
      min: 0,
      max: 0,
      t: 0,
      dir: 1,
      speed: 0,
      phase: rand() * 6,
      scale: 0.86 + rand() * 0.22,
      yaw,
      seed: rand() * 10,
      x,
      z,
      stride: 1,
      bounce: 1,
      lean: 0.03,
    });
  };

  const walkerCount = low ? 26 : 56;
  for (let i = 0; i < walkerCount; i++) {
    if (rand() > 0.35) {
      const rz = MAIN_Z[Math.floor(rand() * MAIN_Z.length)];
      const side = rand() > 0.5 ? 1 : -1;
      const start = (rand() - 0.5) * WORLD_HALF * 1.7;
      addWalker("x", rz + side * (ROAD_MAIN / 2 + 1.2), start - 25 - rand() * 30, start + 25 + rand() * 30);
    } else {
      const rx = MAIN_X[Math.floor(rand() * MAIN_X.length)];
      const side = rand() > 0.5 ? 1 : -1;
      const north = rand() > 0.5;
      const min = north ? RIVER_Z + RIVER_HALF_WIDTH + 12 : -WORLD_HALF + 10;
      const max = north ? WORLD_HALF : RIVER_Z - RIVER_HALF_WIDTH - 12;
      const start = min + rand() * (max - min);
      addWalker(
        "z",
        rx + side * (ROAD_MAIN / 2 + 1.2),
        Math.max(min, start - 30),
        Math.min(max, start + 30),
      );
    }
  }

  // small crowds at every stop, gathered like at a chai stall
  STOPS.forEach((stop) => {
    const onXRoad = MAIN_X.some((rx) => Math.abs(stop.x - rx) < 1);
    const groupCount = low ? 3 : 5;
    for (let i = 0; i < groupCount; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      const along = (rand() - 0.5) * 7;
      const off = ROAD_MAIN / 2 + 0.9 + rand() * 0.8;
      const x = onXRoad ? stop.x + side * off : stop.x + along;
      const z = onXRoad ? stop.z + along : stop.z + side * off;
      const yaw = Math.atan2(stop.x - x, stop.z - z) + (rand() - 0.5) * 0.8;
      addStander(x, z, yaw);
    }
  });
  // shoppers along the bazaar stalls
  for (let i = 0; i < (low ? 8 : 18); i++) {
    const x = -150 + rand() * 300;
    const side = rand() > 0.5 ? 1 : -1;
    addStander(x, 26 + side * 7.4, side > 0 ? Math.PI : 0);
  }

  const clothMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.88, metalness: 0 });
  const skinMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.68, metalness: 0 });
  const bodies = new THREE.InstancedMesh(bodyGeometry, clothMaterial, people.length);
  const headsMesh = new THREE.InstancedMesh(headGeometry, skinMaterial, people.length);
  const thighMesh = new THREE.InstancedMesh(thighGeometry, clothMaterial, people.length * 2);
  const shinMesh = new THREE.InstancedMesh(shinGeometry, clothMaterial, people.length * 2);
  const upperArmMesh = new THREE.InstancedMesh(upperArmGeometry, clothMaterial, people.length * 2);
  const foreArmMesh = new THREE.InstancedMesh(foreArmGeometry, skinMaterial, people.length * 2);

  // saris, kurtas, work shirts — saturated but dusty
  const SHIRTS = [0xd8463c, 0x2f6fb5, 0xe0a52c, 0x3f9a6a, 0xca4f8e, 0xe8e2d2, 0x7a4fb5, 0xef7a30];
  const PANTS = [0x2a3340, 0x4a4036, 0x6b6257, 0x23262b, 0x3b4a5a];
  const SKIN = [0x8d5524, 0xa9713b, 0xc68642, 0x7a4320, 0xe0ac69];
  people.forEach((_, index) => {
    const shirt = color.setHex(SHIRTS[Math.floor(rand() * SHIRTS.length)]).clone();
    const pants = color.setHex(PANTS[Math.floor(rand() * PANTS.length)]).clone();
    const skin = color.setHex(SKIN[Math.floor(rand() * SKIN.length)]).clone();
    bodies.setColorAt(index, shirt);
    headsMesh.setColorAt(index, skin);
    for (let s = 0; s < 2; s++) {
      thighMesh.setColorAt(index * 2 + s, pants);
      shinMesh.setColorAt(index * 2 + s, pants);
      upperArmMesh.setColorAt(index * 2 + s, shirt);
      foreArmMesh.setColorAt(index * 2 + s, skin);
    }
  });
  const personMeshes = [bodies, headsMesh, thighMesh, shinMesh, upperArmMesh, foreArmMesh];
  personMeshes.forEach((mesh) => {
    mesh.castShadow = true;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    group.add(mesh);
  });

  /* ---------------------------------------------------------------- */
  /* Street dogs                                                      */
  /* ---------------------------------------------------------------- */

  const dogGeometry = merge([
    new THREE.CapsuleGeometry(0.16, 0.48, 4, 10).rotateX(Math.PI / 2).translate(0, 0.46, 0),
    new THREE.SphereGeometry(0.13, 12, 10).translate(0, 0.62, 0.42),
    new THREE.BoxGeometry(0.09, 0.08, 0.17).translate(0, 0.58, 0.56),
    new THREE.ConeGeometry(0.045, 0.13, 4).translate(0.07, 0.76, 0.4),
    new THREE.ConeGeometry(0.045, 0.13, 4).translate(-0.07, 0.76, 0.4),
    new THREE.CylinderGeometry(0.02, 0.04, 0.38, 6).rotateX(-0.9).translate(0, 0.6, -0.42),
    new THREE.CylinderGeometry(0.035, 0.03, 0.44, 6).translate(0.08, 0.22, 0.22),
    new THREE.CylinderGeometry(0.035, 0.03, 0.44, 6).translate(-0.08, 0.22, 0.22),
    new THREE.CylinderGeometry(0.035, 0.03, 0.44, 6).translate(0.08, 0.22, -0.22),
    new THREE.CylinderGeometry(0.035, 0.03, 0.44, 6).translate(-0.08, 0.22, -0.22),
  ]);
  const dogs: Dog[] = [];
  const dogCount = low ? 12 : 24;
  for (let tries = 0; tries < dogCount * 8 && dogs.length < dogCount; tries++) {
    const alongZ = rand() > 0.5;
    const x = alongZ
      ? MAIN_X[Math.floor(rand() * MAIN_X.length)] + (rand() > 0.5 ? 1 : -1) * (ROAD_MAIN / 2 + 1.0)
      : (rand() - 0.5) * WORLD_HALF * 1.8;
    const z = alongZ
      ? (rand() - 0.5) * WORLD_HALF * 1.8
      : MAIN_Z[Math.floor(rand() * MAIN_Z.length)] + (rand() > 0.5 ? 1 : -1) * (ROAD_MAIN / 2 + 1.0);
    if (nearRiver(z, 8) || blocked(x, z, 0.5)) continue;
    dogs.push({
      x,
      z,
      homeX: x,
      homeZ: z,
      tx: x,
      tz: z,
      yaw: rand() * 6,
      sleeping: rand() < 0.4,
      pause: rand() * 3,
      phase: rand() * 6,
      scale: 0.85 + rand() * 0.35,
    });
  }
  const dogMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
  const dogMesh = new THREE.InstancedMesh(dogGeometry, dogMaterial, dogs.length);
  const DOG_COATS = [0xb07a42, 0xd8c9a8, 0x6d5844, 0x3b3330, 0xe2d5bd];
  dogs.forEach((_, index) => {
    dogMesh.setColorAt(index, color.setHex(DOG_COATS[Math.floor(rand() * DOG_COATS.length)]).clone());
  });
  dogMesh.castShadow = true;
  dogMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  dogMesh.frustumCulled = false;
  group.add(dogMesh);

  /* ---------------------------------------------------------------- */
  /* Animation                                                         */
  /* ---------------------------------------------------------------- */

  const base = new THREE.Matrix4();
  const local = new THREE.Matrix4();
  const rotation = new THREE.Matrix4();
  const out = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const yAxis = new THREE.Vector3(0, 1, 0);

  /** Place a limb segment in the person's local space, rotated about a joint. */
  const limb = (
    target: THREE.InstancedMesh,
    index: number,
    jointX: number,
    jointY: number,
    jointZ: number,
    pitch: number,
    roll: number,
  ) => {
    local.makeTranslation(jointX, jointY, jointZ);
    rotation.makeRotationFromEuler(new THREE.Euler(pitch, 0, roll));
    local.multiply(rotation);
    out.multiplyMatrices(base, local);
    target.setMatrixAt(index, out);
  };

  const update = (time: number, dt: number, player: THREE.Vector3) => {
    people.forEach((person, index) => {
      let moving = person.walk;
      let x = person.x;
      let z = person.z;
      if (person.walk) {
        x = person.axis === "x" ? person.t : person.fixed;
        z = person.axis === "z" ? person.t : person.fixed;
        if (Math.hypot(player.x - x, player.z - z) < 2.8) {
          moving = false;
          person.yaw = Math.atan2(player.x - x, player.z - z);
        } else {
          person.t += person.speed * dt * person.dir;
          if (person.t > person.max) {
            person.t = person.max;
            person.dir = -1;
          } else if (person.t < person.min) {
            person.t = person.min;
            person.dir = 1;
          }
          const targetYaw =
            person.axis === "x"
              ? person.dir > 0 ? Math.PI / 2 : -Math.PI / 2
              : person.dir > 0 ? 0 : Math.PI;
          let diff = targetYaw - person.yaw;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          person.yaw += diff * Math.min(1, dt * 6);
          person.phase += person.speed * dt * 4.6;
        }
      }

      const p = person.phase;
      const s = person.stride;
      // hips and shoulders counter-rotate; the body rises twice per stride
      const hipSwing = moving ? Math.sin(p) * 0.62 * s : Math.sin(time * 0.8 + person.seed) * 0.03;
      const hipSwingB = moving ? Math.sin(p + Math.PI) * 0.62 * s : Math.sin(time * 0.8 + person.seed + 1) * 0.03;
      // knees only bend backwards, strongest just after the foot lifts
      const kneeA = moving ? Math.max(0, Math.sin(p - 1.1)) * 1.15 * s : 0.05;
      const kneeB = moving ? Math.max(0, Math.sin(p + Math.PI - 1.1)) * 1.15 * s : 0.05;
      const armA = moving ? Math.sin(p + Math.PI) * 0.5 * s : Math.sin(time * 0.7 + person.seed) * 0.05;
      const armB = moving ? Math.sin(p) * 0.5 * s : Math.sin(time * 0.7 + person.seed + 2) * 0.05;
      const elbowA = moving ? 0.35 + Math.max(0, Math.sin(p + Math.PI)) * 0.55 : 0.22;
      const elbowB = moving ? 0.35 + Math.max(0, Math.sin(p)) * 0.55 : 0.22;
      const bob = moving ? Math.abs(Math.cos(p)) * 0.05 * person.bounce : 0;
      const sway = moving ? Math.sin(p) * 0.035 : 0;
      const lean = moving ? person.lean : 0;

      position.set(x, bob, z);
      quaternion.setFromAxisAngle(yAxis, person.yaw + (moving ? Math.sin(p) * 0.06 : Math.sin(time * 0.3 + person.seed) * 0.12));
      scale.setScalar(person.scale);
      base.compose(position, quaternion, scale);

      // torso leans into the walk and rolls with the hips
      local.makeTranslation(0, 0, 0);
      rotation.makeRotationFromEuler(new THREE.Euler(lean, 0, sway));
      local.multiply(rotation);
      out.multiplyMatrices(base, local);
      bodies.setMatrixAt(index, out);

      // head counter-rotates so it stays level, and glances around when idle
      const glance = moving ? -lean * 0.8 : Math.sin(time * 0.45 + person.seed * 2) * 0.22;
      limb(headsMesh, index, 0, 1.73, 0.02, moving ? -lean * 0.5 : 0, -sway * 0.6 + glance * 0.1);

      limb(thighMesh, index * 2, 0.105, 0.93, 0, hipSwing, 0.02);
      limb(thighMesh, index * 2 + 1, -0.105, 0.93, 0, hipSwingB, -0.02);
      // knee position follows the end of the thigh
      limb(shinMesh, index * 2, 0.105 + Math.sin(hipSwing) * 0.0, 0.93 - 0.4 * Math.cos(hipSwing), -0.4 * Math.sin(-hipSwing), hipSwing - kneeA, 0.02);
      limb(shinMesh, index * 2 + 1, -0.105, 0.93 - 0.4 * Math.cos(hipSwingB), -0.4 * Math.sin(-hipSwingB), hipSwingB - kneeB, -0.02);

      limb(upperArmMesh, index * 2, 0.245, 1.5, 0, armA, 0.14);
      limb(upperArmMesh, index * 2 + 1, -0.245, 1.5, 0, armB, -0.14);
      limb(foreArmMesh, index * 2, 0.245 + 0.03, 1.5 - 0.27 * Math.cos(armA), -0.27 * Math.sin(-armA), armA - elbowA, 0.1);
      limb(foreArmMesh, index * 2 + 1, -0.245 - 0.03, 1.5 - 0.27 * Math.cos(armB), -0.27 * Math.sin(-armB), armB - elbowB, -0.1);
    });
    personMeshes.forEach((mesh) => (mesh.instanceMatrix.needsUpdate = true));

    dogs.forEach((dog, index) => {
      let moving = false;
      if (!dog.sleeping) {
        const distToPlayer = Math.hypot(player.x - dog.x, player.z - dog.z);
        if (distToPlayer < 5) {
          // trot away from the cycle
          const ax = dog.x - player.x;
          const az = dog.z - player.z;
          const len = Math.hypot(ax, az) || 1;
          dog.tx = dog.x + (ax / len) * 5;
          dog.tz = dog.z + (az / len) * 5;
          dog.pause = 0;
        }
        if (dog.pause > 0) {
          dog.pause -= dt;
        } else {
          const dx = dog.tx - dog.x;
          const dz = dog.tz - dog.z;
          const dist = Math.hypot(dx, dz);
          if (dist < 0.3) {
            dog.pause = 1.5 + Math.random() * 4;
            dog.tx = dog.homeX + (Math.random() - 0.5) * 12;
            dog.tz = dog.homeZ + (Math.random() - 0.5) * 12;
            if (blocked(dog.tx, dog.tz, 0.4) || nearRiver(dog.tz, 4)) {
              dog.tx = dog.homeX;
              dog.tz = dog.homeZ;
            }
          } else {
            const speed = 1.9;
            dog.x += (dx / dist) * speed * dt;
            dog.z += (dz / dist) * speed * dt;
            const targetYaw = Math.atan2(dx, dz);
            let diff = targetYaw - dog.yaw;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            dog.yaw += diff * Math.min(1, dt * 8);
            dog.phase += dt * 12;
            moving = true;
          }
        }
      }
      const breathe = Math.sin(time * 2 + index) * 0.02;
      position.set(dog.x, moving ? Math.abs(Math.sin(dog.phase)) * 0.06 : dog.sleeping ? -0.18 : 0, dog.z);
      quaternion.setFromAxisAngle(yAxis, dog.yaw);
      scale.set(dog.scale, dog.scale * (dog.sleeping ? 0.5 + breathe : 1), dog.scale);
      base.compose(position, quaternion, scale);
      dogMesh.setMatrixAt(index, base);
    });
    dogMesh.instanceMatrix.needsUpdate = true;
  };

  update(0, 0, new THREE.Vector3(9999, 0, 9999));

  const setNight = (night: number) => {
    bulbMaterial.emissiveIntensity = 0.04 + night * 6;
    poolMaterial.opacity = night * 0.42;
    pools.visible = night > 0.02;
  };

  return { group, lampPositions, colliders, update, setNight };
}
