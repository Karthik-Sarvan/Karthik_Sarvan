import * as THREE from "three";
import type { WorldMaterials } from "./materials";

export interface BikeRig {
  root: THREE.Group;
  body: THREE.Group;
  frontSteer: THREE.Group;
  wheelFront: THREE.Group;
  wheelRear: THREE.Group;
  crank: THREE.Group;
  legs: { thighL: THREE.Group; thighR: THREE.Group; shinL: THREE.Group; shinR: THREE.Group };
  torso: THREE.Group;
  bell: THREE.Mesh;
  lampGlass: THREE.Mesh;
  head: THREE.Mesh;
  feet: { l: THREE.Mesh; r: THREE.Mesh };
}

const WHEEL_RADIUS = 0.345;

function tube(
  from: THREE.Vector3,
  to: THREE.Vector3,
  radius: number,
  material: THREE.Material,
  segments = 10,
) {
  const direction = new THREE.Vector3().subVectors(to, from);
  const length = direction.length();
  const geometry = new THREE.CylinderGeometry(radius, radius * 0.97, length, segments, 1);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(from).addScaledVector(direction, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
  mesh.castShadow = true;
  return mesh;
}

function buildWheel(materials: WorldMaterials) {
  const group = new THREE.Group();

  const tyre = new THREE.Mesh(
    new THREE.TorusGeometry(WHEEL_RADIUS, 0.038, 14, 44),
    materials.rubber,
  );
  tyre.castShadow = true;
  group.add(tyre);

  // tread blocks for a believable silhouette
  const tread = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.045, 0.022, 0.07),
    materials.rubber,
    40,
  );
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 40; i++) {
    const angle = (i / 40) * Math.PI * 2;
    dummy.position.set(Math.cos(angle) * (WHEEL_RADIUS + 0.03), Math.sin(angle) * (WHEEL_RADIUS + 0.03), 0);
    dummy.rotation.set(0, 0, angle);
    dummy.updateMatrix();
    tread.setMatrixAt(i, dummy.matrix);
  }
  tread.castShadow = true;
  group.add(tread);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(WHEEL_RADIUS - 0.045, 0.016, 10, 40),
    materials.chrome,
  );
  rim.castShadow = true;
  group.add(rim);

  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.042, 0.042, 0.1, 14),
    materials.chrome,
  );
  hub.rotation.x = Math.PI / 2;
  hub.castShadow = true;
  group.add(hub);

  const spokeGeometry = new THREE.CylinderGeometry(0.0055, 0.0055, WHEEL_RADIUS - 0.05, 4);
  const spokes = new THREE.InstancedMesh(spokeGeometry, materials.chrome, 18);
  for (let i = 0; i < 18; i++) {
    const angle = (i / 18) * Math.PI * 2;
    dummy.position.set(0, 0, 0);
    dummy.rotation.set(0, 0, angle);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    const offset = new THREE.Matrix4().makeTranslation(0, (WHEEL_RADIUS - 0.05) / 2, 0);
    dummy.matrix.multiply(offset);
    spokes.setMatrixAt(i, dummy.matrix);
  }
  group.add(spokes);

  return group;
}

/**
 * A classic roadster — the black single-speed that every Indian gully knows,
 * built from real frame geometry rather than boxes.
 */
