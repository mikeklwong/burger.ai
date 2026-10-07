// Theme system for burger.ai
// Each theme = a base mode (light/dark) + an accent color.
// "auto" follows the OS: default (light) in daylight, night (dark) in dark mode.

const lightBase = {
  "--background": "0 0% 100%",
  "--foreground": "0 0% 9%",
  "--card": "0 0% 100%",
  "--card-foreground": "0 0% 9%",
  "--popover": "0 0% 100%",
  "--popover-foreground": "0 0% 9%",
  "--secondary": "0 0% 96%",
  "--secondary-foreground": "0 0% 9%",
  "--muted": "0 0% 96%",
  "--muted-foreground": "0 0% 45%",
  "--border": "0 0% 90%",
  "--input": "0 0% 90%",
  "--destructive": "0 84% 60%",
  "--destructive-foreground": "0 0% 98%",
};

const darkBase = {
  "--background": "0 0% 6%",
  "--foreground": "0 0% 96%",
  "--card": "0 0% 10%",
  "--card-foreground": "0 0% 96%",
  "--popover": "0 0% 9%",
  "--popover-foreground": "0 0% 96%",
  "--secondary": "0 0% 16%",
  "--secondary-foreground": "0 0% 96%",
  "--muted": "0 0% 16%",
  "--muted-foreground": "0 0% 62%",
  "--border": "0 0% 18%",
  "--input": "0 0% 18%",
  "--destructive": "0 72% 52%",
  "--destructive-foreground": "0 0% 96%",
};

// accent: primary, primary-foreground, accent, accent-foreground, ring, chart-1
const accents = {
  black: { p: "0 0% 9%", pf: "0 0% 100%", a: "0 0% 96%", af: "0 0% 9%", c: "0 0% 9%" },
  white: { p: "0 0% 96%", pf: "0 0% 9%", a: "0 0% 20%", af: "0 0% 96%", c: "0 0% 96%" },
  red: { p: "0 72% 52%", pf: "0 0% 100%", a: "0 80% 64%", af: "0 0% 100%", c: "0 72% 52%" },
  lightblue: { p: "199 89% 58%", pf: "0 0% 100%", a: "199 90% 72%", af: "0 0% 9%", c: "199 89% 58%" },
  pink: { p: "330 81% 60%", pf: "0 0% 100%", a: "330 85% 74%", af: "0 0% 100%", c: "330 81% 60%" },
  green: { p: "142 71% 45%", pf: "0 0% 100%", a: "142 70% 60%", af: "0 0% 100%", c: "142 71% 45%" },
};

function build(id, label, mode, accentKey, swatch) {
  const base = mode === "dark" ? darkBase : lightBase;
  const ac = accents[accentKey];
  return {
    id, label, mode, swatch,
    vars: {
      ...base,
      "--primary": ac.p,
      "--primary-foreground": ac.pf,
      "--accent": ac.a,
      "--accent-foreground": ac.af,
      "--ring": ac.p,
      "--chart-1": ac.c,
      "--chart-2": ac.c,
      "--chart-3": ac.c,
      "--chart-4": ac.c,
      "--chart-5": ac.c,
      "--sidebar-primary": ac.p,
      "--sidebar-primary-foreground": ac.pf,
      "--sidebar-accent": ac.a,
      "--sidebar-accent-foreground": ac.af,
      "--sidebar-ring": ac.p,
    },
  };
}

export const THEMES = [
  build("default", "Default", "light", "black", { bg: "#ffffff", fg: "#111111" }),
  build("night", "Black & White", "dark", "white", { bg: "#0f0f0f", fg: "#f5f5f5" }),
  build("black-red", "Black & Red", "dark", "red", { bg: "#0f0f0f", fg: "#dc2626" }),
  build("black-white", "Black & White", "dark", "white", { bg: "#0f0f0f", fg: "#f5f5f5" }),
  build("black-lightblue", "Black & Light Blue", "dark", "lightblue", { bg: "#0f0f0f", fg: "#38bdf8" }),
  build("black-pink", "Black & Pink", "dark", "pink", { bg: "#0f0f0f", fg: "#ec4899" }),
  build("black-green", "Black & Green", "dark", "green", { bg: "#0f0f0f", fg: "#22c55e" }),
  build("white-red", "White & Red", "light", "red", { bg: "#ffffff", fg: "#dc2626" }),
  build("white-lightblue", "White & Light Blue", "light", "lightblue", { bg: "#ffffff", fg: "#38bdf8" }),
  build("white-pink", "White & Pink", "light", "pink", { bg: "#ffffff", fg: "#ec4899" }),
  build("white-green", "White & Green", "light", "green", { bg: "#ffffff", fg: "#22c55e" }),
];

const STORAGE_KEY = "burger_theme";
let mqListener = null;

export function getStoredTheme() {
  return localStorage.getItem(STORAGE_KEY) || "auto";
}

function applyVars(vars) {
  const root = document.documentElement;
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
}

function resolveTheme(id) {
  if (id === "auto") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return prefersDark ? byId("night") : byId("default");
  }
  return byId(id);
}

function byId(id) {
  return THEMES.find((t) => t.id === id) || THEMES[0];
}

export function applyTheme(id) {
  localStorage.setItem(STORAGE_KEY, id);
  const theme = resolveTheme(id);
  applyVars(theme.vars);
  // keep .dark class in sync for any component that checks it
  document.documentElement.classList.toggle("dark", theme.mode === "dark");
}

export function initTheme() {
  const stored = getStoredTheme();
  applyTheme(stored);
  if (mqListener) window.matchMedia("(prefers-color-scheme: dark)").removeEventListener("change", mqListener);
  mqListener = () => {
    if (getStoredTheme() === "auto") applyTheme("auto");
  };
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", mqListener);
}