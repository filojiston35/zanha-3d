<template>
  <div class="scene-root">
    <canvas ref="canvasEl" class="scene-canvas" />
    <div class="hud">
      <div class="title">Zanha 3D Sample</div>
      <div class="speed" v-if="hudSpeed">{{ hudSpeed }}</div>
      <div v-if="hudTimer" class="timer">{{ hudTimer }}</div>
      <div v-if="hudMessage" class="message">{{ hudMessage }}</div>
      <div class="hint">W/A/S/D veya ok tuşları</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import HavokPhysics from "@babylonjs/havok";
import {
  Color3,
  DynamicTexture,
  DirectionalLight,
  Engine,
  FollowCamera,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  Quaternion,
  Scene,
  StandardMaterial,
  Texture,
  TrailMesh,
  Vector3,
} from "@babylonjs/core";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import "@babylonjs/loaders/glTF";
import { HavokPlugin } from "@babylonjs/core/Physics/v2/Plugins/havokPlugin";
import { PhysicsAggregate } from "@babylonjs/core/Physics/v2/physicsAggregate";
import { PhysicsShapeType } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";
import "@babylonjs/core/Physics/v2";

const canvasEl = ref<HTMLCanvasElement | null>(null);
const hudTimer = ref<string>("");
const hudMessage = ref<string>("");
const hudSpeed = ref<string>("");

let engine: Engine | null = null;
let scene: Scene | null = null;
let onResize: (() => void) | null = null;

const pressed = new Set<string>();
let onKeyDown: ((e: KeyboardEvent) => void) | null = null;
let onKeyUp: ((e: KeyboardEvent) => void) | null = null;

function keyOf(e: KeyboardEvent) {
  return e.key.length === 1 ? e.key.toLowerCase() : e.key;
}

