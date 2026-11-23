import * as T from 'three';

const postVertex = `
  varying vec2 screenUv;
  void main() {
    screenUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const postFragment = `
  uniform sampler2D sceneColor;
  uniform sampler2D sceneDepth;
  uniform vec2 inverseSize;
  uniform vec2 depthRange;
  uniform float focusDistance;
  uniform float blurRadius;
  uniform float shadowLift;
  varying vec2 screenUv;

  float viewDepth(vec2 uv) {
    float z = texture2D(sceneDepth, uv).x;
    return depthRange.x * depthRange.y / mix(depthRange.y, depthRange.x, z);
  }

  void main() {
    vec3 color = texture2D(sceneColor, screenUv).rgb;
    if (blurRadius > 0.0) {
      float depth = viewDepth(screenUv);
      float radius = min(1.0, abs(1.0 - focusDistance / depth)) * blurRadius;
      if (radius > 0.4) {
        vec3 result = color;
        float total = 1.0;
        for (int i = 0; i < 12; i++) {
          float angle = float(i) * 2.399963;
          float ring = sqrt((float(i) + 0.5) / 12.0);
          vec2 tap = screenUv + vec2(cos(angle), sin(angle)) * ring * radius * inverseSize;
          // Keep the color of sharp foreground objects from bleeding into the background.
          float delta = abs(viewDepth(tap) - depth);
          float weight = (1.0 - 0.45 * ring) * (1.0 - smoothstep(depth * 0.045, depth * 0.12, delta));
          result += texture2D(sceneColor, tap).rgb * weight;
          total += weight;
        }
        color = result / total;
      }
    }
    float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
    float lift = smoothstep(0.0, 0.065, luma) * (1.0 - smoothstep(0.015, 0.46, luma));
    gl_FragColor = vec4(color + shadowLift * lift, 1.0);
  }
`;

export function createCameraEffects(renderer, scene) {
  const bufferSize = new T.Vector2();
  const nearFar = new T.Vector2();
  const inverseSize = new T.Vector2();
  const depthMaterial = new T.MeshDepthMaterial({ side: T.DoubleSide });
  const withoutDepth = [];
  const screen = new T.Scene();
  const screenCamera = new T.Camera();
  const material = new T.ShaderMaterial({
    vertexShader: postVertex,
    fragmentShader: postFragment,
    uniforms: {
      sceneColor: { value: null }, sceneDepth: { value: null },
      inverseSize: { value: inverseSize }, depthRange: { value: nearFar },
      focusDistance: { value: 1 }, blurRadius: { value: 0 }, shadowLift: { value: 0 },
    },
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const quad = new T.Mesh(new T.PlaneGeometry(2, 2), material);
  quad.frustumCulled = false;
  screen.add(quad);
  let color;
  let depth;
  let width = 1;
  let height = 1;

  function resize(w, h, smoothing) {
    width = Math.max(1, w);
    height = Math.max(1, h);
    const ratio = smoothing === 'high'
      ? Math.min(2.25, Math.sqrt(4_200_000 / (width * height)))
      : Math.min(devicePixelRatio, 1.7);
    renderer.setDrawingBufferSize(width, height, ratio);
    // Layout mode also resizes the canvas element relative to the page.
    renderer.domElement.style.width = width + 'px';
    renderer.domElement.style.height = height + 'px';
    renderer.getDrawingBufferSize(bufferSize);
    if (color && (color.image.width !== bufferSize.x || color.image.height !== bufferSize.y)) {
      color.dispose();
      color = undefined;
    }
  }

  function renderDepth(camera) {
    const scale = Math.min(1, Math.sqrt(1_600_000 / (width * height)));
    const w = Math.max(1, Math.floor(width * scale));
    const h = Math.max(1, Math.floor(height * scale));
    if (!depth) {
      depth = new T.WebGLRenderTarget(w, h, { depthTexture: new T.DepthTexture(w, h, T.UnsignedIntType) });
    } else if (depth.width !== w || depth.height !== h) {
      depth.setSize(w, h);
    }
    scene.traverseVisible(object => {
      if (object.isMesh && object.material?.depthWrite === false) {
        withoutDepth.push(object);
        object.visible = false;
      }
    });
    const oldOverride = scene.overrideMaterial;
    const { autoUpdate, needsUpdate } = renderer.shadowMap;
    scene.overrideMaterial = depthMaterial;
    renderer.shadowMap.autoUpdate = renderer.shadowMap.needsUpdate = false;
    renderer.setRenderTarget(depth);
    try {
      renderer.render(scene, camera);
    } finally {
      renderer.setRenderTarget(null);
      renderer.shadowMap.autoUpdate = autoUpdate;
      renderer.shadowMap.needsUpdate = needsUpdate;
      scene.overrideMaterial = oldOverride;
      for (const object of withoutDepth) object.visible = true;
      withoutDepth.length = 0;
    }
  }

  function render(camera, { blur, shadows }, focusDistance) {
    renderer.render(scene, camera);
    if (!blur && !shadows) return;

    if (!color) {
      color = new T.FramebufferTexture(bufferSize.x, bufferSize.y);
      color.minFilter = color.magFilter = T.LinearFilter;
    }
    renderer.copyFramebufferToTexture(color);
    if (blur) renderDepth(camera);
    const uniforms = material.uniforms;
    uniforms.sceneColor.value = color;
    uniforms.sceneDepth.value = depth?.depthTexture ?? null;
    inverseSize.set(1 / width, 1 / height);
    nearFar.set(camera.near, camera.far);
    uniforms.focusDistance.value = focusDistance;
    uniforms.blurRadius.value = blur * .20;
    uniforms.shadowLift.value = shadows * .00055;
    renderer.render(screen, screenCamera);
  }

  return { resize, render };
}

