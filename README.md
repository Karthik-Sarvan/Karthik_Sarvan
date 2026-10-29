# Karthik Sarvan — Linux Graphics & Kernel Engineer

> **karthik.qzz.io** · Visakhapatnam, Andhra Pradesh, India
> Upstream Mesa 3D Contributor · Linux DRM/KMS Subsystem · Mimic Hardware Maintainer

Interactive 3D WebGL portfolio and bare-metal systems showcase for **Karthik Sarvan**.
Featuring a controllable GPU Rover on a silicon substrate, 3D extruded GitHub/GitLab commit canyon (2,742+ commits in 2026), live GLSL shader telemetry, and an interactive kernel console.

## Focus Areas

- **Mesa 3D Graphics Stack**: Lavapipe Vulkan software rasterizer (MR !45614), Zink OpenGL-over-Vulkan HUD instrumentation, NIR compiler optimization passes, Gallium3D.
- **Linux Kernel DRM / KMS**: Direct Rendering Manager, Atomic Modesetting commits, GEM memory buffer management, DMA-BUF zero-copy sharing, timeline syncobj (`wp_linux_drm_syncobj_v1`).
- **Mimic Hardware Emulation**: Maintainer of [mimic.aegiondynamic.com](https://mimic.aegiondynamic.com) — bare-metal STM32 hardware-in-the-loop test framework proxying physical I2C/SPI sensors.
- **Languages & Tooling**: Bare-metal C, C++, Rust, Python, Assembly, Vulkan, OpenGL, GLSL, Zephyr RTOS, IGT GPU Tools.

## Connect & Upstream Profiles

- Portfolio: <https://karthik.qzz.io>
- FreeDesktop GitLab: [@karthik-sarvan](https://gitlab.freedesktop.org/karthik-sarvan)
- GitHub: [@Karthik-Sarvan](https://github.com/Karthik-Sarvan)
- Hardware Emulation: <https://mimic.aegiondynamic.com>
- LinkedIn: [karthik-sarvan](https://www.linkedin.com/in/karthik-sarvan/)
- X: [@Karthik__Sarvan](https://x.com/Karthik__Sarvan)
- Email: <karthiks1mail@gmail.com>

---

## Architecture & Verification

- 100% self-contained WebGL & Three.js engine (vendored locally, zero CDN lag).
- Procedural audio synthesizer via Web Audio API.
- Fully passes static SEO, canonical, and health tests:
  ```bash
  python3 tools/check.py
  ```
