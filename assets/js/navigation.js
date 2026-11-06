import { chapters, chapterById, legacyRoutes } from "./portfolio.js";

export function setupNavigation({ onFocus, onChapter, isMotionPaused }) {
  const archive = document.querySelector("#content-archive");
  const dialog = document.querySelector("#chapter-dialog");
  const content = document.querySelector("#chapter-content");
  const scroller = dialog.querySelector(".dialog-scroll");
  const label = document.querySelector("#chapter-label");
  const next = document.querySelector("#next-chapter");
  const closeButton = document.querySelector("#close-chapter");
  const defaultTitle = document.title;
  let active = null;
  let trigger = null;
  let transition = 0;
  let timer = null;
  let openedFromWorld = false;

  // Keep the original page usable in browsers without native dialog support.
  if (typeof dialog.showModal !== "function") return;
  archive.hidden = true;

  function restoreContent() {
    if (active) archive.append(active.element);
    active = null;
  }

  function resetWorld() {
    clearTimeout(timer);
    const token = ++transition;
    const finish = () => {
      if (token !== transition) return;
      document.body.classList.remove("world-focusing", "chapter-open");
      document.body.classList.add("world-returning");
      document
        .querySelector(".portal.is-selected")
        ?.classList.remove("is-selected");
      dialog.classList.remove("dialog-enter", "dialog-leave");
      if (dialog.open) dialog.close();
      delete dialog.dataset.chapter;
      restoreContent();
      document.title = defaultTitle;
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
      trigger = null;
      setTimeout(() => document.body.classList.remove("world-returning"), 700);
    };
    onChapter(false);
    onFocus(null);
    if (dialog.open && !isMotionPaused()) {
      dialog.classList.remove("dialog-enter");
      dialog.classList.add("dialog-leave");
      timer = setTimeout(finish, 220);
    } else finish();
  }

  function showChapter(id, cinematic = false) {
    const chapter = chapterById.get(id);
    if (!chapter || active?.id === id) return;
    clearTimeout(timer);
    const token = ++transition;
    const alreadyOpen = dialog.open;
    if (!alreadyOpen && !trigger) trigger = document.activeElement;
    document.body.classList.add("world-focusing");
    document
      .querySelector(".portal.is-selected")
      ?.classList.remove("is-selected");
    document
      .querySelector(`[data-object="${id}"]`)
      ?.classList.add("is-selected");
    dialog.classList.remove("dialog-leave");
    onFocus(id, cinematic && !alreadyOpen);

    const reveal = () => {
      if (token !== transition) return;
      restoreContent();
      active = chapter;
      content.append(chapter.element);
      dialog.dataset.chapter = id;
      label.textContent = `${chapter.number} / ${chapter.label}`;
      for (const link of dialog.querySelectorAll(".chapter-compass a")) {
        if (link.hash === `#${id}`) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
      }
      document.title = `${chapter.label} — Ayoub El Ghazi`;
      const following =
        chapters[(chapters.indexOf(chapter) + 1) % chapters.length];
      next.href = `#${following.id}`;
      next.querySelector("span").textContent = following.label;
      document.body.classList.add("chapter-open");
      dialog.classList.toggle("dialog-enter", !alreadyOpen);
      content.classList.remove("chapter-enter");
      if (!dialog.open) dialog.showModal();
      scroller.scrollTop = 0;
      // Focus the heading first: screen readers receive the opened content directly.
      const heading = chapter.element.querySelector("h2");
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
      requestAnimationFrame(() => content.classList.add("chapter-enter"));
      onChapter(true);
    };
    timer = setTimeout(
      reveal,
      cinematic && !alreadyOpen && !isMotionPaused()
        ? matchMedia("(min-width: 761px)").matches &&
          document.documentElement.classList.contains("webgl-ready")
          ? 790
          : 220
        : 0,
    );
  }

  function closeChapter() {
    if (openedFromWorld) {
      openedFromWorld = false;
      history.back();
    } else {
      history.replaceState(null, "", "#world");
      resetWorld();
    }
  }

  function navigate(id, cinematic = false) {
    id = legacyRoutes[id] || id;
    if (id === "world") {
      closeChapter();
      return;
    }
    if (!chapterById.has(id)) return;
    if (location.hash !== `#${id}`) {
      // Keep one history entry per exploration, so Back returns to the world.
      if (active || document.body.classList.contains("world-focusing")) {
        history.replaceState({ portfolio: true }, "", `#${id}`);
      } else {
        history.pushState({ portfolio: true }, "", `#${id}`);
        openedFromWorld = true;
      }
    }
    showChapter(id, cinematic);
  }

  document.addEventListener("click", (event) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const anchor = event.target.closest('a[href^="#"]');
    if (!anchor) return;
    const id = anchor.hash.slice(1);
    if (!chapterById.has(id) && !legacyRoutes[id] && id !== "world") return;
    event.preventDefault();
    navigate(id, Boolean(anchor.dataset.object));
  });
  closeButton.addEventListener("click", closeChapter);
  dialog.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") return;
    const focusable = [
      ...dialog.querySelectorAll("a[href], button, summary"),
    ].filter(
      (element) =>
        element.getClientRects().length &&
        !element.disabled &&
        element.tabIndex !== -1,
    );
    const first = focusable[0];
    const last = focusable.at(-1);
    if (
      event.shiftKey &&
      (document.activeElement === first || document.activeElement.matches("h2"))
    ) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  });
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeChapter();
  });
  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
      closeChapter();
  });
  // Escape also cancels the brief camera approach before the modal is open.
  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      !dialog.open &&
      document.body.classList.contains("world-focusing")
    )
      closeChapter();
  });
  const syncRoute = () => {
    const raw = location.hash.slice(1);
    const id = legacyRoutes[raw] || raw;
    if (chapterById.has(id)) showChapter(id);
    else {
      openedFromWorld = false;
      resetWorld();
    }
  };
  window.addEventListener("popstate", syncRoute);
  window.addEventListener("hashchange", syncRoute);
  syncRoute();
}
