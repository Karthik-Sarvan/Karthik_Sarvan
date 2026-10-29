import * as THREE from "three";

/** Gradient sky dome with sun, moon and a procedural star field. */
export function createSky() {
  const uniforms = {
    uTop: { value: new THREE.Color(0x030303) },
    uHorizon: { value: new THREE.Color(0x141414) },
    uGround: { value: new THREE.Color(0x060606) },
    uSunDir: { value: new THREE.Vector3(0, -1, 0) },
    uMoonDir: { value: new THREE.Vector3(0, 1, 0) },
    uSun: { value: 0 },
    uNight: { value: 1 },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = p.xyww;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uTop;
      uniform vec3 uHorizon;
      uniform vec3 uGround;
      uniform vec3 uSunDir;
      uniform vec3 uMoonDir;
      uniform float uSun;
      uniform float uNight;
      varying vec3 vDir;

      float hash(vec3 p) {
        p = fract(p * 0.3183099 + 0.1);
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }

      void main() {
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 col = mix(uHorizon, uTop, smoothstep(0.0, 0.6, h));
        col = mix(col, uGround, smoothstep(0.0, -0.2, h));

        float sd = max(dot(d, normalize(uSunDir)), 0.0);
        col += vec3(1.0) * (pow(sd, 1600.0) * 18.0 + pow(sd, 12.0) * 0.28) * uSun;

        float md = max(dot(d, normalize(uMoonDir)), 0.0);
        col += vec3(0.92) * smoothstep(0.99955, 0.9998, md) * 2.4 * uNight;
        col += vec3(0.55) * pow(md, 90.0) * 0.35 * uNight;

        vec3 cell = floor(d * 380.0);
        float s = hash(cell);
        float star = step(0.9962, s) * smoothstep(0.03, 0.3, h);
        float twinkle = 0.55 + 0.9 * hash(cell + 7.3);
        col += vec3(star * twinkle) * uNight;

        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });

  const mesh = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 24), material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1;
  return { mesh, uniforms, material };
}
