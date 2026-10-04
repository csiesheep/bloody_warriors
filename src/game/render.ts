import * as THREE from 'three';
import { config } from './config.ts';

export interface View {
  resize(): void;
  place(x: number, z: number, facing: number): void;
  aimAt(sx: number, sy: number, px: number, pz: number): number;
  render(): void;
}

export function createScene(canvas: HTMLCanvasElement): View {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9db8d2);
  scene.fog = new THREE.Fog(0x9db8d2, 60, 150);

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 300);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x55663f, 1.1));
  const sun = new THREE.DirectionalLight(0xfff2cc, 1.6);
  sun.position.set(18, 28, 12);
  scene.add(sun);

  const size = config.bounds * 2;

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(size * 1.6, size * 1.6),
    new THREE.MeshLambertMaterial({ color: 0x7a9a4e })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const border = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.PlaneGeometry(size, size)),
    new THREE.LineBasicMaterial({ color: 0x3d4a5c })
  );
  border.rotation.x = -Math.PI / 2;
  border.position.y = 0.03;
  scene.add(border);

  const player = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.35, 0.9, 4, 12),
    new THREE.MeshLambertMaterial({ color: 0xbfc6d4 })
  );
  body.position.y = 1.0;
  player.add(body);
  const spear = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, 3.2, 6),
    new THREE.MeshLambertMaterial({ color: 0xd8dee8 })
  );
  spear.position.set(0.35, 1.1, 0.15);
  spear.rotation.z = -1.15;
  player.add(spear);
  scene.add(player);

  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  function resize(): void {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  window.addEventListener('resize', resize);
  resize();

  function place(x: number, z: number, facing: number): void {
    player.position.set(x, 0, z);
    player.rotation.y = facing;
    camera.position.set(x, config.cam.y, z + config.cam.back);
    camera.lookAt(x, config.cam.targetY, z);
  }

  function aimAt(sx: number, sy: number, px: number, pz: number): number {
    ndc.set((sx / window.innerWidth) * 2 - 1, -(sy / window.innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const dir = ray.ray.direction;
    if (Math.abs(dir.y) < 1e-6) return 0;
    const t = -ray.ray.origin.y / dir.y;
    const hx = ray.ray.origin.x + dir.x * t;
    const hz = ray.ray.origin.z + dir.z * t;
    return Math.atan2(hx - px, hz - pz);
  }

  place(0, 0, 0);

  return { resize, place, aimAt, render: () => renderer.render(scene, camera) };
}
