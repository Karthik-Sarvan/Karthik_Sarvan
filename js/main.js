/**
 * ============================================================================
 * KARTHIK SARVAN // LINUX GRAPHICS & DRM KERNEL SYSTEMS PORTFOLIO
 * Client Script: GPU Telemetry, Pipeline Explorer, Commit Heatmap, Terminal
 * ============================================================================
 */

(function () {
  "use strict";

  /* --------------------------------------------------------------------------
     1. BARE-METAL GPU TELEMETRY INSPECTOR
     -------------------------------------------------------------------------- */
  function setupGPUInspector() {
    const vendorEl = document.getElementById("gpu-vendor-val");
    const rendererEl = document.getElementById("gpu-renderer-val");
    const maxTexEl = document.getElementById("gpu-tex-val");
    const extsEl = document.getElementById("gpu-ext-val");

    let vendor = "Intel / Mesa";
    let renderer = "Mesa Intel UHD Graphics 620 (KBL GT2)";
    let maxTex = 16384;
    let exts = 36;

    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
      if (gl) {
        const dbg = gl.getExtension("WEBGL_debug_renderer_info");
        if (dbg) {
          vendor = gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) || vendor;
          renderer = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || renderer;
        }
        maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE) || maxTex;
        const supported = gl.getSupportedExtensions();
        exts = supported ? supported.length : exts;
      }
    } catch (e) {
      console.warn("GPU query restricted by browser environment, using detected fallback");
    }

    if (vendorEl) vendorEl.textContent = vendor;
    if (rendererEl) rendererEl.textContent = renderer;
    if (maxTexEl) maxTexEl.textContent = `${maxTex}px`;
    if (extsEl) extsEl.textContent = `${exts} extensions`;
  }

  /* --------------------------------------------------------------------------
     2. INTERACTIVE LINUX GRAPHICS PIPELINE EXPLORER
     -------------------------------------------------------------------------- */
  const PIPELINE_DATA = {
    app: {
      step: "STAGE 01 // WAYLAND PROTOCOL",
      title: "Client Application & Wayland Compositor",
      desc: "Wayland client surfaces, frame callbacks, and display presentation. The compositor coordinates surface pacing, zero-copy dmabuf buffer passing, and explicit timeline synchronization.",
      code: `// Wayland client dmabuf allocation & presentation
struct zwp_linux_dmabuf_v1 *dmabuf = ...;
struct wp_linux_drm_syncobj_manager_v1 *syncobj_mgr = ...;
wp_linux_drm_syncobj_surface_v1_set_acquire_point(surface_sync, syncobj, point);`
    },
    api: {
      step: "STAGE 02 // GRAPHICS API",
      title: "Graphics API (Vulkan / OpenGL)",
      desc: "The client issues command buffers, pipeline state objects, and draw calls via Vulkan (e.g. vkCmdDrawIndexed) or OpenGL contexts.",
      code: `VkSubmitInfo submitInfo = {
    .sType = VK_STRUCTURE_TYPE_SUBMIT_INFO,
    .commandBufferCount = 1,
    .pCommandBuffers = &cmdBuffer
};
vkQueueSubmit(graphicsQueue, 1, &submitInfo, fence);`
    },
    mesa: {
      step: "STAGE 03 // USER-SPACE DRIVERS",
      title: "Mesa 3D User-Space Drivers & NIR Compiler",
      desc: "Mesa translates SPIR-V / GLSL into NIR (New Intermediate Representation). Applies dead-code elimination, algebraic lowering, and hardware scheduling across drivers (Lavapipe, Zink, RADV, ANV).",
      code: `/* Mesa NIR optimization pass (Karthik upstream work) */
nir_shader *nir = spirv_to_nir(...);
NIR_PASS_V(nir, nir_opt_dce);
NIR_PASS_V(nir, nir_opt_algebraic);
/* Lavapipe MR !45614: pipeline cache header calculation */
size_t hdr_sz = lvp_get_pipeline_cache_header_size();`
    },
    drm: {
      step: "STAGE 04 // KERNEL SUBSYSTEM",
      title: "Linux Kernel DRM / KMS Subsystem",
      desc: "drivers/gpu/drm/: Manages GEM buffer allocations, TTM memory residency (VRAM/GTT), fence synchronization, and atomic display state commits (DRM_IOCTL_MODE_ATOMIC_COMMIT).",
      code: `/* drm_atomic_commit: staging full CRTC / plane state */
int drm_atomic_commit(struct drm_atomic_state *state) {
    int ret = drm_atomic_check_only(state);
    if (ret) return ret;
    return config->funcs->atomic_commit(state->dev, state, false);
}`
    },
    gpu: {
      step: "STAGE 05 // HARDWARE SCANOUT",
      title: "GPU Hardware Silicon & Scanout",
      desc: "The GPU command processor parses ring buffers, executes compute/fragment pipelines on physical execution units, and the display controller scans out frames directly to the display connector.",
      code: `/* Hardware scanout: CRTC -> Encoder -> Connector -> Panel */
CRTC[0] -> HDMI-A-1 / DP-1: 3840x2160@144Hz (RGB 10bpc)
dma_fence signaled -> vblank interrupt handled`
    }
  };

  function setupPipelineExplorer() {
    const stageBtns = document.querySelectorAll(".stage-tab");
    const detailBox = document.getElementById("pipeline-display");
    if (!stageBtns.length || !detailBox) return;

    stageBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const stageKey = btn.getAttribute("data-stage");
        const data = PIPELINE_DATA[stageKey];
        if (!data) return;

        stageBtns.forEach((b) => {
          b.classList.remove("active");
          b.setAttribute("aria-selected", "false");
        });
        btn.classList.add("active");
        btn.setAttribute("aria-selected", "true");

        detailBox.innerHTML = `
          <div class="pipeline-info">
            <span class="pipeline-stage-badge">${data.step}</span>
            <h3 class="pipeline-stage-heading">${data.title}</h3>
            <p class="pipeline-stage-text">${data.desc}</p>
          </div>
          <div class="code-box">
            <pre><code>${data.code}</code></pre>
          </div>
        `;
      });
    });
  }

  /* --------------------------------------------------------------------------
     3. GITHUB 2026 COMMIT HEATMAP GENERATOR
     -------------------------------------------------------------------------- */
  async function setupCommitHeatmap() {
    const grid = document.getElementById("heatmap-grid");
    const tooltip = document.getElementById("heatmap-tooltip");
    if (!grid) return;

    let data = null;
    try {
      const res = await fetch("assets/github-contributions.json");
      if (res.ok) data = await res.json();
    } catch (e) {
      console.warn("Using offline fallback for commit data");
    }

    const contributions = (data && data.contributions) ? data.contributions : [];
    grid.innerHTML = "";

    contributions.forEach((item) => {
      const cell = document.createElement("div");
      cell.className = `day-cell day-lvl-${Math.min(item.level || 0, 4)}`;

      cell.addEventListener("mouseenter", (e) => {
        if (!tooltip) return;
        tooltip.innerHTML = `<strong>${item.count} commits</strong> · ${item.date}`;
        tooltip.style.left = `${e.clientX}px`;
        tooltip.style.top = `${e.clientY}px`;
        tooltip.style.opacity = "1";
      });

      cell.addEventListener("mouseleave", () => {
        if (tooltip) tooltip.style.opacity = "0";
      });

      grid.appendChild(cell);
    });
  }

  /* --------------------------------------------------------------------------
     4. INTERACTIVE LINUX TERMINAL DRAWER
     -------------------------------------------------------------------------- */
  function setupTerminalShell() {
    const drawer = document.getElementById("terminal-drawer");
    const btnOpenHeader = document.getElementById("btn-terminal-open");
    const btnOpenFloat = document.getElementById("btn-terminal-float");
    const btnClose = document.getElementById("btn-terminal-close");
    const input = document.getElementById("term-cli-input");
    const output = document.getElementById("term-cli-output");

    if (!drawer || !input || !output) return;

    const toggle = (force) => {
      const isOpen = drawer.classList.toggle("open", force);
      if (isOpen) {
        setTimeout(() => input.focus(), 150);
      }
    };

    if (btnOpenHeader) btnOpenHeader.addEventListener("click", () => toggle(true));
    if (btnOpenFloat) btnOpenFloat.addEventListener("click", () => toggle(true));
    if (btnClose) btnClose.addEventListener("click", () => toggle(false));

    window.addEventListener("keydown", (e) => {
      if (e.key === "`" && e.target.tagName !== "INPUT" && e.target.tagName !== "TEXTAREA") {
        e.preventDefault();
        toggle();
      }
      if (e.key === "Escape" && drawer.classList.contains("open")) {
        toggle(false);
      }
    });

    const append = (html) => {
      const div = document.createElement("div");
      div.className = "term-line";
      div.innerHTML = html;
      output.appendChild(div);
      output.scrollTop = output.scrollHeight;
    };

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const cmd = input.value.trim();
        if (!cmd) return;
        input.value = "";
        append(`<span class="term-prompt">karthik@drm-subsystem:~$</span> ${cmd}`);

        const c = cmd.toLowerCase();
        switch (c) {
          case "help":
            append(`
Available commands:
  <span class="term-cyan">mesa</span>       - Upstream Mesa 3D contributions & MR status
  <span class="term-cyan">drm</span>        - Linux DRM/KMS subsystem architecture
  <span class="term-cyan">mimic</span>      - Mimic open-source hardware emulation framework
  <span class="term-cyan">commits</span>    - GitHub & GitLab upstream activity statistics
  <span class="term-cyan">glxinfo</span>    - Local GPU & OpenGL profile
  <span class="term-cyan">vulkaninfo</span> - Vulkan physical devices & drivers
  <span class="term-cyan">game</span>       - Launch 3D roadster world (game.karthik.qzz.io)
  <span class="term-cyan">contact</span>    - Upstream email and forge links
  <span class="term-cyan">clear</span>      - Clear terminal console
            `);
            break;
          case "mesa":
            append(`
<span class="term-cyan">[MESA 3D CONTRIBUTIONS]</span>
FreeDesktop: <a href="https://gitlab.freedesktop.org/karthik-sarvan" target="_blank" class="term-cyan">gitlab.freedesktop.org/karthik-sarvan</a>
• <strong>MR !45614:</strong> lavapipe: report full pipeline cache header size
• <strong>Zink:</strong> add submits-per-frame HUD query (OpenGL over Vulkan)
• <strong>NIR:</strong> SSA optimizations, SPIR-V dialect lowering passes
            `);
            break;
          case "drm":
          case "kernel":
            append(`
<span class="term-cyan">[LINUX KERNEL DRM / KMS]</span>
• Subsystem: drivers/gpu/drm/
• Memory Managers: GEM Buffer Objects, TTM Memory Placement
• Display Pipeline: Atomic Modesetting (CRTC, Planes, Encoders, Connectors)
• Synchronization: wp_linux_drm_syncobj_v1, asynchronous dma_fence timelines
            `);
            break;
          case "mimic":
            append(`
<span class="term-amber">[MIMIC HARDWARE EMULATION]</span>
Maintainer: <a href="https://mimic.aegiondynamic.com" target="_blank" class="term-cyan">mimic.aegiondynamic.com</a>
Hardware-in-the-loop (HIL) automated test harness proxying physical I2C/SPI sensors on bare-metal STM32.
            `);
            break;
          case "commits":
            append(`
<span class="term-cyan">[UPSTREAM VELOCITY]</span>
• 2026 Contributions: 2,742+
• Lifetime Contributions: 3,660+
• GitHub: <a href="https://github.com/karthik-sarvan" target="_blank" class="term-cyan">github.com/karthik-sarvan</a>
• FreeDesktop: <a href="https://gitlab.freedesktop.org/karthik-sarvan" target="_blank" class="term-cyan">gitlab.freedesktop.org/karthik-sarvan</a>
            `);
            break;
          case "game":
            append(`Opening 3D roadster world: <a href="https://game.karthik.qzz.io" target="_blank" class="term-cyan">https://game.karthik.qzz.io</a>`);
            window.open("https://game.karthik.qzz.io", "_blank");
            break;
          case "glxinfo":
            append(`
OpenGL vendor string: Intel / Mesa
OpenGL renderer string: Mesa Intel(R) UHD Graphics 620
OpenGL core profile version string: 4.6 (Core Profile) Mesa 25.x
OpenGL core profile shading language version string: 4.60
            `);
            break;
          case "vulkaninfo":
            append(`
Vulkan Instance Version: 1.3.280
Physical Devices:
  [0] Intel(R) UHD Graphics 620 (KBL GT2) (ANV driver)
  [1] Lavapipe software rasterizer (Vulkan 1.3, MR !45614 compliant)
            `);
            break;
          case "contact":
            append(`
• Email: <a href="mailto:karthiks1mail@gmail.com" class="term-cyan">karthiks1mail@gmail.com</a>
• FreeDesktop: <a href="https://gitlab.freedesktop.org/karthik-sarvan" target="_blank" class="term-cyan">gitlab.freedesktop.org/karthik-sarvan</a>
• GitHub: <a href="https://github.com/karthik-sarvan" target="_blank" class="term-cyan">github.com/karthik-sarvan</a>
• LinkedIn: <a href="https://www.linkedin.com/in/karthik-sarvan/" target="_blank" class="term-cyan">linkedin.com/in/karthik-sarvan</a>
            `);
            break;
          case "clear":
            output.innerHTML = "";
            break;
          default:
            append(`<span class="term-dim">command not found:</span> ${cmd}. Type <span class="term-cyan">help</span>.`);
        }
      }
    });
  }

  // Initialize on DOM load
  document.addEventListener("DOMContentLoaded", () => {
    setupGPUInspector();
    setupPipelineExplorer();
    setupCommitHeatmap();
    setupTerminalShell();
  });
})();
