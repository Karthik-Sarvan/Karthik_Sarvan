import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { DISTRICTS, STOPS, WORLD_HALF } from "../data/places";
import { buildCity, MAIN_X as MAIN_ROAD_X } from "./city";
import { createBike } from "./bike";
import { buildProps } from "./props";
import { createSky } from "./sky";
import { createMaterials, makeCloudTexture, makeEnvironment, makeRandom } from "./materials";

export interface RideInput {
  throttle: boolean;
  brake: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
  axisX: number;
  axisY: number;
}

export interface RideState {
  speed: number;
  visited: number[];
  nextIndex: number;
  nextName: string;
  bearing: number;
  distance: number;
  district: string;
  districtSub: string;
  eggs: number;
  eggTotal: number;
  night: number;
  clock: string;
}

export type Phase = "idle" | "intro" | "ride";

export interface EngineCallbacks {
  onReady?: () => void;
  onError?: (message: string) => void;
  onState?: (state: RideState) => void;
  onStop?: (index: number) => void;
  onLeaveStop?: (index: number) => void;
  onEgg?: (name: string, note: string, found: number, total: number) => void;
  onBell?: () => void;
  onPhase?: (phase: Phase) => void;
}

export interface EngineAPI {
  start: () => void;
  setInput: (next: Partial<RideInput>) => void;
  ringBell: () => void;
  reset: () => void;
  teleport: (index: number) => void;
  setTimeMode: (mode: "day" | "night") => void;
  dispose: () => void;
}

const SPAWN = new THREE.Vector3(64, 0, -62);

const C = {
  dayTop: new THREE.Color(0x3f7fc4),
  dayHorizon: new THREE.Color(0xdcd3bd),
  dayGround: new THREE.Color(0x6b5f4e),
  nightTop: new THREE.Color(0x05080f),
  nightHorizon: new THREE.Color(0x1b2030),
  nightGround: new THREE.Color(0x090a0e),
  dusk: new THREE.Color(0xff7a3c),
  sunWarm: new THREE.Color(0xfff0d4),
  moonCool: new THREE.Color(0x9fb8ff),
};

