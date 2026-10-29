export interface District {
  id: string;
  name: string;
  sub: string;
  x: number;
  z: number;
}

export interface StopLink {
  label: string;
  href: string;
}

export interface Stop {
  id: number;
  place: string;
  kicker: string;
  title: string;
  lede: string;
  body: string[];
  tags: string[];
  links: StopLink[];
  x: number;
  z: number;
}

export interface EasterEgg {
  id: string;
  name: string;
  note: string;
  x: number;
  y: number;
  z: number;
}

export const OWNER = {
  name: "Karthik Sarvan",
  role: "Linux graphics & kernel engineer",
};

export const LINKS = {
  gitlab: "https://gitlab.freedesktop.org/karthik-sarvan",
  github: "https://github.com/karthik-sarvan",
  mimic: "https://mimic.aegiondynamic.com",
  email: "mailto:karthik@aegiondynamic.com",
};

/** River runs east–west across the map. */
export const RIVER_Z = 118;
export const RIVER_HALF_WIDTH = 15;
export const BRIDGE_X = [-62, 64];
export const WORLD_HALF = 265;

export const DISTRICTS: District[] = [
  { id: "purani", name: "Purani Gully", sub: "the old lanes", x: -128, z: -118 },
  { id: "bazaar", name: "Bazaar Road", sub: "shutters & awnings", x: 16, z: -24 },
  { id: "mandir", name: "Mandir Chowk", sub: "temple square", x: 156, z: -140 },
  { id: "patang", name: "Patang Chhat", sub: "kite rooftops", x: -186, z: 36 },
  { id: "ghat", name: "Nadi Ghat", sub: "the river steps", x: 6, z: 96 },
  { id: "paar", name: "Nadi Paar", sub: "across the water", x: -20, z: 186 },
  { id: "station", name: "Station Side", sub: "under the overbridge", x: 182, z: 54 },
];

