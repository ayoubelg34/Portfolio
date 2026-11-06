/** Focused case studies and restrained pointer feedback; no animation dependency. */
export function setupProjects() {
  const tabs = [...document.querySelectorAll("[data-project]")];
  const panels = [...document.querySelectorAll("[data-project-panel]")];
  const select = (tab, animate = true) => {
    for (const item of tabs) {
      const active = item === tab;
      item.setAttribute("aria-selected", String(active));
      item.tabIndex = active ? 0 : -1;
    }
    for (const panel of panels) {
      const active = panel.dataset.projectPanel === tab.dataset.project;
      panel.hidden = !active;
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute(
        "aria-labelledby",
        `tab-${panel.dataset.projectPanel}`,
      );
      panel.classList.remove("project-reveal");
      if (active && animate)
        requestAnimationFrame(() => panel.classList.add("project-reveal"));
    }
  };
  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => select(tab));
    tab.addEventListener("keydown", (event) => {
      let next = index;
      if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
      else if (event.key === "ArrowLeft")
        next = (index + tabs.length - 1) % tabs.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = tabs.length - 1;
      else return;
      event.preventDefault();
      // Hide the previous panel first; focusing afterwards prevents browsers
      // from dropping focus when a just-opened details element is removed.
      select(tabs[next]);
      tabs[next].focus({ preventScroll: true });
    });
  });
  if (tabs.length) select(tabs[0], false);
  for (const visual of document.querySelectorAll(".project-visual")) {
    let frame = 0,
      x = 0,
      y = 0;
    visual.addEventListener(
      "pointermove",
      (event) => {
        if (
          event.pointerType === "touch" ||
          document.documentElement.classList.contains("motion-paused")
        )
          return;
        const box = visual.getBoundingClientRect();
        x = (event.clientX - box.left) / box.width - 0.5;
        y = (event.clientY - box.top) / box.height - 0.5;
        if (!frame)
          frame = requestAnimationFrame(() => {
            visual.style.setProperty("--px", x);
            visual.style.setProperty("--py", y);
            frame = 0;
          });
      },
      { passive: true },
    );
    visual.addEventListener("pointerleave", () => {
      cancelAnimationFrame(frame);
      frame = 0;
      visual.style.setProperty("--px", 0);
      visual.style.setProperty("--py", 0);
    });
  }
}

export function setupCursor(isMotionPaused) {
  const cursor = document.querySelector(".explore-cursor");
  const root = document.documentElement;
  const fine = matchMedia("(hover: hover) and (pointer: fine)");
  if (!cursor) return;
  let frame = 0,
    x = -100,
    y = -100;
  const hide = () => {
    root.classList.remove("cursor-visible", "cursor-enabled", "cursor-active");
    cancelAnimationFrame(frame);
    frame = 0;
  };
  document.addEventListener(
    "pointermove",
    (event) => {
      // Native cursor in modal content and for touch/reduced-motion visitors.
      if (
        !fine.matches ||
        isMotionPaused() ||
        document.querySelector("dialog[open]") ||
        event.pointerType === "touch"
      ) {
        hide();
        return;
      }
      x = event.clientX;
      y = event.clientY;
      const target = event.target.closest("a,button,summary");
      let text = "";
      if (target?.matches("[data-object]"))
        text = target.dataset.object === "projects" ? "Explore" : "Open";
      else if (target?.getAttribute("href") === "#world") text = "Return";
      else if (target) text = target.dataset.cursor || "View";
      root.classList.toggle("cursor-active", Boolean(text));
      cursor.querySelector("span").textContent = text;
      root.classList.add("cursor-visible", "cursor-enabled");
      if (!frame)
        frame = requestAnimationFrame(() => {
          cursor.style.transform = `translate3d(${x}px,${y}px,0) translate(-50%,-50%)`;
          frame = 0;
        });
    },
    { passive: true },
  );
  document.addEventListener("pointerout", (event) => {
    if (!event.relatedTarget) hide();
  });
  document.addEventListener("keydown", hide);
  document.addEventListener("visibilitychange", hide);
  fine.addEventListener("change", hide);
  return { hide };
}
