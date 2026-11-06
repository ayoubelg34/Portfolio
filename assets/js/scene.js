import * as THREE from "three";
import { createPlanetMaterials } from "./ice-materials.js";
import { createSculpture } from "./sculptures.js";

const HOME_Z = 18;
const DEPTH = {
  about: 0.3,
  projects: 2.8,
  skills: -4.8,
  education: -1.2,
  contact: -1.8,
};
const FOCUS = {
  about: { distance: 6.2, look: [-1, 0.1, 0] },
  projects: { distance: 7.2, look: [-1.25, 0.08, 0] },
  skills: { distance: 4.3, look: [-0.68, 0.04, 0] },
  education: { distance: 9.2, look: [-1.6, -0.35, 0] },
  contact: { distance: 3.7, look: [-0.42, 0.05, 0] },
};
const smooth = (value) =>
  value < 0.5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2;

export function createWorld(container) {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "low-power",
  });
  let pixelRatio = Math.min(devicePixelRatio, 1.5);
  renderer.setPixelRatio(pixelRatio);
  renderer.setClearColor(0x000000, 0);
  renderer.transmissionResolutionScale = 0.5;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  container.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 70);
  camera.position.set(0, 0, HOME_Z);
  const materials = createPlanetMaterials();
  scene.fog = new THREE.FogExp2(0x020611, 0.014);
  scene.add(new THREE.HemisphereLight(0x566eab, 0x02030b, 0.28));
  const key = new THREE.DirectionalLight(0xffead3, 3.2);
  key.position.set(-6, 5, 9);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x547bd0, 1.8);
  rim.position.set(6, 2, -6);
  scene.add(rim);
  const cursorLight = new THREE.PointLight(0xb6ebff, 2.8, 18, 2);
  cursorLight.position.set(0, 2, 5);
  scene.add(cursorLight);
  const pieces = [];
  const listeners = [];
  const listen = (target, type, handler, options) => {
    target.addEventListener(type, handler, options);
    listeners.push(() => target.removeEventListener(type, handler, options));
  };
  let paused = false,
    visible = true,
    onScreen = true,
    lost = false,
    disposed = false,
    selected = null;
  let frame = 0,
    lastTime = 0,
    elapsed = 0,
    frames = 0,
    slowFrames = 0,
    quality = "full",
    frameCost = 0;
  let transition = null,
    focusAmount = 0;
  const pointer = new THREE.Vector2(),
    drift = new THREE.Vector2();
  const look = new THREE.Vector3(),
    temp = new THREE.Vector3();
  const cameraHome = new THREE.Vector3(0, 0, HOME_Z);
  const stageRect = { left: 0, top: 0, width: 1, height: 1 };
  let pendingDraw = true;

  for (const portal of document.querySelectorAll("[data-object]")) {
    const sculpture = createSculpture(portal.dataset.object, materials);
    const pivot = new THREE.Group();
    pivot.add(sculpture.group);
    scene.add(pivot);
    const piece = {
      ...sculpture,
      id: portal.dataset.object,
      portal,
      art: portal.querySelector(".object-art"),
      pivot,
      origin: new THREE.Vector3(),
      scale: 1,
      hover: 0,
      targetHover: 0,
    };
    pieces.push(piece);
    const enter = () => {
      piece.targetHover = 1;
      requestRender();
    };
    const leave = () => {
      piece.targetHover = 0;
      requestRender();
    };
    listen(portal, "pointerenter", enter);
    listen(portal, "pointerleave", leave);
    listen(portal, "focus", enter);
    listen(portal, "blur", leave);
  }

  // A single tiny texture supplies star glints, distant haze and atmospheric coronas.
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const context = canvas.getContext("2d");
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "rgba(255,250,235,.95)");
  gradient.addColorStop(0.12, "rgba(162,196,255,.72)");
  gradient.addColorStop(0.45, "rgba(71,104,210,.14)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  const haloTexture = new THREE.CanvasTexture(canvas);
  const haloMaterial = new THREE.SpriteMaterial({
    map: haloTexture,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  pieces.forEach((piece) => {
    const halo = new THREE.Sprite(haloMaterial.clone());
    scene.add(halo);
    piece.halo = halo;
  });

  const sun = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: haloTexture,
      color: 0xffe1b5,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  sun.position.set(-8.6, 5.2, -5.5);
  sun.scale.setScalar(2.1);
  scene.add(sun);

  let seed = 18;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const dustPositions = new Float32Array(260 * 3);
  for (let i = 0; i < 260; i++) {
    dustPositions[i * 3] = (random() - 0.5) * 25;
    dustPositions[i * 3 + 1] = (random() - 0.5) * 14;
    dustPositions[i * 3 + 2] = -8 - random() * 18;
  }
  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(dustPositions, 3),
  );
  const dust = new THREE.Points(
    dustGeometry,
    new THREE.PointsMaterial({
      map: haloTexture,
      size: 0.07,
      color: 0xd8e6ff,
      transparent: true,
      opacity: 0.58,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  scene.add(dust);
  const nearStarPositions = new Float32Array(68 * 3);
  for (let i = 0; i < 68; i++) {
    nearStarPositions[i * 3] = (random() - 0.5) * 19;
    nearStarPositions[i * 3 + 1] = (random() - 0.5) * 10;
    nearStarPositions[i * 3 + 2] = -2 - random() * 8;
  }
  const nearStars = new THREE.Points(
    new THREE.BufferGeometry().setAttribute(
      "position",
      new THREE.BufferAttribute(nearStarPositions, 3),
    ),
    new THREE.PointsMaterial({
      map: haloTexture,
      size: 0.12,
      color: 0x9db6ff,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  scene.add(nearStars);
  const haze = new THREE.Group();
  for (const [position, color, scale] of [
    [[-5.5, -0.8, -9], 0x293e97, 5.6],
    [[5.6, 2.9, -11], 0x783664, 4.4],
    [[1, -4.2, -10], 0x194e6e, 5.3],
  ]) {
    const cloud = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: haloTexture,
        color,
        transparent: true,
        opacity: 0.13,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    cloud.position.set(...position);
    cloud.scale.set(scale * 1.65, scale, 1);
    haze.add(cloud);
  }
  scene.add(haze);

  function resize() {
    const rect = container.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    Object.assign(stageRect, {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    });
    renderer.setSize(rect.width, rect.height, false);
    camera.aspect = rect.width / rect.height;
    camera.updateProjectionMatrix();
    for (const piece of pieces) {
      const box = piece.art.getBoundingClientRect();
      const z = DEPTH[piece.id];
      const worldHeight =
        2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * (HOME_Z - z);
      const unitsPerPixel = worldHeight / rect.height;
      piece.origin.set(
        (box.left + box.width / 2 - rect.left - rect.width / 2) * unitsPerPixel,
        -(box.top + box.height / 2 - rect.top - rect.height / 2) *
          unitsPerPixel,
        z,
      );
      piece.scale =
        (box.width * unitsPerPixel) / (piece.id === "projects" ? 2.12 : 1.86);
      piece.halo.position.copy(piece.origin);
      piece.halo.position.z -= 0.35;
      piece.halo.scale.setScalar(piece.scale * 2.9);
      piece.haloBaseOpacity =
        { about: 0.08, projects: 0.26, skills: 0.025, education: 0.07 }[
          piece.id
        ] || 0.16;
      piece.halo.material.opacity = piece.haloBaseOpacity;
      if (piece.id === "contact") {
        piece.halo.position.copy(piece.origin);
        piece.halo.position.z -= 0.3;
        piece.halo.scale.setScalar(piece.scale * 3.4);
        piece.halo.material.opacity = piece.haloBaseOpacity;
      }
    }
    requestRender();
  }

  function render(now, delta = 0, snap = false, deliveredMs = 0) {
    const started = performance.now();
    const ease = snap ? 1 : 1 - Math.exp(-delta * 7);
    if (!paused) elapsed += delta;
    materials.update(elapsed);
    drift.lerp(paused ? temp.set(0, 0, 0) : pointer, ease * 0.6);
    if (transition) {
      const raw = Math.min(1, (now - transition.start) / transition.duration);
      const progress = smooth(raw);
      camera.position.lerpVectors(transition.from, transition.to, progress);
      // A brief lateral arc and a shifting look target make this a move through space, not a zoom.
      camera.position.x += Math.sin(raw * Math.PI) * transition.arc;
      camera.position.y += Math.sin(raw * Math.PI) * 0.18;
      look.lerpVectors(transition.lookFrom, transition.lookTo, progress);
      focusAmount = THREE.MathUtils.lerp(
        transition.focusFrom,
        selected ? 1 : 0,
        progress,
      );
      if (raw === 1) transition = null;
    } else if (!selected) {
      camera.position.x = THREE.MathUtils.lerp(
        camera.position.x,
        drift.x * 0.22,
        ease * 0.28,
      );
      camera.position.y = THREE.MathUtils.lerp(
        camera.position.y,
        -drift.y * 0.14,
        ease * 0.28,
      );
      camera.position.z = HOME_Z;
      look.set(drift.x * 0.07, -drift.y * 0.045, 0);
    }
    camera.lookAt(look);
    for (const [i, piece] of pieces.entries()) {
      piece.hover = THREE.MathUtils.lerp(piece.hover, piece.targetHover, ease);
      const amount = selected === piece.id ? focusAmount : 0;
      piece.pivot.position.copy(piece.origin);
      piece.pivot.position.y +=
        (paused ? 0 : Math.sin(elapsed * 0.43 + i * 1.7) * 0.035) +
        piece.hover * 0.04;
      piece.pivot.position.x += drift.x * (0.09 + (piece.origin.z + 5) * 0.018);
      piece.pivot.scale.setScalar(piece.scale * (1 + piece.hover * 0.035));
      piece.group.rotation.set(
        piece.rotation.x +
          (paused ? 0 : Math.sin(elapsed * 0.2 + i) * 0.025) +
          piece.hover * 0.07,
        piece.rotation.y +
          (paused ? 0 : elapsed * (piece.id === "projects" ? 0.065 : 0.032)) +
          drift.x * 0.08 +
          piece.hover * 0.16 +
          amount * 0.4,
        piece.rotation.z + drift.y * 0.025,
      );
      for (const part of piece.parts) {
        part.part.position
          .copy(part.position)
          .multiplyScalar(
            1 + (part.spread || 0) * (amount + piece.hover * 0.08),
          );
        part.part.position.y += (part.rise || 0) * amount;
        part.part.rotation.copy(part.rotation);
        part.part.rotation.y +=
          (paused ? 0 : elapsed * (part.spin || 0)) +
          (part.twist || 0) * (amount + piece.hover * 0.18);
        if (part.childSpin)
          part.part.children[0].rotation.y = paused
            ? 0
            : elapsed * part.childSpin;
      }
      piece.halo.material.opacity =
        piece.haloBaseOpacity + piece.hover * 0.11 + amount * 0.1;
    }
    cursorLight.position.set(drift.x * 6, drift.y * -4 + 1.5, 5);
    cursorLight.intensity = 2.8 + focusAmount * 3;
    key.intensity = 3.2 + focusAmount * 0.7;
    dust.position.x = drift.x * 0.18;
    dust.position.y = paused ? 0 : Math.sin(elapsed * 0.11) * 0.1;
    dust.rotation.y = drift.x * 0.018 + (paused ? 0 : elapsed * 0.002);
    nearStars.rotation.y = drift.x * 0.035 + (paused ? 0 : elapsed * 0.003);
    haze.position.x = drift.x * 0.08;
    renderer.render(scene, camera);
    frames++;
    const cost = performance.now() - started;
    frameCost = frameCost * 0.9 + cost * 0.1;
    // GPU work is asynchronous: delivered frame intervals catch stalls that
    // CPU submission timing misses. Ignore startup, paused frames and camera moves.
    if ((cost > 42 || deliveredMs > 90) && frames > 5 && !paused && !transition)
      slowFrames++;
    else slowFrames = Math.max(0, slowFrames - 1);
    if (slowFrames > 8 && quality === "full") {
      quality = "balanced";
      pixelRatio = Math.min(pixelRatio, 1);
      renderer.setPixelRatio(pixelRatio);
      renderer.transmissionResolutionScale = 0.35;
      slowFrames = 0;
    }
    if (slowFrames > 10 && quality === "balanced") {
      quality = "economy";
      renderer.setPixelRatio(0.75);
      slowFrames = 0;
    }
    if (slowFrames > 10 && quality === "economy") {
      quality = "lightweight";
      dispose();
    }
    pendingDraw = false;
  }
  function canRender() {
    return visible && onScreen && !document.hidden && !lost && !disposed;
  }
  function tick(now) {
    frame = 0;
    if (!canRender()) return;
    const step = quality === "economy" ? 48 : 32;
    if (pendingDraw || now - lastTime >= step) {
      render(
        now,
        Math.min((now - lastTime) / 1000 || 0.033, 0.08),
        paused,
        lastTime ? now - lastTime : 0,
      );
      lastTime = now;
    }
    if (canRender() && (!paused || transition))
      frame = requestAnimationFrame(tick);
  }
  function requestRender() {
    pendingDraw = true;
    if (canRender() && !frame) frame = requestAnimationFrame(tick);
  }
  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
  }
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  const visibility = new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    if (onScreen) requestRender();
    else stop();
  });
  visibility.observe(container);
  listen(document, "visibilitychange", () => {
    if (document.hidden) stop();
    else requestRender();
  });
  listen(
    container.parentElement,
    "pointermove",
    (event) => {
      if (paused || event.pointerType === "touch") return;
      const box = container.getBoundingClientRect();
      pointer.set(
        (event.clientX - box.left) / box.width - 0.5,
        (event.clientY - box.top) / box.height - 0.5,
      );
    },
    { passive: true },
  );
  listen(container.parentElement, "pointerleave", () => pointer.set(0, 0));
  listen(renderer.domElement, "webglcontextlost", (event) => {
    event.preventDefault();
    lost = true;
    stop();
    document.documentElement.classList.remove("webgl-ready");
  });
  listen(renderer.domElement, "webglcontextrestored", () => {
    lost = false;
    resize();
    requestRender();
    document.documentElement.classList.add("webgl-ready");
  });
  function dispose() {
    if (disposed) return;
    disposed = true;
    stop();
    observer.disconnect();
    visibility.disconnect();
    listeners.forEach((remove) => remove());
    const geometries = new Set(),
      mats = new Set();
    scene.traverse((object) => {
      if (object.geometry) geometries.add(object.geometry);
      if (object.material) mats.add(object.material);
    });
    geometries.forEach((geometry) => geometry.dispose());
    mats.forEach((material) => material.dispose());
    materials.dispose();
    haloTexture.dispose();
    renderer.dispose();
    // Also release renderer-owned transmission buffers on permanent teardown.
    renderer.forceContextLoss();
    renderer.domElement.remove();
    document.documentElement.classList.remove("webgl-ready");
  }
  resize();
  render(performance.now(), 0, true);
  document.documentElement.classList.add("webgl-ready");
  requestRender();
  return {
    resize,
    focus(id, { instant = false } = {}) {
      if (selected === id) return;
      selected = id;
      const chosen = pieces.find((piece) => piece.id === id);
      const profile = FOCUS[id];
      const to = chosen
        ? chosen.origin
            .clone()
            .add(new THREE.Vector3(0.2, 0.15, profile.distance))
        : cameraHome.clone();
      const lookTo = chosen
        ? chosen.origin.clone().add(new THREE.Vector3(...profile.look))
        : new THREE.Vector3();
      if (paused || instant) {
        camera.position.copy(to);
        look.copy(lookTo);
        focusAmount = id ? 1 : 0;
        transition = null;
      } else
        transition = {
          start: performance.now(),
          duration: id ? 780 : 680,
          from: camera.position.clone(),
          to,
          lookFrom: look.clone(),
          lookTo,
          arc: id ? -1.05 : 0.72,
          focusFrom: focusAmount,
        };
      requestRender();
    },
    setPaused(value) {
      if (paused === value) return;
      paused = value;
      if (paused && transition) {
        camera.position.copy(transition.to);
        look.copy(transition.lookTo);
        focusAmount = selected ? 1 : 0;
        transition = null;
      }
      stop();
      requestRender();
    },
    setVisible(value) {
      if (visible === value) return;
      visible = value;
      if (value) {
        resize();
        requestRender();
      } else stop();
    },
    getDiagnostics() {
      return {
        frames,
        quality,
        pixelRatio: renderer.getPixelRatio(),
        drawCalls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
        averageSubmissionMs: Math.round(frameCost * 100) / 100,
        animating: Boolean(frame),
        visible,
        paused,
        camera: camera.position.toArray(),
        lookAt: look.toArray(),
        transitioning: Boolean(transition),
      };
    },
    dispose,
  };
}