function formatMMSS(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

onMounted(async () => {
  if (!canvasEl.value) return;

  engine = new Engine(
    canvasEl.value,
    true,
    {
      preserveDrawingBuffer: true,
      stencil: true,
    },
    true, // adaptToDeviceRatio
  );
  scene = new Scene(engine);
  scene.clearColor = new Color3(0.07, 0.08, 0.1).toColor4(1);

  // İlk ölçümü garanti et
  await nextTick();
  engine.resize();

  // Camera
  const camera = new FollowCamera("camera", new Vector3(0, 6, -14), scene);
  camera.attachControl(true);
  camera.radius = 14;
  camera.heightOffset = 4.2;
  camera.rotationOffset = 0; // arabanın arkasından bak (model forward yönü için)
  camera.cameraAcceleration = 0.08;
  camera.maxCameraSpeed = 50;
  camera.minZ = 0.05;
  camera.maxZ = 5000;

  // Light (minimum)
  const sun = new DirectionalLight("sun", new Vector3(-0.4, -1, -0.2), scene);
  sun.position = new Vector3(20, 40, 20);
  sun.intensity = 2.2;

  // Yumuşak ortam ışığı: duvarların iç yüzlerinin "siyah" görünmesini engeller
  const sky = new HemisphericLight("sky", new Vector3(0, 1, 0), scene);
  sky.intensity = 0.55;

  // Havok physics
  const havok = await HavokPhysics({
    locateFile: (p) => (p.endsWith(".wasm") ? "/havok/HavokPhysics.wasm" : p),
  });
  const hk = new HavokPlugin(true, havok);
  scene.enablePhysics(new Vector3(0, -9.81, 0), hk);

  // Zemin (texture: rocky terrain)
  // Görsel ground + ayrı (kalın) fizik collider: Havok'ta daha stabil temas sağlar.
  const arenaSize = 220;
  const half = arenaSize / 2;
  const ground = MeshBuilder.CreateGround(
    "ground",
    { width: arenaSize, height: arenaSize, subdivisions: 2 },
    scene,
  );
  ground.position.y = 0;

  const groundMat = new StandardMaterial("groundMat", scene);
  const groundTex = new Texture("/textures/ground/rocky_terrain_02_diff_4k.jpg", scene);
  groundTex.wrapU = Texture.WRAP_ADDRESSMODE;
  groundTex.wrapV = Texture.WRAP_ADDRESSMODE;
  groundTex.uScale = 18;
  groundTex.vScale = 18;
  groundTex.anisotropicFilteringLevel = 8;
  groundMat.diffuseTexture = groundTex;
  groundMat.specularColor = new Color3(0.05, 0.05, 0.05);
  groundMat.ambientColor = new Color3(0.25, 0.25, 0.25);
  ground.material = groundMat;

  const groundCollider = MeshBuilder.CreateBox(
    "groundCollider",
    { width: arenaSize, depth: arenaSize, height: 2 },
    scene,
  );
  groundCollider.position.y = -1; // üst yüzeyi y=0
  groundCollider.isVisible = false;
  new PhysicsAggregate(
    groundCollider,
    PhysicsShapeType.MESH,
    { mass: 0, friction: 1.25, restitution: 0.0 },
    scene,
  );

  // Start / Finish alanları (görsel)
  const makePadMaterial = (name: string, label: string, bg: Color3) => {
    const sc = scene!;
    const mat = new StandardMaterial(name, sc);
    const tex = new DynamicTexture(`${name}Tex`, { width: 1024, height: 1024 }, sc, true);
    tex.hasAlpha = true;
    const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;
    ctx.clearRect(0, 0, 1024, 1024);
    ctx.fillStyle = `rgb(${Math.round(bg.r * 255)}, ${Math.round(bg.g * 255)}, ${Math.round(bg.b * 255)})`;
    ctx.fillRect(0, 0, 1024, 1024);
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 380, 1024, 264);
    ctx.font = "bold 150px Montserrat, Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.fillText(label, 512, 512);
    tex.update(false);
    mat.diffuseTexture = tex;
    mat.emissiveColor = bg.scale(0.25);
    mat.specularColor = new Color3(0.02, 0.02, 0.02);
    return mat;
  };

  const padSize = 18;
  const padY = 0.03;
  const startPad = MeshBuilder.CreateGround("startPad", { width: padSize, height: padSize }, scene);
  startPad.position = new Vector3(0, padY, 0);
  startPad.material = makePadMaterial("startPadMat", "START", new Color3(0.15, 0.55, 0.2));

  const finishPad = MeshBuilder.CreateGround("finishPad", { width: padSize, height: padSize }, scene);
  finishPad.material = makePadMaterial("finishPadMat", "FINISH", new Color3(0.6, 0.18, 0.16));
  const padHalf = padSize / 2;

  // Finish noktası her açılışta farklı olsun
  const finishMargin = 18; // duvarlardan uzak
  const finishKeepOut = 28; // start/merkezden uzak
  const randomPosInArena = (margin: number, keepOutFrom?: Vector3, keepOutRadius = 0) => {
    const max = half - margin - padHalf;
    for (let tries = 0; tries < 120; tries++) {
      const x = (Math.random() * 2 - 1) * max;
      const z = (Math.random() * 2 - 1) * max;
      if (keepOutFrom && Math.hypot(x - keepOutFrom.x, z - keepOutFrom.z) < keepOutRadius) continue;
      return new Vector3(x, padY, z);
    }
    return new Vector3(0, padY, half - 22);
  };
  const sampleFinishPos = () => {
    return randomPosInArena(finishMargin, startPad.position, finishKeepOut);
  };
  let finishPos = new Vector3(0, padY, half - 22);
  for (let tries = 0; tries < 80; tries++) {
    const p = sampleFinishPos();
    if (Math.hypot(p.x - startPad.position.x, p.z - startPad.position.z) >= finishKeepOut) {
      finishPos = p;
      break;
    }
  }
  finishPad.position = finishPos;

  const isInsidePad = (p: Vector3, padPos: Vector3) =>
    Math.abs(p.x - padPos.x) <= padHalf && Math.abs(p.z - padPos.z) <= padHalf;

  let timerStarted = false;
  let timerFinished = false;
  let timerStartMs = 0;
  let lastInStart = true;
  let resetting = false;
  let startPadHidden = false;

  const rockCols: Mesh[] = [];
  const fenceCols: Mesh[] = [];
  const dinoCols: Mesh[] = [];

  // Alan sınırları: 4 duvar (fizik) + plane (görsel)
  const wallThickness = 2;
  const wallHeight = 8;

  const wallMat = new StandardMaterial("wallMat", scene);
  const wallTex = new Texture("/textures/walls/ganges_river_pebbles_diff_4k.jpg", scene);
  wallTex.wrapU = Texture.WRAP_ADDRESSMODE;
  wallTex.wrapV = Texture.WRAP_ADDRESSMODE;
  wallTex.uScale = 6;
  wallTex.vScale = 1.5;
  wallTex.anisotropicFilteringLevel = 8;
  wallMat.diffuseTexture = wallTex;
  wallMat.specularColor = new Color3(0.05, 0.05, 0.05);
  wallMat.ambientColor = new Color3(0.2, 0.2, 0.2);
  wallMat.backFaceCulling = false;
  wallMat.twoSidedLighting = true;

  const wallNVis = MeshBuilder.CreatePlane(
    "wallNVis",
    { width: arenaSize + wallThickness * 2, height: wallHeight, sideOrientation: Mesh.DOUBLESIDE },
    scene,
  );
  wallNVis.position = new Vector3(0, wallHeight / 2, half + wallThickness / 2);
  wallNVis.rotation = new Vector3(0, Math.PI, 0);
  wallNVis.material = wallMat;

  const wallSVis = MeshBuilder.CreatePlane(
    "wallSVis",
    { width: arenaSize + wallThickness * 2, height: wallHeight, sideOrientation: Mesh.DOUBLESIDE },
    scene,
  );
  wallSVis.position = new Vector3(0, wallHeight / 2, -half - wallThickness / 2);
  wallSVis.rotation = new Vector3(0, 0, 0);
  wallSVis.material = wallMat;

  const wallEVis = MeshBuilder.CreatePlane(
    "wallEVis",
    { width: arenaSize + wallThickness * 2, height: wallHeight, sideOrientation: Mesh.DOUBLESIDE },
    scene,
  );
  wallEVis.position = new Vector3(half + wallThickness / 2, wallHeight / 2, 0);
  wallEVis.rotation = new Vector3(0, Math.PI / 2, 0);
  wallEVis.material = wallMat;

  const wallWVis = MeshBuilder.CreatePlane(
    "wallWVis",
    { width: arenaSize + wallThickness * 2, height: wallHeight, sideOrientation: Mesh.DOUBLESIDE },
    scene,
  );
  wallWVis.position = new Vector3(-half - wallThickness / 2, wallHeight / 2, 0);
  wallWVis.rotation = new Vector3(0, -Math.PI / 2, 0);
  wallWVis.material = wallMat;

  const wallN = MeshBuilder.CreateBox(
    "wallN",
    { width: arenaSize + wallThickness * 2, depth: wallThickness, height: wallHeight },
    scene,
  );
  wallN.position = new Vector3(0, wallHeight / 2, half + wallThickness / 2);
  wallN.isVisible = false;
  new PhysicsAggregate(wallN, PhysicsShapeType.BOX, { mass: 0, friction: 1.0, restitution: 0.0 }, scene);

  const wallS = MeshBuilder.CreateBox(
    "wallS",
    { width: arenaSize + wallThickness * 2, depth: wallThickness, height: wallHeight },
    scene,
  );
  wallS.position = new Vector3(0, wallHeight / 2, -half - wallThickness / 2);
  wallS.isVisible = false;
  new PhysicsAggregate(wallS, PhysicsShapeType.BOX, { mass: 0, friction: 1.0, restitution: 0.0 }, scene);

  const wallE = MeshBuilder.CreateBox(
    "wallE",
    { width: wallThickness, depth: arenaSize + wallThickness * 2, height: wallHeight },
    scene,
  );
  wallE.position = new Vector3(half + wallThickness / 2, wallHeight / 2, 0);
  wallE.isVisible = false;
  new PhysicsAggregate(wallE, PhysicsShapeType.BOX, { mass: 0, friction: 1.0, restitution: 0.0 }, scene);

  const wallW = MeshBuilder.CreateBox(
    "wallW",
    { width: wallThickness, depth: arenaSize + wallThickness * 2, height: wallHeight },
    scene,
  );
  wallW.position = new Vector3(-half - wallThickness / 2, wallHeight / 2, 0);
  wallW.isVisible = false;
  new PhysicsAggregate(wallW, PhysicsShapeType.BOX, { mass: 0, friction: 1.0, restitution: 0.0 }, scene);

  // Kaya modelleri (random): rock_photogrammetry_scan.glb
  const rockAsset = await SceneLoader.ImportMeshAsync("", "/models/", "rock_photogrammetry_scan.glb", scene);
  const rockRoot = rockAsset.meshes[0];
  if (!rockRoot) throw new Error("GLB yüklendi ama mesh yok: rock_photogrammetry_scan.glb");
  rockRoot.setEnabled(false); // template olarak kullanacağız

  // Rock bounds (template) -> collider ölçüsü için
  const rockBounds = rockRoot.getHierarchyBoundingVectors(true);
  const rockSize = rockBounds.max.subtract(rockBounds.min);

  // Deterministik RNG
  let rockSeed = 20260317;
  const rockRand01 = () => {
    rockSeed ^= rockSeed << 13;
    rockSeed ^= rockSeed >>> 17;
    rockSeed ^= rockSeed << 5;
    return ((rockSeed >>> 0) % 1_000_000) / 1_000_000;
  };

  const rockCount = 12;
  const rockMargin = 12; // duvarlardan uzak
  const rockKeepOut = 14; // merkeze/başlangıca spawn olmasın

  for (let i = 0; i < rockCount; i++) {
    // konum seç
    let x = 0;
    let z = 0;
    for (let tries = 0; tries < 60; tries++) {
      x = (rockRand01() * 2 - 1) * (half - rockMargin);
      z = (rockRand01() * 2 - 1) * (half - rockMargin);
      if (Math.hypot(x, z) >= rockKeepOut) break;
    }

    // ölçek (küçük/büyük)
    const s = 0.6 + rockRand01() * 1.6; // 0.6..2.2

    // fizik collider: görünmez box
    const c = MeshBuilder.CreateBox(
      `rockCol_${i}`,
      { width: rockSize.x * s, height: rockSize.y * s, depth: rockSize.z * s },
      scene,
    );
    c.isVisible = false;
    c.position = new Vector3(x, (rockSize.y * s) / 2, z);
    c.rotation = new Vector3(0, rockRand01() * Math.PI * 2, 0);
    rockCols.push(c);

    // görsel kaya: clone
    const rock = rockRoot.clone(`rock_${i}`, null)!;
    rock.setEnabled(true);
    rock.parent = c;
    rock.scaling = new Vector3(s, s, s);
    // collider'ın tabanı (y=0) ile kaya tabanı hizalansın (+ çok az zemine göm)
    const rockSinkY = 0.04;
    rock.position = new Vector3(0, -((rockSize.y * s) / 2) - rockBounds.min.y * s - rockSinkY, 0);

    new PhysicsAggregate(
      c,
      PhysicsShapeType.BOX,
      { mass: 0, friction: 1.6, restitution: 0.0 },
      scene,
    );
  }

  // Farklı kaya türü (random): ruined_rock_fence.glb
  const fenceAsset = await SceneLoader.ImportMeshAsync("", "/models/", "ruined_rock_fence.glb", scene);
  const fenceRoot = fenceAsset.meshes[0];
  if (!fenceRoot) throw new Error("GLB yüklendi ama mesh yok: ruined_rock_fence.glb");
  fenceRoot.setEnabled(false);

  const fenceBounds = fenceRoot.getHierarchyBoundingVectors(true);
  const fenceSize = fenceBounds.max.subtract(fenceBounds.min);
  // Sahneye uydur: en uzun kenarı ~6m hedefle
  const fenceMaxDim = Math.max(fenceSize.x, fenceSize.y, fenceSize.z) || 1;
  const fenceBaseScale = 6 / fenceMaxDim;

  let fenceSeed = 424242;
  const fenceRand01 = () => {
    fenceSeed ^= fenceSeed << 13;
    fenceSeed ^= fenceSeed >>> 17;
    fenceSeed ^= fenceSeed << 5;
    return ((fenceSeed >>> 0) % 1_000_000) / 1_000_000;
  };

  const fenceCount = 6;
  const fenceMargin = 14;
  const fenceKeepOut = 16;

  for (let i = 0; i < fenceCount; i++) {
    let x = 0;
    let z = 0;
    for (let tries = 0; tries < 60; tries++) {
      x = (fenceRand01() * 2 - 1) * (half - fenceMargin);
      z = (fenceRand01() * 2 - 1) * (half - fenceMargin);
      if (Math.hypot(x, z) >= fenceKeepOut) break;
    }

    const s = fenceBaseScale * (0.6 + fenceRand01() * 1.0); // base * (0.6..1.6)

    const c = MeshBuilder.CreateBox(
      `fenceRockCol_${i}`,
      { width: fenceSize.x * s, height: fenceSize.y * s, depth: fenceSize.z * s },
      scene,
    );
    c.isVisible = false;
    c.position = new Vector3(x, (fenceSize.y * s) / 2, z);
    c.rotation = new Vector3(0, fenceRand01() * Math.PI * 2, 0);
    fenceCols.push(c);

    const fence = fenceRoot.clone(`ruined_fence_${i}`, null)!;
    fence.setEnabled(true);
    fence.parent = c;
    fence.scaling = new Vector3(s, s, s);
    // İlk kaya modelindeki gibi: gerçek minY ölç -> collider tabanına hizala
    const sinkY = 0.25; // biraz zemine göm
    fence.position = new Vector3(0, 0, 0);
    fence.computeWorldMatrix(true);
    const placedBounds = fence.getHierarchyBoundingVectors(true);
    // parent collider'ın tabanı (local y=0) hedefimiz
    fence.position.y += -sinkY - placedBounds.min.y;

    new PhysicsAggregate(
      c,
      PhysicsShapeType.BOX,
      { mass: 0, friction: 1.6, restitution: 0.0 },
      scene,
    );
  }

  // Farklı model (random): armor_dinasour.glb (aynı boyutta)
  // const dinoAsset = await SceneLoader.ImportMeshAsync("", "/models/", "armor_dinasour.glb", scene);
  // const dinoRoot = dinoAsset.meshes[0];
  // if (!dinoRoot) throw new Error("GLB yüklendi ama mesh yok: armor_dinasour.glb");
  // dinoRoot.setEnabled(false);

  // const dinoBounds = dinoRoot.getHierarchyBoundingVectors(true);
  // const dinoSize = dinoBounds.max.subtract(dinoBounds.min);

  // let dinoSeed = 909090;
  // const dinoRand01 = () => {
  //   dinoSeed ^= dinoSeed << 13;
  //   dinoSeed ^= dinoSeed >>> 17;
  //   dinoSeed ^= dinoSeed << 5;
  //   return ((dinoSeed >>> 0) % 1_000_000) / 1_000_000;
  // };

  // const dinoCount = 3;
  // const dinoMargin = 18;
  // const dinoKeepOut = 18;
  // const showDinos = false; // şimdilik gizle (performans)
  // // Modeli sahneye uydur: en uzun kenarı ~8m yap
  // const dinoMaxDim = Math.max(dinoSize.x, dinoSize.y, dinoSize.z) || 1;
  // const dinoScale = 12 / dinoMaxDim;

  // for (let i = 0; i < dinoCount; i++) {
  //   let x = 0;
  //   let z = 0;
  //   for (let tries = 0; tries < 80; tries++) {
  //     x = (dinoRand01() * 2 - 1) * (half - dinoMargin);
  //     z = (dinoRand01() * 2 - 1) * (half - dinoMargin);
  //     if (Math.hypot(x, z) >= dinoKeepOut) break;
  //   }

  //   const c = MeshBuilder.CreateBox(
  //     `dinoCol_${i}`,
  //     { width: dinoSize.x * dinoScale, height: dinoSize.y * dinoScale, depth: dinoSize.z * dinoScale },
  //     scene,
  //   );
  //   c.isVisible = false;
  //   c.position = new Vector3(x, (dinoSize.y * dinoScale) / 2, z);
  //   c.rotation = new Vector3(0, dinoRand01() * Math.PI * 2, 0);
  //   dinoCols.push(c);

  //   const dino = dinoRoot.clone(`armor_dino_${i}`, null)!;
  //   dino.setEnabled(true);
  //   dino.parent = c;
  //   dino.scaling = new Vector3(dinoScale, dinoScale, dinoScale);
  //   const sinkY = 0.04;
  //   dino.position = new Vector3(0, -((dinoSize.y * dinoScale) / 2) - dinoBounds.min.y * dinoScale - sinkY, 0);
  //   if (!showDinos) c.setEnabled(false);

  //   new PhysicsAggregate(
  //     c,
  //     PhysicsShapeType.BOX,
  //     { mass: 0, friction: 1.6, restitution: 0.0 },
  //     scene,
  //   );
  // }

  // GLB yükle
  const glb = await SceneLoader.ImportMeshAsync("", "/models/", "old_rusty_car.glb", scene);
  // glb.meshes[0] genelde __root__
  const root = glb.meshes[0];
  if (!root) throw new Error("GLB yüklendi ama mesh yok: old_rusty_car.glb");

  // Model çok büyük/küçük olabiliyor: "araba" uzunluğunu normalize et
  const preBounds = root.getHierarchyBoundingVectors(true);
  const preSize = preBounds.max.subtract(preBounds.min);
  const targetLength = 2.6;
  const carScaleBoost = 1.15; // arabayı biraz büyüt
  const scaleFactor = preSize.z > 0 ? (targetLength / preSize.z) * carScaleBoost : carScaleBoost;
  root.scaling = new Vector3(scaleFactor, scaleFactor, scaleFactor);

  // Parent'lamadan önce bounds al (world-space ofset hatasını önler)
  const scaledBounds = root.getHierarchyBoundingVectors(true);
  const scaledMinY = scaledBounds.min.y;

  // Fizik gövdesi (collider) - görsel ölçeğiyle uyumlu
  const carW = 1.4 * carScaleBoost;
  const carH = 0.6 * carScaleBoost;
  const carD = 2.6 * carScaleBoost;
  const car = MeshBuilder.CreateBox("carCollider", { width: carW, height: carH, depth: carD }, scene);
  car.position = new Vector3(0, 3, 0);
  car.rotationQuaternion = Quaternion.Identity();
  car.isVisible = false;

  // GLB'yi collider'a bağla
  root.parent = car;

  // Alt hizalama: model tabanı collider tabanına gelsin
  const desiredBottomY = -carH / 2; // collider bottom (car local)
  const visualLiftY = 0.05; // biraz yukarı (px hissi için küçük offset)
  root.position = new Vector3(0, desiredBottomY - scaledMinY + visualLiftY, 0);

  const carAgg = new PhysicsAggregate(
    car,
    PhysicsShapeType.BOX,
    { mass: 900, friction: 1.05, restitution: 0.0 },
    scene,
  );
  carAgg.body.setAngularDamping(0.25);
  carAgg.body.setLinearDamping(0.25);

  // Hızlanınca arkada ışın (trail)
  const boostAnchor = MeshBuilder.CreateBox("boostAnchor", { size: 0.1 }, scene);
  boostAnchor.isVisible = false;
  boostAnchor.parent = car;
  // Modelin forward yönü ters olabildiği için anchor'ı aracın arkasına gelecek şekilde +Z tarafına alıyoruz
  boostAnchor.position = new Vector3(0, 0.1, carD / 2 + 0.25);

  const trail = new TrailMesh("carTrail", boostAnchor, scene, 0.12, 45, true);
  const trailMat = new StandardMaterial("carTrailMat", scene);
  trailMat.emissiveColor = new Color3(0.25, 0.9, 1.0);
  trailMat.diffuseColor = new Color3(0.08, 0.2, 0.25);
  trailMat.alpha = 0.8;
  trailMat.backFaceCulling = false;
  trail.material = trailMat;
  trail.isVisible = false;

  // Kamera aracı takip etsin
  camera.lockedTarget = car;
  // İlk karede kamerayı aracın arkasına oturt
  camera.position = car.position.add(new Vector3(0, camera.heightOffset, -camera.radius));

  const resetRound = () => {
    // finish + engelleri yeniden dağıt
    finishPad.position = randomPosInArena(finishMargin, startPad.position, finishKeepOut);

    const moveCols = (cols: Mesh[], margin: number, keepOut: number) => {
      for (const m of cols) {
        const halfH = m.getBoundingInfo().boundingBox.extendSize.y;
        const p = randomPosInArena(margin, startPad.position, keepOut);
        m.position.x = p.x;
        m.position.z = p.z;
        m.position.y = halfH;
        m.rotation.y = Math.random() * Math.PI * 2;
      }
    };
    moveCols(rockCols, 12, 14);
    moveCols(fenceCols, 14, 16);
    moveCols(dinoCols, 18, 18);

    // arabayı start'a al ve fizik hızlarını sıfırla
    car.position = new Vector3(0, 3, 0);
    car.rotationQuaternion = Quaternion.Identity();
    carAgg.body.setLinearVelocity(Vector3.Zero());
    carAgg.body.setAngularVelocity(Vector3.Zero());

    // timer sıfırla
    timerStarted = false;
    timerFinished = false;
    timerStartMs = 0;
    lastInStart = true;
    hudTimer.value = "";
    hudMessage.value = "";
    resetting = false;
  };

  // WASD kontroller
  onKeyDown = (e: KeyboardEvent) => pressed.add(keyOf(e));
  onKeyUp = (e: KeyboardEvent) => pressed.delete(keyOf(e));
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  const maxSpeed = 27.78; // m/s (~100 km/h)
  const accel = 24; // m/s^2
  const turnRate = 3.2; // rad/s

  scene.onBeforeRenderObservable.add(() => {
    const dt = scene?.getEngine().getDeltaTime() ? scene.getEngine().getDeltaTime() / 1000 : 0;
    if (!dt) return;

    // START/FINISH timer
    if (!timerFinished) {
      const p = car.position;
      const inStart = isInsidePad(p, startPad.position);
      const inFinish = isInsidePad(p, finishPad.position);

      if (!timerStarted) {
        // Start alanından ilk çıkışta başlat
        if (lastInStart && !inStart) {
          timerStarted = true;
          timerStartMs = performance.now();
          hudMessage.value = "";
        }
        lastInStart = inStart;
      } else {
        const elapsed = performance.now() - timerStartMs;
        hudTimer.value = formatMMSS(elapsed);

        if (inFinish) {
          timerFinished = true;
          hudTimer.value = formatMMSS(elapsed);
          hudMessage.value = `Tebrikler ${hudTimer.value} saniyede tamamladınız`;
          if (!startPadHidden) {
            startPadHidden = true;
            startPad.isVisible = false;
          }
          if (!resetting) {
            resetting = true;
            window.setTimeout(() => resetRound(), 900);
          }
        }
      }
    }

    // GLB'nin forward yönü ters olabildiği için W/S'i beklenen şekilde eşleştiriyoruz:
    const forwardKey = pressed.has("s") || pressed.has("ArrowUp");
    const backKey = pressed.has("w") || pressed.has("ArrowDown");
    const leftKey = pressed.has("d") || pressed.has("ArrowLeft");
    const rightKey = pressed.has("a") || pressed.has("ArrowRight");

    const rb = carAgg.body;
    const v = rb.getLinearVelocity();
    const forward = car.forward.normalize();

    // Trail sadece hızlanırken ve yeterli hızda aktif olsun
    const speed = v.length();
    hudSpeed.value = `${Math.round(speed * 3.6)} km/h`;
    // Boost efekti: kullanıcı W / ArrowUp ile gaz veriyorsa ve hız yeterliyse göster
    const boostKey = pressed.has(" ") || pressed.has("Space");
    const boosting = boostKey && speed > 10;
    trail.isVisible = boosting;

    let targetSpeed = 0;
    if (forwardKey) targetSpeed += maxSpeed;
    if (backKey) targetSpeed -= maxSpeed * 0.6;

    const currentForwardSpeed = Vector3.Dot(v, forward);
    const speedError = targetSpeed - currentForwardSpeed;
    const speedChange = Math.max(-accel * dt, Math.min(accel * dt, speedError));
    rb.setLinearVelocity(v.add(forward.scale(speedChange)));

    const steering = (leftKey ? 1 : 0) + (rightKey ? -1 : 0);
    const speedFactor = Math.min(1, Math.abs(currentForwardSpeed) / 4);
    const yaw = steering * turnRate * (0.25 + 0.75 * speedFactor);
    rb.setAngularVelocity(new Vector3(0, yaw, 0));
  });

  engine.runRenderLoop(() => {
    scene?.render();
  });

  onResize = () => engine?.resize();
  window.addEventListener("resize", onResize);
});

onBeforeUnmount(() => {
  if (onKeyDown) window.removeEventListener("keydown", onKeyDown);
  if (onKeyUp) window.removeEventListener("keyup", onKeyUp);
  if (onResize) window.removeEventListener("resize", onResize);

  scene?.dispose();
  engine?.dispose();
  scene = null;
  engine = null;
});
</script>

<style scoped>
.scene-root {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: #05060a;
}

.scene-canvas {
  display: block;
  width: 100%;
  height: 100%;
  touch-action: none;
  outline: none;
}

.hud {
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 10px 12px;
  background: rgba(10, 12, 18, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  color: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
}

.title {
  font-weight: 700;
  letter-spacing: 0.2px;
}

.hint {
  margin-top: 4px;
  font-size: 12px;
  opacity: 0.85;
}

.speed {
  margin-top: 8px;
  font-size: 16px;
  font-weight: 800;
  letter-spacing: 0.3px;
}

.timer {
  margin-top: 8px;
  font-size: 20px;
  font-weight: 800;
  letter-spacing: 0.5px;
}

.message {
  margin-top: 8px;
  font-size: 14px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.92);
}
</style>