import * as THREE from "three";

const sphereGeometry = new THREE.SphereGeometry(1, 48, 32);
const smallSphere = new THREE.SphereGeometry(1, 24, 16);

function orbitLine(radius, material, tilt = 0) {
  const points = Array.from({ length: 100 }, (_, index) => {
    const angle = (index / 99) * Math.PI * 2;
    return new THREE.Vector3(
      Math.cos(angle) * radius,
      0,
      Math.sin(angle) * radius,
    );
  });
  const line = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(points),
    material,
  );
  line.rotation.set(tilt, 0.18, -0.2);
  return line;
}

function planetPart(
  group,
  object,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  motion = {},
) {
  const part = new THREE.Group();
  part.position.set(...position);
  part.rotation.set(...rotation);
  part.add(object);
  group.add(part);
  return {
    part,
    position: part.position.clone(),
    rotation: part.rotation.clone(),
    ...motion,
  };
}

/** Five individual worlds, all based on actual spherical geometry and local procedural maps. */
export function createSculpture(id, materials) {
  const group = new THREE.Group();
  const parts = [];
  const surface = new THREE.Mesh(sphereGeometry, materials.surfaces[id]);
  surface.castShadow = false;
  surface.receiveShadow = false;
  group.add(surface);

  const atmosphere = new THREE.Mesh(sphereGeometry, materials.atmospheres[id]);
  atmosphere.scale.setScalar(id === "projects" ? 1.105 : 1.075);
  group.add(atmosphere);

  if (id === "about") {
    // A second sphere carries translucent weather independently over the surface.
    const clouds = new THREE.Mesh(sphereGeometry, materials.clouds.about);
    clouds.scale.setScalar(1.018);
    parts.push(
      planetPart(group, clouds, [0, 0, 0], [0, 0, 0], { spin: 0.018 }),
    );
    group.rotation.set(0.12, -0.5, 0.1);
  }

  if (id === "projects") {
    // A broad, quiet ring and orbiting survey moon frame the volcanic world.
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.18, 1.7, 128),
      materials.ring,
    );
    ring.rotation.set(1.06, -0.25, 0.16);
    parts.push(planetPart(group, ring, [0, 0, 0], [0, 0, 0], { spin: 0.008 }));
    const moon = new THREE.Mesh(smallSphere, materials.surfaces.contact);
    moon.scale.setScalar(0.16);
    moon.position.set(1.55, 0.45, -0.18);
    const moonOrbit = new THREE.Group();
    moonOrbit.add(moon);
    parts.push(
      planetPart(group, moonOrbit, [0, 0, 0], [0, 0, 0], {
        spin: 0.17,
        childSpin: 0.08,
        twist: 0.26,
      }),
    );
    const flare = new THREE.PointLight(0xff7043, 1.1, 3.2);
    flare.position.set(0.3, 0.2, 1.2);
    group.add(flare);
    group.rotation.set(0.08, -0.38, -0.12);
  }

  if (id === "skills") {
    // Machine-like latitude arcs signal a constructed rather than natural body.
    for (const [radius, tilt] of [
      [1.13, 0],
      [1.22, 0.65],
    ]) {
      const arc = orbitLine(radius, materials.orbit, tilt);
      parts.push(planetPart(group, arc, [0, 0, 0], [0, 0, 0], { twist: 0.16 }));
    }
    group.rotation.set(-0.25, 0.4, 0.15);
  }

  if (id === "education") {
    const clouds = new THREE.Mesh(sphereGeometry, materials.clouds.education);
    clouds.scale.setScalar(1.018);
    parts.push(
      planetPart(group, clouds, [0, 0, 0], [0, 0, 0], { spin: 0.012 }),
    );
    group.rotation.set(-0.08, 0.15, -0.18);
  }

  if (id === "contact") {
    const halo = orbitLine(1.36, materials.orbit, 0.78);
    parts.push(planetPart(group, halo, [0, 0, 0], [0, 0, 0], { twist: -0.17 }));
    const satellite = new THREE.Mesh(smallSphere, materials.surfaces.about);
    satellite.scale.setScalar(0.105);
    satellite.position.set(-1.15, 0.48, 0.1);
    const satelliteOrbit = new THREE.Group();
    satelliteOrbit.add(satellite);
    parts.push(
      planetPart(group, satelliteOrbit, [0, 0, 0], [0, 0, 0], {
        spin: -0.13,
        childSpin: 0.04,
        twist: -0.22,
      }),
    );
    const glow = new THREE.PointLight(0xbca6ff, 1.2, 3.4);
    glow.position.set(-0.2, 0.2, 1.3);
    group.add(glow);
    group.rotation.set(0.16, -0.25, 0.18);
  }

  return { group, parts, rotation: group.rotation.clone() };
}