function signTexture(index: number, place: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 168;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#0e1116";
  ctx.fillRect(0, 0, 512, 168);
  const accent = ["#22e0ff", "#ff2d8f", "#ffb24a", "#46ff9b", "#a96bff", "#ff4d3d"][index % 6];
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, 512, 6);
  ctx.fillRect(0, 162, 512, 6);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, 500, 156);
  ctx.fillStyle = accent;
  ctx.font = "300 92px system-ui, sans-serif";
  ctx.fillText(String(index + 1).padStart(2, "0"), 26, 118);
  ctx.fillRect(160, 34, 2, 100);
  ctx.fillStyle = "#cfd6e0";
  ctx.font = "500 22px ui-monospace, monospace";
  ctx.fillText("STOP", 186, 64);
  ctx.fillStyle = "#f2f5f8";
  ctx.font = "500 40px system-ui, sans-serif";
  ctx.fillText(place.toUpperCase(), 186, 118);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function createEngine(
  container: HTMLElement,
  callbacks: EngineCallbacks,
): { api: EngineAPI | null; error?: string } {
  try {
    const probe = document.createElement("canvas");
    const gl = probe.getContext("webgl2") ?? probe.getContext("webgl");
    if (!gl) {
      callbacks.onError?.("WebGL is unavailable in this browser.");
      return { api: null, error: "WebGL unavailable" };
    }
  } catch {
    callbacks.onError?.("WebGL is blocked by this browser.");
    return { api: null, error: "WebGL blocked" };
  }

  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const low = coarse || Math.min(window.innerWidth, window.innerHeight) < 700;

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: !low, powerPreference: "high-performance" });
  } catch {
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "default", failIfMajorPerformanceCaveat: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Renderer failed to start.";
      callbacks.onError?.(message);
      return { api: null, error: message };
    }
  }

  try {
    const canvas = renderer.domElement;
    canvas.setAttribute("aria-hidden", "true");
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, low ? 1.35 : 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(canvas);

    const scene = new THREE.Scene();
    const { envMap, skyTexture } = makeEnvironment(renderer);
    skyTexture.dispose();
    scene.environment = envMap;
    scene.fog = new THREE.Fog(0x121213, 30, 200);

    const sky = createSky();
    scene.add(sky.mesh);

    const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 1500);
    const materials = createMaterials(renderer, envMap);

    /* ---------------------------------------------------------------- */
    /* Lights                                                           */
    /* ---------------------------------------------------------------- */

    const hemi = new THREE.HemisphereLight(0x8fb4ff, 0x4a3a2a, 0.2);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff0d4, 1);
    sun.castShadow = true;
    const shadowSize = low ? 1024 : 2048;
    sun.shadow.mapSize.set(shadowSize, shadowSize);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 260;
    sun.shadow.camera.left = -44;
    sun.shadow.camera.right = 44;
    sun.shadow.camera.top = 44;
    sun.shadow.camera.bottom = -44;
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.04;
    scene.add(sun);
    scene.add(sun.target);

    /* ---------------------------------------------------------------- */
    /* World                                                            */
    /* ---------------------------------------------------------------- */

    const city = buildCity(materials);
    scene.add(city.group);
    const props = buildProps(materials, city.colliders, low);
    scene.add(props.group);
    const colliders = [...city.colliders, ...props.colliders];

    const pointLights = Array.from({ length: low ? 2 : 4 }, () => {
      const light = new THREE.PointLight(0xffb257, 0, 26, 1.6);
      scene.add(light);
      return light;
    });

    /* ---------------------------------------------------------------- */
    /* Cycle + headlamp                                                 */
    /* ---------------------------------------------------------------- */

    const bike = createBike(materials);
    scene.add(bike.root);

    const lampGlassMaterial = new THREE.MeshStandardMaterial({
      color: 0x241d12,
      emissive: new THREE.Color(0xfff1cf),
      emissiveIntensity: 0,
    });
    bike.lampGlass.material = lampGlassMaterial;

    const headlamp = new THREE.SpotLight(0xfff1cf, 0, 52, 0.46, 0.55, 1.25);
    headlamp.position.set(0.16, 0.22, 0);
    headlamp.castShadow = !low;
    headlamp.shadow.mapSize.set(1024, 1024);
    headlamp.shadow.bias = -0.0004;
    headlamp.shadow.camera.near = 0.3;
    bike.frontSteer.add(headlamp);
    const lampTarget = new THREE.Object3D();
    lampTarget.position.set(12, -1.4, 0);
    bike.frontSteer.add(lampTarget);
    headlamp.target = lampTarget;

    const coneGeometry = new THREE.ConeGeometry(3.6, 13, 32, 1, true);
    coneGeometry.translate(0, -6.5, 0);
    coneGeometry.rotateZ(Math.PI / 2 - 0.1);
    const coneMaterial = new THREE.ShaderMaterial({
      uniforms: { uOpacity: { value: 0 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform float uOpacity; varying vec2 vUv; void main(){ float a = pow(vUv.y, 2.4) * uOpacity; gl_FragColor = vec4(vec3(1.0), a); }`,
    });
    const cone = new THREE.Mesh(coneGeometry, coneMaterial);
    cone.position.set(0.16, 0.22, 0);
    cone.renderOrder = 3;
    bike.frontSteer.add(cone);

    const contactShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 1.1),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }),
    );
    scene.add(contactShadow);

    /* ---------------------------------------------------------------- */
    /* Clouds (intro descent)                                           */
    /* ---------------------------------------------------------------- */

    const cloudTexture = makeCloudTexture(renderer);
    const cloudGroup = new THREE.Group();
    scene.add(cloudGroup);
    const cloudRandom = makeRandom(8123);
    const cloudMaterials: THREE.SpriteMaterial[] = [];
    for (let i = 0; i < (low ? 26 : 44); i++) {
      const material = new THREE.SpriteMaterial({
        map: cloudTexture,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        fog: false,
      });
      cloudMaterials.push(material);
      const sprite = new THREE.Sprite(material);
      const s = 60 + cloudRandom() * 130;
      sprite.scale.set(s, s * 0.6, 1);
      sprite.position.set((cloudRandom() - 0.5) * 900, 70 + cloudRandom() * 150, (cloudRandom() - 0.5) * 900);
      cloudGroup.add(sprite);
    }

    /* ---------------------------------------------------------------- */
    /* Stop markers                                                     */
    /* ---------------------------------------------------------------- */

    const stopMarkers = STOPS.map((stop, index) => {
      const marker = new THREE.Group();
      marker.position.set(stop.x, 0, stop.z);
      const accent = new THREE.Color([0x22e0ff, 0xff2d8f, 0xffb24a, 0x46ff9b, 0xa96bff, 0xff4d3d][index % 6]);
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(3.0, 3.35, 56),
        new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.2;
      marker.add(ring);
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(3, 3, 22, 32, 1, true),
        new THREE.MeshBasicMaterial({
          color: accent,
          transparent: true,
          opacity: 0.06,
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );
      beam.position.y = 11;
      marker.add(beam);

      const onXRoad = MAIN_ROAD_X.some((rx) => Math.abs(stop.x - rx) < 1);
      const sign = new THREE.Group();
      sign.position.set(onXRoad ? 7.6 : 0, 0, onXRoad ? 0 : 7.6);
      sign.rotation.y = onXRoad ? -Math.PI / 2 : Math.PI;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 3.6, 8), materials.ink);
      pole.position.y = 1.8;
      pole.castShadow = true;
      sign.add(pole);
      const boardMaterial = new THREE.MeshStandardMaterial({
        map: signTexture(index, stop.place),
        roughness: 0.8,
        emissive: 0xffffff,
        emissiveIntensity: 0,
        emissiveMap: null,
      });
      boardMaterial.emissiveMap = boardMaterial.map;
      const board = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.92, 0.06), [
        materials.ink,
        materials.ink,
        materials.ink,
        materials.ink,
        boardMaterial,
        boardMaterial,
      ]);
      board.position.y = 3.5;
      board.castShadow = true;
      sign.add(board);
      marker.add(sign);
      scene.add(marker);
      const stopLight = new THREE.PointLight(accent, 0, 20, 2);
      stopLight.position.set(stop.x, 3.4, stop.z);
      scene.add(stopLight);
      return { ring, beam, boardMaterial, stopLight };
    });

    /* ---------------------------------------------------------------- */
    /* Post-processing                                                  */
    /* ---------------------------------------------------------------- */

    let composer: EffectComposer | null = null;
    let bloom: UnrealBloomPass | null = null;
    if (!low) {
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.5, 0.65, 0.92);
      composer.addPass(bloom);
      composer.addPass(new OutputPass());
    }

    /* ---------------------------------------------------------------- */
    /* State                                                            */
    /* ---------------------------------------------------------------- */

    const input: RideInput = { throttle: false, brake: false, left: false, right: false, sprint: false, axisX: 0, axisY: 0 };
    const state = {
      position: SPAWN.clone(),
      heading: 0,
      speed: 0,
      steer: 0,
      lean: 0,
      pedal: 0,
      stand: 0,
      eggs: 0,
      phase: "idle" as Phase,
      introStart: 0,
      bellTime: -10,
      visited: new Set<number>(),
      insideStop: -1,
    };

    let tod = 0.94; // start late at night
    let timeTarget: number | null = null;
    const CYCLE_SECONDS = 420;
    let night = 1;

    const MAX_SPEED = 12.5;
    const SPRINT_SPEED = 18;
    const tmp = new THREE.Vector3();
    const sunDir = new THREE.Vector3();
    const moonDir = new THREE.Vector3();
    const cameraLook = new THREE.Vector3(SPAWN.x, 6, SPAWN.z + 30);
    const pose = { position: new THREE.Vector3(), look: new THREE.Vector3() };

    function forwardVector() {
      return tmp.set(Math.sin(state.heading), 0, Math.cos(state.heading));
    }

    function chasePose() {
      const forward = forwardVector().clone();
      const speedRatio = Math.min(1, Math.abs(state.speed) / SPRINT_SPEED);
      const portrait = camera.aspect < 1;
      const distance = (portrait ? 6.0 : 4.9) + speedRatio * 1.4;
      const height = (portrait ? 2.7 : 2.2) + speedRatio * 0.25;
      pose.position.copy(state.position).addScaledVector(forward, -distance).add(new THREE.Vector3(0, height, 0));
      pose.look.copy(state.position).addScaledVector(forward, 4 + speedRatio * 3).add(new THREE.Vector3(0, 1.2, 0));
      return pose;
    }

    const introFrom = new THREE.Vector3(SPAWN.x - 26, 190, SPAWN.z - 70);

    function placeBike() {
      bike.root.position.set(state.position.x, 0, state.position.z);
      // the model is built facing +x; rotate so it faces the heading vector
      bike.root.rotation.y = state.heading - Math.PI / 2;
      contactShadow.position.set(state.position.x, 0.18, state.position.z);
      contactShadow.rotation.set(-Math.PI / 2, 0, state.heading - Math.PI / 2);
    }
    placeBike();

    function resolveCollisions(next: THREE.Vector3) {
      const radius = 0.7;
      for (const c of colliders) {
        if (next.x + radius < c.minX || next.x - radius > c.maxX || next.z + radius < c.minZ || next.z - radius > c.maxZ) continue;
        const cx = THREE.MathUtils.clamp(next.x, c.minX, c.maxX);
        const cz = THREE.MathUtils.clamp(next.z, c.minZ, c.maxZ);
        const dx = next.x - cx;
        const dz = next.z - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 > radius * radius) continue;
        if (d2 < 1e-5) {
          const options = [
            [Math.abs(next.x - c.minX), 0],
            [Math.abs(c.maxX - next.x), 1],
            [Math.abs(next.z - c.minZ), 2],
            [Math.abs(c.maxZ - next.z), 3],
          ].sort((a, b) => a[0] - b[0]);
          const side = options[0][1];
          if (side === 0) next.x = c.minX - radius;
          else if (side === 1) next.x = c.maxX + radius;
          else if (side === 2) next.z = c.minZ - radius;
          else next.z = c.maxZ + radius;
        } else {
          const d = Math.sqrt(d2);
          const push = (radius - d) / d;
          next.x += dx * push;
          next.z += dz * push;
        }
        state.speed *= 0.6;
      }
      next.x = THREE.MathUtils.clamp(next.x, -WORLD_HALF - 20, WORLD_HALF + 20);
      next.z = THREE.MathUtils.clamp(next.z, -WORLD_HALF - 20, WORLD_HALF + 60);
    }

    function nextStopIndex() {
      for (let i = 0; i < STOPS.length; i++) if (!state.visited.has(i)) return i;
      return -1;
    }

    let lastEmit = 0;
    function emitState(force: boolean, time: number) {
      if (!force && time - lastEmit < 0.15) return;
      lastEmit = time;
      const nextIndex = nextStopIndex();
      const target = STOPS[nextIndex === -1 ? 0 : nextIndex];
      const dx = target.x - state.position.x;
      const dz = target.z - state.position.z;
      let bearing = Math.atan2(dx, dz) - state.heading;
      while (bearing > Math.PI) bearing -= Math.PI * 2;
      while (bearing < -Math.PI) bearing += Math.PI * 2;
      let district = DISTRICTS[0];
      let best = Infinity;
      for (const entry of DISTRICTS) {
        const d = Math.hypot(entry.x - state.position.x, entry.z - state.position.z);
        if (d < best) {
          best = d;
          district = entry;
        }
      }
      const hours = (tod * 24) % 24;
      const clock = `${String(Math.floor(hours)).padStart(2, "0")}:${String(Math.floor((hours % 1) * 60)).padStart(2, "0")}`;
      callbacks.onState?.({
        speed: Math.abs(state.speed) * 3.2,
        visited: [...state.visited],
        nextIndex,
        nextName: target.place,
        bearing,
        distance: Math.hypot(dx, dz),
        district: district.name,
        districtSub: district.sub,
        eggs: state.eggs,
        eggTotal: city.eggs.length,
        night,
        clock,
      });
    }

    /* ---------------------------------------------------------------- */
    /* Day / night                                                      */
    /* ---------------------------------------------------------------- */

    const skyTop = new THREE.Color();
    const skyHorizon = new THREE.Color();
    const skyGround = new THREE.Color();

    function updateTime(dt: number) {
      if (timeTarget !== null) {
        const step = dt * 0.2;
        const diff = (timeTarget - tod + 1) % 1;
        if (diff <= step) {
          tod = timeTarget;
          timeTarget = null;
        } else {
          tod = (tod + step) % 1;
        }
      } else {
        tod = (tod + dt / CYCLE_SECONDS) % 1;
      }

      const angle = (tod - 0.25) * Math.PI * 2;
      sunDir.set(Math.cos(angle), Math.sin(angle), 0.42).normalize();
      moonDir.copy(sunDir).negate();
      moonDir.z = 0.35;
      moonDir.normalize();
      const elevation = sunDir.y;
      const day = THREE.MathUtils.smoothstep(elevation, -0.1, 0.24);
      night = 1 - day;
      const dusk = Math.exp(-(elevation * elevation) / 0.012);

      skyTop.copy(C.nightTop).lerp(C.dayTop, day);
      skyHorizon.copy(C.nightHorizon).lerp(C.dayHorizon, day).lerp(C.dusk, dusk * 0.35);
      skyGround.copy(C.nightGround).lerp(C.dayGround, day);
      sky.uniforms.uTop.value.copy(skyTop);
      sky.uniforms.uHorizon.value.copy(skyHorizon);
      sky.uniforms.uGround.value.copy(skyGround);
      sky.uniforms.uSunDir.value.copy(sunDir);
      sky.uniforms.uMoonDir.value.copy(moonDir);
      sky.uniforms.uSun.value = THREE.MathUtils.smoothstep(elevation, -0.04, 0.06);
      sky.uniforms.uNight.value = THREE.MathUtils.smoothstep(-elevation, -0.02, 0.18);

      const sunStrength = THREE.MathUtils.smoothstep(elevation, 0, 0.25);
      const moonStrength = THREE.MathUtils.smoothstep(-elevation, 0, 0.25);
      const keyDir = elevation >= 0 ? sunDir : moonDir;
      sun.position.copy(state.position).addScaledVector(keyDir, 140);
      sun.target.position.copy(state.position);
      sun.target.updateMatrixWorld();
      sun.intensity = 3.1 * sunStrength + 0.5 * moonStrength;

      hemi.intensity = 0.1 + 0.85 * day;
      scene.environmentIntensity = 0.05 + 0.9 * day;
      const fog = scene.fog as THREE.Fog;
      fog.color.copy(skyHorizon);
      fog.near = THREE.MathUtils.lerp(22, 90, day);
      fog.far = THREE.MathUtils.lerp(175, 360, day);
      renderer.toneMappingExposure = THREE.MathUtils.lerp(1.05, 1.32, day);
      sun.color.copy(C.moonCool).lerp(C.sunWarm, day).lerp(C.dusk, dusk * 0.5);
      hemi.color.setHex(0x8fb4ff).lerp(new THREE.Color(0xcfe0ff), day);

      materials.glassLit.emissiveIntensity = 2.4 * night;
      // neon tubes buzz: each colour flickers on its own rhythm
      materials.neon.forEach((neonMaterial, i) => {
        const buzz =
          0.86 +
          Math.sin(elapsed * (7 + i * 2.3) + i) * 0.07 +
          (Math.sin(elapsed * (31 + i * 7)) > 0.93 ? -0.35 : 0);
        neonMaterial.emissiveIntensity = (0.1 + 3.4 * night) * buzz;
      });
      props.setNight(night);
      headlamp.intensity = 95 * night;
      headlamp.visible = night > 0.02;
      lampGlassMaterial.emissiveIntensity = 6 * night;
      coneMaterial.uniforms.uOpacity.value = 0.085 * night;
      cone.visible = night > 0.02;
      pointLights.forEach((light) => {
        light.intensity = 22 * night;
        light.visible = night > 0.02;
      });
      stopMarkers.forEach((marker) => {
        marker.boardMaterial.emissiveIntensity = 0.25 + 0.75 * night;
        marker.stopLight.intensity = 14 * night;
      });
      if (bloom) bloom.strength = 0.16 + 0.62 * night;
      const cloudShade = 0.16 + 0.84 * day;
      cloudMaterials.forEach((material) => material.color.setScalar(cloudShade));
    }

    let lampRefresh = 0;
    function refreshPointLights(time: number) {
      if (time - lampRefresh < 0.3) return;
      lampRefresh = time;
      const sorted = props.lampPositions
        .map((p) => ({ p, d: (p.x - state.position.x) ** 2 + (p.z - state.position.z) ** 2 }))
        .sort((a, b) => a.d - b.d);
      pointLights.forEach((light, i) => {
        const entry = sorted[i];
        if (entry) light.position.set(entry.p.x, entry.p.y - 0.4, entry.p.z);
      });
    }

    /* ---------------------------------------------------------------- */
    /* Ride                                                             */
    /* ---------------------------------------------------------------- */

    function updateRide(dt: number, time: number) {
      const maxSpeed = input.sprint ? SPRINT_SPEED : MAX_SPEED;
      const throttle = input.throttle ? 1 : Math.max(0, -input.axisY);
      const brake = input.brake ? 1 : Math.max(0, (input.axisY - 0.25) / 0.75);
      if (throttle > 0.05) state.speed += (input.sprint ? 9 : 7) * throttle * dt;
      else if (brake > 0.05) state.speed -= 13 * brake * dt;
      else {
        state.speed -= Math.sign(state.speed) * 2.4 * dt;
        if (Math.abs(state.speed) < 0.05) state.speed = 0;
      }
      state.speed = THREE.MathUtils.clamp(state.speed, -3, maxSpeed);
      state.speed -= state.speed * 0.1 * dt;

      const steerInput = THREE.MathUtils.clamp((input.left ? 1 : 0) - (input.right ? 1 : 0) - input.axisX, -1, 1);
      state.steer = THREE.MathUtils.damp(state.steer, steerInput, 8, dt);
      const speedRatio = Math.min(1, Math.abs(state.speed) / MAX_SPEED);
      state.heading += state.steer * 2.0 * (0.35 + speedRatio * 0.65) * Math.sign(state.speed || 1) * dt;

      const next = state.position.clone().addScaledVector(forwardVector(), state.speed * dt);
      resolveCollisions(next);
      state.position.copy(next);
      placeBike();

      // lean into the turn (roll around the bike's forward axis)
      state.lean = THREE.MathUtils.damp(state.lean, -state.steer * speedRatio * 0.36, 5, dt);
      bike.body.rotation.x = state.lean;
      bike.body.position.y = Math.sin(time * 9) * 0.01 * speedRatio;
      bike.frontSteer.rotation.y = state.steer * 0.36;

      const spin = (state.speed * dt) / 0.345;
      bike.wheelFront.rotation.z -= spin;
      bike.wheelRear.rotation.z -= spin;
      state.pedal += spin * 0.42;
      bike.crank.rotation.z = -state.pedal;
      const p = -state.pedal;
      const effort = Math.min(1, Math.abs(state.speed) / SPRINT_SPEED);
      const standing = input.sprint && effort > 0.55 ? 1 : 0;
      state.stand = THREE.MathUtils.damp(state.stand, standing, 4, dt);

      // legs follow the crank; the knee lags the hip so the pedal stroke reads
      bike.legs.thighL.rotation.z = -0.55 + Math.sin(p) * (0.5 + state.stand * 0.12);
      bike.legs.thighR.rotation.z = -0.55 + Math.sin(p + Math.PI) * (0.5 + state.stand * 0.12);
      bike.legs.shinL.rotation.z = 0.75 + Math.sin(p - 0.9) * 0.55;
      bike.legs.shinR.rotation.z = 0.75 + Math.sin(p + Math.PI - 0.9) * 0.55;
      bike.feet.l.rotation.z = -0.35 - Math.sin(p - 1.5) * 0.25;
      bike.feet.r.rotation.z = -0.35 - Math.sin(p + Math.PI - 1.5) * 0.25;

      // rider crouches into the bars with speed and rises out of the saddle to sprint
      const crouch = effort * 0.3 + state.stand * 0.12;
      bike.torso.rotation.z = -crouch;
      bike.torso.position.y = 1.0 + state.stand * 0.1 + Math.abs(Math.sin(p)) * (0.004 + state.stand * 0.022);
      bike.torso.position.x = -0.22 + crouch * 0.07;
      bike.torso.rotation.x = Math.sin(p) * (0.02 + state.stand * 0.07);
      // head stays level and looks down the road
      bike.head.rotation.z = crouch * 0.85;
      bike.head.position.y = 0.42 + crouch * 0.05;

      const sinceBell = time - state.bellTime;
      if (sinceBell < 0.5) bike.bell.rotation.z = Math.sin(sinceBell * 60) * 0.25 * (1 - sinceBell / 0.5);

      // portfolio stops
      let inside = -1;
      STOPS.forEach((stop, index) => {
        if (Math.hypot(stop.x - state.position.x, stop.z - state.position.z) < 7) inside = index;
      });
      if (inside !== -1 && inside !== state.insideStop) {
        state.insideStop = inside;
        state.visited.add(inside);
        callbacks.onStop?.(inside);
        emitState(true, time);
      } else if (inside === -1 && state.insideStop !== -1) {
        const stop = STOPS[state.insideStop];
        if (Math.hypot(stop.x - state.position.x, stop.z - state.position.z) > 18) {
          callbacks.onLeaveStop?.(state.insideStop);
          state.insideStop = -1;
        }
      }

      for (const egg of city.eggs) {
        if (egg.collected) continue;
        if (Math.hypot(egg.position.x - state.position.x, egg.position.z - state.position.z) < 2.8) {
          egg.collected = true;
          egg.object.visible = false;
          state.eggs++;
          callbacks.onEgg?.(egg.name, egg.note, state.eggs, city.eggs.length);
          emitState(true, time);
        }
      }
    }

    function updateCamera(dt: number, time: number) {
      const portrait = camera.aspect < 1;
      if (state.phase === "intro") {
        chasePose();
        const t = Math.min(1, (performance.now() - state.introStart) / 5600);
        const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        const swirl = 1 - ease;
        camera.position.set(
          THREE.MathUtils.lerp(introFrom.x, pose.position.x, ease) + Math.sin(ease * Math.PI) * swirl * 18,
          THREE.MathUtils.lerp(introFrom.y, pose.position.y, ease * ease * 0.85 + ease * 0.15),
          THREE.MathUtils.lerp(introFrom.z, pose.position.z, ease) + Math.cos(ease * Math.PI) * swirl * 12,
        );
        cameraLook.lerp(pose.look, 0.05 + ease * 0.12);
        camera.lookAt(cameraLook);
        camera.fov = THREE.MathUtils.lerp(74, portrait ? 66 : 56, ease);
        camera.updateProjectionMatrix();
        if (t >= 1) {
          state.phase = "ride";
          callbacks.onPhase?.("ride");
        }
        return;
      }
      if (state.phase === "idle") {
        const a = time * 0.035;
        camera.position.set(state.position.x + Math.cos(a) * 58, 30, state.position.z + 40 + Math.sin(a) * 58);
        cameraLook.lerp(tmp.set(state.position.x, 4, state.position.z + 34), 0.05);
        camera.lookAt(cameraLook);
        camera.fov = portrait ? 70 : 52;
        camera.updateProjectionMatrix();
        return;
      }
      chasePose();
      camera.position.lerp(pose.position, 1 - Math.exp(-6.5 * dt));
      // a whisper of handheld drift
      pose.look.x += Math.sin(time * 0.7) * 0.06;
      pose.look.y += Math.sin(time * 1.1) * 0.04;
      cameraLook.lerp(pose.look, 1 - Math.exp(-8 * dt));
      camera.lookAt(cameraLook);
      const speedRatio = Math.min(1, Math.abs(state.speed) / SPRINT_SPEED);
      camera.fov = THREE.MathUtils.damp(camera.fov, (portrait ? 66 : 55) + speedRatio * 9, 4, dt);
      camera.updateProjectionMatrix();
    }

    function updateMarkers(time: number) {
      const nextIndex = nextStopIndex();
      stopMarkers.forEach((marker, index) => {
        const ringMaterial = marker.ring.material as THREE.MeshBasicMaterial;
        const beamMaterial = marker.beam.material as THREE.MeshBasicMaterial;
        const active = index === nextIndex;
        const visited = state.visited.has(index);
        ringMaterial.opacity = active ? 0.55 + Math.sin(time * 3) * 0.25 : visited ? 0.15 : 0.35;
        beamMaterial.opacity = (active ? 0.07 : visited ? 0.012 : 0.03) * (0.4 + night);
        marker.ring.scale.setScalar(active ? 1 + Math.sin(time * 3) * 0.04 : 1);
      });
    }

    /* ---------------------------------------------------------------- */
    /* Loop                                                             */
    /* ---------------------------------------------------------------- */

    function resize() {
      const width = container.clientWidth || window.innerWidth;
      const height = container.clientHeight || window.innerHeight;
      renderer.setSize(width, height, false);
      composer?.setPixelRatio(renderer.getPixelRatio());
      composer?.setSize(width, height);
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
    }
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    let disposed = false;
    let ready = false;
    let previous = performance.now();
    let elapsed = 0;
    let frameHandle = 0;
    camera.position.copy(introFrom);

    function frame() {
      if (disposed) return;
      const now = performance.now();
      const dt = Math.min((now - previous) / 1000, 0.05);
      previous = now;
      elapsed += dt;

      updateTime(dt);
      if (state.phase === "ride") updateRide(dt, elapsed);
      updateCamera(dt, elapsed);
      updateMarkers(elapsed);
      refreshPointLights(elapsed);
      props.update(elapsed, dt, state.position);
      city.update(elapsed);
      sky.mesh.position.copy(camera.position);
      cloudGroup.visible = state.phase !== "ride";
      cloudGroup.position.set(camera.position.x * 0.5, 0, camera.position.z * 0.5);
      emitState(false, elapsed);

      if (composer) composer.render();
      else renderer.render(scene, camera);

      if (!ready) {
        ready = true;
        callbacks.onReady?.();
      }
      frameHandle = requestAnimationFrame(frame);
    }
    frame();

    function onContextLost(event: Event) {
      event.preventDefault();
      callbacks.onError?.("The WebGL context was lost.");
    }
    canvas.addEventListener("webglcontextlost", onContextLost);

    const api: EngineAPI = {
      start: () => {
        if (state.phase !== "idle") return;
        state.phase = "intro";
        state.introStart = performance.now();
        callbacks.onPhase?.("intro");
      },
      setInput: (next) => Object.assign(input, next),
      ringBell: () => {
        state.bellTime = elapsed;
        callbacks.onBell?.();
      },
      reset: () => {
        state.position.copy(SPAWN);
        state.heading = 0;
        state.speed = 0;
        state.steer = 0;
        placeBike();
      },
      teleport: (index) => {
        const stop = STOPS[index];
        if (!stop) return;
        const onXRoad = MAIN_ROAD_X.some((rx) => Math.abs(stop.x - rx) < 1);
        const back = 13;
        state.position.set(onXRoad ? stop.x : stop.x - back, 0, onXRoad ? stop.z - back : stop.z);
        state.heading = onXRoad ? 0 : Math.PI / 2;
        state.speed = 0;
        state.steer = 0;
        state.insideStop = -1;
        placeBike();
        if (state.phase === "ride") {
          chasePose();
          camera.position.copy(pose.position);
          cameraLook.copy(pose.look);
        }
        emitState(true, elapsed);
      },
      setTimeMode: (mode) => {
        timeTarget = mode === "day" ? 0.45 : 0.94;
      },
      dispose: () => {
        disposed = true;
        cancelAnimationFrame(frameHandle);
        resizeObserver.disconnect();
        canvas.removeEventListener("webglcontextlost", onContextLost);
        scene.traverse((object) => {
          if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.Line) {
            object.geometry?.dispose?.();
          }
        });
        materials.dispose();
        cloudTexture.dispose();
        envMap.dispose();
        composer?.dispose();
        renderer.dispose();
        if (canvas.parentElement === container) container.removeChild(canvas);
      },
    };

    return { api };
  } catch (error) {
    const message = error instanceof Error ? error.message : "The world failed to build.";
    callbacks.onError?.(message);
    try {
      renderer.dispose();
      renderer.domElement.remove();
    } catch {
      /* noop */
    }
    return { api: null, error: message };
  }
}
