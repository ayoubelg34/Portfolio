# Ayoub El Ghazi — Ideas below the surface

An interactive portfolio built with semantic HTML, CSS, JavaScript modules, and a lazy-loaded Three.js planetary scene. Five worlds lead to the profile, projects, skills, education, and contact chapters. The visual identity, geometry, and surface maps are original and generated locally: a deep-space environment, five distinct planet systems, cinematic camera travel, and three individually browsable project case studies.

## Run

Requires Node.js 20.19+ and npm.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite (normally `http://localhost:5173`).

```sh
npm run build
npm run preview
```

Deploy the generated `dist/` directory to a static host. Routing uses URL fragments, so no server-side route rewrites are needed. `base: './'` supports hosting under a subdirectory. There are no API keys, backend services, or runtime CDN requests.

## Where to make changes

- `index.html`: the source of truth for portfolio content, semantic section markup, navigation labels, and SEO metadata. Content is readable even with JavaScript disabled.
- `assets/css/style.css`: shared tokens, local typefaces, controls, cursor, and accessibility preferences.
- `assets/css/world.css`: universe composition, responsive exploration, and lightweight CSS planets.
- `assets/css/chapters.css`: chapter UI, project illustrations, and mobile case-study layouts.
- `assets/js/portfolio.js`: chapter metadata extracted from the HTML, plus legacy URL aliases.
- `assets/js/navigation.js`: chapter transitions, native dialog, keyboard/focus handling, and browser history.
- `assets/js/main.js`: view switching, motion preferences, and lazy scene loading.
- `assets/js/scene.js`: perspective camera travel, stars, nebula haze, lights, adaptive rendering, and GPU resource cleanup.
- `assets/js/sculptures.js`: five distinct 3D planet systems and their orbital details.
- `assets/js/ice-materials.js`: local 256 × 128 procedural surface maps, tactile bump detail, and atmospheric Fresnel materials.
- `assets/js/interactions.js`: accessible case-study tabs, illustration responses, and fine-pointer cursor states.
- `assets/fonts/`: self-hosted Manrope and Instrument Serif fonts with their SIL Open Font Licenses.

To add a chapter, add semantic content with the `.chapter` class, `id`, `data-number`, and `data-label`; then add its universe/index links and planet definition. Existing chapter contents can be edited directly in HTML.

## Content decisions

The original repository supplied three academic projects, technical skills, Polytech Montpellier education, five spoken languages, and contact details. These are retained and reorganized. No employment, international experience, project results, CV file, GitHub account, or live demo URLs have been invented. The expired April–August 2025 internship campaign and time-sensitive “fourth year” wording were removed. Current availability can be added once confirmed.

Project visuals are original conceptual illustrations, not screenshots of the applications. The portfolio's existing technology icons are retained.

## Graphics and accessibility

- Desktop loads Three.js independently after the interface is usable; narrow screens and data-saving connections use the lightweight CSS planets.
- Rendering targets a ceiling of about 30 frames per second and a 1.5 device-pixel ratio. Sustained expensive submissions or slow delivered frames reduce pixel density; economy mode reduces the frame ceiling further. If rendering remains too slow, the scene releases its graphics context and returns to the lightweight CSS universe. There are no downloaded 3D models, HDR maps, real-time shadow maps, or postprocessing passes.
- Rendering stops for hidden tabs, offscreen content, index view, and open chapters.
- System reduced-motion preferences and the persistent motion toggle disable idle/camera motion and UI animation.
- WebGL initialization failure or context loss leaves the same semantic links and CSS sculptures available.
- Native links, keyboard focus, Escape, browser Back/Forward, deep links, and a native modal dialog support direct navigation.
- The dialog traps Tab/Shift+Tab, announces its chapter heading, restores opener focus, and keeps its return control visible while scrolling.
- Both fonts are hosted locally with `font-display: swap`; together they are about 47 kB.
- Desktop pointer hints are disabled for touch, reduced motion, and reading inside a chapter. No audio or blocking introduction is added.
- Selecting a planet follows a short lateral camera arc while its atmosphere, satellite, rings, or cloud bands react. Returning fades the chapter before the camera settles back into the universe.
- The project collection uses a keyboard-operable tab list and expandable engineering notes; all three case studies remain readable without JavaScript.

The Three.js chunk is approximately 138 kB compressed and is not requested on initial mobile visits. Vite may report its uncompressed size against its generic 500 kB warning threshold; the world is already split into an optional dynamic import.

## Validation

```sh
npm test
npm run format:check
npm run build
```

The Playwright suite uses an installed Chrome at `/usr/bin/google-chrome`. Set `CHROME_PATH` to a different Chromium executable on other machines. It covers chapter navigation, browser history, keyboard access, mobile behavior, responsive hit areas, reduced motion, no-JavaScript content, WebGL context loss, project tabs, progressive disclosure, interruptible transitions, cursor behavior, and axe WCAG A/AA checks. Interface tests block the optional scene request to remain independent of software-renderer speed; a dedicated test exercises the real WebGL renderer.

Automated accessibility checks supplement, rather than replace, manual keyboard and visual review.

In development only, `window.__worldDiagnostics()` reports render counts, draw calls, geometry/texture counts, quality level, and average CPU submission time. Submission time is not GPU time or a hardware benchmark. The scene exposes explicit resource disposal and releases buffers, textures, observers, listeners, and its renderer on a real page unload.

The local performance audit uses headless Chrome with SwiftShader, not a hardware GPU. The planetary scene keeps its surface maps at 256 × 128 and its shared glow texture at 64 × 64; it has no downloaded assets. Modal and index views stop rendering, and resource disposal releases scene geometry, materials, textures, observers, listeners, and the graphics context. Software frame delivery is expected to be poor, so the adaptive path reduces quality and then selects the usable CSS fallback. This is a fallback/lifecycle check, not evidence of hardware frame rate or GPU utilization.
