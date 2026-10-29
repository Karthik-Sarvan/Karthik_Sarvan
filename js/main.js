/**
 * ============================================================================
 * KARTHIK SARVAN // PERSONAL PORTFOLIO
 * Client Script: Commit Heatmap, Terminal Shell, Micro-Interactions
 * ============================================================================
 */

(function () {
  "use strict";

  /* --------------------------------------------------------------------------
     1. GITHUB 2026 COMMIT HEATMAP GENERATOR
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
     2. INTERACTIVE TERMINAL DRAWER
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
        append(`<span class="term-prompt">karthik@workbench:~$</span> ${cmd}`);

        const c = cmd.toLowerCase();
        switch (c) {
          case "help":
            append(`
Available commands:
  <span class="term-cyan">about</span>       - Bio and technical focus
  <span class="term-cyan">experience</span>  - Work history (Aegion, Reaidy, Spotmies)
  <span class="term-cyan">projects</span>    - Featured builds (Pratibim, Mimic, PID Balancer)
  <span class="term-cyan">mimic</span>       - Mimic hardware emulation framework
  <span class="term-cyan">pratibim</span>    - AI-driven circuit schematic engine in Rust
  <span class="term-cyan">skills</span>      - Embedded, firmware & software tools
  <span class="term-cyan">contact</span>     - Email, phone, GitHub & LinkedIn
  <span class="term-cyan">game</span>        - Launch 3D roadster world (game.karthik.qzz.io)
  <span class="term-cyan">clear</span>       - Clear terminal console
            `);
            break;
          case "about":
            append(`
<strong>Karthik Sarvan</strong> — Embedded Engineer & Systems Developer
Electronics & Communication Engineering student building from the ground up:
bare-metal C, Rust, STM32 microcontrollers, PID control loops, and modern web systems.
            `);
            break;
          case "experience":
            append(`
• <strong>Aegion Dynamic Solutions</strong> (Dec 2025 - Present): Embedded Intern, STM32 firmware in C & Rust
• <strong>Reaidy.io</strong> (Sept 2024 - Apr 2025): MERN Stack Developer, AI interview platform
• <strong>Spotmies LLP</strong> (June 2023 - Dec 2023): React Intern, web applications
            `);
            break;
          case "projects":
            append(`
1. <strong>Pratibim:</strong> AI-driven EDA schematic tool built with a high-performance Rust core (pratibim.tech)
2. <strong>Mimic:</strong> Hardware emulation test framework proxying physical I2C/SPI sensors on STM32 (mimic.aegiondynamic.com)
3. <strong>Relay Test System:</strong> Automated field diagnostic unit for contact resistance & pickup voltage
4. <strong>PID Balancer:</strong> Closed-loop tilt stabilization utilizing fast-response spatial sensor feedback
            `);
            break;
          case "mimic":
            append(`
<span class="term-amber">[MIMIC HARDWARE EMULATION]</span>
Maintainer: <a href="https://mimic.aegiondynamic.com" target="_blank" class="term-cyan">mimic.aegiondynamic.com</a>
Hardware-in-the-loop (HIL) test framework that acts as a proxy for physical sensors on bare-metal STM32.
            `);
            break;
          case "pratibim":
            append(`
<span class="term-cyan">[PRATIBIM EDA TOOL]</span>
URL: <a href="https://pratibim.tech" target="_blank" class="term-cyan">pratibim.tech</a>
AI co-pilot for hardware engineers designing circuit schematics, with memory-safe core engine in Rust.
            `);
            break;
          case "skills":
            append(`
• Languages: Rust, C/C++, JavaScript, Python
• Hardware & Systems: STM32, Embedded Firmware, PCB Design, Linux Kernel, PID Control, Git
• Web: MERN Stack, React, Node.js
            `);
            break;
          case "contact":
            append(`
• Email: <a href="mailto:karthiks1mail@gmail.com" class="term-cyan">karthiks1mail@gmail.com</a>
• Phone: +91 6281858488
• GitHub: <a href="https://github.com/Karthik-Sarvan" target="_blank" class="term-cyan">github.com/Karthik-Sarvan</a>
• LinkedIn: <a href="https://linkedin.com/in/Karthik-Sarvan" target="_blank" class="term-cyan">linkedin.com/in/Karthik-Sarvan</a>
            `);
            break;
          case "game":
            append(`Launching 3D roadster world: <a href="https://game.karthik.qzz.io" target="_blank" class="term-cyan">https://game.karthik.qzz.io</a>`);
            window.open("https://game.karthik.qzz.io", "_blank");
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
    setupCommitHeatmap();
    setupTerminalShell();
  });
})();
