/**
 * ============================================================================
 * KARTHIK SARVAN // LINUX GRAPHICS & DRM KERNEL PORTFOLIO ENGINE
 * 3D WebGL Bare-Metal Simulation, Rover Physics, Commit Matrix & Terminal
 * ============================================================================
 */

(function () {
  "use strict";

  // Check for Three.js
  if (typeof THREE === "undefined") {
    console.error("Three.js not loaded.");
    return;
  }

  /* ==========================================================================
     1. AUDIO SYNTHESIZER (100% Web Audio API - Zero External Audio Files)
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
      this.ctx = new AudioCtx();

      // Engine oscillator setup
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
    }

    toggle() {
      this.init();
      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume();
      }
      this.enabled = !this.enabled;
      if (!this.enabled && this.engineGain) {
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
      const freqs = [523.25, 659.25, 783.99, 1046.5]; // C Major arpeggio
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
     2. GPU & HARDWARE DETECTOR (Bare-Metal WebGL Telemetry)
     ========================================================================== */
  function getGPUTelemetry(gl) {
    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    let vendor = "Standard WebGL";
    let renderer = "Generic Hardware Accelerator";
    if (debugInfo) {
      vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || vendor;
      renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || renderer;
    }
    const maxTexSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    const exts = gl.getSupportedExtensions() ? gl.getSupportedExtensions().length : 0;
    return { vendor, renderer, maxTexSize, exts };
  }

  /* ==========================================================================
     3. DATA: STATIONS & TECHNICAL CONTENT
     ========================================================================== */
  const STATIONS_DATA = [
    {
      id: "spawn",
      title: "Command Plaza // Identity",
      sub: "Karthik Sarvan · Linux Graphics & Kernel Engineer",
      pos: { x: 0, z: 0 },
      color: 0x00e5ff,
      icon: "⚡",
      tags: ["Systems Developer", "Mesa 3D", "Linux Kernel", "FreeDesktop"],
      description: `
        <p>Welcome to the bare-metal 3D workspace of <strong>Karthik Sarvan</strong>. I engineer low-level systems software, focusing on <strong>Mesa 3D graphics drivers</strong>, the <strong>Linux DRM/KMS kernel subsystem</strong>, Wayland compositors, and open-source hardware emulation.</p>
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
      icon: "🟩",
      tags: ["2,742+ Commits", "Voxel Heatmap", "Upstream Code", "Daily Streaks"],
      description: `
        <p>This 3D landscape is an interactive, physically-extruded <strong>voxel heatmap of all 52 weeks of GitHub activity</strong> for <code>karthik-sarvan</code>.</p>
        <p>Each monolithic bar's height represents daily commit density (surpassing <strong>2,742+ commits in 2026</strong>), shaded with glowing phosphor green levels. Drive the rover through the canyons or hover over any pillar to view the exact date and commit count.</p>
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
      icon: "🔮",
      tags: ["GLSL Shaders", "Raymarching", "GPU Telemetry", "Hardware Performance"],
      description: `
        <p>Live graphics rendering pipeline experiment. The crystalline structure above runs custom <strong>GLSL vertex wave displacement</strong> and <strong>procedural iridescent chromatic Fresnel fragment shaders</strong> directly on your GPU.</p>
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
     4. MAIN 3D APPLICATION INITIALIZATION
     ========================================================================== */
  class PortfolioApp {
    constructor() {
      this.container = document.getElementById("webgl-viewport");
      if (!this.container) return;

      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.rover = null;
      this.ground = null;
      this.clock = new THREE.Clock();

      // Driving Physics State
      this.roverPos = new THREE.Vector2(0, 0);
      this.roverAngle = 0;
      this.roverSpeed = 0;
      this.roverSteer = 0;
      this.targetSteer = 0;
      this.isBraking = false;
      this.keys = { forward: false, backward: false, left: false, right: false, brake: false };

      // Autopilot / Camera Target
      this.autopilotTarget = null;
      this.cameraMode = "chase"; // "chase", "orbit", "flyto"
      this.flyTargetPos = null;
      this.flyTargetCam = null;
      this.flyProgress = 1;

      // Commit blocks & raycaster
      this.commitBlocks = [];
      this.raycaster = new THREE.Raycaster();
      this.mouse = new THREE.Vector2(-999, -999);
      this.hoveredBlock = null;

      // Stations & interactive zones
      this.stations = [];
      this.activeStation = null;

      // Particle system for thruster exhaust
      this.exhaustParticles = [];

      // Shader Lab Uniforms
      this.shaderUniforms = {
        uTime: { value: 0 }
      };

      // Telemetry
      this.frameCount = 0;
      this.fps = 60;
      this.lastFpsUpdate = 0;
      this.gpuInfo = null;

      this.init();
    }

    init() {
      // 1. Scene setup
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x06080d);
      this.scene.fog = new THREE.FogExp2(0x06080d, 0.015);

      // 2. Camera setup
      this.camera = new THREE.PerspectiveCamera(
        45,
        window.innerWidth / window.innerHeight,
        0.5,
        500
      );
      this.camera.position.set(0, 16, 28);

      // 3. Renderer setup
      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: "high-performance"
      });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.outputEncoding = THREE.sRGBEncoding;
      this.container.appendChild(this.renderer.domElement);

      // Hardware telemetry query
      const gl = this.renderer.getContext();
      this.gpuInfo = getGPUTelemetry(gl);
      this.updateTelemetryDOM();

      // 4. Lighting
      this.setupLighting();

      // 5. Silicon Die Floor & Environment
      this.setupEnvironment();

      // 6. Controllable Silicon Rover
      this.setupRover();

      // 7. Interactive Themed Stations
      this.setupStations();

      // 8. 3D GitHub Commit Canyon
      this.setupCommitMatrix();

      // 9. Shader Lab Crystalline Prism
      this.setupShaderLab();

      // 10. Event Listeners & UI Binding
      this.setupEventListeners();
      this.setupHUD();

      // 11. Start animation loop
      this.animate();
    }

    /* ------------------------------------------------------------------------
       LIGHTING
       ------------------------------------------------------------------------ */
    setupLighting() {
      // Ambient celestial illumination
      const ambientLight = new THREE.AmbientLight(0x182030, 1.2);
      this.scene.add(ambientLight);

      // Main directional sun
      const dirLight = new THREE.DirectionalLight(0xddeeff, 1.8);
      dirLight.position.set(40, 60, 30);
      dirLight.castShadow = true;
      dirLight.shadow.mapSize.width = 2048;
      dirLight.shadow.mapSize.height = 2048;
      dirLight.shadow.camera.near = 10;
      dirLight.shadow.camera.far = 160;
      const d = 60;
      dirLight.shadow.camera.left = -d;
      dirLight.shadow.camera.right = d;
      dirLight.shadow.camera.top = d;
      dirLight.shadow.camera.bottom = -d;
      dirLight.shadow.bias = -0.0005;
      this.scene.add(dirLight);

      // Blueish rim light
      const rimLight = new THREE.DirectionalLight(0x0055ff, 0.8);
      rimLight.position.set(-50, 30, -50);
      this.scene.add(rimLight);
    }

    /* ------------------------------------------------------------------------
       ENVIRONMENT & SILICON SUBSTRATE FLOOR
       ------------------------------------------------------------------------ */
    setupEnvironment() {
      // Procedural Silicon Circuit Grid Texture
      const canvas = document.createElement("canvas");
      canvas.width = 1024;
      canvas.height = 1024;
      const ctx = canvas.getContext("2d");

      // Deep obsidian substrate
      ctx.fillStyle = "#070a10";
      ctx.fillRect(0, 0, 1024, 1024);

      // Fine circuit grid
      ctx.strokeStyle = "rgba(0, 229, 255, 0.08)";
      ctx.lineWidth = 1;
      const step = 32;
      for (let x = 0; x <= 1024; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 1024);
        ctx.stroke();
      }
      for (let y = 0; y <= 1024; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(1024, y);
        ctx.stroke();
      }

      // Major bus tracks
      ctx.strokeStyle = "rgba(0, 229, 255, 0.25)";
      ctx.lineWidth = 3;
      [128, 256, 512, 768, 896].forEach((pos) => {
        ctx.beginPath();
        ctx.moveTo(pos, 0);
        ctx.lineTo(pos, 1024);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, pos);
        ctx.lineTo(1024, pos);
        ctx.stroke();
      });

      // Gold via pads
      ctx.fillStyle = "#ffaa00";
      [128, 256, 512, 768, 896].forEach((x) => {
        [128, 256, 512, 768, 896].forEach((y) => {
          ctx.beginPath();
          ctx.arc(x, y, 5, 0, Math.PI * 2);
          ctx.fill();
        });
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

      // Starfield / Silicon Dust particles
      const starGeo = new THREE.BufferGeometry();
      const starCount = 600;
      const starPos = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount * 3; i += 3) {
        starPos[i] = (Math.random() - 0.5) * 240;
        starPos[i + 1] = Math.random() * 45 + 1;
        starPos[i + 2] = (Math.random() - 0.5) * 240;
      }
      starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
      const starMat = new THREE.PointsMaterial({
        color: 0x00e5ff,
        size: 0.8,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending
      });
      const starField = new THREE.Points(starGeo, starMat);
      this.scene.add(starField);
    }

    /* ------------------------------------------------------------------------
       CONTROLLABLE SILICON ROVER (VEHICLE)
       ------------------------------------------------------------------------ */
    setupRover() {
      this.rover = new THREE.Group();

      // 1. Chassis Body (Matte Stealth Obsidian)
      const bodyGeo = new THREE.BoxGeometry(2.2, 0.7, 3.4);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x11151e,
        roughness: 0.4,
        metalness: 0.8
      });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 0.65;
      body.castShadow = true;
      this.rover.add(body);

      // 2. Cockpit / Visor (Glowing Cyan)
      const visorGeo = new THREE.BoxGeometry(1.6, 0.45, 1.4);
      const visorMat = new THREE.MeshStandardMaterial({
        color: 0x002233,
        emissive: 0x00e5ff,
        emissiveIntensity: 0.7,
        roughness: 0.2,
        metalness: 0.9
      });
      const visor = new THREE.Mesh(visorGeo, visorMat);
      visor.position.set(0, 1.1, -0.3);
      visor.castShadow = true;
      this.rover.add(visor);

      // 3. Headlights (Dual Spotlights)
      const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      [-0.7, 0.7].forEach((x) => {
        const lens = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.15, 0.1), lightMat);
        lens.position.set(x, 0.65, -1.72);
        this.rover.add(lens);

        const spot = new THREE.SpotLight(0xffffff, 2.5, 35, Math.PI / 6, 0.4, 1);
        spot.position.set(x, 0.65, -1.8);
        spot.target.position.set(x, 0, -18);
        this.rover.add(spot);
        this.rover.add(spot.target);
      });

      // 4. Wheels (4 Rotating Cylinders)
      this.wheels = [];
      this.frontWheelHubs = [];
      const wheelGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.45, 18);
      const wheelMat = new THREE.MeshStandardMaterial({
        color: 0x080b10,
        roughness: 0.8,
        metalness: 0.3
      });

      const wheelOffsets = [
        { x: -1.3, z: -1.1, isFront: true },
        { x: 1.3, z: -1.1, isFront: true },
        { x: -1.3, z: 1.1, isFront: false },
        { x: 1.3, z: 1.1, isFront: false }
      ];

      wheelOffsets.forEach((cfg) => {
        const hub = new THREE.Group();
        hub.position.set(cfg.x, 0.48, cfg.z);

        const mesh = new THREE.Mesh(wheelGeo, wheelMat);
        mesh.rotation.z = Math.PI / 2;
        mesh.castShadow = true;
        hub.add(mesh);

        this.rover.add(hub);
        this.wheels.push(mesh);
        if (cfg.isFront) {
          this.frontWheelHubs.push(hub);
        }
      });

      // 5. Thruster Exhaust Particle Points
      const partCount = 30;
      const partGeo = new THREE.BufferGeometry();
      const partPos = new Float32Array(partCount * 3);
      for (let i = 0; i < partCount * 3; i++) {
        partPos[i] = 0;
      }
      partGeo.setAttribute("position", new THREE.BufferAttribute(partPos, 3));
      const partMat = new THREE.PointsMaterial({
        color: 0x00e5ff,
        size: 0.4,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
      });
      this.exhaustSystem = new THREE.Points(partGeo, partMat);
      this.scene.add(this.exhaustSystem);

      for (let i = 0; i < partCount; i++) {
        this.exhaustParticles.push({
          x: 0,
          y: -10,
          z: 0,
          vx: 0,
          vy: 0,
          vz: 0,
          life: 0
        });
      }

      this.scene.add(this.rover);
    }

    /* ------------------------------------------------------------------------
       INTERACTIVE STATIONS SETUP
       ------------------------------------------------------------------------ */
    setupStations() {
      STATIONS_DATA.forEach((data) => {
        const group = new THREE.Group();
        group.position.set(data.pos.x, 0, data.pos.z);

        // Ground Beacon Ring
        const ringGeo = new THREE.RingGeometry(4.2, 4.6, 36);
        const ringMat = new THREE.MeshBasicMaterial({
          color: data.color,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.6
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.05;
        group.add(ring);

        // Inner Pulsing Disc
        const discGeo = new THREE.CircleGeometry(4.0, 36);
        const discMat = new THREE.MeshBasicMaterial({
          color: data.color,
          transparent: true,
          opacity: 0.12,
          side: THREE.DoubleSide
        });
        const disc = new THREE.Mesh(discGeo, discMat);
        disc.rotation.x = -Math.PI / 2;
        disc.position.y = 0.04;
        group.add(disc);

        // Station Monolith / Hologram Anchor
        if (data.id === "spawn") {
          // Central Identity Hologram
          const coreGeo = new THREE.TorusGeometry(2, 0.12, 16, 64);
          const coreMat = new THREE.MeshStandardMaterial({
            color: 0x00e5ff,
            emissive: 0x00e5ff,
            emissiveIntensity: 0.6,
            roughness: 0.2
          });
          const core = new THREE.Mesh(coreGeo, coreMat);
          core.position.y = 3.5;
          group.add(core);
          data.animMesh = core;
        } else if (data.id === "mesa") {
          // Mesa 3D Pipeline Monolith: 3 Floating Stages
          const pipeStages = new THREE.Group();
          pipeStages.position.y = 3.2;
          [-1.4, 0, 1.4].forEach((x, idx) => {
            const boxGeo = new THREE.BoxGeometry(0.9, 1.8, 0.9);
            const boxMat = new THREE.MeshStandardMaterial({
              color: 0x0a1220,
              emissive: 0x00e5ff,
              emissiveIntensity: 0.4 + idx * 0.2,
              roughness: 0.3
            });
            const box = new THREE.Mesh(boxGeo, boxMat);
            box.position.x = x;
            box.castShadow = true;
            pipeStages.add(box);
          });
          group.add(pipeStages);
          data.animMesh = pipeStages;
        } else if (data.id === "drm") {
          // Kernel Ring Buffer Loop
          const ringBufferGeo = new THREE.TorusGeometry(2.4, 0.2, 16, 48);
          const ringBufferMat = new THREE.MeshStandardMaterial({
            color: 0x1a050d,
            emissive: 0xff3366,
            emissiveIntensity: 0.7,
            roughness: 0.3
          });
          const ringBuf = new THREE.Mesh(ringBufferGeo, ringBufferMat);
          ringBuf.rotation.x = Math.PI / 4;
          ringBuf.position.y = 3.2;
          group.add(ringBuf);
          data.animMesh = ringBuf;
        } else if (data.id === "mimic") {
          // STM32 Microcontroller Board
          const boardGeo = new THREE.BoxGeometry(3.2, 0.3, 3.2);
          const boardMat = new THREE.MeshStandardMaterial({
            color: 0x0b1a10,
            roughness: 0.5
          });
          const board = new THREE.Mesh(boardGeo, boardMat);
          board.position.y = 1.2;

          // MCU Chip
          const chipGeo = new THREE.BoxGeometry(1.4, 0.2, 1.4);
          const chipMat = new THREE.MeshStandardMaterial({
            color: 0x151515,
            emissive: 0xffaa00,
            emissiveIntensity: 0.5
          });
          const chip = new THREE.Mesh(chipGeo, chipMat);
          chip.position.y = 0.22;
          board.add(chip);
          group.add(board);
          data.animMesh = board;
        }

        // Accent Point Light for the station
        const pLight = new THREE.PointLight(data.color, 1.6, 18);
        pLight.position.set(0, 3.5, 0);
        group.add(pLight);

        this.scene.add(group);
        this.stations.push({ ...data, group });
      });
    }

    /* ------------------------------------------------------------------------
       3D GITHUB COMMIT CANYON ("Commit Green Chart in 3D")
       ------------------------------------------------------------------------ */
    async setupCommitMatrix() {
      const commitGroup = new THREE.Group();
      commitGroup.position.set(0, 0, -44);

      // Fetch or use embedded commit dataset
      let commitData = null;
      try {
        const res = await fetch("assets/github-contributions.json");
        if (res.ok) {
          commitData = await res.json();
        }
      } catch (err) {
        console.warn("Using offline commit data fallback");
      }

      // If data is unavailable, generate authentic sample distribution
      const contributions = (commitData && commitData.contributions) ? commitData.contributions : [];
      const totalCount = (commitData && commitData.total && commitData.total["2026"]) ? commitData.total["2026"] : 2742;

      // Color mapping according to GitHub commit levels
      const levelColors = [
        new THREE.Color(0x161b22), // 0: None
        new THREE.Color(0x0e4429), // 1: Low
        new THREE.Color(0x006d32), // 2: Med
        new THREE.Color(0x26a641), // 3: High
        new THREE.Color(0x39d353)  // 4: Peak (glowing emerald)
      ];

      const boxGeo = new THREE.BoxGeometry(0.48, 1, 0.48);
      const cols = 52; // Weeks
      const rows = 7;  // Days of week

      let itemIndex = 0;
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          const item = contributions[itemIndex] || {
            count: Math.floor(Math.random() * 8),
            level: Math.floor(Math.random() * 4),
            date: `2026-W${c + 1}-D${r + 1}`
          };
          itemIndex++;

          const level = Math.min(Math.max(item.level || 0, 0), 4);
          const count = item.count || 0;
          // Extrude height based on commits
          const height = level === 0 ? 0.15 : Math.max(0.4, Math.log2(count + 1) * 0.9);

          const mat = new THREE.MeshStandardMaterial({
            color: levelColors[level],
            emissive: level >= 3 ? 0x00ff88 : 0x000000,
            emissiveIntensity: level === 4 ? 0.6 : (level === 3 ? 0.3 : 0),
            roughness: 0.3,
            metalness: 0.4
          });

          const bar = new THREE.Mesh(boxGeo, mat);
          // Layout grid centered
          const x = (c - cols / 2) * 0.65;
          const z = (r - rows / 2) * 0.65;
          bar.position.set(x, height / 2, z);
          bar.scale.set(1, height, 1);
          bar.castShadow = true;
          bar.receiveShadow = true;

          bar.userData = {
            date: item.date,
            count: count,
            level: level
          };

          commitGroup.add(bar);
          this.commitBlocks.push(bar);
        }
      }

      // Billboard Text Header for Commit Matrix
      const billboardGeo = new THREE.BoxGeometry(26, 1.8, 0.4);
      const billboardMat = new THREE.MeshStandardMaterial({
        color: 0x0b141a,
        emissive: 0x00ff88,
        emissiveIntensity: 0.25,
        roughness: 0.2
      });
      const billboard = new THREE.Mesh(billboardGeo, billboardMat);
      billboard.position.set(0, 4.5, -4);
      commitGroup.add(billboard);

      this.scene.add(commitGroup);
    }

    /* ------------------------------------------------------------------------
       GLSL SHADER LAB PRISM
       ------------------------------------------------------------------------ */
    setupShaderLab() {
      const shaderGroup = new THREE.Group();
      shaderGroup.position.set(28, 3.8, 24);

      // Custom Vertex & Fragment Shader Crystalline Polyhedron
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
            // Harmonic vertex displacement
            float wave = sin(pos.y * 3.0 + uTime * 2.5) * 0.18;
            pos += normal * wave;
            vPosition = pos;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          }
        `,
        fragmentShader: `
          varying vec3 vNormal;
          varying vec3 vPosition;
          uniform float uTime;
          void main() {
            // View vector
            vec3 viewVec = normalize(-vPosition);
            float fresnel = pow(1.0 - max(dot(vNormal, viewVec), 0.0), 2.2);
            // Iridescent chromatic spectrum
            vec3 col = 0.5 + 0.5 * cos(uTime + vPosition.xyx * 1.8 + vec3(0.0, 2.0, 4.0));
            vec3 finalColor = mix(vec3(0.05, 0.08, 0.15), col, fresnel);
            gl_FragColor = vec4(finalColor + fresnel * 0.4, 0.9);
          }
        `,
        transparent: true,
        side: THREE.DoubleSide
      });

      this.shaderPrism = new THREE.Mesh(prismGeo, prismMat);
      shaderGroup.add(this.shaderPrism);

      // Gyroscopic Wireframe Rings
      const ringGeo = new THREE.TorusGeometry(3.2, 0.05, 16, 64);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xbf5af2, wireframe: true });
      this.shaderRing1 = new THREE.Mesh(ringGeo, ringMat);
      this.shaderRing2 = new THREE.Mesh(ringGeo, ringMat);
      this.shaderRing2.rotation.x = Math.PI / 2;
      shaderGroup.add(this.shaderRing1);
      shaderGroup.add(this.shaderRing2);

      this.scene.add(shaderGroup);
    }

    /* ------------------------------------------------------------------------
       EVENT LISTENERS & INPUT
       ------------------------------------------------------------------------ */
    setupEventListeners() {
      // Keyboard input
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
            this.respawnRover();
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

      // Mouse & Raycasting
      window.addEventListener("mousemove", (e) => {
        this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      });

      // Click on canvas to steer rover or inspect
      window.addEventListener("click", (e) => {
        if (e.target.closest("#hud-overlay") || e.target.closest("#station-modal") || e.target.closest("#terminal-modal")) {
          return;
        }
        this.raycastClick();
      });

      // Resize window
      window.addEventListener("resize", () => {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
      });
    }

    raycastClick() {
      this.raycaster.setFromCamera(this.mouse, this.camera);
      // Check stations
      const stationHits = [];
      this.stations.forEach((s) => {
        const d = this.camera.position.distanceTo(s.group.position);
        if (d < 120) stationHits.push(s);
      });

      // Check ground intersection for click-to-move (autopilot)
      const groundHits = this.raycaster.intersectObject(this.ground);
      if (groundHits.length > 0) {
        const pt = groundHits[0].point;
        // Check if close to a station
        const nearby = this.stations.find((s) => Math.hypot(s.pos.x - pt.x, s.pos.z - pt.z) < 6);
        if (nearby) {
          this.navigateToStation(nearby.id);
        } else {
          this.autopilotTarget = new THREE.Vector2(pt.x, pt.z);
        }
      }
    }

    /* ------------------------------------------------------------------------
       UI & HUD BINDINGS
       ------------------------------------------------------------------------ */
    setupHUD() {
      // Audio toggle
      const btnSound = document.getElementById("btn-sound");
      if (btnSound) {
        btnSound.addEventListener("click", () => {
          const on = audio.toggle();
          btnSound.classList.toggle("active", on);
          btnSound.classList.toggle("muted", !on);
        });
      }

      // Terminal toggle
      const btnTerminal = document.getElementById("btn-terminal");
      if (btnTerminal) {
        btnTerminal.addEventListener("click", () => {
          this.toggleTerminal();
        });
      }

      // Mode Switcher (Game 3D vs Reader Mode)
      const btnMode = document.getElementById("btn-mode-toggle");
      const readerView = document.getElementById("reader-mode-view");
      const returnBtn = document.getElementById("reader-return-btn");

      const setMode = (isReader) => {
        audio.playClick();
        if (isReader) {
          readerView.classList.add("active");
          btnMode.classList.add("active");
          btnMode.innerHTML = "<span>🎮 3D DRIVE</span>";
        } else {
          readerView.classList.remove("active");
          btnMode.classList.remove("active");
          btnMode.innerHTML = "<span>📄 BRIEFING</span>";
        }
      };

      if (btnMode) {
        btnMode.addEventListener("click", () => {
          const isReader = !readerView.classList.contains("active");
          setMode(isReader);
        });
      }

      if (returnBtn) {
        returnBtn.addEventListener("click", () => {
          setMode(false);
        });
      }

      // Dock teleport pills
      const pills = document.querySelectorAll(".dock-pill");
      pills.forEach((p) => {
        p.addEventListener("click", () => {
          const stId = p.getAttribute("data-station");
          if (stId) {
            audio.playClick();
            this.navigateToStation(stId);
          }
        });
      });

      // Station modal close
      const modalClose = document.getElementById("modal-close-btn");
      if (modalClose) {
        modalClose.addEventListener("click", () => {
          audio.playClick();
          document.getElementById("station-modal").classList.remove("open");
        });
      }

      // Mobile Touch Joystick & Pedals
      this.setupTouchControls();

      // Terminal command execution
      this.setupTerminalEngine();
    }

    setupTouchControls() {
      const stickZone = document.getElementById("touch-stick-zone");
      const stickKnob = document.getElementById("touch-stick-knob");
      const btnGas = document.getElementById("pedal-gas");
      const btnBrake = document.getElementById("pedal-brake");

      if (stickZone && stickKnob) {
        let touchId = null;
        let startX = 0;
        let startY = 0;

        const onTouchStart = (e) => {
          for (let t of e.changedTouches) {
            touchId = t.identifier;
            const rect = stickZone.getBoundingClientRect();
            startX = rect.left + rect.width / 2;
            startY = rect.top + rect.height / 2;
            break;
          }
        };

        const onTouchMove = (e) => {
          for (let t of e.changedTouches) {
            if (t.identifier === touchId) {
              const dx = t.clientX - startX;
              const dy = t.clientY - startY;
              const dist = Math.min(Math.hypot(dx, dy), 40);
              const angle = Math.atan2(dy, dx);
              const kx = Math.cos(angle) * dist;
              const ky = Math.sin(angle) * dist;
              stickKnob.style.transform = `translate(calc(-50% + ${kx}px), calc(-50% + ${ky}px))`;

              // Steering mapped to horizontal displacement
              this.targetSteer = (-kx / 40) * 0.65;
              break;
            }
          }
        };

        const onTouchEnd = (e) => {
          for (let t of e.changedTouches) {
            if (t.identifier === touchId) {
              touchId = null;
              stickKnob.style.transform = "translate(-50%, -50%)";
              this.targetSteer = 0;
              break;
            }
          }
        };

        stickZone.addEventListener("touchstart", onTouchStart, { passive: true });
        stickZone.addEventListener("touchmove", onTouchMove, { passive: true });
        stickZone.addEventListener("touchend", onTouchEnd, { passive: true });
        stickZone.addEventListener("touchcancel", onTouchEnd, { passive: true });
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
        termClose.addEventListener("click", () => {
          termModal.classList.remove("open");
        });
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
  <span class="term-cyan">mode</span>       - Toggle between 3D Game Drive & Reader Briefing
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
• Total Lifetime Commits: 3,660+
• FreeDesktop: gitlab.freedesktop.org/karthik-sarvan
            `);
            break;
          case "glxinfo":
            appendLine(`
<span class="term-cyan">name of display: :0</span>
display: :0  screen: 0
OpenGL vendor string: ${this.gpuInfo ? this.gpuInfo.vendor : "Mesa / Linux"}
OpenGL renderer string: ${this.gpuInfo ? this.gpuInfo.renderer : "Mesa Driver"}
OpenGL core profile version string: 4.6 (Core Profile) Mesa 24.x
OpenGL core profile shading language version string: 4.60
            `);
            break;
          case "vulkaninfo":
            appendLine(`
<span class="term-pink">========== VULKAN INSTANCE INFO ==========</span>
Vulkan Instance Version: 1.3.280
Physical Devices: 1
Device Name: ${this.gpuInfo ? this.gpuInfo.renderer : "Vulkan Physical GPU"}
Driver Version: Mesa Upstream / Lavapipe / RADV
Max Texture Dimension: ${this.gpuInfo ? this.gpuInfo.maxTexSize : 16384}
            `);
            break;
          case "dmesg":
            appendLine(`
<span class="term-dim">[    0.841022]</span> [drm] Initialized amdgpu 3.54.0 for 0000:03:00.0 on minor 0
<span class="term-dim">[    0.842104]</span> [drm] Supports vblank timestamp caching Rev 2 (21.10.2013).
<span class="term-dim">[    0.843051]</span> [drm] Memory manager initialized: 8192MB VRAM, 16384MB GTT
<span class="term-dim">[    0.844199]</span> [drm] Atomic KMS display engine initialized with 4 CRTCs
<span class="term-dim">[    0.845012]</span> [drm] Syncobj explicit timeline fence protocol ready
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
• FreeDesktop GitLab: <a href="https://gitlab.freedesktop.org/karthik-sarvan" target="_blank" class="term-cyan">gitlab.freedesktop.org/karthik-sarvan</a>
• GitHub: <a href="https://github.com/karthik-sarvan" target="_blank" class="term-cyan">github.com/karthik-sarvan</a>
• LinkedIn: <a href="https://www.linkedin.com/in/karthik-sarvan/" target="_blank" class="term-cyan">linkedin.com/in/karthik-sarvan</a>
• X: <a href="https://x.com/Karthik__Sarvan" target="_blank" class="term-cyan">@Karthik__Sarvan</a>
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
            appendLine(`<span class="term-pink">command not found:</span> ${c}. Type <span class="term-cyan">help</span> for available commands.`);
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

      // Quick terminal chip buttons
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
          setTimeout(() => {
            document.getElementById("terminal-input").focus();
          }, 100);
        }
      }
    }

    navigateToStation(stationId) {
      const st = this.stations.find((s) => s.id === stationId);
      if (!st) return;

      // Update active dock pill
      document.querySelectorAll(".dock-pill").forEach((p) => {
        p.classList.toggle("active", p.getAttribute("data-station") === stationId);
      });

      // Set autopilot target
      this.autopilotTarget = new THREE.Vector2(st.pos.x, st.pos.z);
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
        tags.innerHTML = station.tags
          .map((t) => `<span class="station-tag">${t}</span>`)
          .join("");
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
            this.autopilotTarget = new THREE.Vector2(station.pos.x, station.pos.z);
            modal.classList.remove("open");
          });
        }
      }

      modal.classList.add("open");
    }

    respawnRover() {
      this.roverPos.set(0, 0);
      this.roverAngle = 0;
      this.roverSpeed = 0;
      this.roverSteer = 0;
      this.targetSteer = 0;
      this.autopilotTarget = null;
      if (this.rover) {
        this.rover.position.set(0, 0, 0);
        this.rover.rotation.set(0, 0, 0);
      }
    }

    updateTelemetryDOM() {
      const box = document.getElementById("gpu-telemetry-box");
      if (box && this.gpuInfo) {
        box.innerHTML = `
// Detected Bare-Metal GPU Hardware
Vendor: ${this.gpuInfo.vendor}
Renderer: ${this.gpuInfo.renderer}
Max Texture Dimension: ${this.gpuInfo.maxTexSize}px
Extensions Supported: ${this.gpuInfo.exts}
Engine: Three.js WebGL (Direct Memory Buffer)
        `;
      }
    }

    /* ------------------------------------------------------------------------
       PHYSICS & SIMULATION STEP
       ------------------------------------------------------------------------ */
    updatePhysics(delta) {
      const dt = Math.min(delta, 0.1);

      // Autopilot navigation logic
      if (this.autopilotTarget) {
        const dx = this.autopilotTarget.x - this.roverPos.x;
        const dz = this.autopilotTarget.y - this.roverPos.y;
        const dist = Math.hypot(dx, dz);

        if (dist < 1.2) {
          this.autopilotTarget = null;
          this.roverSpeed *= 0.8;
        } else {
          // Target heading angle
          const targetAngle = Math.atan2(-dx, -dz);
          let diffAngle = targetAngle - this.roverAngle;
          while (diffAngle > Math.PI) diffAngle -= Math.PI * 2;
          while (diffAngle < -Math.PI) diffAngle += Math.PI * 2;

          this.targetSteer = Math.max(-0.65, Math.min(0.65, diffAngle * 1.5));
          const targetSpeed = Math.min(0.55, dist * 0.25);
          this.roverSpeed += (targetSpeed - this.roverSpeed) * 0.1;
        }
      } else {
        // Manual Steering & Throttle
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

      // Smooth steering lerp
      this.roverSteer += (this.targetSteer - this.roverSteer) * 0.18;

      // Angular velocity proportional to forward velocity
      const turnRate = 0.055;
      this.roverAngle += this.roverSteer * this.roverSpeed * turnRate;

      // Integrate 2D translation
      const forwardX = -Math.sin(this.roverAngle);
      const forwardZ = -Math.cos(this.roverAngle);
      this.roverPos.x += forwardX * this.roverSpeed;
      this.roverPos.y += forwardZ * this.roverSpeed;

      // Boundary clamp
      const bound = 135;
      this.roverPos.x = Math.max(-bound, Math.min(bound, this.roverPos.x));
      this.roverPos.y = Math.max(-bound, Math.min(bound, this.roverPos.y));

      // Update Rover Mesh Transform
      if (this.rover) {
        this.rover.position.set(this.roverPos.x, 0, this.roverPos.y);
        this.rover.rotation.y = this.roverAngle;

        // Suspension pitch/roll effect
        const pitch = -this.roverSpeed * 0.08;
        const roll = this.roverSteer * this.roverSpeed * 0.06;
        this.rover.rotation.x = pitch;
        this.rover.rotation.z = roll;

        // Rotate wheels
        this.wheels.forEach((w) => {
          w.rotation.y += this.roverSpeed * 0.8;
        });
        // Steer front wheel hubs
        this.frontWheelHubs.forEach((h) => {
          h.rotation.y = this.roverSteer;
        });
      }

      // Audio engine pitch
      audio.updateEngine(this.roverSpeed / 0.72);

      // Thruster Exhaust Particles
      if (this.roverSpeed > 0.05 && this.rover) {
        const p = this.exhaustParticles.find((pt) => pt.life <= 0);
        if (p) {
          const rearOffset = new THREE.Vector3(0, 0.45, 1.6).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.roverAngle);
          p.x = this.roverPos.x + rearOffset.x;
          p.y = rearOffset.y;
          p.z = this.roverPos.y + rearOffset.z;
          p.vx = (Math.random() - 0.5) * 0.2 + forwardX * -0.2;
          p.vy = Math.random() * 0.15;
          p.vz = (Math.random() - 0.5) * 0.2 + forwardZ * -0.2;
          p.life = 0.4;
        }
      }

      // Animate particles
      const posAttr = this.exhaustSystem.geometry.attributes.position;
      this.exhaustParticles.forEach((p, idx) => {
        if (p.life > 0) {
          p.x += p.vx;
          p.y += p.vy;
          p.z += p.vz;
          p.life -= dt;
          posAttr.setXYZ(idx, p.x, p.y, p.z);
        } else {
          posAttr.setXYZ(idx, 0, -20, 0);
        }
      });
      posAttr.needsUpdate = true;

      // Update Speedometer HUD readout
      const speedKmH = Math.abs(Math.round(this.roverSpeed * 85));
      const speedEl = document.getElementById("speed-val");
      const gearEl = document.getElementById("gear-val");
      const throttleEl = document.getElementById("throttle-fill");

      if (speedEl) speedEl.textContent = speedKmH.toString().padStart(2, "0");
      if (gearEl) gearEl.textContent = this.roverSpeed < -0.01 ? "R" : (this.roverSpeed > 0.01 ? "D" : "P");
      if (throttleEl) throttleEl.style.width = `${Math.min(100, Math.abs(this.roverSpeed / 0.72) * 100)}%`;

      // Check Proximity to Stations
      this.stations.forEach((st) => {
        const d = Math.hypot(this.roverPos.x - st.pos.x, this.roverPos.y - st.pos.z);
        if (d < 4.5 && this.activeStation !== st) {
          this.openStationModal(st);
        }
      });
    }

    /* ------------------------------------------------------------------------
       CAMERA CHASE & SMOOTH ORBIT
       ------------------------------------------------------------------------ */
    updateCamera() {
      if (!this.rover) return;

      const chaseDistance = 14;
      const chaseHeight = 8.5;
      const targetX = this.roverPos.x + Math.sin(this.roverAngle) * chaseDistance;
      const targetZ = this.roverPos.y + Math.cos(this.roverAngle) * chaseDistance;

      // Smooth camera dampening
      this.camera.position.x += (targetX - this.camera.position.x) * 0.08;
      this.camera.position.y += (chaseHeight - this.camera.position.y) * 0.08;
      this.camera.position.z += (targetZ - this.camera.position.z) * 0.08;

      // Look slightly ahead of rover
      const lookAhead = 3.5;
      const lookX = this.roverPos.x - Math.sin(this.roverAngle) * lookAhead;
      const lookZ = this.roverPos.y - Math.cos(this.roverAngle) * lookAhead;
      this.camera.lookAt(lookX, 1.2, lookZ);
    }

    /* ------------------------------------------------------------------------
       3D COMMIT MATRIX HOVER INSPECTOR
       ------------------------------------------------------------------------ */
    updateCommitHover() {
      if (this.commitBlocks.length === 0) return;
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const hits = this.raycaster.intersectObjects(this.commitBlocks);
      const tooltip = document.getElementById("commit-tooltip");

      if (hits.length > 0) {
        const hit = hits[0].object;
        if (this.hoveredBlock !== hit) {
          if (this.hoveredBlock && this.hoveredBlock.material) {
            this.hoveredBlock.material.emissiveIntensity = this.hoveredBlock.userData.level >= 3 ? 0.6 : 0;
          }
          this.hoveredBlock = hit;
          hit.material.emissiveIntensity = 1.0;
        }

        if (tooltip && hit.userData) {
          tooltip.style.left = `${(this.mouse.x + 1) * 0.5 * window.innerWidth}px`;
          tooltip.style.top = `${(-this.mouse.y + 1) * 0.5 * window.innerHeight}px`;
          tooltip.innerHTML = `
            <div class="commit-tooltip-date">${hit.userData.date}</div>
            <div class="commit-tooltip-count">${hit.userData.count} commits</div>
          `;
          tooltip.classList.add("visible");
        }
      } else {
        if (this.hoveredBlock && this.hoveredBlock.material) {
          this.hoveredBlock.material.emissiveIntensity = this.hoveredBlock.userData.level >= 3 ? 0.6 : 0;
          this.hoveredBlock = null;
        }
        if (tooltip) tooltip.classList.remove("visible");
      }
    }

    /* ------------------------------------------------------------------------
       ANIMATION LOOP
       ------------------------------------------------------------------------ */
    animate() {
      requestAnimationFrame(() => this.animate());

      const delta = this.clock.getDelta();
      const elapsed = this.clock.getElapsedTime();

      // Shader uniforms time
      this.shaderUniforms.uTime.value = elapsed;

      // Animate Stations
      this.stations.forEach((st) => {
        if (st.animMesh) {
          st.animMesh.rotation.y += 0.012;
        }
      });

      // Animate Shader Lab Prism
      if (this.shaderPrism) {
        this.shaderPrism.rotation.y = elapsed * 0.35;
        this.shaderPrism.rotation.x = Math.sin(elapsed * 0.25) * 0.2;
      }
      if (this.shaderRing1) this.shaderRing1.rotation.z += 0.015;
      if (this.shaderRing2) this.shaderRing2.rotation.y += 0.012;

      // Vehicle Physics & Camera
      this.updatePhysics(delta);
      this.updateCamera();

      // Commit Hover Raycaster
      this.updateCommitHover();

      // FPS Counter
      this.frameCount++;
      if (elapsed - this.lastFpsUpdate > 1.0) {
        this.fps = this.frameCount;
        this.frameCount = 0;
        this.lastFpsUpdate = elapsed;
        const fpsEl = document.getElementById("fps-val");
        if (fpsEl) fpsEl.textContent = this.fps;
      }

      // Render Scene
      this.renderer.render(this.scene, this.camera);
    }
  }

  // Initialize on DOM Ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => new PortfolioApp());
  } else {
    new PortfolioApp();
  }
})();
