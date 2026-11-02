import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export interface FoxController {
  setPaused(paused: boolean): void;
  dispose(): void;
}

export function createFox(canvas: HTMLCanvasElement, onReady: () => void): FoxController {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  const environmentScene = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(environmentScene, 0.04);
  scene.environment = environment.texture;
  environmentScene.dispose();
  pmrem.dispose();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0, 6);
  scene.add(new THREE.HemisphereLight(0xffe2c0, 0x6b3a12, 1.1));
  const key = new THREE.DirectionalLight(0xffc98a, 2.2);
  key.position.set(-3, 4, 3);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffa24d, 1.6);
  rim.position.set(3, 2, -3);
  scene.add(rim);
  const pivot = new THREE.Group();
  scene.add(pivot);
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let destroyed = false;
  let paused = false;
  let loaded = false;
  let baseX = 0;
  let baseY = 0;
  const target = new THREE.Vector2();
  const look = new THREE.Vector2();

  function layout(): void {
    const { width, height } = canvas.getBoundingClientRect();
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    const mobile = width < 720;
    baseX = mobile ? 0 : Math.min(1, camera.aspect * 0.55);
    baseY = mobile ? 0.5 : -0.05;
    pivot.scale.setScalar(
      mobile ? Math.min(0.65, camera.aspect * 1.05) : Math.min(0.78, camera.aspect / 2.1),
    );
    draw(0);
  }

  function draw(milliseconds: number): void {
    if (destroyed || !loaded) return;
    const t = motion.matches ? 0 : milliseconds / 1000;
    look.lerp(target, 0.04);
    pivot.position.set(
      baseX + look.x * 0.06,
      baseY + (motion.matches ? 0 : Math.sin(t * 2.2) * 0.07),
      0,
    );
    pivot.rotation.set(
      motion.matches ? 0 : look.y * 0.08,
      motion.matches ? 0 : look.x * 0.18 + Math.sin(t * 0.9) * 0.04,
      motion.matches ? 0 : Math.sin(t * 2.2 + 0.6) * 0.02,
    );
    renderer.render(scene, camera);
  }

  function updateLoop(): void {
    renderer.setAnimationLoop(null);
    if (destroyed || !loaded) return;
    if (!paused && !document.hidden && !motion.matches) renderer.setAnimationLoop(draw);
    else draw(0);
  }

  function pointer(event: PointerEvent): void {
    if (motion.matches || event.pointerType === 'touch') return;
    target.set(
      (event.clientX / window.innerWidth) * 2 - 1,
      (event.clientY / window.innerHeight) * 2 - 1,
    );
  }

  function release(root: THREE.Object3D): void {
    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        for (const value of Object.values(material)) {
          if (value instanceof THREE.Texture) value.dispose();
        }
        material.dispose();
      }
    });
  }

  new GLTFLoader().load(
    '/login/fox.glb',
    (gltf) => {
      if (destroyed) {
        release(gltf.scene);
        return;
      }
      const bounds = new THREE.Box3().setFromObject(gltf.scene);
      const center = bounds.getCenter(new THREE.Vector3());
      const size = bounds.getSize(new THREE.Vector3());
      gltf.scene.position.sub(center);
      const holder = new THREE.Group();
      holder.scale.setScalar(3.15 / Math.max(size.x, size.y, size.z));
      holder.add(gltf.scene);
      pivot.add(holder);
      loaded = true;
      layout();
      onReady();
      updateLoop();
    },
    undefined,
    () => {
      /* Keep the static fallback when loading fails. */
    },
  );

  const resize = new ResizeObserver(layout);
  resize.observe(canvas);
  window.addEventListener('pointermove', pointer, { passive: true });
  document.addEventListener('visibilitychange', updateLoop);
  motion.addEventListener('change', updateLoop);
  layout();

  return {
    setPaused(value) {
      paused = value;
      updateLoop();
    },
    dispose() {
      destroyed = true;
      renderer.setAnimationLoop(null);
      resize.disconnect();
      window.removeEventListener('pointermove', pointer);
      document.removeEventListener('visibilitychange', updateLoop);
      motion.removeEventListener('change', updateLoop);
      release(pivot);
      environment.dispose();
      renderer.dispose();
    },
  };
}
