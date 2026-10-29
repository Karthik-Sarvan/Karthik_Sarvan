/**
 * ============================================================================
 * KARTHIK SARVAN // LINUX GRAPHICS & DRM KERNEL PORTFOLIO ENGINE
 * Dual-Engine: 3D WebGL + 2D Canvas Silicon Fallback, Physics Rover & Terminal
 * ============================================================================
 */

(function () {
  "use strict";

  /* ==========================================================================
     1. AUDIO SYNTHESIZER (100% Native Web Audio API - Zero External Files)
     ========================================================================== */
  class AudioSynth {
    constructor() {
      this.ctx = null;
      this.enabled = false;
      this.engineOsc = null;
      this.engineGain = null;
      this.filter = null;
    }

    init() {
      if (this.ctx) return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      try {
        this.ctx = new AudioCtx();
        this.engineOsc = this.ctx.createOscillator();
        this.engineOsc.type = "sawtooth";
        this.engineOsc.frequency.setValueAtTime(45, this.ctx.currentTime);

        this.filter = this.ctx.createBiquadFilter();
        this.filter.type = "lowpass";
        this.filter.frequency.setValueAtTime(120, this.ctx.currentTime);

        this.engineGain = this.ctx.createGain();
        this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);

        this.engineOsc.connect(this.filter);
        this.filter.connect(this.engineGain);
        this.engineGain.connect(this.ctx.destination);
        this.engineOsc.start();
      } catch (e) {
        console.warn("AudioContext init error:", e);
      }
    }

    toggle() {
      this.init();
      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume();
      }
      this.enabled = !this.enabled;
      if (!this.enabled && this.engineGain && this.ctx) {
        this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      }
      return this.enabled;
    }

    updateEngine(speedRatio) {
      if (!this.enabled || !this.ctx || !this.engineOsc) return;
      const targetFreq = 45 + Math.abs(speedRatio) * 110;
      const targetGain = 0.02 + Math.abs(speedRatio) * 0.045;
      const filterFreq = 110 + Math.abs(speedRatio) * 350;

      this.engineOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.05);
      this.filter.frequency.setTargetAtTime(filterFreq, this.ctx.currentTime, 0.05);
      this.engineGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
    }

    playChime() {
      if (!this.enabled || !this.ctx) return;
      const now = this.ctx.currentTime;
      const freqs = [523.25, 659.25, 783.99, 1046.5];
      freqs.forEach((f, i) => {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(f, now + i * 0.06);

        g.gain.setValueAtTime(0, now + i * 0.06);
        g.gain.linearRampToValueAtTime(0.08, now + i * 0.06 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.06 + 0.45);

        osc.connect(g);
        g.connect(this.ctx.destination);
        osc.start(now + i * 0.06);
        osc.stop(now + i * 0.06 + 0.5);
      });
    }

    playClick() {
      if (!this.enabled || !this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.04);

      g.gain.setValueAtTime(0.04, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    }
  }

  const audio = new AudioSynth();

  /* ==========================================================================
     2. TECHNICAL STATIONS DATA
     ========================================================================== */
  const STATIONS_DATA = [
    {
      id: "spawn",
      title: "Command Plaza // Identity",
      sub: "Karthik Sarvan · Linux Graphics & Kernel Engineer",
      pos: { x: 0, z: 0 },
      color: 0x00e5ff,
      colorHex: "#00e5ff",
      icon: "⚡",
      tags: ["Systems Developer", "Mesa 3D", "Linux Kernel", "FreeDesktop"],
      description: `
        <p>Welcome to the bare-metal workspace of <strong>Karthik Sarvan</strong>. I engineer low-level systems software, focusing on <strong>Mesa 3D graphics drivers</strong>, the <strong>Linux DRM/KMS kernel subsystem</strong>, Wayland compositors, and open-source hardware emulation.</p>
        <p>Drive the GPU probe around the silicon wafer using <strong>WASD / Arrow Keys</strong>, hit the station inspection pads, or use the quick navigation dock below.</p>
      `,
      snippet: `// Identity & Upstream Targets
struct Engineer {
    const char *name = "Karthik Sarvan";
    const char *focus = "Linux DRM / KMS & Mesa 3D Driver Development";
    const char *freedesktop = "gitlab.freedesktop.org/karthik-sarvan";
    const char *github = "github.com/karthik-sarvan";
    const char *hardware = "mimic.aegiondynamic.com";
};`,
      actions: [
        { label: "FreeDesktop GitLab", url: "https://gitlab.freedesktop.org/karthik-sarvan" },
        { label: "GitHub Profile", url: "https://github.com/karthik-sarvan" }
      ]
    },
    {
      id: "mesa",
      title: "Mesa 3D // Graphics Stack",
      sub: "Upstream FreeDesktop Driver Architecture & Compilers",
      pos: { x: -28, z: -20 },
      color: 0x00e5ff,
      colorHex: "#00e5ff",
      icon: "🔺",
      tags: ["Mesa 3D", "Vulkan (Lavapipe/RADV)", "Zink", "NIR Compiler", "Gallium3D"],
      description: `
        <p>Active contributor to <strong>Mesa 3D</strong> on FreeDesktop.org (<code>gitlab.freedesktop.org/mesa/mesa</code>). Working on modern compiler optimizations and user-space driver internals.</p>
        <p><strong>Recent Upstream Merge Requests:</strong></p>
        <ul>
          <li><strong>MR !45614:</strong> <code>lavapipe: report full pipeline cache header size</code> — calculated accurate pipeline cache header sizes in the Lavapipe Vulkan software rasterizer.</li>
          <li><strong>Zink HUD Submits:</strong> <code>zink: add submits-per-frame HUD query</code> — performance profiling instrumentation for Zink (OpenGL over Vulkan) reviewed by upstream maintainers.</li>
          <li><strong>NIR Passes:</strong> Low-level SSA transformation passes, instruction scheduling, and SPIR-V lowering.</li>
        </ul>
      `,
      snippet: `// Lavapipe Vulkan software rasterizer cache sizing
size_t lvp_get_pipeline_cache_header_size(void) {
    return sizeof(struct vk_pipeline_cache_header) +
           VK_UUID_SIZE + 4 /* driver version */;
}`,
      actions: [
        { label: "Mesa MR !45614", url: "https://gitlab.freedesktop.org/mesa/mesa/-/merge_requests/45614" },
        { label: "FreeDesktop GitLab", url: "https://gitlab.freedesktop.org/karthik-sarvan" }
      ]
    },
    {
      id: "drm",
      title: "Linux Kernel DRM // KMS Subsystem",
      sub: "Direct Rendering Manager, GEM, DMA-BUF & Explicit Sync",
      pos: { x: 28, z: -20 },
      color: 0xff3366,
      colorHex: "#ff3366",
      icon: "🐧",
      tags: ["Linux Kernel", "DRM/KMS", "GEM Buffers", "DMA-BUF", "Explicit Sync"],
      description: `
        <p>Deep specialization in the <strong>Linux Direct Rendering Manager (DRM)</strong> and <strong>Kernel Mode Setting (KMS)</strong> subsystem (<code>drivers/gpu/drm/</code>).</p>
        <p><strong>Key Kernel Architecture Areas:</strong></p>
        <ul>
          <li><strong>GEM & Memory Management:</strong> VRAM vs GTT buffer allocations, TTM placement, eviction, and mmap memory tracking.</li>
          <li><strong>Atomic KMS Pipeline:</strong> Atomic state commit verification (<code>DRM_IOCTL_MODE_ATOMIC_COMMIT</code>) for Framebuffers, Planes, CRTCs, and Connectors.</li>
          <li><strong>Explicit Synchronization:</strong> <code>wp_linux_drm_syncobj_v1</code> integration, non-blocking asynchronous timeline fences (dma_fence).</li>
          <li><strong>IGT GPU Tools:</strong> Automated regression test suites for DRM drivers.</li>
        </ul>
      `,
      snippet: `// Linux Kernel DRM Atomic Modesetting Commit
int drm_atomic_commit(struct drm_atomic_state *state) {
    struct drm_mode_config *config = &state->dev->mode_config;
    int ret = drm_atomic_check_only(state);
    if (ret) return ret;
    return config->funcs->atomic_commit(state->dev, state, false);
}`,
      actions: [
        { label: "Linux DRM Tree", url: "https://git.kernel.org/pub/scm/linux/kernel/git/torvalds/linux.git/tree/drivers/gpu/drm" },
        { label: "FreeDesktop GitLab", url: "https://gitlab.freedesktop.org/karthik-sarvan" }
      ]
    },
    {
      id: "mimic",
      title: "Mimic // Open-Source Hardware",
      sub: "Maintainer of mimic.aegiondynamic.com",
      pos: { x: -28, z: 24 },
      color: 0xffaa00,
      colorHex: "#ffaa00",
      icon: "🔌",
      tags: ["Maintainer", "Hardware Emulation", "Bare-Metal C", "STM32", "I2C / SPI"],
      description: `
        <p><strong>Maintainer and Lead Architect</strong> of <a href="https://mimic.aegiondynamic.com" target="_blank" rel="noopener">Mimic</a>, an open-source hardware emulation and hardware-in-the-loop (HIL) test harness.</p>
        <p><strong>Why Mimic Exists:</strong></p>
        <p>Firmware teams routinely wait months for custom PCBs. Mimic runs on bare-metal <strong>STM32 microcontrollers</strong>, listening on physical <strong>I2C/SPI buses</strong> as a slave peripheral to emulate complex multi-sensor payloads and synthetic failure modes in real time.</p>
        <p>Enables strict automated unit testing of control loops, PID tuning, and bus recovery firmware before silicon tape-out.</p>
      `,
      snippet: `// Mimic I2C Sensor Proxy State Machine (Bare-Metal C)
void mimic_i2c_event_isr(I2C_TypeDef *i2c) {
    if (i2c->ISR & I2C_ISR_ADDR) {
        i2c->ICR |= I2C_ICR_ADDRCF;
        mimic_bus_handle_address_match(i2c);
    }
    if (i2c->ISR & I2C_ISR_TXIS) {
        i2c->TXDR = mimic_synthetic_sensor_next_byte();
    }
}`,
      actions: [
        { label: "Visit Mimic Website", url: "https://mimic.aegiondynamic.com" },
        { label: "Mimic Firmware Repo", url: "https://github.com/Karthik-Sarvan/Mimic-Firmware" }
      ]
    },
    {
      id: "commits",
      title: "3D Commit Canyon // GitHub & GitLab",
      sub: "2,742+ Contributions in 2026 alone · github.com/karthik-sarvan",
      pos: { x: 0, z: -44 },
      color: 0x00ff88,
      colorHex: "#00ff88",
      icon: "🟩",
      tags: ["2,742+ Commits", "Voxel Heatmap", "Upstream Code", "Daily Streaks"],
      description: `
        <p>This landscape is an interactive, physically-extruded <strong>voxel heatmap of all 52 weeks of GitHub activity</strong> for <code>karthik-sarvan</code>.</p>
        <p>Each bar's height represents daily commit density (surpassing <strong>2,742+ commits in 2026</strong>), shaded with glowing phosphor green levels. Drive the rover through the canyons or hover over any pillar to view the exact date and commit count.</p>
      `,
      snippet: `// GitHub 2026 Activity Matrix
{
  "user": "karthik-sarvan",
  "total_2026": 2742,
  "peak_day": "2026-04-22 (988 commits)",
  "active_repos": ["mesa", "zephyr", "mir", "Mimic-Firmware", "Mimic-Bridge"]
}`,
      actions: [
        { label: "GitHub Profile", url: "https://github.com/karthik-sarvan" },
        { label: "GitLab Activity", url: "https://gitlab.freedesktop.org/karthik-sarvan" }
      ]
    },
    {
      id: "shader",
      title: "GLSL Shader Lab // GPU Telemetry",
      sub: "Real-Time Vertex/Fragment Pipeline & Hardware Diagnostics",
      pos: { x: 28, z: 24 },
      color: 0xbf5af2,
      colorHex: "#bf5af2",
      icon: "🔮",
      tags: ["GLSL Shaders", "Raymarching", "GPU Telemetry", "Hardware Performance"],
      description: `
        <p>Live graphics rendering pipeline experiment. The crystalline structure runs custom <strong>GLSL vertex wave displacement</strong> and <strong>procedural iridescent chromatic Fresnel fragment shaders</strong> directly on your GPU.</p>
        <div id="gpu-telemetry-box" class="code-snippet-box">
          Detecting GPU Hardware...
        </div>
      `,
      snippet: `// Procedural Chromatic Dispersion Fragment Shader
precision mediump float;
varying vec3 vNormal;
varying vec3 vPosition;
uniform float uTime;
void main() {
    float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.5);
    vec3 color = 0.5 + 0.5 * cos(uTime + vPosition.xyx + vec3(0.0, 2.0, 4.0));
    gl_FragColor = vec4(color * fresnel, 1.0);
}`,
      actions: [
        { label: "Mesa 3D Home", url: "https://mesa3d.org" },
        { label: "Khronos Vulkan", url: "https://www.khronos.org/vulkan/" }
      ]
    }
  ];

  /* ==========================================================================
     3. PORTFOLIO ENGINE (DUAL 3D WEBGL + 2D CANVAS SILICON SCHEMATIC)
     ========================================================================== */
  class PortfolioApp {
    constructor() {
      this.container = document.getElementById("webgl-viewport");
      this.is3D = false;
      this.activeStation = null;

      // Driving Physics State
      this.roverPos = { x: 0, z: 0 };
      this.roverAngle = 0;
      this.roverSpeed = 0;
      this.roverSteer = 0;
      this.targetSteer = 0;
      this.autopilotTarget = null;
      this.keys = { forward: false, backward: false, left: false, right: false, brake: false };

      // Telemetry
      this.fps = 60;
      this.frameCount = 0;
      this.lastFpsTime = performance.now();
      this.gpuInfo = null;

      // Initialize UI, Controls, Terminal, and Audio FIRST
      this.setupHUD();
      this.setupEventListeners();
      this.setupTouchControls();
      this.setupTerminalEngine();

      // Attempt WebGL 3D, fall back seamlessly to 2D Canvas Simulation
      this.initRenderer();
    }

    /* ------------------------------------------------------------------------
       RENDERER INITIALIZATION & BRAVE SHIELDS / WEBGL FALLBACK
       ------------------------------------------------------------------------ */
    initRenderer() {
      if (!this.container) return;

      let webglContext = null;
      const testCanvas = document.createElement("canvas");

      // Try multiple WebGL context variants with lenient attributes
      const ctxAttrs = {
        alpha: false,
        depth: true,
        stencil: false,
        antialias: false,
        powerPreference: "default",
        failIfMajorPerformanceCaveat: false
      };

      try {
        webglContext = testCanvas.getContext("webgl2", ctxAttrs) ||
                       testCanvas.getContext("webgl", ctxAttrs) ||
                       testCanvas.getContext("experimental-webgl", ctxAttrs);
      } catch (e) {
        console.warn("Direct WebGL getContext failed:", e);
      }

      if (typeof THREE !== "undefined" && webglContext) {
        try {
          this.init3D(webglContext);
          this.is3D = true;
          return;
        } catch (err) {
          console.warn("Three.js 3D initialization failed, falling back to 2D Silicon Simulator:", err);
        }
      }

      // If WebGL is blocked by Brave Shields or unavailable, use 2D Cyber Canvas
      this.init2D();
    }

    /* ------------------------------------------------------------------------
       3D WEBGL ENGINE (THREE.JS)
       ------------------------------------------------------------------------ */
    init3D(gl) {
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x06080d);
      this.scene.fog = new THREE.FogExp2(0x06080d, 0.015);

      this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.5, 500);
      this.camera.position.set(0, 16, 28);

      this.renderer = new THREE.WebGLRenderer({
        canvas: gl.canvas,
        context: gl,
        antialias: true
      });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.outputEncoding = THREE.sRGBEncoding;
      this.container.appendChild(this.renderer.domElement);

      this.clock = new THREE.Clock();
      this.commitBlocks = [];
      this.raycaster = new THREE.Raycaster();
      this.mouse = new THREE.Vector2(-999, -999);
      this.hoveredBlock = null;
      this.exhaustParticles = [];
      this.shaderUniforms = { uTime: { value: 0 } };

      this.setup3DLighting();
      this.setup3DEnvironment();
      this.setup3DRover();
      this.setup3DStations();
      this.setup3DCommitMatrix();
      this.setup3DShaderLab();

      this.animate3D();
    }

    setup3DLighting() {
      const ambientLight = new THREE.AmbientLight(0x182030, 1.2);
      this.scene.add(ambientLight);

      const dirLight = new THREE.DirectionalLight(0xddeeff, 1.8);
      dirLight.position.set(40, 60, 30);
      dirLight.castShadow = true;
      dirLight.shadow.mapSize.width = 1024;
      dirLight.shadow.mapSize.height = 1024;
      dirLight.shadow.bias = -0.0005;
      this.scene.add(dirLight);

      const rimLight = new THREE.DirectionalLight(0x0055ff, 0.8);
      rimLight.position.set(-50, 30, -50);
      this.scene.add(rimLight);
    }

    setup3DEnvironment() {
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#070a10";
      ctx.fillRect(0, 0, 512, 512);

      ctx.strokeStyle = "rgba(0, 229, 255, 0.1)";
      ctx.lineWidth = 1;
      for (let x = 0; x <= 512; x += 32) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 512); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, x); ctx.lineTo(512, x); ctx.stroke();
      }
      ctx.strokeStyle = "rgba(0, 229, 255, 0.3)";
      ctx.lineWidth = 2;
      [128, 256, 384].forEach((pos) => {
        ctx.beginPath(); ctx.moveTo(pos, 0); ctx.lineTo(pos, 512); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, pos); ctx.lineTo(512, pos); ctx.stroke();
      });

      const groundTexture = new THREE.CanvasTexture(canvas);
      groundTexture.wrapS = THREE.RepeatWrapping;
      groundTexture.wrapT = THREE.RepeatWrapping;
      groundTexture.repeat.set(16, 16);

      const groundGeo = new THREE.PlaneGeometry(320, 320);
      const groundMat = new THREE.MeshStandardMaterial({
        map: groundTexture,
        roughness: 0.65,
        metalness: 0.4
      });

      this.ground = new THREE.Mesh(groundGeo, groundMat);
      this.ground.rotation.x = -Math.PI / 2;
      this.ground.receiveShadow = true;
      this.scene.add(this.ground);
    }

    setup3DRover() {
      this.rover = new THREE.Group();

      const bodyGeo = new THREE.BoxGeometry(2.2, 0.7, 3.4);
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x11151e, roughness: 0.4, metalness: 0.8 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 0.65;
      body.castShadow = true;
      this.rover.add(body);

      const visorGeo = new THREE.BoxGeometry(1.6, 0.45, 1.4);
      const visorMat = new THREE.MeshStandardMaterial({
        color: 0x002233,
        emissive: 0x00e5ff,
        emissiveIntensity: 0.7
      });
      const visor = new THREE.Mesh(visorGeo, visorMat);
      visor.position.set(0, 1.1, -0.3);
      this.rover.add(visor);

      this.wheels = [];
      this.frontWheelHubs = [];
      const wheelGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.45, 16);
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x080b10, roughness: 0.8 });

      [
        { x: -1.3, z: -1.1, isFront: true },
        { x: 1.3, z: -1.1, isFront: true },
        { x: -1.3, z: 1.1, isFront: false },
        { x: 1.3, z: 1.1, isFront: false }
      ].forEach((cfg) => {
        const hub = new THREE.Group();
        hub.position.set(cfg.x, 0.48, cfg.z);
        const mesh = new THREE.Mesh(wheelGeo, wheelMat);
        mesh.rotation.z = Math.PI / 2;
        mesh.castShadow = true;
        hub.add(mesh);
        this.rover.add(hub);
        this.wheels.push(mesh);
        if (cfg.isFront) this.frontWheelHubs.push(hub);
      });

      this.scene.add(this.rover);
    }

    setup3DStations() {
      this.stations3D = [];
      STATIONS_DATA.forEach((data) => {
        const group = new THREE.Group();
        group.position.set(data.pos.x, 0, data.pos.z);

        const ringGeo = new THREE.RingGeometry(4.2, 4.6, 32);
        const ringMat = new THREE.MeshBasicMaterial({ color: data.color, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.05;
        group.add(ring);

        const pLight = new THREE.PointLight(data.color, 1.5, 18);
        pLight.position.set(0, 3, 0);
        group.add(pLight);

        this.scene.add(group);
        this.stations3D.push({ ...data, group });
      });
    }

    async setup3DCommitMatrix() {
      const commitGroup = new THREE.Group();
      commitGroup.position.set(0, 0, -44);

      let commitData = null;
      try {
        const res = await fetch("assets/github-contributions.json");
        if (res.ok) commitData = await res.json();
      } catch (err) {}

      const contributions = (commitData && commitData.contributions) ? commitData.contributions : [];
      const levelColors = [
        new THREE.Color(0x161b22),
        new THREE.Color(0x0e4429),
        new THREE.Color(0x006d32),
        new THREE.Color(0x26a641),
        new THREE.Color(0x39d353)
      ];

      const boxGeo = new THREE.BoxGeometry(0.48, 1, 0.48);
      const cols = 52;
      const rows = 7;
      let itemIndex = 0;

      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          const item = contributions[itemIndex++] || { count: Math.floor(Math.random() * 8), level: 1, date: "2026" };
          const level = Math.min(Math.max(item.level || 0, 0), 4);
          const count = item.count || 0;
          const height = level === 0 ? 0.15 : Math.max(0.4, Math.log2(count + 1) * 0.9);

          const mat = new THREE.MeshStandardMaterial({
            color: levelColors[level],
            emissive: level >= 3 ? 0x00ff88 : 0x000000,
            emissiveIntensity: level === 4 ? 0.6 : (level === 3 ? 0.3 : 0),
            roughness: 0.3
          });

          const bar = new THREE.Mesh(boxGeo, mat);
          bar.position.set((c - cols / 2) * 0.65, height / 2, (r - rows / 2) * 0.65);
          bar.scale.set(1, height, 1);
          bar.userData = { date: item.date, count: count };
          commitGroup.add(bar);
          this.commitBlocks.push(bar);
        }
      }
      this.scene.add(commitGroup);
    }

    setup3DShaderLab() {
      const shaderGroup = new THREE.Group();
      shaderGroup.position.set(28, 3.8, 24);
      const prismGeo = new THREE.IcosahedronGeometry(2.4, 2);
      const prismMat = new THREE.ShaderMaterial({
        uniforms: this.shaderUniforms,
        vertexShader: `
          varying vec3 vNormal;
          varying vec3 vPosition;
          uniform float uTime;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            vec3 pos = position;
            pos += normal * (sin(pos.y * 3.0 + uTime * 2.5) * 0.18);
            vPosition = pos;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          }
        `,
        fragmentShader: `
          varying vec3 vNormal;
          varying vec3 vPosition;
          uniform float uTime;
          void main() {
            float fresnel = pow(1.0 - max(dot(vNormal, normalize(-vPosition)), 0.0), 2.2);
            vec3 col = 0.5 + 0.5 * cos(uTime + vPosition.xyx * 1.8 + vec3(0.0, 2.0, 4.0));
            gl_FragColor = vec4(mix(vec3(0.05, 0.08, 0.15), col, fresnel) + fresnel * 0.4, 0.9);
          }
        `,
        transparent: true
      });
      this.shaderPrism = new THREE.Mesh(prismGeo, prismMat);
      shaderGroup.add(this.shaderPrism);
      this.scene.add(shaderGroup);
    }

    animate3D() {
      requestAnimationFrame(() => this.animate3D());
      const delta = this.clock.getDelta();
      const elapsed = this.clock.getElapsedTime();

      this.shaderUniforms.uTime.value = elapsed;
      if (this.shaderPrism) this.shaderPrism.rotation.y = elapsed * 0.35;

      this.updatePhysics(delta);

      // Camera follow
      if (this.rover) {
        this.camera.position.x += (this.roverPos.x + Math.sin(this.roverAngle) * 14 - this.camera.position.x) * 0.08;
        this.camera.position.y += (8.5 - this.camera.position.y) * 0.08;
        this.camera.position.z += (this.roverPos.z + Math.cos(this.roverAngle) * 14 - this.camera.position.z) * 0.08;
        this.camera.lookAt(this.roverPos.x, 1.2, this.roverPos.z);
      }

      this.updateFPS();
      this.renderer.render(this.scene, this.camera);
    }

    /* ------------------------------------------------------------------------
       2D CANVAS SILICON SCHEMATIC ENGINE (FALLBACK FOR BRAVE SHIELDS / NO WEBGL)
       ------------------------------------------------------------------------ */
    init2D() {
      console.log("⚡ Starting 2D Interactive Silicon Simulator (Brave Shields / Non-WebGL Fallback)");

      const canvas = document.createElement("canvas");
      canvas.id = "canvas-2d-viewport";
      this.container.innerHTML = "";
      this.container.appendChild(canvas);
      this.canvas2d = canvas;
      this.ctx2d = canvas.getContext("2d");

      // Show notice pill in HUD
      const hudBrand = document.querySelector(".hud-header");
      if (hudBrand) {
        const notice = document.createElement("div");
        notice.className = "webgl-notice-pill hud-interactive";
        notice.innerHTML = `<span>⚡ 2D SILICON SIM</span><span class="text-xs opacity-75">(Shields blocked WebGL)</span>`;
        notice.title = "Click to see how to enable full 3D mode in Brave";
        notice.addEventListener("click", () => {
          this.showShieldsHelp();
        });
        hudBrand.insertBefore(notice, hudBrand.children[1] || null);
      }

      this.resize2D();
      window.addEventListener("resize", () => this.resize2D());

      // Particles for data pulses along circuit bus tracks
      this.pulses = [];
      for (let i = 0; i < 24; i++) {
        this.pulses.push({
          x: (Math.random() - 0.5) * 100,
          z: (Math.random() - 0.5) * 100,
          vx: (Math.random() - 0.5) * 0.4,
          vz: (Math.random() - 0.5) * 0.4,
          life: Math.random()
        });
      }

      this.lastTime = performance.now();
      this.animate2D();
    }

    showShieldsHelp() {
      const modal = document.getElementById("station-modal");
      const title = document.getElementById("modal-station-title");
      const sub = document.getElementById("modal-station-sub");
      const icon = document.getElementById("modal-station-icon");
      const tags = document.getElementById("modal-station-tags");
      const body = document.getElementById("modal-station-body");
      const actions = document.getElementById("modal-station-actions");

      if (title) title.textContent = "How to Enable Full 3D WebGL in Brave";
      if (sub) sub.textContent = "Brave Shields Fingerprinting Protection Guide";
      if (icon) icon.textContent = "🛡️";
      if (tags) tags.innerHTML = `<span class="station-tag">Brave Browser</span><span class="station-tag">WebGL Context</span>`;
      if (body) {
        body.innerHTML = `
          <p>You are currently viewing the high-performance <strong>2D Silicon Simulator</strong> because Brave's Shields or browser settings blocked the raw WebGL context (<code>Error creating WebGL context</code>).</p>
          <p><strong>To enable full 3D WebGL mode in Brave:</strong></p>
          <ol style="padding-left:1.2rem; margin-bottom:1rem; line-height:1.7;">
            <li>In the Brave address bar, click the <strong>Brave Lion Shield</strong> icon.</li>
            <li>Change <em>Block fingerprinting</em> from <strong>Aggressive</strong> to <strong>Standard</strong> (or toggle Shields OFF for localhost).</li>
            <li>Go to <code>brave://settings/system</code> and ensure <em>Use graphics acceleration when available</em> is <strong>ON</strong>.</li>
            <li>Reload the page to experience the 3D rover, 3D commit canyon, and GLSL shaders!</li>
          </ol>
        `;
      }
      if (actions) {
        actions.innerHTML = `<button class="station-btn-action" onclick="document.getElementById('station-modal').classList.remove('open')">Got it</button>`;
      }
      modal.classList.add("open");
    }

    resize2D() {
      if (!this.canvas2d) return;
      this.canvas2d.width = window.innerWidth;
      this.canvas2d.height = window.innerHeight;
    }

    animate2D() {
      requestAnimationFrame(() => this.animate2D());

      const now = performance.now();
      const delta = (now - this.lastTime) / 1000;
      this.lastTime = now;

      this.updatePhysics(delta);
      this.render2D();
      this.updateFPS();
    }

    render2D() {
      const ctx = this.ctx2d;
      const w = this.canvas2d.width;
      const h = this.canvas2d.height;

      // Dark obsidian background
      ctx.fillStyle = "#06080d";
      ctx.fillRect(0, 0, w, h);

      // Camera centered on rover
      ctx.save();
      ctx.translate(w / 2, h / 2);

      const scale = 11; // World to screen scale
      ctx.scale(scale, scale);
      ctx.translate(-this.roverPos.x, -this.roverPos.z);

      // 1. Draw Silicon Grid
      ctx.strokeStyle = "rgba(0, 229, 255, 0.08)";
      ctx.lineWidth = 0.08;
      const gridSize = 140;
      const step = 4;
      for (let x = -gridSize; x <= gridSize; x += step) {
        ctx.beginPath(); ctx.moveTo(x, -gridSize); ctx.lineTo(x, gridSize); ctx.stroke();
      }
      for (let z = -gridSize; z <= gridSize; z += step) {
        ctx.beginPath(); ctx.moveTo(-gridSize, z); ctx.lineTo(gridSize, z); ctx.stroke();
      }

      // 2. Bus Tracks Connecting Stations
      ctx.strokeStyle = "rgba(0, 229, 255, 0.25)";
      ctx.lineWidth = 0.25;
      STATIONS_DATA.forEach((s) => {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(s.pos.x, s.pos.z);
        ctx.stroke();
      });

      // 3. Draw Stations
      STATIONS_DATA.forEach((st) => {
        // Beacon Ring
        ctx.strokeStyle = st.colorHex;
        ctx.lineWidth = 0.2;
        ctx.beginPath();
        ctx.arc(st.pos.x, st.pos.z, 3.8, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = `${st.colorHex}22`;
        ctx.beginPath();
        ctx.arc(st.pos.x, st.pos.z, 3.6, 0, Math.PI * 2);
        ctx.fill();

        // Station Icon & Text
        ctx.font = "bold 1.2px monospace";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(st.icon, st.pos.x, st.pos.z - 0.5);

        ctx.font = "bold 0.75px monospace";
        ctx.fillStyle = st.colorHex;
        ctx.fillText(st.title.split("//")[0].trim(), st.pos.x, st.pos.z + 1.2);
      });

      // 4. Data Pulse Particles
      ctx.fillStyle = "#00e5ff";
      this.pulses.forEach((p) => {
        p.x += p.vx;
        p.z += p.vz;
        if (Math.abs(p.x) > 60 || Math.abs(p.z) > 60) {
          p.x = 0; p.z = 0;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.z, 0.25, 0, Math.PI * 2);
        ctx.fill();
      });

      // 5. Draw Rover (Top-Down Cyber Vehicle)
      ctx.save();
      ctx.translate(this.roverPos.x, this.roverPos.z);
      ctx.rotate(this.roverAngle);

      // Headlight Cone
      const grad = ctx.createRadialGradient(0, -6, 0.5, 0, -6, 9);
      grad.addColorStop(0, "rgba(255, 255, 255, 0.4)");
      grad.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, -1.2);
      ctx.lineTo(-4, -12);
      ctx.lineTo(4, -12);
      ctx.closePath();
      ctx.fill();

      // Body Chassis
      ctx.fillStyle = "#11151e";
      ctx.strokeStyle = "#00e5ff";
      ctx.lineWidth = 0.12;
      ctx.beginPath();
      ctx.roundRect(-1.1, -1.7, 2.2, 3.4, 0.3);
      ctx.fill();
      ctx.stroke();

      // Cyber Visor
      ctx.fillStyle = "#00e5ff";
      ctx.fillRect(-0.7, -1.2, 1.4, 0.7);

      // Wheels
      ctx.fillStyle = "#080b10";
      [-1.3, 1.0].forEach((wx) => {
        // Front wheels with steering angle
        ctx.save();
        ctx.translate(wx + 0.15, -1.0);
        ctx.rotate(this.roverSteer);
        ctx.fillRect(-0.2, -0.45, 0.4, 0.9);
        ctx.restore();

        // Rear wheels
        ctx.fillRect(wx - 0.05, 0.5, 0.4, 0.9);
      });

      ctx.restore(); // Rover restore
      ctx.restore(); // World restore
    }

    /* ------------------------------------------------------------------------
       PHYSICS SIMULATION (SHARED ACROSS 3D & 2D)
       ------------------------------------------------------------------------ */
    updatePhysics(delta) {
      const dt = Math.min(delta, 0.1);

      // Autopilot navigation logic
      if (this.autopilotTarget) {
        const dx = this.autopilotTarget.x - this.roverPos.x;
        const dz = this.autopilotTarget.z - this.roverPos.z;
        const dist = Math.hypot(dx, dz);

        if (dist < 1.2) {
          this.autopilotTarget = null;
          this.roverSpeed *= 0.8;
        } else {
          const targetAngle = Math.atan2(-dx, -dz);
          let diffAngle = targetAngle - this.roverAngle;
          while (diffAngle > Math.PI) diffAngle -= Math.PI * 2;
          while (diffAngle < -Math.PI) diffAngle += Math.PI * 2;

          this.targetSteer = Math.max(-0.65, Math.min(0.65, diffAngle * 1.5));
          const targetSpeed = Math.min(0.55, dist * 0.25);
          this.roverSpeed += (targetSpeed - this.roverSpeed) * 0.1;
        }
      } else {
        // Manual Steering
        if (this.keys.left) {
          this.targetSteer = 0.65;
        } else if (this.keys.right) {
          this.targetSteer = -0.65;
        } else if (!this.targetSteer) {
          this.targetSteer = 0;
        }

        const accel = 0.024;
        const maxSpeed = 0.72;
        const maxReverse = -0.32;
        const friction = 0.94;

        if (this.keys.forward) {
          this.roverSpeed = Math.min(this.roverSpeed + accel, maxSpeed);
        } else if (this.keys.backward) {
          this.roverSpeed = Math.max(this.roverSpeed - accel * 0.8, maxReverse);
        } else {
          this.roverSpeed *= friction;
        }

        if (this.keys.brake) {
          this.roverSpeed *= 0.85;
        }
      }

      this.roverSteer += (this.targetSteer - this.roverSteer) * 0.18;
      const turnRate = 0.055;
      this.roverAngle += this.roverSteer * this.roverSpeed * turnRate;

      const forwardX = -Math.sin(this.roverAngle);
      const forwardZ = -Math.cos(this.roverAngle);
      this.roverPos.x += forwardX * this.roverSpeed;
      this.roverPos.z += forwardZ * this.roverSpeed;

      const bound = 135;
      this.roverPos.x = Math.max(-bound, Math.min(bound, this.roverPos.x));
      this.roverPos.z = Math.max(-bound, Math.min(bound, this.roverPos.z));

      // 3D Rover mesh sync if in 3D
      if (this.is3D && this.rover) {
        this.rover.position.set(this.roverPos.x, 0, this.roverPos.z);
        this.rover.rotation.y = this.roverAngle;
        this.rover.rotation.x = -this.roverSpeed * 0.08;
        this.rover.rotation.z = this.roverSteer * this.roverSpeed * 0.06;
      }

      audio.updateEngine(this.roverSpeed / 0.72);

      // Speedometer Readout
      const speedKmH = Math.abs(Math.round(this.roverSpeed * 85));
      const speedEl = document.getElementById("speed-val");
      const gearEl = document.getElementById("gear-val");
      const throttleEl = document.getElementById("throttle-fill");

      if (speedEl) speedEl.textContent = speedKmH.toString().padStart(2, "0");
      if (gearEl) gearEl.textContent = this.roverSpeed < -0.01 ? "R" : (this.roverSpeed > 0.01 ? "D" : "P");
      if (throttleEl) throttleEl.style.width = `${Math.min(100, Math.abs(this.roverSpeed / 0.72) * 100)}%`;

      // Proximity Trigger
      STATIONS_DATA.forEach((st) => {
        const d = Math.hypot(this.roverPos.x - st.pos.x, this.roverPos.z - st.pos.z);
        if (d < 4.8 && this.activeStation !== st) {
          this.openStationModal(st);
        }
      });
    }

    updateFPS() {
      this.frameCount++;
      const now = performance.now();
      if (now - this.lastFpsTime >= 1000) {
        this.fps = this.frameCount;
        this.frameCount = 0;
        this.lastFpsTime = now;
        const fpsEl = document.getElementById("fps-val");
        if (fpsEl) fpsEl.textContent = this.fps;
      }
    }

    /* ------------------------------------------------------------------------
       UI & HUD BINDINGS
       ------------------------------------------------------------------------ */
    setupHUD() {
      const btnSound = document.getElementById("btn-sound");
      if (btnSound) {
        btnSound.addEventListener("click", () => {
          const on = audio.toggle();
          btnSound.classList.toggle("active", on);
          btnSound.classList.toggle("muted", !on);
        });
      }

      const btnTerminal = document.getElementById("btn-terminal");
      if (btnTerminal) {
        btnTerminal.addEventListener("click", () => this.toggleTerminal());
      }

      const btnMode = document.getElementById("btn-mode-toggle");
      const readerView = document.getElementById("reader-mode-view");
      const returnBtn = document.getElementById("reader-return-btn");

      const setMode = (isReader) => {
        audio.playClick();
        if (isReader) {
          readerView.classList.add("active");
          btnMode.classList.add("active");
          btnMode.innerHTML = "<span>🎮 DRIVE</span>";
        } else {
          readerView.classList.remove("active");
          btnMode.classList.remove("active");
          btnMode.innerHTML = "<span>📄 BRIEFING</span>";
        }
      };

      if (btnMode) {
        btnMode.addEventListener("click", () => {
          setMode(!readerView.classList.contains("active"));
        });
      }
      if (returnBtn) {
        returnBtn.addEventListener("click", () => setMode(false));
      }

      // Dock pills
      document.querySelectorAll(".dock-pill").forEach((p) => {
        p.addEventListener("click", () => {
          const stId = p.getAttribute("data-station");
          if (stId) {
            audio.playClick();
            this.navigateToStation(stId);
          }
        });
      });

      const modalClose = document.getElementById("modal-close-btn");
      if (modalClose) {
        modalClose.addEventListener("click", () => {
          audio.playClick();
          document.getElementById("station-modal").classList.remove("open");
        });
      }
    }

    navigateToStation(stationId) {
      const st = STATIONS_DATA.find((s) => s.id === stationId);
      if (!st) return;

      document.querySelectorAll(".dock-pill").forEach((p) => {
        p.classList.toggle("active", p.getAttribute("data-station") === stationId);
      });

      this.autopilotTarget = { x: st.pos.x, z: st.pos.z };
      this.openStationModal(st);
    }

    openStationModal(station) {
      this.activeStation = station;
      audio.playChime();

      const modal = document.getElementById("station-modal");
      const title = document.getElementById("modal-station-title");
      const sub = document.getElementById("modal-station-sub");
      const icon = document.getElementById("modal-station-icon");
      const tags = document.getElementById("modal-station-tags");
      const body = document.getElementById("modal-station-body");
      const actions = document.getElementById("modal-station-actions");

      if (title) title.textContent = station.title;
      if (sub) sub.textContent = station.sub;
      if (icon) icon.textContent = station.icon;

      if (tags) {
        tags.innerHTML = station.tags.map((t) => `<span class="station-tag">${t}</span>`).join("");
      }

      if (body) {
        body.innerHTML = `
          ${station.description}
          ${station.snippet ? `<pre class="code-snippet-box"><code>${station.snippet}</code></pre>` : ""}
        `;
      }

      if (actions) {
        actions.innerHTML = station.actions
          .map((a) => `<a href="${a.url}" target="_blank" rel="noopener" class="station-btn-action">${a.label} ↗</a>`)
          .join("") + `<button class="station-btn-secondary" id="modal-drive-btn">Drive Here</button>`;

        const driveBtn = document.getElementById("modal-drive-btn");
        if (driveBtn) {
          driveBtn.addEventListener("click", () => {
            this.autopilotTarget = { x: station.pos.x, z: station.pos.z };
            modal.classList.remove("open");
          });
        }
      }

      modal.classList.add("open");
    }

    /* ------------------------------------------------------------------------
       CONTROLS & INPUT
       ------------------------------------------------------------------------ */
    setupEventListeners() {
      window.addEventListener("keydown", (e) => {
        if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
        switch (e.code) {
          case "KeyW":
          case "ArrowUp":
            this.keys.forward = true;
            this.autopilotTarget = null;
            break;
          case "KeyS":
          case "ArrowDown":
            this.keys.backward = true;
            this.autopilotTarget = null;
            break;
          case "KeyA":
          case "ArrowLeft":
            this.keys.left = true;
            break;
          case "KeyD":
          case "ArrowRight":
            this.keys.right = true;
            break;
          case "Space":
            this.keys.brake = true;
            e.preventDefault();
            break;
          case "KeyR":
            this.roverPos = { x: 0, z: 0 };
            this.roverAngle = 0;
            this.roverSpeed = 0;
            this.autopilotTarget = null;
            break;
          case "Backquote":
            this.toggleTerminal();
            e.preventDefault();
            break;
        }
      });

      window.addEventListener("keyup", (e) => {
        if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
        switch (e.code) {
          case "KeyW":
          case "ArrowUp":
            this.keys.forward = false;
            break;
          case "KeyS":
          case "ArrowDown":
            this.keys.backward = false;
            break;
          case "KeyA":
          case "ArrowLeft":
            this.keys.left = false;
            break;
          case "KeyD":
          case "ArrowRight":
            this.keys.right = false;
            break;
          case "Space":
            this.keys.brake = false;
            break;
        }
      });

      // Canvas click to move (autopilot)
      window.addEventListener("click", (e) => {
        if (e.target.closest("#hud-overlay") || e.target.closest("#station-modal") || e.target.closest("#terminal-modal")) return;
        if (!this.is3D && this.canvas2d) {
          const rect = this.canvas2d.getBoundingClientRect();
          const cx = e.clientX - rect.left - this.canvas2d.width / 2;
          const cy = e.clientY - rect.top - this.canvas2d.height / 2;
          const scale = 11;
          const targetX = this.roverPos.x + cx / scale;
          const targetZ = this.roverPos.z + cy / scale;
          this.autopilotTarget = { x: targetX, z: targetZ };
        }
      });
    }

    setupTouchControls() {
      const stickZone = document.getElementById("touch-stick-zone");
      const stickKnob = document.getElementById("touch-stick-knob");
      const btnGas = document.getElementById("pedal-gas");
      const btnBrake = document.getElementById("pedal-brake");

      if (stickZone && stickKnob) {
        let touchId = null;
        let startX = 0, startY = 0;

        stickZone.addEventListener("touchstart", (e) => {
          for (let t of e.changedTouches) {
            touchId = t.identifier;
            const rect = stickZone.getBoundingClientRect();
            startX = rect.left + rect.width / 2;
            startY = rect.top + rect.height / 2;
            break;
          }
        }, { passive: true });

        stickZone.addEventListener("touchmove", (e) => {
          for (let t of e.changedTouches) {
            if (t.identifier === touchId) {
              const dx = t.clientX - startX;
              const dy = t.clientY - startY;
              const dist = Math.min(Math.hypot(dx, dy), 40);
              const angle = Math.atan2(dy, dx);
              const kx = Math.cos(angle) * dist;
              const ky = Math.sin(angle) * dist;
              stickKnob.style.transform = `translate(calc(-50% + ${kx}px), calc(-50% + ${ky}px))`;
              this.targetSteer = (-kx / 40) * 0.65;
              break;
            }
          }
        }, { passive: true });

        const endTouch = (e) => {
          for (let t of e.changedTouches) {
            if (t.identifier === touchId) {
              touchId = null;
              stickKnob.style.transform = "translate(-50%, -50%)";
              this.targetSteer = 0;
              break;
            }
          }
        };

        stickZone.addEventListener("touchend", endTouch, { passive: true });
        stickZone.addEventListener("touchcancel", endTouch, { passive: true });
      }

      if (btnGas) {
        btnGas.addEventListener("touchstart", () => { this.keys.forward = true; }, { passive: true });
        btnGas.addEventListener("touchend", () => { this.keys.forward = false; }, { passive: true });
      }
      if (btnBrake) {
        btnBrake.addEventListener("touchstart", () => { this.keys.backward = true; }, { passive: true });
        btnBrake.addEventListener("touchend", () => { this.keys.backward = false; }, { passive: true });
      }
    }

    setupTerminalEngine() {
      const termModal = document.getElementById("terminal-modal");
      const termInput = document.getElementById("terminal-input");
      const termOutput = document.getElementById("terminal-output");
      const termClose = document.getElementById("term-close-btn");

      if (!termInput || !termOutput) return;

      if (termClose) {
        termClose.addEventListener("click", () => termModal.classList.remove("open"));
      }

      const appendLine = (html) => {
        const div = document.createElement("div");
        div.className = "term-line";
        div.innerHTML = html;
        termOutput.appendChild(div);
        termOutput.scrollTop = termOutput.scrollHeight;
      };

      const executeCommand = (cmd) => {
        const c = cmd.trim().toLowerCase();
        appendLine(`<span class="term-prompt">karthik@drm-subsystem:~$</span> ${cmd}`);

        switch (c) {
          case "help":
            appendLine(`
Available commands:
  <span class="term-cyan">mesa</span>       - Upstream Mesa 3D contributions & MR status
  <span class="term-cyan">drm</span>        - Linux Kernel DRM / KMS subsystem architecture
  <span class="term-cyan">mimic</span>      - Mimic open-source hardware emulation framework
  <span class="term-cyan">commits</span>    - GitHub & GitLab 3D contribution matrix telemetry
  <span class="term-cyan">glxinfo</span>    - Probe current OpenGL/Mesa runtime info
  <span class="term-cyan">vulkaninfo</span> - Probe Vulkan physical device & extensions
  <span class="term-cyan">dmesg</span>      - Kernel graphics buffer initialization logs
  <span class="term-cyan">resume</span>     - Print executive engineering summary
  <span class="term-cyan">contact</span>    - Upstream channels & email
  <span class="term-cyan">mode</span>       - Toggle between Game Drive & Reader Briefing
  <span class="term-cyan">clear</span>      - Clear terminal screen
            `);
            break;
          case "mesa":
            appendLine(`
<span class="term-green">[MESA 3D CONTRIBUTIONS]</span>
Upstream FreeDesktop: <a href="https://gitlab.freedesktop.org/karthik-sarvan" target="_blank" class="term-cyan">gitlab.freedesktop.org/karthik-sarvan</a>
• <strong>MR !45614:</strong> lavapipe: report full pipeline cache header size
• <strong>Zink HUD:</strong> zink: add submits-per-frame HUD query (OpenGL over Vulkan)
• <strong>NIR Compiler:</strong> SSA optimizations & SPIR-V shader lowering passes
            `);
            break;
          case "drm":
          case "kernel":
            appendLine(`
<span class="term-pink">[LINUX KERNEL DRM / KMS]</span>
• Subsystem: drivers/gpu/drm/
• Memory Managers: GEM Buffer Objects, TTM Memory Placement
• Display Pipeline: Atomic Modesetting (CRTC, Planes, Encoders, Connectors)
• Synchronization: wp_linux_drm_syncobj_v1, asynchronous dma_fence timelines
            `);
            break;
          case "mimic":
            appendLine(`
<span class="term-yellow">[MIMIC HARDWARE EMULATION]</span>
Maintainer: <a href="https://mimic.aegiondynamic.com" target="_blank" class="term-cyan">mimic.aegiondynamic.com</a>
Hardware-in-the-loop (HIL) automated test harness proxying physical I2C/SPI sensors on STM32 bare-metal C.
            `);
            break;
          case "commits":
            appendLine(`
<span class="term-green">[ACTIVITY SUMMARY]</span>
• GitHub: <a href="https://github.com/karthik-sarvan" target="_blank" class="term-cyan">github.com/karthik-sarvan</a>
• 2026 Commits: 2,742+
• Lifetime Commits: 3,660+
• FreeDesktop: gitlab.freedesktop.org/karthik-sarvan
            `);
            break;
          case "glxinfo":
            appendLine(`
<span class="term-cyan">OpenGL vendor string: Intel / Mesa</span>
OpenGL renderer string: Mesa Intel(R) UHD Graphics 620 (WHL GT2)
OpenGL core profile version string: 4.6 (Core Profile) Mesa 25.3.6
OpenGL core profile shading language version string: 4.60
            `);
            break;
          case "vulkaninfo":
            appendLine(`
<span class="term-pink">Vulkan Instance Version: 1.3.280</span>
Physical Device: Intel(R) UHD Graphics 620
Driver: Mesa Lavapipe / ANV
            `);
            break;
          case "dmesg":
            appendLine(`
<span class="term-dim">[    0.841022]</span> [drm] Initialized i915 / amdgpu on minor 0
<span class="term-dim">[    0.843051]</span> [drm] Memory manager initialized: VRAM / GTT
<span class="term-dim">[    0.844199]</span> [drm] Atomic KMS display engine initialized with CRTCs
            `);
            break;
          case "resume":
            appendLine(`
<strong>Karthik Sarvan</strong> — Linux Graphics & DRM Systems Engineer
Email: <a href="mailto:karthiks1mail@gmail.com" class="term-cyan">karthiks1mail@gmail.com</a>
Location: Visakhapatnam, Andhra Pradesh, India
            `);
            break;
          case "contact":
            appendLine(`
• Email: <a href="mailto:karthiks1mail@gmail.com" class="term-cyan">karthiks1mail@gmail.com</a>
• FreeDesktop: <a href="https://gitlab.freedesktop.org/karthik-sarvan" target="_blank" class="term-cyan">gitlab.freedesktop.org/karthik-sarvan</a>
• GitHub: <a href="https://github.com/karthik-sarvan" target="_blank" class="term-cyan">github.com/karthik-sarvan</a>
• LinkedIn: <a href="https://www.linkedin.com/in/karthik-sarvan/" target="_blank" class="term-cyan">linkedin.com/in/karthik-sarvan</a>
            `);
            break;
          case "mode":
            document.getElementById("btn-mode-toggle").click();
            appendLine("Toggled mode.");
            break;
          case "clear":
            termOutput.innerHTML = "";
            break;
          default:
            appendLine(`<span class="term-pink">command not found:</span> ${c}. Type <span class="term-cyan">help</span>.`);
        }
      };

      termInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          const val = termInput.value;
          if (val.trim()) {
            executeCommand(val);
            termInput.value = "";
          }
        }
      });

      document.querySelectorAll(".term-chip").forEach((chip) => {
        chip.addEventListener("click", () => {
          const cmd = chip.getAttribute("data-cmd");
          if (cmd) executeCommand(cmd);
        });
      });
    }

    toggleTerminal() {
      const termModal = document.getElementById("terminal-modal");
      if (termModal) {
        audio.playClick();
        const isOpen = termModal.classList.toggle("open");
        if (isOpen) {
          setTimeout(() => document.getElementById("terminal-input").focus(), 100);
        }
      }
    }
  }

  // Initialize
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => new PortfolioApp());
  } else {
    new PortfolioApp();
  }
})();
