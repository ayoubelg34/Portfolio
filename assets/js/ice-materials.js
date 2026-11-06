import * as THREE from "three";

const sunDirection = new THREE.Vector3(-6, 5, 9).normalize();

const surfaceVertex = `
  varying vec3 vLocal;
  varying vec3 vNormalWorld;
  varying vec3 vWorldPosition;
  void main() {
    vLocal = normalize(position);
    vNormalWorld = normalize(mat3(modelMatrix) * normal);
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldPosition = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const noiseFunctions = `
  float hash31(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.yzx + 33.33);
    return fract((p.x + p.y) * p.z);
  }
  float noise3(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash31(i), hash31(i + vec3(1,0,0)), f.x),
          mix(hash31(i + vec3(0,1,0)), hash31(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(hash31(i + vec3(0,0,1)), hash31(i + vec3(1,0,1)), f.x),
          mix(hash31(i + vec3(0,1,1)), hash31(i + vec3(1,1,1)), f.x), f.y),
      f.z
    );
  }
  float fbm(vec3 p) {
    float value = 0.0;
    float amplitude = 0.5;
    mat3 rotation = mat3(.00, .80, .60, -.80, .36, -.48, -.60, -.48, .64);
    for (int i = 0; i < 4; i++) {
      value += amplitude * noise3(p);
      p = rotation * p * 2.03 + 7.1;
      amplitude *= 0.5;
    }
    return value;
  }
