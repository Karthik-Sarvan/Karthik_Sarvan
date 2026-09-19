// DOM smoke test: executes each page's JS in jsdom and reports real runtime
// errors (ReferenceError / TypeError in our own code). Run:
//   node tools/smoke.js
//
// Because jsdom v30 no longer exposes a resource loader, we inline every
// local <script src> into the document before handing it to jsdom, so the
// vendored libraries and our main.js actually execute.
const path = require("path");
const fs = require("fs");
const { JSDOM, VirtualConsole } = require(path.join(
  process.env.HOME, ".build", "node_modules", "jsdom"));

const ROOT = path.resolve(__dirname, "..");
const BASE = "https://karthik.qzz.io/";
const PAGES = [
  "index.html",
  "blog.html",
  "post.html",
  "404.html",
  "posts/bare-metal-firmware-testing-with-mimic.html",
  "posts/safe-concurrency-in-rust-for-eda.html",
];

function inlineScripts(html, rel) {
  const dir = path.dirname(path.join(ROOT, rel));
  return html.replace(
    /<script\s+src="([^"]+)"([^>]*)>\s*<\/script>/g,
    (m, src, attrs) => {
      if (/^https?:\/\//.test(src)) return ""; // drop external in sandbox
      let p = src.startsWith("/") ? path.join(ROOT, src.slice(1)) : path.join(dir, src);
      p = path.normalize(p);
      if (!fs.existsSync(p)) {
        console.log(`  ! missing script ${src} for ${rel}`);
        return "";
      }
      return `<script>${fs.readFileSync(p, "utf-8")}</script>`;
    });
}

let failed = 0;
const queue = [...PAGES];

function next() {
  const rel = queue.shift();
  if (!rel) {
    console.log(failed ? `\n${failed} page(s) produced JS errors` : "\nALL PAGES RUN CLEAN");
    process.exit(failed ? 1 : 0);
  }
  const html = inlineScripts(fs.readFileSync(path.join(ROOT, rel), "utf-8"), rel);
  const vc = new VirtualConsole();
  const errors = [];
  vc.on("jsdomError", (e) => {
    const msg = String(e && e.message ? e.message : e);
    if (/Could not parse CSS|not implemented/i.test(msg)) return;
    errors.push(msg);
  });
  const dom = new JSDOM(html, {
    url: BASE + rel,
    runScripts: "dangerously",
    pretendToBeVisual: true,
    virtualConsole: vc,
  });
  dom.window.addEventListener("error", (e) => {
    if (e.error) errors.push(e.error.stack || e.error.message);
  });
  setTimeout(() => {
    const real = errors.filter((m) =>
      /ReferenceError|TypeError|is not (defined|a function)/.test(m));
    console.log(`\n[${rel}]`);
    if (real.length) {
      failed++;
      real.forEach((m) => console.log("  JS ERROR:", m.split("\n")[0]));
    } else {
      console.log("  no runtime JS errors");
    }
    dom.window.close();
    next();
  }, 1200);
}
next();