/** Portfolio stops — every one sits on a road so it can be ridden to. */
export const STOPS: Stop[] = [
  {
    id: 1,
    place: "Chai Tapri",
    kicker: "01 · About",
    title: "Karthik Sarvan",
    lede: "Open-source engineer working where pixels are made and memory is mapped.",
    body: [
      "I work across the Linux graphics stack — Mesa 3D drivers and compilers at the top, the kernel's DRM/KMS display subsystem underneath — and I maintain Mimic, a hardware-in-the-loop harness for testing firmware before boards exist.",
      "This folded city is the portfolio. Each lit stop holds one part of the work. Ride to them in any order, or open the index and jump straight there.",
    ],
    tags: ["Mesa 3D", "Linux DRM/KMS", "Vulkan", "Firmware HIL"],
    links: [
      { label: "GitLab", href: LINKS.gitlab },
      { label: "GitHub", href: LINKS.github },
    ],
    x: 64,
    z: -34,
  },
  {
    id: 2,
    place: "Mandir Chowk",
    kicker: "02 · Linux kernel",
    title: "DRM / KMS, from buffer to scanout",
    lede: "The oldest temple in the stack: where a rendered buffer finally becomes light.",
    body: [
      "Work in drivers/gpu/drm: GEM buffer objects and their lifetimes, DMA-BUF sharing so buffers cross drivers without a copy, and atomic modesetting that commits a whole display state in one coherent move.",
      "Explicit synchronisation with wp_linux_drm_syncobj_v1 timeline fences — ordering written down as a contract instead of hoped for at vblank.",
    ],
    tags: ["GEM", "DMA-BUF", "Atomic KMS", "syncobj fences"],
    links: [{ label: "Freedesktop GitLab", href: LINKS.gitlab }],
    x: 182,
    z: -140,
  },
  {
    id: 3,
    place: "Station Side",
    kicker: "03 · Hardware",
    title: "Mimic — test the firmware before the board",
    lede: "An open-source hardware-in-the-loop harness, maintained under the overbridge.",
    body: [
      "Mimic proxies physical I2C and SPI sensors. Firmware sends the bus transactions it would send to real parts and receives believable replies from a model.",
      "Verification moves upstream of fabrication: deterministic fixtures, replayable failures, and bus bugs caught before PCB tape-out instead of after a respin.",
    ],
    tags: ["HIL", "I2C", "SPI", "STM32", "Pre tape-out"],
    links: [{ label: "mimic.aegiondynamic.com", href: LINKS.mimic }],
    x: 182,
    z: 96,
  },
  {
    id: 4,
    place: "Nadi Paar",
    kicker: "04 · Graphics",
    title: "Mesa 3D, upstream",
    lede: "Across the water: drivers, compilers and the quiet work between them.",
    body: [
      "lavapipe — MR !45614 reports the full pipeline cache header size, so consumers and tests can reason about the complete serialised header.",
      "zink — a submits-per-frame HUD query that makes OpenGL-over-Vulkan batching visible while a scene runs. Plus NIR optimisation passes and SPIR-V lowering.",
    ],
    tags: ["lavapipe", "zink", "NIR", "SPIR-V", "Vulkan"],
    links: [{ label: "Mesa on GitLab", href: LINKS.gitlab }],
    x: 64,
    z: 186,
  },
  {
    id: 5,
    place: "Nadi Ghat",
    kicker: "05 · Open source",
    title: "2,742 commits in 2026",
    lede: "Fifty-two weeks of work, poured out at the river steps.",
    body: [
      "A steady weekly cadence across GitLab and GitHub — review threads, compiler passes, display commits and test infrastructure.",
      "The record lives on the forges; the diff is always the argument.",
    ],
    tags: ["52 weeks", "GitLab", "GitHub", "Review"],
    links: [
      { label: "GitLab", href: LINKS.gitlab },
      { label: "GitHub", href: LINKS.github },
    ],
    x: -62,
    z: 92,
  },
  {
    id: 6,
    place: "Patang Chhat",
    kicker: "06 · Contact",
    title: "Send a kite",
    lede: "The rooftops are where messages fly. Say hello.",
    body: [
      "Open to conversations about graphics drivers, kernel display paths, and testing firmware before fabrication.",
      "Email is the fastest kite. The forges are the best record.",
    ],
    tags: ["Graphics", "Kernel", "Firmware"],
    links: [
      { label: "Email", href: LINKS.email },
      { label: "GitLab", href: LINKS.gitlab },
      { label: "GitHub", href: LINKS.github },
      { label: "Mimic", href: LINKS.mimic },
    ],
    x: -186,
    z: 26,
  },
];

export const EASTER_EGGS: EasterEgg[] = [
  { id: "egg-1", name: "Paper crane", note: "Folded and left on a windowsill.", x: 64, z: -150, y: 2.6 },
  { id: "egg-2", name: "Lost kite", note: "Someone's patang, caught on the wires.", x: -186, z: -120, y: 5.4 },
  { id: "egg-3", name: "Gully cricket", note: "Stumps chalked on a wall. Out, clean bowled.", x: -62, z: -196, y: 1.6 },
  { id: "egg-4", name: "Rooftop cat", note: "It saw you first.", x: -186, z: 110, y: 2.4 },
  { id: "egg-5", name: "Paper boat", note: "Set adrift at the ghat.", x: 64, z: 104, y: 1.2 },
  { id: "egg-6", name: "Temple bell", note: "One ring for the road.", x: 170, z: -146, y: 2.4 },
  { id: "egg-7", name: "Milk crates", note: "Stacked since four in the morning.", x: 182, z: 26, y: 1.5 },
  { id: "egg-8", name: "Banyan swing", note: "A tyre, a rope, a whole childhood.", x: -50, z: 200, y: 2.6 },
  { id: "egg-9", name: "Sleeping dog", note: "Do not wake the gully's landlord.", x: 0, z: -78, y: 1.3 },
  { id: "egg-10", name: "Folded moon", note: "The last fold of the world.", x: 182, z: 236, y: 5.2 },
];
