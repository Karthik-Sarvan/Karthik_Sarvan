import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { BRIDGE_X, EASTER_EGGS, RIVER_HALF_WIDTH, RIVER_Z, WORLD_HALF } from "../data/places";
import { makeRandom, type WorldMaterials } from "./materials";

export interface Collider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface EggPickup {
  id: string;
  name: string;
  note: string;
  object: THREE.Object3D;
  position: THREE.Vector3;
  collected: boolean;
  spin: number;
}

export interface CityBuild {
  group: THREE.Group;
  colliders: Collider[];
  eggs: EggPickup[];
  water: THREE.Mesh;
  update: (time: number) => void;
}

export const ROAD_MAIN = 13;
const ROAD_GULLY = 7.2;

export const MAIN_X = [-186, -62, 64, 182];
export const MAIN_Z = [-196, -78, 26, 186, 236];

type GeoBucket = THREE.BufferGeometry[];

/** Material channel used when chunking geometry. */
interface Channel {
  name: string;
}

const CELL = 72;

/**
 * Geometry is merged per material AND per spatial cell, so the renderer can
 * frustum-cull the city instead of drawing every lane at once.
 */
class Chunker {
  private cells = new Map<string, GeoBucket>();

  add(channel: Channel, geometry: THREE.BufferGeometry, x: number, z: number) {
    const key = `${channel.name}|${Math.floor(x / CELL)}|${Math.floor(z / CELL)}`;
    let bucket = this.cells.get(key);
    if (!bucket) {
      bucket = [];
      this.cells.set(key, bucket);
    }
    bucket.push(geometry);
  }

  flush(
    group: THREE.Group,
    lookup: Record<string, THREE.Material>,
    shadows: Record<string, { cast: boolean; receive: boolean }>,
  ) {
    this.cells.forEach((bucket, key) => {
      const name = key.split("|")[0];
      const material = lookup[name];
      if (!material || !bucket.length) return;
      const merged = mergeGeometries(bucket, false);
      bucket.forEach((geometry) => geometry.dispose());
      if (!merged) return;
      const mesh = new THREE.Mesh(merged, material);
      const flags = shadows[name] ?? { cast: true, receive: true };
      mesh.castShadow = flags.cast;
      mesh.receiveShadow = flags.receive;
      group.add(mesh);
    });
    this.cells.clear();
  }
}

function inRiver(z: number, margin = 0) {
  return Math.abs(z - RIVER_Z) < RIVER_HALF_WIDTH + margin;
}

function onBridge(x: number) {
  return BRIDGE_X.some((bx) => Math.abs(x - bx) < ROAD_MAIN * 0.8);
}