`;

const surfaceFragment = `
  uniform float uKind;
  uniform vec3 uSunDirection;
  uniform float uTime;
  varying vec3 vLocal;
  varying vec3 vNormalWorld;
  varying vec3 vWorldPosition;
  ${noiseFunctions}

  void main() {
    vec3 p = normalize(vLocal);
    vec3 n = normalize(vNormalWorld);
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    vec3 halfDirection = normalize(uSunDirection + viewDirection);
    float solar = dot(n, uSunDirection);
    float light = mix(0.055, 1.0, smoothstep(-0.22, 0.72, solar));
    float fineNoise = fbm(p * 11.0);
    vec3 color = vec3(0.1);
    vec3 emission = vec3(0.0);
    float specularStrength = 0.0;
    float specularPower = 36.0;

    if (uKind < 0.5) {
      float continents = fbm(p * 2.75 + vec3(1.8, 3.1, 0.4));
      float coast = smoothstep(0.49, 0.60, continents + fineNoise * 0.08);
      vec3 ocean = mix(vec3(0.012, 0.075, 0.145), vec3(0.025, 0.31, 0.48), fineNoise);
      vec3 land = mix(vec3(0.055, 0.20, 0.17), vec3(0.36, 0.48, 0.31), fbm(p * 6.0));
      float ice = smoothstep(0.72, 0.93, abs(p.y) + fineNoise * 0.18);
      color = mix(ocean, land, coast);
      color = mix(color, vec3(0.72, 0.84, 0.82), ice);
      specularStrength = (1.0 - coast) * 0.42;
      specularPower = 70.0;
    } else if (uKind < 1.5) {
      float rock = fbm(p * 4.1 + vec3(2.4, 0.2, 5.7));
      float region = smoothstep(0.49, 0.74, fbm(p * 2.0 - vec3(3.2, 1.0, 0.5)));
      float faultNoise = fbm(p * 8.5 + vec3(0.0, 0.0, 4.0));
      float fissure = 1.0 - smoothstep(0.025, 0.12, abs(faultNoise - 0.53));
      float lava = fissure * region;
      color = mix(vec3(0.035, 0.015, 0.018), vec3(0.25, 0.085, 0.055), rock);
      color = mix(color, vec3(0.72, 0.16, 0.045), lava * 0.52);
      emission = vec3(1.0, 0.12, 0.018) * lava * (0.35 + 0.65 * fineNoise);
      specularStrength = 0.08;
      specularPower = 22.0;
    } else if (uKind < 2.5) {
      float terrain = fbm(p * 4.4 + vec3(4.0, 2.0, 1.0));
      vec3 cells = abs(fract((p + fineNoise * 0.025) * 6.2) - 0.5);
      float seam = 1.0 - smoothstep(0.025, 0.085, min(cells.x, min(cells.y, cells.z)));
      float structure = seam * smoothstep(0.42, 0.7, terrain);
      color = mix(vec3(0.018, 0.055, 0.075), vec3(0.045, 0.28, 0.31), terrain);
      color += vec3(0.08, 0.52, 0.44) * structure * 0.45;
      emission = vec3(0.03, 0.34, 0.29) * structure * 0.22;
      specularStrength = 0.32 + terrain * 0.18;
      specularPower = 54.0;
    } else if (uKind < 3.5) {
      float turbulence = fbm(p * 5.5 + vec3(0.0, uTime * 0.008, 0.0));
      float latitude = asin(clamp(p.y, -1.0, 1.0));
      float bands = sin(latitude * 25.0 + turbulence * 4.8) * 0.5 + 0.5;
      vec3 violet = vec3(0.11, 0.075, 0.19);
      vec3 rose = vec3(0.48, 0.25, 0.38);
      vec3 sand = vec3(0.69, 0.46, 0.39);
      color = mix(violet, rose, smoothstep(0.2, 0.72, bands));
      color = mix(color, sand, smoothstep(0.79, 0.96, bands + turbulence * 0.12));
      float stormDistance = distance(p, normalize(vec3(0.48, -0.22, 0.85)));
      float storm = 1.0 - smoothstep(0.13, 0.45, stormDistance);
      float stormEye = 1.0 - smoothstep(0.035, 0.13, stormDistance);
      color = mix(color, vec3(0.58, 0.19, 0.22), storm * 0.78);
      color = mix(color, vec3(0.94, 0.69, 0.54), stormEye * 0.82);
      specularStrength = 0.12;
      specularPower = 32.0;
    } else {
      float terrain = fbm(p * 4.8 - vec3(1.0, 2.0, uTime * 0.006));
      float energy = smoothstep(0.72, 0.88, terrain + fineNoise * 0.18);
      color = mix(vec3(0.016, 0.012, 0.07), vec3(0.17, 0.07, 0.33), terrain);
      emission = vec3(0.34, 0.14, 0.76) * energy * 0.7;
      specularStrength = 0.28;
      specularPower = 48.0;
    }

    float specular = pow(max(dot(n, halfDirection), 0.0), specularPower) * specularStrength * smoothstep(-0.05, 0.35, solar);
    vec3 finalColor = color * light + emission + vec3(1.0, 0.88, 0.72) * specular;
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

const atmosphereVertex = `
  varying vec3 vNormalWorld;
  varying vec3 vWorldPosition;
  void main() {
    vNormalWorld = normalize(mat3(modelMatrix) * normal);
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldPosition = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const atmosphereFragment = `
  uniform vec3 uColor;
  uniform vec3 uSunDirection;
  uniform float uStrength;
  varying vec3 vNormalWorld;
  varying vec3 vWorldPosition;
  void main() {
    vec3 n = normalize(vNormalWorld);
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    float fresnel = pow(1.0 - max(dot(n, viewDirection), 0.0), 3.3);
    float sunlight = 0.12 + 0.88 * smoothstep(-0.26, 0.58, dot(n, uSunDirection));
    float alpha = fresnel * sunlight * uStrength;
    gl_FragColor = vec4(uColor * (0.66 + sunlight * 0.42), alpha);
  }
`;

const cloudFragment = `
  uniform float uKind;
  uniform float uTime;
  uniform vec3 uSunDirection;
  varying vec3 vLocal;
  varying vec3 vNormalWorld;
  ${noiseFunctions}
  void main() {
    vec3 p = normalize(vLocal);
    float solar = 0.15 + 0.85 * smoothstep(-0.25, 0.62, dot(normalize(vNormalWorld), uSunDirection));
    float density;
    vec3 color;
    if (uKind < 0.5) {
      float broad = fbm(p * 4.4 + vec3(uTime * 0.012, 0.0, -uTime * 0.005));
      float wisps = fbm(p * 10.0 - vec3(uTime * 0.018, 0.0, 0.0));
      density = smoothstep(0.61, 0.76, broad * 0.74 + wisps * 0.26);
      color = vec3(0.77, 0.9, 0.95);
    } else {
      float turbulence = fbm(p * 7.0 + vec3(uTime * 0.008, 0.0, 2.0));
      float bands = sin(asin(clamp(p.y, -1.0, 1.0)) * 34.0 + turbulence * 5.0) * 0.5 + 0.5;
      density = smoothstep(0.55, 0.82, bands);
      color = mix(vec3(0.55, 0.42, 0.66), vec3(0.92, 0.66, 0.57), turbulence);
    }
    gl_FragColor = vec4(color * solar, density * (uKind < 0.5 ? 0.34 : 0.22));
  }
`;

const ringVertex = `
  varying float vRadius;
  varying vec3 vNormalWorld;
  void main() {
    vRadius = length(position.xy);
    vNormalWorld = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ringFragment = `
  uniform vec3 uSunDirection;
  varying float vRadius;
  varying vec3 vNormalWorld;
  void main() {
    float edge = smoothstep(1.18, 1.23, vRadius) * (1.0 - smoothstep(1.64, 1.7, vRadius));
    float wide = sin(vRadius * 41.0) * 0.5 + 0.5;
    float fine = sin(vRadius * 137.0 + wide * 1.7) * 0.5 + 0.5;
    float bands = smoothstep(0.2, 0.86, wide * 0.68 + fine * 0.32);
    float solar = 0.18 + 0.82 * abs(dot(normalize(vNormalWorld), uSunDirection));
    vec3 dust = mix(vec3(0.12, 0.055, 0.045), vec3(0.46, 0.25, 0.19), bands);
    float alpha = edge * (0.12 + bands * 0.4);
    gl_FragColor = vec4(dust * solar, alpha);
  }
`;

function surface(kind) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uKind: { value: kind },
      uSunDirection: { value: sunDirection.clone() },
      uTime: { value: 0 },
    },
    vertexShader: surfaceVertex,
    fragmentShader: surfaceFragment,
  });
}