export function createBike(materials: WorldMaterials): BikeRig {
  const paint = new THREE.MeshStandardMaterial({
    color: 0x12333f,
    roughness: 0.28,
    metalness: 0.55,
    envMapIntensity: 1.4,
  });
  const jacket = new THREE.MeshStandardMaterial({ color: 0xc8402f, roughness: 0.74 });
  const trouser = new THREE.MeshStandardMaterial({ color: 0x27303c, roughness: 0.86 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xa9713b, roughness: 0.66 });
  const hair = new THREE.MeshStandardMaterial({ color: 0x15100d, roughness: 0.78 });
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const frameMat = paint;
  const chromeMat = materials.chrome;

  // key frame nodes (x = forward, y = up, z = lateral)
  const rearAxle = new THREE.Vector3(-0.52, WHEEL_RADIUS, 0);
  const frontAxle = new THREE.Vector3(0.58, WHEEL_RADIUS, 0);
  const bb = new THREE.Vector3(-0.06, 0.29, 0);
  const seatTop = new THREE.Vector3(-0.3, 0.96, 0);
  const headTop = new THREE.Vector3(0.42, 0.96, 0);
  const headBottom = new THREE.Vector3(0.5, 0.62, 0);

  const frame = new THREE.Group();
  body.add(frame);

  frame.add(tube(bb, seatTop, 0.026, frameMat)); // seat tube
  frame.add(tube(bb, headBottom, 0.03, frameMat)); // down tube
  frame.add(tube(seatTop, headTop, 0.026, frameMat)); // top tube
  frame.add(tube(headTop, headBottom, 0.032, frameMat)); // head tube
  frame.add(tube(seatTop.clone().add(new THREE.Vector3(0.02, -0.1, 0)), headTop.clone().add(new THREE.Vector3(-0.02, -0.12, 0)), 0.018, frameMat));

  [-0.055, 0.055].forEach((z) => {
    const axle = rearAxle.clone().setZ(z);
    frame.add(tube(bb.clone().setZ(z * 0.5), axle, 0.019, frameMat)); // chainstay
    frame.add(tube(seatTop.clone().setZ(z * 0.35), axle, 0.015, frameMat)); // seatstay
  });

  // mudguards — essential roadster character
  const guardShape = (radius: number, arc: number) =>
    new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.012, 6, 28, arc),
      materials.metal,
    );
  const rearGuard = guardShape(WHEEL_RADIUS + 0.05, Math.PI * 1.0);
  rearGuard.position.copy(rearAxle);
  rearGuard.rotation.z = Math.PI * 0.08;
  rearGuard.scale.set(1, 1, 3.4);
  rearGuard.castShadow = true;
  body.add(rearGuard);
  const frontGuard = guardShape(WHEEL_RADIUS + 0.05, Math.PI * 0.8);
  frontGuard.position.copy(frontAxle);
  frontGuard.rotation.z = Math.PI * 0.1;
  frontGuard.scale.set(1, 1, 3.4);
  frontGuard.castShadow = true;

  // chain + chainring
  const chainring = new THREE.Mesh(
    new THREE.TorusGeometry(0.1, 0.008, 8, 26),
    chromeMat,
  );
  chainring.position.copy(bb);
  chainring.position.z = 0.075;
  chainring.rotation.y = Math.PI / 2;
  body.add(chainring);
  const sprocket = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.007, 6, 18), chromeMat);
  sprocket.position.copy(rearAxle);
  sprocket.position.z = 0.062;
  sprocket.rotation.y = Math.PI / 2;
  body.add(sprocket);
  [0.1, -0.045].forEach((offset, index) => {
    const chain = tube(
      new THREE.Vector3(bb.x, bb.y + (index === 0 ? 0.1 : -0.1), 0.075),
      new THREE.Vector3(rearAxle.x, rearAxle.y + (index === 0 ? 0.045 : -0.045), 0.075),
      0.0075,
      materials.metal,
      6,
    );
    body.add(chain);
    void offset;
  });
  const chainCase = new THREE.Mesh(new THREE.CircleGeometry(0.135, 18), materials.metal);
  chainCase.position.set(bb.x, bb.y, 0.09);
  chainCase.rotation.y = Math.PI / 2;
  body.add(chainCase);

  // crank + pedals
  const crank = new THREE.Group();
  crank.position.copy(bb);
  body.add(crank);
  const crankAxle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.17, 10), chromeMat);
  crankAxle.rotation.x = Math.PI / 2;
  crank.add(crankAxle);
  const pedals: THREE.Group[] = [];
  [1, -1].forEach((side) => {
    const arm = new THREE.Group();
    arm.rotation.z = side > 0 ? 0 : Math.PI;
    crank.add(arm);
    const armMesh = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.17, 0.02), chromeMat);
    armMesh.position.set(0, 0.085, side * 0.085);
    armMesh.castShadow = true;
    arm.add(armMesh);
    const pedal = new THREE.Group();
    pedal.position.set(0, 0.17, side * 0.1);
    arm.add(pedal);
    const pedalMesh = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.018, 0.055), materials.rubber);
    pedalMesh.castShadow = true;
    pedal.add(pedalMesh);
    pedals.push(pedal);
  });

  // saddle
  const saddleShape = new THREE.Shape();
  saddleShape.moveTo(-0.11, 0);
  saddleShape.bezierCurveTo(-0.1, 0.075, 0.02, 0.07, 0.085, 0.045);
  saddleShape.bezierCurveTo(0.12, 0.028, 0.12, -0.028, 0.085, -0.045);
  saddleShape.bezierCurveTo(0.02, -0.07, -0.1, -0.075, -0.11, 0);
  const saddle = new THREE.Mesh(
    new THREE.ExtrudeGeometry(saddleShape, { depth: 0.045, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2, curveSegments: 10 }),
    materials.ink,
  );
  saddle.rotation.x = -Math.PI / 2;
  saddle.rotation.z = Math.PI;
  saddle.position.set(-0.31, 1.0, 0);
  saddle.castShadow = true;
  body.add(saddle);
  body.add(tube(new THREE.Vector3(-0.3, 0.9, 0), new THREE.Vector3(-0.31, 0.99, 0), 0.016, chromeMat, 8));

  // steering assembly
  const frontSteer = new THREE.Group();
  frontSteer.position.copy(headBottom);
  body.add(frontSteer);

  const forkTop = new THREE.Vector3(0, 0, 0);
  [-0.055, 0.055].forEach((z) => {
    frontSteer.add(
      tube(forkTop, new THREE.Vector3(0.08, -(headBottom.y - WHEEL_RADIUS), z), 0.016, chromeMat),
    );
  });
  frontSteer.add(tube(new THREE.Vector3(0, 0, 0), new THREE.Vector3(-0.06, 0.37, 0), 0.02, chromeMat));

  const barHeight = 0.38;
  const handlebar = new THREE.Group();
  handlebar.position.set(-0.06, barHeight, 0);
  frontSteer.add(handlebar);
  const barCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.02, -0.03, -0.3),
    new THREE.Vector3(-0.03, 0.015, -0.16),
    new THREE.Vector3(-0.01, 0.025, 0),
    new THREE.Vector3(-0.03, 0.015, 0.16),
    new THREE.Vector3(0.02, -0.03, 0.3),
  ]);
  const bar = new THREE.Mesh(new THREE.TubeGeometry(barCurve, 26, 0.015, 8, false), chromeMat);
  bar.castShadow = true;
  handlebar.add(bar);
  [-0.26, 0.26].forEach((z) => {
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.021, 0.1, 10), materials.ink);
    grip.rotation.x = Math.PI / 2;
    grip.position.set(0.005, -0.012, z);
    handlebar.add(grip);
  });
  const bell = new THREE.Mesh(new THREE.SphereGeometry(0.032, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), chromeMat);
  bell.position.set(-0.01, 0.045, 0.17);
  bell.castShadow = true;
  handlebar.add(bell);
  const headlamp = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.045, 0.07, 14), chromeMat);
  headlamp.rotation.z = Math.PI / 2;
  headlamp.position.set(0.09, 0.22, 0);
  frontSteer.add(headlamp);
  const lampGlass = new THREE.Mesh(new THREE.CircleGeometry(0.044, 14), materials.glass);
  lampGlass.position.set(0.126, 0.22, 0);
  lampGlass.rotation.y = Math.PI / 2;
  frontSteer.add(lampGlass);

  // front basket, because every gully cycle has one
  const basket = new THREE.Group();
  basket.position.set(0.12, 0.28, 0);
  frontSteer.add(basket);
  const basketBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.17, 0.3),
    materials.metal,
  );
  basketBody.castShadow = true;
  basket.add(basketBody);
  const basketLines = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(0.225, 0.175, 0.305)),
    new THREE.LineBasicMaterial({ color: 0x121212 }),
  );
  basket.add(basketLines);

  const wheelFront = buildWheel(materials);
  wheelFront.position.set(frontAxle.x, frontAxle.y, 0);
  body.add(wheelFront);
  frontGuard.position.set(frontAxle.x, frontAxle.y, 0);
  body.add(frontGuard);

  const wheelRear = buildWheel(materials);
  wheelRear.position.copy(rearAxle);
  body.add(wheelRear);

  // rear carrier
  const carrier = new THREE.Group();
  body.add(carrier);
  [-0.07, 0.07].forEach((z) => {
    carrier.add(
      tube(new THREE.Vector3(-0.28, 0.88, z), new THREE.Vector3(-0.66, 0.68, z), 0.011, materials.metal, 6),
    );
    carrier.add(
      tube(new THREE.Vector3(-0.52, 0.42, z), new THREE.Vector3(-0.63, 0.66, z), 0.009, materials.metal, 6),
    );
  });
  const carrierTop = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.014, 0.16), materials.metal);
  carrierTop.position.set(-0.52, 0.69, 0);
  carrierTop.castShadow = true;
  carrier.add(carrierTop);

  /* ---------------------------------------------------------------- */
  /* Rider                                                            */
  /* ---------------------------------------------------------------- */

  const rider = new THREE.Group();
  body.add(rider);

  const torso = new THREE.Group();
  torso.position.set(-0.22, 1.0, 0);
  rider.add(torso);

  const torsoMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.135, 0.3, 6, 14), jacket);
  torsoMesh.rotation.z = -0.52;
  torsoMesh.position.set(0.1, 0.17, 0);
  torsoMesh.castShadow = true;
  torso.add(torsoMesh);

  const hips = new THREE.Mesh(new THREE.CapsuleGeometry(0.115, 0.1, 5, 12), trouser);
  hips.rotation.z = Math.PI / 2;
  hips.position.set(-0.01, 0.02, 0);
  hips.castShadow = true;
  torso.add(hips);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.105, 18, 14), skin);
  head.position.set(0.26, 0.42, 0);
  head.scale.set(1, 1.08, 0.92);
  head.castShadow = true;
  torso.add(head);
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.112, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    hair,
  );
  cap.position.copy(head.position);
  cap.position.y += 0.012;
  cap.castShadow = true;
  torso.add(cap);
  const peak = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.012, 0.16), hair);
  peak.position.set(0.36, 0.45, 0);
  torso.add(peak);

  const arms: THREE.Mesh[] = [];
  [-0.12, 0.12].forEach((z) => {
    const shoulder = new THREE.Vector3(0.14, 0.3, z);
    const hand = new THREE.Vector3(0.66, 0.0, z * 1.9);
    const arm = tube(shoulder, hand, 0.042, jacket, 8);
    torso.add(arm);
    arms.push(arm);
  });

  const legs = {
    thighL: new THREE.Group(),
    thighR: new THREE.Group(),
    shinL: new THREE.Group(),
    shinR: new THREE.Group(),
  };
  const feet: THREE.Mesh[] = [];
  const makeLeg = (side: number, thigh: THREE.Group, shin: THREE.Group) => {
    thigh.position.set(-0.01, 0.0, side * 0.1);
    torso.add(thigh);
    const thighMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.058, 0.24, 5, 10), trouser);
    thighMesh.position.set(0, -0.15, 0);
    thighMesh.castShadow = true;
    thigh.add(thighMesh);
    shin.position.set(0, -0.3, 0);
    thigh.add(shin);
    const shinMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.046, 0.24, 5, 10), trouser);
    shinMesh.position.set(0, -0.15, 0);
    shinMesh.castShadow = true;
    shin.add(shinMesh);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.045, 0.075), materials.rubber);
    foot.position.set(0.03, -0.3, 0);
    foot.castShadow = true;
    shin.add(foot);
    feet.push(foot);
  };
  makeLeg(1, legs.thighL, legs.shinL);
  makeLeg(-1, legs.thighR, legs.shinR);

  root.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.castShadow = true;
      object.receiveShadow = false;
    }
  });

  return { root, body, frontSteer, wheelFront, wheelRear, crank, legs, torso, bell, lampGlass, head, feet: { l: feet[0], r: feet[1] } };
}

export const BIKE_WHEEL_RADIUS = WHEEL_RADIUS;