export function buildCity(materials: WorldMaterials): CityBuild {
  const group = new THREE.Group();
  const colliders: Collider[] = [];
  const eggs: EggPickup[] = [];
  const rand = makeRandom(20260426);

  const chunker = new Chunker();
  const wallChannels: Channel[] = Array.from({ length: 8 }, (_, i) => ({ name: `wall${i}` }));
  const wallLight: Channel = wallChannels[6];
  const wallMid: Channel = wallChannels[0];
  const wallDark: Channel = wallChannels[2];
  void wallChannels[4];
  const rustParts: Channel = { name: "rust" };
  const woodParts: Channel = { name: "wood" };
  const neonChannels: Channel[] = Array.from({ length: 6 }, (_, i) => ({ name: `neon${i}` }));
  const inkParts: Channel = { name: "ink" };
  const metalParts: Channel = { name: "metal" };
  const concreteParts: Channel = { name: "concrete" };
  const clothParts: Channel = { name: "cloth" };
  const foliageParts: Channel = { name: "foliage" };
  const glassParts: Channel = { name: "glass" };
  const glassLit: Channel = { name: "glassLit" };
  const roadBucket: Channel = { name: "asphalt" };
  const paveBucket: Channel = { name: "pave" };

  const wallBuckets = wallChannels;

  const pushBox = (
    channel: Channel,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    rotY = 0,
  ) => {
    const geometry = new THREE.BoxGeometry(w, h, d);
    const matrix = new THREE.Matrix4().makeRotationY(rotY);
    matrix.setPosition(x, y, z);
    geometry.applyMatrix4(matrix);
    chunker.add(channel, geometry, x, z);
  };

  const pushGeometry = (
    channel: Channel,
    geometry: THREE.BufferGeometry,
    position: THREE.Vector3,
    rotation?: THREE.Euler,
    scale?: THREE.Vector3,
  ) => {
    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    if (rotation) quaternion.setFromEuler(rotation);
    matrix.compose(position, quaternion, scale ?? new THREE.Vector3(1, 1, 1));
    const clone = geometry.clone();
    clone.applyMatrix4(matrix);
    chunker.add(channel, clone, position.x, position.z);
  };

  /* ---------------------------------------------------------------- */
  /* Ground, roads, river                                             */
  /* ---------------------------------------------------------------- */

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD_HALF * 2 + 120, WORLD_HALF * 2 + 120),
    materials.ground,
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);

  MAIN_X.forEach((x) => {
    // split the road around the river, bridges carry it across
    const segments: [number, number][] = [
      [-WORLD_HALF - 40, RIVER_Z - RIVER_HALF_WIDTH],
      [RIVER_Z + RIVER_HALF_WIDTH, WORLD_HALF + 40],
    ];
    if (onBridge(x)) {
      segments.splice(0, 2, [-WORLD_HALF - 40, WORLD_HALF + 40]);
    }
    segments.forEach(([z0, z1]) => {
      const length = z1 - z0;
      pushBox(roadBucket, ROAD_MAIN, 0.18, length, x, 0.07, z0 + length / 2);
    });
  });

  MAIN_Z.forEach((z) => {
    if (inRiver(z, 6)) return;
    pushBox(roadBucket, (WORLD_HALF + 40) * 2, 0.18, ROAD_MAIN, 0, 0.07, z);
  });


  // river water
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry((WORLD_HALF + 60) * 2, RIVER_HALF_WIDTH * 2 + 6, 1, 1),
    materials.water,
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, -0.55, RIVER_Z);
  water.receiveShadow = false;
  group.add(water);

  // river bed trench walls + ghat steps on the near bank
  const bank: Channel = paveBucket;
  const stepCount = 9;
  for (let i = 0; i < stepCount; i++) {
    const depth = 1.25;
    const y = -0.1 - i * 0.26;
    const zNear = RIVER_Z - RIVER_HALF_WIDTH - 2 + i * depth;
    pushBox(bank, (WORLD_HALF + 60) * 2, 0.26, depth, 0, y + 0.13, zNear);
    const zFar = RIVER_Z + RIVER_HALF_WIDTH + 2 - i * depth;
    pushBox(bank, (WORLD_HALF + 60) * 2, 0.26, depth, 0, y + 0.13, zFar);
  }

  // bridges
  BRIDGE_X.forEach((x) => {
    const deck: Channel = paveBucket;
    pushBox(deck, ROAD_MAIN + 3, 0.7, RIVER_HALF_WIDTH * 2 + 16, x, 0.5, RIVER_Z);
    for (let i = -1; i <= 1; i += 2) {
      for (let s = -3; s <= 3; s++) {
        pushBox(
          deck,
          0.5,
          1.0,
          0.5,
          x + i * (ROAD_MAIN / 2 + 1.2),
          1.35,
          RIVER_Z + s * 4.2,
        );
      }
      pushBox(deck, 0.42, 0.3, RIVER_HALF_WIDTH * 2 + 14, x + i * (ROAD_MAIN / 2 + 1.2), 1.95, RIVER_Z);
    }
    // arch piers
    const piers: Channel = concreteParts;
    [-1, 1].forEach((side) => {
      pushBox(piers, 3.4, 2.4, 4, x, -0.6, RIVER_Z + side * 9);
    });
  });

  /* ---------------------------------------------------------------- */
  /* Buildings                                                        */
  /* ---------------------------------------------------------------- */

  const windowGeo = new THREE.BoxGeometry(1, 1, 1);
  const KEEP_CLEAR: { x: number; z: number; r: number }[] = [
    { x: 156, z: -146, r: 19 },
    { x: -58, z: 206, r: 15 },
    { x: 182, z: 62, r: 28 },
    { x: 64, z: -62, r: 12 },
  ];

  const addBuilding = (
    cx: number,
    cz: number,
    width: number,
    depth: number,
    height: number,
    facing: number,
  ) => {
    if (inRiver(cz, Math.max(width, depth) * 0.5 + 6)) return;
    const clearance = Math.max(width, depth) * 0.5;
    if (KEEP_CLEAR.some((zone) => Math.hypot(zone.x - cx, zone.z - cz) < zone.r + clearance)) return;
    const bucket = wallBuckets[Math.floor(rand() * wallBuckets.length)];
    const half = new THREE.Vector3(width / 2, height / 2, depth / 2);
    const position = new THREE.Vector3(cx, height / 2, cz);
    const rotation = new THREE.Euler(0, facing, 0);

    pushGeometry(bucket, new THREE.BoxGeometry(width, height, depth), position, rotation);

    // plinth
    pushGeometry(
      inkParts,
      new THREE.BoxGeometry(width + 0.3, 0.5, depth + 0.3),
      new THREE.Vector3(cx, 0.25, cz),
      rotation,
    );

    // parapet with folded coping
    pushGeometry(
      wallLight,
      new THREE.BoxGeometry(width + 0.22, 0.75, depth + 0.22),
      new THREE.Vector3(cx, height + 0.37, cz),
      rotation,
    );
    pushGeometry(
      inkParts,
      new THREE.BoxGeometry(width + 0.42, 0.1, depth + 0.42),
      new THREE.Vector3(cx, height + 0.78, cz),
      rotation,
    );

    // string courses between floors — crisp paper folds
    const floors = Math.max(1, Math.floor(height / 3.1));
    for (let f = 1; f <= floors; f++) {
      const y = f * (height / (floors + 1));
      pushGeometry(
        inkParts,
        new THREE.BoxGeometry(width + 0.3, 0.12, depth + 0.3),
        new THREE.Vector3(cx, y + 0.9, cz),
        rotation,
      );
    }

    const forward = new THREE.Vector3(Math.sin(facing), 0, Math.cos(facing));
    const right = new THREE.Vector3(Math.cos(facing), 0, -Math.sin(facing));

    // facade openings
    const cols = Math.max(2, Math.floor(width / 2.6));
    for (let f = 0; f < floors; f++) {
      const y = 2.0 + f * (height / (floors + 1)) + 0.55;
      if (y > height - 0.9) continue;
      for (let c = 0; c < cols; c++) {
        if (rand() > 0.84) continue;
        const u = (c + 0.5) / cols - 0.5;
        const base = new THREE.Vector3()
          .copy(right)
          .multiplyScalar(u * (width - 1.1))
          .add(forward.clone().multiplyScalar(half.z + 0.04));
        const wx = cx + base.x;
        const wz = cz + base.z;

        // recessed opening
        pushGeometry(
          inkParts,
          windowGeo,
          new THREE.Vector3(wx, y, wz),
          rotation,
          new THREE.Vector3(1.25, 1.45, 0.16),
        );
        if (rand() > 0.42) {
          pushGeometry(
            rand() > 0.45 ? glassLit : glassParts,
            windowGeo,
            new THREE.Vector3(wx + forward.x * 0.05, y, wz + forward.z * 0.05),
            rotation,
            new THREE.Vector3(1.05, 1.2, 0.06),
          );
        }
        // shutter slats / grille
        pushGeometry(
          metalParts,
          windowGeo,
          new THREE.Vector3(wx + forward.x * 0.1, y, wz + forward.z * 0.1),
          rotation,
          new THREE.Vector3(1.3, 0.09, 0.09),
        );
        pushGeometry(
          metalParts,
          windowGeo,
          new THREE.Vector3(wx + forward.x * 0.1, y - 0.72, wz + forward.z * 0.1),
          rotation,
          new THREE.Vector3(1.35, 0.14, 0.26),
        );

        // balcony on some upper floors
        if (f > 0 && rand() > 0.58) {
          const by = y - 0.75;
          pushGeometry(
            concreteParts,
            windowGeo,
            new THREE.Vector3(wx + forward.x * 0.5, by, wz + forward.z * 0.5),
            rotation,
            new THREE.Vector3(2.0, 0.14, 1.0),
          );
          pushGeometry(
            metalParts,
            windowGeo,
            new THREE.Vector3(wx + forward.x * 0.98, by + 0.45, wz + forward.z * 0.98),
            rotation,
            new THREE.Vector3(2.0, 0.85, 0.07),
          );
          [-1, 1].forEach((side) => {
            const sx = right.clone().multiplyScalar(side * 0.98);
            pushGeometry(
              metalParts,
              windowGeo,
              new THREE.Vector3(wx + forward.x * 0.5 + sx.x, by + 0.45, wz + forward.z * 0.5 + sx.z),
              rotation,
              new THREE.Vector3(0.07, 0.85, 1.0),
            );
          });
          // laundry over the railing
          if (rand() > 0.45) {
            for (let k = 0; k < 3; k++) {
              const lx = right.clone().multiplyScalar((k - 1) * 0.55);
              pushGeometry(
                clothParts,
                new THREE.PlaneGeometry(0.42, 0.72),
                new THREE.Vector3(
                  wx + forward.x * 1.02 + lx.x,
                  by + 0.2,
                  wz + forward.z * 1.02 + lx.z,
                ),
                new THREE.Euler(0, facing, (rand() - 0.5) * 0.18),
              );
            }
          }
        }
      }
    }

    // ground-floor shop shutter facing the street
    if (rand() > 0.35) {
      const shopW = Math.min(width - 1.2, 3.4);
      const sp = forward.clone().multiplyScalar(half.z + 0.06);
      pushGeometry(
        rand() > 0.45 ? rustParts : woodParts,
        windowGeo,
        new THREE.Vector3(cx + sp.x, 1.45, cz + sp.z),
        rotation,
        new THREE.Vector3(shopW, 2.6, 0.12),
      );
      pushGeometry(
        inkParts,
        windowGeo,
        new THREE.Vector3(cx + sp.x, 2.95, cz + sp.z),
        rotation,
        new THREE.Vector3(shopW + 0.5, 0.52, 0.3),
      );
      // neon shop sign — the cyberpunk note over the village street
      if (rand() > 0.35) {
        const neon = neonChannels[Math.floor(rand() * neonChannels.length)];
        const signW = Math.min(shopW * 0.9, 2.6);
        const vertical = rand() > 0.6;
        const sp2 = forward.clone().multiplyScalar(half.z + 0.22);
        const sy = vertical ? 5.2 : 3.62;
        pushGeometry(
          inkParts,
          windowGeo,
          new THREE.Vector3(cx + sp2.x, sy, cz + sp2.z),
          rotation,
          vertical ? new THREE.Vector3(0.52, 3.0, 0.16) : new THREE.Vector3(signW + 0.2, 0.68, 0.16),
        );
        pushGeometry(
          neon,
          windowGeo,
          new THREE.Vector3(cx + sp2.x * 1.06, sy, cz + sp2.z * 1.06),
          rotation,
          vertical ? new THREE.Vector3(0.3, 2.7, 0.07) : new THREE.Vector3(signW, 0.4, 0.07),
        );
      }

      // folded cloth awning — the origami note
      const awning = new THREE.PlaneGeometry(shopW + 0.8, 1.5, 4, 1);
      const positions = awning.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < positions.count; i++) {
        const px = positions.getX(i);
        positions.setZ(i, Math.abs((px % 1.2) - 0.6) * 0.22);
      }
      awning.computeVertexNormals();
      pushGeometry(
        clothParts,
        awning,
        new THREE.Vector3(cx + sp.x * 1.5, 3.3, cz + sp.z * 1.5),
        new THREE.Euler(-Math.PI / 2 + 0.55, facing, 0),
      );
    }

    // roofscape: tanks, dish, stair box, pots
    const roofY = height + 0.75;
    if (rand() > 0.3) {
      const tank = new THREE.CylinderGeometry(0.62, 0.68, 1.15, 12);
      const tx = cx + (rand() - 0.5) * (width - 2.4);
      const tz = cz + (rand() - 0.5) * (depth - 2.4);
      pushGeometry(inkParts, tank, new THREE.Vector3(tx, roofY + 0.9, tz));
      pushGeometry(
        metalParts,
        new THREE.BoxGeometry(0.1, 1.4, 0.1),
        new THREE.Vector3(tx + 0.5, roofY + 0.7, tz),
      );
    }
    if (rand() > 0.55) {
      pushGeometry(
        wallLight,
        new THREE.BoxGeometry(2.4, 2.2, 2.4),
        new THREE.Vector3(cx + (rand() - 0.5) * (width - 3), roofY + 1.1, cz + (rand() - 0.5) * (depth - 3)),
        rotation,
      );
    }
    if (rand() > 0.55) {
      const neon = neonChannels[Math.floor(rand() * neonChannels.length)];
      pushGeometry(
        neon,
        new THREE.BoxGeometry(width * 0.72, 0.1, 0.1),
        new THREE.Vector3(cx, roofY + 0.9, cz + depth / 2),
        rotation,
      );
    }
    if (rand() > 0.6) {
      const dish = new THREE.SphereGeometry(0.5, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2.4);
      pushGeometry(
        metalParts,
        dish,
        new THREE.Vector3(cx + (rand() - 0.5) * width * 0.6, roofY + 0.6, cz + (rand() - 0.5) * depth * 0.6),
        new THREE.Euler(-0.9, rand() * 3, 0),
      );
    }
    if (rand() > 0.5) {
      for (let p = 0; p < 3; p++) {
        const px = cx + (rand() - 0.5) * (width - 1.5);
        const pz = cz + (rand() - 0.5) * (depth - 1.5);
        pushGeometry(
          wallDark,
          new THREE.CylinderGeometry(0.17, 0.13, 0.3, 8),
          new THREE.Vector3(px, roofY + 0.2, pz),
        );
        pushGeometry(
          foliageParts,
          new THREE.IcosahedronGeometry(0.26, 0),
          new THREE.Vector3(px, roofY + 0.5, pz),
        );
      }
    }

    const cos = Math.abs(Math.cos(facing));
    const sin = Math.abs(Math.sin(facing));
    const halfX = (width * cos + depth * sin) / 2;
    const halfZ = (width * sin + depth * cos) / 2;
    colliders.push({
      minX: cx - halfX,
      maxX: cx + halfX,
      minZ: cz - halfZ,
      maxZ: cz + halfZ,
    });
  };

  /* Fill the blocks between the main roads with rows of houses and inner gullies. */
  const xEdges = [-WORLD_HALF, ...MAIN_X, WORLD_HALF];
  const zEdges = [-WORLD_HALF, ...MAIN_Z, WORLD_HALF + 40];

  for (let xi = 0; xi < xEdges.length - 1; xi++) {
    for (let zi = 0; zi < zEdges.length - 1; zi++) {
      const x0 = xEdges[xi] + ROAD_MAIN / 2 + 2;
      const x1 = xEdges[xi + 1] - ROAD_MAIN / 2 - 2;
      const z0 = zEdges[zi] + ROAD_MAIN / 2 + 2;
      const z1 = zEdges[zi + 1] - ROAD_MAIN / 2 - 2;
      const blockW = x1 - x0;
      const blockD = z1 - z0;
      if (blockW < 18 || blockD < 18) continue;
      const cz = (z0 + z1) / 2;
      if (inRiver(cz, blockD / 2 + 4)) continue;

      // carve one inner gully through the block
      const gullyZ = (z0 + z1) / 2 + (rand() - 0.5) * blockD * 0.2;
      pushBox(paveBucket, blockW + 6, 0.14, ROAD_GULLY, (x0 + x1) / 2, 0.08, gullyZ);

      const rows: [number, number][] = [
        [z0, gullyZ - ROAD_GULLY / 2],
        [gullyZ + ROAD_GULLY / 2, z1],
      ];

      rows.forEach(([rz0, rz1], rowIndex) => {
        const rowDepth = rz1 - rz0;
        if (rowDepth < 9) return;
        let cursor = x0;
        while (cursor < x1 - 6) {
          const plotW = 7 + rand() * 7;
          if (cursor + plotW > x1) break;
          const depth = Math.min(rowDepth - 2.5, 9 + rand() * 6);
          const height = 6.5 + rand() * 11.5;
          const faceGully = rowIndex === 0 ? 0 : Math.PI;
          const cxPlot = cursor + plotW / 2;
          const czPlot = rowIndex === 0 ? rz1 - depth / 2 - 1 : rz0 + depth / 2 + 1;
          addBuilding(cxPlot, czPlot, plotW - 1.1, depth, height, faceGully);
          cursor += plotW + 0.6 + rand() * 1.4;
        }
      });
    }
  }


  /* ---------------------------------------------------------------- */
  /* Landmarks                                                        */
  /* ---------------------------------------------------------------- */

  // Temple at Mandir Chowk — folded shikhara
  {
    const tx = 156;
    const tz = -146;
    pushBox(concreteParts, 20, 1.2, 20, tx, 0.6, tz);
    pushGeometry(wallLight, new THREE.BoxGeometry(11, 5.5, 11), new THREE.Vector3(tx, 3.9, tz));
    for (let i = 0; i < 7; i++) {
      const s = 1 - i * 0.12;
      pushGeometry(
        wallLight,
        new THREE.CylinderGeometry(4.4 * s, 5.0 * s, 1.5, 8),
        new THREE.Vector3(tx, 7.2 + i * 1.4, tz),
        new THREE.Euler(0, Math.PI / 8, 0),
      );
    }
    pushGeometry(metalParts, new THREE.ConeGeometry(1.0, 2.6, 8), new THREE.Vector3(tx, 18.6, tz));
    pushGeometry(metalParts, new THREE.SphereGeometry(0.55, 12, 10), new THREE.Vector3(tx, 20.2, tz));
    [-1, 1].forEach((side) => {
      [-1, 1].forEach((side2) => {
        pushGeometry(
          wallLight,
          new THREE.CylinderGeometry(0.55, 0.62, 5.2, 10),
          new THREE.Vector3(tx + side * 6.4, 3.8, tz + side2 * 6.4),
        );
      });
    });
    colliders.push({ minX: tx - 6, maxX: tx + 6, minZ: tz - 6, maxZ: tz + 6 });
  }

  // Station overbridge — a long folded steel span
  {
    const sx = 182;
    for (let i = 0; i < 2; i++) {
      const z = 40 + i * 44;
      pushBox(concreteParts, 7, 7.5, 7, sx - 14, 3.75, z);
      pushBox(concreteParts, 7, 7.5, 7, sx + 14, 3.75, z);
      colliders.push({ minX: sx - 18, maxX: sx - 10, minZ: z - 4, maxZ: z + 4 });
      colliders.push({ minX: sx + 10, maxX: sx + 18, minZ: z - 4, maxZ: z + 4 });
    }
    pushBox(concreteParts, 42, 0.9, 7.5, sx, 7.9, 62);
    for (let i = 0; i < 16; i++) {
      pushBox(metalParts, 0.35, 2.2, 0.35, sx - 20 + i * 2.7, 9.4, 58.6);
      pushBox(metalParts, 0.35, 2.2, 0.35, sx - 20 + i * 2.7, 9.4, 65.4);
    }
    pushBox(metalParts, 42, 0.3, 0.4, sx, 10.5, 58.6);
    pushBox(metalParts, 42, 0.3, 0.4, sx, 10.5, 65.4);
  }

  // Banyan tree across the river, with hanging roots
  {
    const bx = -58;
    const bz = 206;
    pushGeometry(wallDark, new THREE.CylinderGeometry(1.5, 2.3, 6, 10), new THREE.Vector3(bx, 3, bz));
    for (let i = 0; i < 7; i++) {
      const angle = (i / 7) * Math.PI * 2;
      const r = 3.2 + rand() * 1.6;
      pushGeometry(
        wallDark,
        new THREE.CylinderGeometry(0.3, 0.55, 5.5, 7),
        new THREE.Vector3(bx + Math.cos(angle) * r, 2.8, bz + Math.sin(angle) * r),
      );
      pushGeometry(
        foliageParts,
        new THREE.IcosahedronGeometry(3.4 + rand() * 1.6, 1),
        new THREE.Vector3(bx + Math.cos(angle) * r * 1.2, 7.8 + rand() * 2, bz + Math.sin(angle) * r * 1.2),
      );
    }
    pushGeometry(foliageParts, new THREE.IcosahedronGeometry(5.4, 1), new THREE.Vector3(bx, 9.5, bz));
    colliders.push({ minX: bx - 2.4, maxX: bx + 2.4, minZ: bz - 2.4, maxZ: bz + 2.4 });
  }

  /* ---------------------------------------------------------------- */
  /* Street furniture                                                 */
  /* ---------------------------------------------------------------- */

  // electric poles + tangled wires along the main roads
  const polePositions: THREE.Vector3[] = [];
  MAIN_X.forEach((x) => {
    for (let z = -WORLD_HALF + 20; z < WORLD_HALF + 20; z += 34) {
      if (inRiver(z, 10)) continue;
      const px = x + ROAD_MAIN / 2 + 1.6;
      pushGeometry(concreteParts, new THREE.CylinderGeometry(0.18, 0.26, 9, 7), new THREE.Vector3(px, 4.5, z));
      pushBox(metalParts, 2.6, 0.16, 0.16, px, 8.4, z);
      polePositions.push(new THREE.Vector3(px, 8.4, z));
      colliders.push({ minX: px - 0.4, maxX: px + 0.4, minZ: z - 0.4, maxZ: z + 0.4 });
    }
  });

  const wireMaterial = new THREE.LineBasicMaterial({ color: 0x1a1a1a, transparent: true, opacity: 0.85 });
  const wireGroup = new THREE.Group();
  for (let i = 0; i < polePositions.length - 1; i++) {
    const a = polePositions[i];
    const b = polePositions[i + 1];
    if (a.distanceTo(b) > 48) continue;
    for (let k = 0; k < 4; k++) {
      const sag = 1.2 + rand() * 1.6;
      const offset = (k - 1.5) * 0.3;
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(a.x + offset, a.y - k * 0.22, a.z),
        new THREE.Vector3((a.x + b.x) / 2 + offset, (a.y + b.y) / 2 - sag - k * 0.22, (a.z + b.z) / 2),
        new THREE.Vector3(b.x + offset, b.y - k * 0.22, b.z),
      ]);
      const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(16));
      wireGroup.add(new THREE.Line(geometry, wireMaterial));
    }
  }
  group.add(wireGroup);

  // market stalls along the bazaar road
  for (let i = 0; i < 26; i++) {
    const x = -150 + i * 12 + rand() * 3;
    const z = 26 + (rand() > 0.5 ? 9.5 : -9.5);
    if (Math.abs(x) > WORLD_HALF - 20) continue;
    pushBox(wallDark, 3.2, 0.9, 2.2, x, 0.9, z);
    pushBox(metalParts, 0.1, 2.3, 0.1, x - 1.5, 1.15, z - 1);
    pushBox(metalParts, 0.1, 2.3, 0.1, x + 1.5, 1.15, z - 1);
    const tarp = new THREE.PlaneGeometry(3.8, 2.6, 5, 1);
    const pos = tarp.attributes.position as THREE.BufferAttribute;
    for (let v = 0; v < pos.count; v++) {
      pos.setZ(v, Math.abs((pos.getX(v) % 1.4) - 0.7) * 0.3);
    }
    tarp.computeVertexNormals();
    pushGeometry(clothParts, tarp, new THREE.Vector3(x, 2.5, z - 0.4), new THREE.Euler(-Math.PI / 2 + 0.3, 0, 0));
    for (let c = 0; c < 4; c++) {
      pushGeometry(
        wallLight,
        new THREE.BoxGeometry(0.5, 0.35, 0.5),
        new THREE.Vector3(x - 1 + c * 0.65, 1.5, z + 0.3),
        new THREE.Euler(0, rand(), 0),
      );
    }
    colliders.push({ minX: x - 1.7, maxX: x + 1.7, minZ: z - 1.2, maxZ: z + 1.2 });
  }

  // parked rickshaws + handcarts as folded blocks
  for (let i = 0; i < 34; i++) {
    const main = MAIN_X[Math.floor(rand() * MAIN_X.length)];
    const x = main + (rand() > 0.5 ? 1 : -1) * (ROAD_MAIN / 2 + 2.2);
    const z = -WORLD_HALF + 20 + rand() * (WORLD_HALF * 2 - 30);
    if (inRiver(z, 12)) continue;
    const rot = rand() * 0.3 - 0.15;
    pushGeometry(wallMid, new THREE.BoxGeometry(2.0, 1.5, 3.1), new THREE.Vector3(x, 1.1, z), new THREE.Euler(0, rot, 0));
    pushGeometry(
      metalParts,
      new THREE.CylinderGeometry(0.32, 0.32, 0.18, 12),
      new THREE.Vector3(x - 0.9, 0.32, z + 1.0),
      new THREE.Euler(0, 0, Math.PI / 2),
    );
    pushGeometry(
      metalParts,
      new THREE.CylinderGeometry(0.32, 0.32, 0.18, 12),
      new THREE.Vector3(x + 0.9, 0.32, z + 1.0),
      new THREE.Euler(0, 0, Math.PI / 2),
    );
    pushGeometry(clothParts, new THREE.PlaneGeometry(2.0, 1.6), new THREE.Vector3(x, 2.1, z - 0.3), new THREE.Euler(-0.5, rot, 0));
    colliders.push({ minX: x - 1.2, maxX: x + 1.2, minZ: z - 1.8, maxZ: z + 1.8 });
  }

  /* ---------------------------------------------------------------- */
  /* Easter eggs — folded paper objects hidden in the lanes           */
  /* ---------------------------------------------------------------- */

  const craneGeometry = (() => {
    const shapes: THREE.BufferGeometry[] = [];
    const bodyGeo = new THREE.ConeGeometry(0.22, 0.55, 4);
    bodyGeo.rotateX(Math.PI / 2);
    shapes.push(bodyGeo);
    const wingL = new THREE.ConeGeometry(0.2, 0.75, 3);
    wingL.rotateZ(Math.PI / 2);
    wingL.translate(0.4, 0.12, 0);
    shapes.push(wingL);
    const wingR = new THREE.ConeGeometry(0.2, 0.75, 3);
    wingR.rotateZ(-Math.PI / 2);
    wingR.translate(-0.4, 0.12, 0);
    shapes.push(wingR);
    const neck = new THREE.ConeGeometry(0.07, 0.45, 4);
    neck.rotateX(-Math.PI / 2.6);
    neck.translate(0, 0.16, 0.3);
    shapes.push(neck);
    const tail = new THREE.ConeGeometry(0.09, 0.4, 4);
    tail.rotateX(Math.PI / 2.2);
    tail.translate(0, 0.14, -0.32);
    shapes.push(tail);
    const merged = mergeGeometries(shapes, false)!;
    shapes.forEach((s) => s.dispose());
    return merged;
  })();

  EASTER_EGGS.forEach((egg) => {
    const object = new THREE.Group();
    const crane = new THREE.Mesh(craneGeometry, materials.paperLight);
    crane.castShadow = true;
    object.add(crane);
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(0.62, 0.014, 6, 32),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }),
    );
    halo.rotation.x = Math.PI / 2;
    object.add(halo);
    object.position.set(egg.x, egg.y, egg.z);
    group.add(object);
    eggs.push({
      id: egg.id,
      name: egg.name,
      note: egg.note,
      object,
      position: object.position.clone(),
      collected: false,
      spin: 0.6 + Math.random() * 0.5,
    });
  });

  /* ---------------------------------------------------------------- */

  chunker.flush(
    group,
    {
      ...Object.fromEntries(materials.walls.map((m, i) => [`wall${i}`, m])),
      ...Object.fromEntries(materials.neon.map((m, i) => [`neon${i}`, m])),
      rust: materials.rust,
      wood: materials.wood,
      ink: materials.ink,
      metal: materials.metal,
      concrete: materials.concrete,
      cloth: materials.cloth,
      foliage: materials.foliage,
      glass: materials.glass,
      glassLit: materials.glassLit,
      asphalt: materials.asphalt,
      pave: materials.pave,
    },
    {
      ...Object.fromEntries(materials.walls.map((_, i) => [`wall${i}`, { cast: true, receive: true }])),
      ...Object.fromEntries(materials.neon.map((_, i) => [`neon${i}`, { cast: false, receive: false }])),
      rust: { cast: true, receive: true },
      wood: { cast: true, receive: true },
      ink: { cast: true, receive: true },
      concrete: { cast: true, receive: true },
      metal: { cast: false, receive: true },
      cloth: { cast: false, receive: false },
      foliage: { cast: false, receive: true },
      glass: { cast: false, receive: false },
      glassLit: { cast: false, receive: false },
      asphalt: { cast: false, receive: true },
      pave: { cast: false, receive: true },
    },
  );

  const update = (time: number) => {
    materials.waterNormalMap.offset.set(time * 0.012, time * 0.022);
    eggs.forEach((egg, index) => {
      if (egg.collected) return;
      egg.object.rotation.y += 0.012 * egg.spin;
      egg.object.position.y = egg.position.y + Math.sin(time * 1.4 + index) * 0.16;
    });
  };

  return { group, colliders, eggs, water, update };
}