function atmosphere(color, strength) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uSunDirection: { value: sunDirection.clone() },
      uStrength: { value: strength },
    },
    vertexShader: atmosphereVertex,
    fragmentShader: atmosphereFragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
  });
}

function clouds(kind) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uKind: { value: kind },
      uTime: { value: 0 },
      uSunDirection: { value: sunDirection.clone() },
    },
    vertexShader: surfaceVertex,
    fragmentShader: cloudFragment,
    transparent: true,
    depthWrite: false,
  });
}

/** Coherent solar lighting and layered shaders turn low-cost spheres into distinct worlds. */
export function createPlanetMaterials() {
  const ids = ["about", "projects", "skills", "education", "contact"];
  const surfaces = Object.fromEntries(
    ids.map((id, kind) => [id, surface(kind)]),
  );
  const atmospheres = {
    about: atmosphere(0x52b9ff, 0.7),
    projects: atmosphere(0xff6038, 0.48),
    skills: atmosphere(0x72e6da, 0.42),
    education: atmosphere(0xb27acb, 0.48),
    contact: atmosphere(0x9774ff, 0.92),
  };
  const cloudLayers = { about: clouds(0), education: clouds(1) };
  const orbit = new THREE.LineBasicMaterial({
    color: 0x96b9dc,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
  });
  const ring = new THREE.ShaderMaterial({
    uniforms: { uSunDirection: { value: sunDirection.clone() } },
    vertexShader: ringVertex,
    fragmentShader: ringFragment,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const dynamic = [...Object.values(surfaces), ...Object.values(cloudLayers)];
  return {
    surfaces,
    atmospheres,
    clouds: cloudLayers,
    orbit,
    ring,
    update(time) {
      dynamic.forEach((material) => {
        material.uniforms.uTime.value = time;
      });
    },
    dispose() {},
  };
}
