import { setupNavigation } from "./navigation.js";
import { setupProjects, setupCursor } from "./interactions.js";

const root = document.documentElement;
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const desktop = matchMedia("(min-width: 761px)");
const motionButton = document.querySelector("#motion-toggle");
const stage = document.querySelector(".world-stage");
const index = document.querySelector(".index-view");
let scene = null;
let cursor = null;
let sceneLoading = false;
let motionPaused = reducedMotion.matches;
let view = "world";
let chapterOpen = false;
let focusedId = null;
try {
  motionPaused ||= localStorage.getItem("ayoub-motion") === "paused";
} catch {
  /* Storage is optional. */
}

document.querySelectorAll(".require-js").forEach((element) => {
  element.hidden = false;
});
document.querySelectorAll("[data-year]").forEach((element) => {
  element.textContent = new Date().getFullYear();
});
const time = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Paris",
  hour: "2-digit",
  minute: "2-digit",
});
const updateTime = () => {
  document.querySelector(".local-time").textContent = time.format(new Date());
};
updateTime();
setInterval(updateTime, 60000);

function updateMotion() {
  if (motionPaused) cursor?.hide();
  root.classList.toggle("motion-paused", motionPaused);
  motionButton.setAttribute("aria-pressed", String(motionPaused));
  motionButton.setAttribute(
    "aria-label",
    motionPaused ? "Enable motion" : "Pause motion",
  );
  motionButton
    .querySelector("use")
    .setAttribute("href", motionPaused ? "#i-play" : "#i-pause");
  scene?.setPaused(motionPaused);
}
updateMotion();
setupProjects();
cursor = setupCursor(() => motionPaused);
root.classList.add("world-ready");
motionButton.addEventListener("click", () => {
  motionPaused = !motionPaused;
  try {
    localStorage.setItem("ayoub-motion", motionPaused ? "paused" : "playing");
  } catch {
    /* No persistence needed. */
  }
  updateMotion();
});
reducedMotion.addEventListener("change", (event) => {
  motionPaused = event.matches;
  updateMotion();
});

async function loadScene() {
  if (
    scene ||
    sceneLoading ||
    view !== "world" ||
    !desktop.matches ||
    navigator.connection?.saveData
  )
    return;
  sceneLoading = true;
  try {
    const { createWorld } = await import("./scene.js");
    // Recheck after download; the visitor may have resized during loading.
    if (!desktop.matches || view !== "world") return;
    scene = createWorld(document.querySelector("#scene"));
    if (import.meta.env.DEV)
      window.__worldDiagnostics = () => scene?.getDiagnostics();
    scene.setPaused(motionPaused);
    scene.focus(focusedId);
    scene.setVisible(view === "world");
  } catch (error) {
    // HTML links and the CSS sculptures never depend on graphics support.
    root.classList.remove("webgl-ready");
    console.info("Using the lightweight world.", error.message);
  } finally {
    sceneLoading = false;
  }
}

desktop.addEventListener("change", () => {
  if (desktop.matches) {
    loadScene();
    scene?.setVisible(view === "world");
    scene?.resize();
  } else scene?.setVisible(false);
});

for (const button of document.querySelectorAll("[data-view]")) {
  button.addEventListener("click", () => {
    view = button.dataset.view;
    for (const option of document.querySelectorAll("[data-view]"))
      option.setAttribute("aria-pressed", String(option === button));
    stage.hidden = view !== "world";
    index.hidden = view !== "index";
    scene?.setVisible(view === "world" && desktop.matches);
    if (view === "world") {
      loadScene();
      scene?.resize();
    }
  });
}

setupNavigation({
  isMotionPaused: () => motionPaused,
  onFocus(id, cinematic = true) {
    focusedId = id;
    cursor?.hide();
    scene?.focus(id, { instant: !cinematic });
  },
  onChapter(open) {
    chapterOpen = open;
    if (!open && !scene) {
      if ("requestIdleCallback" in window)
        requestIdleCallback(loadScene, { timeout: 700 });
      else setTimeout(loadScene, 100);
    }
    scene?.setVisible(view === "world" && desktop.matches);
  },
});
// Content and interaction render first; the only runtime dependency is lazy loaded.
if ("requestIdleCallback" in window)
  requestIdleCallback(loadScene, { timeout: 700 });
else setTimeout(loadScene, 100);

// Release GPU resources on actual unload; preserve back/forward-cache restores.
window.addEventListener("pagehide", (event) => {
  if (!event.persisted) scene?.dispose();
});
