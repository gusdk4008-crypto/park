/**
 * threeCubeView.js - Interactive 3D Twisty Puzzle Viewer & Synchronized Painter
 * Provides authentic 3D geometry for:
 * 1. NxN (1x1 ~ 7x7)
 * 2. Pyraminx (Tetrahedron with 9 triangular stickers per face)
 * 3. Megaminx (Regular Dodecahedron with 11 stickers per face)
 * 4. Skewb (Cube with diamond center & 4 corner triangles)
 */

class ThreeCubeView {
  constructor(container, options = {}) {
    this.container = container;
    this.state = null;
    this.options = options;
    this.onPaint = options.onPaint || null;
    this.onPickColor = options.onPickColor || null;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.puzzleGroup = null;
    this.interactiveMeshes = [];
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.hoveredMesh = null;

    this.init();
  }

  init() {
    const width = this.container.clientWidth || 400;
    const height = this.container.clientHeight || 400;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = null;

    // Camera
    this.camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1000);
    this.camera.position.set(4, 3.5, 5);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);

    // Controls
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.rotateSpeed = 0.8;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 25;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.85);
    this.scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xFFFFFF, 0.55);
    dirLight1.position.set(5, 10, 7);
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xFFFFFF, 0.35);
    dirLight2.position.set(-5, -5, -5);
    this.scene.add(dirLight2);

    // Puzzle group
    this.puzzleGroup = new THREE.Group();
    this.scene.add(this.puzzleGroup);

    // Events
    this.initEvents();

    // Start loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initEvents() {
    const dom = this.renderer.domElement;
    let isDragging = false;
    let downPos = { x: 0, y: 0 };

    dom.addEventListener('mousedown', (e) => {
      downPos = { x: e.clientX, y: e.clientY };
      isDragging = false;
    });

    dom.addEventListener('mousemove', (e) => {
      const dist = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
      if (dist > 4) isDragging = true;

      const rect = dom.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.checkHover();
    });

    dom.addEventListener('mouseup', (e) => {
      if (!isDragging && e.button === 0) {
        this.handleClick(e);
      }
    });

    window.addEventListener('resize', () => this.resize());
  }

  checkHover() {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.interactiveMeshes, false);

    if (intersects.length > 0) {
      const hit = intersects[0].object;
      if (this.hoveredMesh !== hit) {
        this.resetHover();
        this.hoveredMesh = hit;
        if (hit.material && hit.material.emissive) {
          hit.material.emissive.setHex(0x38BDF8);
          hit.material.emissiveIntensity = 0.35;
        }
      }
    } else {
      this.resetHover();
    }
  }

  resetHover() {
    if (this.hoveredMesh) {
      if (this.hoveredMesh.material && this.hoveredMesh.material.emissive) {
        this.hoveredMesh.material.emissive.setHex(0x000000);
        this.hoveredMesh.material.emissiveIntensity = 0;
      }
      this.hoveredMesh = null;
    }
  }

  handleClick(e) {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.interactiveMeshes, false);

    if (intersects.length > 0) {
      const hit = intersects[0].object;
      if (hit.userData) {
        if (e.altKey && this.onPickColor) {
          this.onPickColor(hit.userData.color);
        } else if (this.onPaint) {
          this.onPaint(hit.userData);
        }
      }
    }
  }

  setState(state) {
    this.state = state;
    this.rebuildModel();
  }

  rebuildModel() {
    if (!this.state) return;

    // Clear old meshes
    this.resetHover();
    while (this.puzzleGroup.children.length > 0) {
      const obj = this.puzzleGroup.children[0];
      this.puzzleGroup.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    }
    this.interactiveMeshes = [];

    const config = CUBE_TYPES[this.state.cubeId];
    if (!config) return;

    if (config.type === 'nxn') {
      this.buildNxN3D(config.order);
    } else if (config.type === 'pyraminx') {
      this.buildPyraminx3D();
    } else if (config.type === 'megaminx') {
      this.buildMegaminx3D();
    } else if (config.type === 'skewb') {
      this.buildSkewb3D();
    } else if (config.type === 'windmill') {
      this.buildWindmill3D();
    } else if (config.type === '3x3x4') {
      this.build3x3x43D();
    } else {
      this.buildNxN3D(3);
    }

    this.updateColors();
  }

  // ==========================================
  // 1. NxN CUBE 3D BUILDER
  // ==========================================
  buildNxN3D(N) {
    const cubieSize = 2.4 / N;
    const stickerSize = cubieSize * 0.92;
    const half = (N - 1) / 2;

    const coreGeo = new THREE.BoxGeometry(cubieSize * 0.98, cubieSize * 0.98, cubieSize * 0.98);
    const coreMat = new THREE.MeshStandardMaterial({ color: 0x18181B, roughness: 0.7, metalness: 0.1 });
    const stickerPlaneGeo = new THREE.PlaneGeometry(stickerSize, stickerSize);

    for (let x = 0; x < N; x++) {
      for (let y = 0; y < N; y++) {
        for (let z = 0; z < N; z++) {
          const isExterior = (x === 0 || x === N - 1 || y === 0 || y === N - 1 || z === 0 || z === N - 1);
          if (!isExterior) continue;

          const posX = (x - half) * cubieSize;
          const posY = (y - half) * cubieSize;
          const posZ = (z - half) * cubieSize;

          const coreMesh = new THREE.Mesh(coreGeo, coreMat);
          coreMesh.position.set(posX, posY, posZ);
          this.puzzleGroup.add(coreMesh);

          const addSticker = (face, r, c, normalVec, rotEuler) => {
            const mat = new THREE.MeshStandardMaterial({
              color: 0xFFFFFF,
              roughness: 0.25,
              metalness: 0.05,
              polygonOffset: true,
              polygonOffsetFactor: -1,
              polygonOffsetUnits: -1
            });
            const mesh = new THREE.Mesh(stickerPlaneGeo, mat);
            mesh.position.set(
              posX + normalVec.x * (cubieSize * 0.505),
              posY + normalVec.y * (cubieSize * 0.505),
              posZ + normalVec.z * (cubieSize * 0.505)
            );
            mesh.rotation.copy(rotEuler);
            mesh.userData = { face, r, c, type: 'sticker' };
            this.puzzleGroup.add(mesh);
            this.interactiveMeshes.push(mesh);
          };

          if (y === N - 1) addSticker('U', N - 1 - z, x, new THREE.Vector3(0, 1, 0), new THREE.Euler(-Math.PI / 2, 0, 0));
          if (y === 0) addSticker('D', z, x, new THREE.Vector3(0, -1, 0), new THREE.Euler(Math.PI / 2, 0, 0));
          if (z === N - 1) addSticker('F', N - 1 - y, x, new THREE.Vector3(0, 0, 1), new THREE.Euler(0, 0, 0));
          if (z === 0) addSticker('B', N - 1 - y, N - 1 - x, new THREE.Vector3(0, 0, -1), new THREE.Euler(0, Math.PI, 0));
          if (x === 0) addSticker('L', N - 1 - y, z, new THREE.Vector3(-1, 0, 0), new THREE.Euler(0, -Math.PI / 2, 0));
          if (x === N - 1) addSticker('R', N - 1 - y, N - 1 - z, new THREE.Vector3(1, 0, 0), new THREE.Euler(0, Math.PI / 2, 0));
        }
      }
    }
  }

  // ==========================================
  // 2. PYRAMINX 3D BUILDER (Tetrahedron with 9 stickers per face)
  // ==========================================
  buildPyraminx3D() {
    const E = 3.6;
    const H = E * Math.sqrt(2 / 3);
    const R = E / Math.sqrt(3);

    const V0 = new THREE.Vector3(0, H * 0.75, 0);
    const V1 = new THREE.Vector3(0, -H * 0.25, R);
    const V2 = new THREE.Vector3(-R * Math.cos(Math.PI / 6), -H * 0.25, -R * Math.sin(Math.PI / 6));
    const V3 = new THREE.Vector3(R * Math.cos(Math.PI / 6), -H * 0.25, -R * Math.sin(Math.PI / 6));

    // Solid core tetrahedron
    const coreGeo = new THREE.BufferGeometry();
    const coreVerts = [
      V0.x, V0.y, V0.z, V2.x, V2.y, V2.z, V1.x, V1.y, V1.z,
      V0.x, V0.y, V0.z, V1.x, V1.y, V1.z, V3.x, V3.y, V3.z,
      V0.x, V0.y, V0.z, V3.x, V3.y, V3.z, V2.x, V2.y, V2.z,
      V1.x, V1.y, V1.z, V2.x, V2.y, V2.z, V3.x, V3.y, V3.z,
    ];
    coreGeo.setAttribute('position', new THREE.Float32BufferAttribute(coreVerts, 3));
    coreGeo.computeVertexNormals();
    const coreMat = new THREE.MeshStandardMaterial({ color: 0x18181B, roughness: 0.8 });
    this.puzzleGroup.add(new THREE.Mesh(coreGeo, coreMat));

    const faceDefs = [
      { face: 'U', A: V0, B: V2, C: V1 },
      { face: 'R', A: V0, B: V1, C: V3 },
      { face: 'L', A: V0, B: V3, C: V2 },
      { face: 'B', A: V1, B: V2, C: V3 },
    ];

    faceDefs.forEach(({ face, A, B, C }) => {
      const normal = new THREE.Vector3().crossVectors(
        new THREE.Vector3().subVectors(B, A),
        new THREE.Vector3().subVectors(C, A)
      ).normalize();

      // Ensure normal points outward
      const centroid = new THREE.Vector3().add(A).add(B).add(C).multiplyScalar(1 / 3);
      if (normal.dot(centroid) < 0) normal.negate();

      // 9 grid triangles
      const G = (i, j) => {
        const pA = A.clone().multiplyScalar(1 - i / 3);
        const pB = B.clone().multiplyScalar((i - j) / 3);
        const pC = C.clone().multiplyScalar(j / 3);
        return new THREE.Vector3().add(pA).add(pB).add(pC);
      };

      const triangles = [
        [G(0, 0), G(1, 0), G(1, 1)], // 0
        [G(1, 0), G(2, 0), G(2, 1)], // 1
        [G(1, 0), G(2, 1), G(1, 1)], // 2
        [G(1, 1), G(2, 1), G(2, 2)], // 3
        [G(2, 0), G(3, 0), G(3, 1)], // 4
        [G(2, 0), G(3, 1), G(2, 1)], // 5
        [G(2, 1), G(3, 1), G(3, 2)], // 6
        [G(2, 1), G(3, 2), G(2, 2)], // 7
        [G(2, 2), G(3, 2), G(3, 3)], // 8
      ];

      triangles.forEach((pts, idx) => {
        const triCenter = new THREE.Vector3().add(pts[0]).add(pts[1]).add(pts[2]).multiplyScalar(1 / 3);
        const shrink = 0.90;
        const q0 = triCenter.clone().add(pts[0].clone().sub(triCenter).multiplyScalar(shrink)).addScaledVector(normal, 0.015);
        const q1 = triCenter.clone().add(pts[1].clone().sub(triCenter).multiplyScalar(shrink)).addScaledVector(normal, 0.015);
        const q2 = triCenter.clone().add(pts[2].clone().sub(triCenter).multiplyScalar(shrink)).addScaledVector(normal, 0.015);

        const triGeo = new THREE.BufferGeometry();
        triGeo.setAttribute('position', new THREE.Float32BufferAttribute([
          q0.x, q0.y, q0.z,
          q1.x, q1.y, q1.z,
          q2.x, q2.y, q2.z,
        ], 3));
        triGeo.computeVertexNormals();

        const mat = new THREE.MeshStandardMaterial({
          color: 0xFFFFFF,
          roughness: 0.25,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1
        });
        const mesh = new THREE.Mesh(triGeo, mat);
        mesh.userData = { face, index: idx, type: 'pyraminx' };
        this.puzzleGroup.add(mesh);
        this.interactiveMeshes.push(mesh);
      });
    });
  }

  // ==========================================
  // 3. MEGAMINX 3D BUILDER (Mathematically Perfect Regular Dodecahedron)
  // ==========================================
  buildMegaminx3D() {
    // Extract faces from Three.js DodecahedronGeometry (100% planar, perfectly regular)
    const dGeo = new THREE.DodecahedronGeometry(1.5);
    const pos = dGeo.attributes.position;
    const rawFaces = [];
    for (let i = 0; i < pos.count; i += 3) {
      const a = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
      const b = new THREE.Vector3(pos.getX(i + 1), pos.getY(i + 1), pos.getZ(i + 1));
      const c = new THREE.Vector3(pos.getX(i + 2), pos.getY(i + 2), pos.getZ(i + 2));
      const cb = new THREE.Vector3().subVectors(c, b);
      const ab = new THREE.Vector3().subVectors(a, b);
      const norm = new THREE.Vector3().crossVectors(cb, ab).normalize();

      let f = rawFaces.find(f => f.norm.dot(norm) > 0.99);
      if (!f) {
        f = { norm, verts: [] };
        rawFaces.push(f);
      }
      [a, b, c].forEach(p => {
        if (!f.verts.some(v => v.distanceTo(p) < 1e-4)) f.verts.push(p);
      });
    }

    // Rotate so top face points strictly along +Y (0, 1, 0)
    const f0Norm = rawFaces[0].norm;
    const rotAngle = -Math.atan2(f0Norm.z, f0Norm.y);
    const rotQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), rotAngle);

    rawFaces.forEach(f => {
      f.norm.applyQuaternion(rotQ);
      f.verts.forEach(v => v.applyQuaternion(rotQ));

      const center = new THREE.Vector3();
      f.verts.forEach(v => center.add(v));
      center.multiplyScalar(0.2);
      f.center = center;

      // Order vertices CCW around outward normal
      const up = Math.abs(f.norm.y) > 0.9 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0);
      const u = new THREE.Vector3().crossVectors(up, f.norm).normalize();
      const v = new THREE.Vector3().crossVectors(f.norm, u).normalize();

      f.verts.sort((p1, p2) => {
        const d1 = p1.clone().sub(center);
        const d2 = p2.clone().sub(center);
        const a1 = Math.atan2(d1.dot(v), d1.dot(u));
        const a2 = Math.atan2(d2.dot(v), d2.dot(u));
        return a1 - a2;
      });
    });

    const topFace = rawFaces.find(f => f.norm.y > 0.99);
    const bottomFace = rawFaces.find(f => f.norm.y < -0.99);
    const upper5 = rawFaces.filter(f => f.norm.y > 0.2 && f.norm.y < 0.8)
      .sort((a, b) => Math.atan2(a.norm.x, a.norm.z) - Math.atan2(b.norm.x, b.norm.z));
    const lower5 = rawFaces.filter(f => f.norm.y < -0.2 && f.norm.y > -0.8)
      .sort((a, b) => Math.atan2(a.norm.x, a.norm.z) - Math.atan2(b.norm.x, b.norm.z));

    const faceNames = ['U', 'F', 'BR', 'R', 'BL', 'L', 'DR', 'DBR', 'B', 'DBL', 'DL', 'D'];
    const orderedFaces = [topFace, ...upper5, ...lower5, bottomFace];

    // Build solid core (scaled 0.95 so it never intersects stickers)
    const coreVerts = [];
    orderedFaces.forEach(f => {
      if (!f) return;
      const coreC = f.center.clone().multiplyScalar(0.95);
      for (let i = 0; i < 5; i++) {
        const next = (i + 1) % 5;
        const v1 = f.verts[i].clone().multiplyScalar(0.95);
        const v2 = f.verts[next].clone().multiplyScalar(0.95);
        coreVerts.push(coreC.x, coreC.y, coreC.z);
        coreVerts.push(v1.x, v1.y, v1.z);
        coreVerts.push(v2.x, v2.y, v2.z);
      }
    });
    const coreGeo = new THREE.BufferGeometry();
    coreGeo.setAttribute('position', new THREE.Float32BufferAttribute(coreVerts, 3));
    coreGeo.computeVertexNormals();
    const coreMat = new THREE.MeshStandardMaterial({ color: 0x18181B, roughness: 0.8 });
    this.puzzleGroup.add(new THREE.Mesh(coreGeo, coreMat));

    // Build interactive stickers for each face
    orderedFaces.forEach((f, fIdx) => {
      const faceName = faceNames[fIdx];
      if (!faceName || !f) return;

      const fVerts = f.verts;
      const center = f.center;
      const normal = f.norm;

      // 1. Center Pentagon Sticker
      const centerPoly = [];
      for (let i = 0; i < 5; i++) {
        const pt = center.clone().add(fVerts[i].clone().sub(center).multiplyScalar(0.42));
        centerPoly.push(pt.addScaledVector(normal, 0.02));
      }
      this.createPolygonSticker(centerPoly, { face: faceName, part: 'center', type: 'megaminx' });

      // 2. 5 Edge Trapezoid Stickers
      for (let i = 0; i < 5; i++) {
        const next = (i + 1) % 5;
        const c1 = centerPoly[i];
        const c2 = centerPoly[next];
        const v1 = fVerts[i].clone().addScaledVector(normal, 0.02);
        const v2 = fVerts[next].clone().addScaledVector(normal, 0.02);
        const midOuter = new THREE.Vector3().addVectors(v1, v2).multiplyScalar(0.5);

        const edgePts = [
          c1.clone().lerp(c2, 0.1),
          c2.clone().lerp(c1, 0.1),
          midOuter.clone().lerp(v2, 0.45),
          midOuter.clone().lerp(v1, 0.45)
        ];
        this.createPolygonSticker(edgePts, { face: faceName, part: 'edge', index: i, type: 'megaminx' });
      }

      // 3. 5 Corner Kite Stickers
      for (let i = 0; i < 5; i++) {
        const prev = (i + 4) % 5;
        const next = (i + 1) % 5;
        const v = fVerts[i].clone().addScaledVector(normal, 0.02);
        const midPrev = new THREE.Vector3().addVectors(fVerts[i], fVerts[prev]).multiplyScalar(0.5).addScaledVector(normal, 0.02);
        const midNext = new THREE.Vector3().addVectors(fVerts[i], fVerts[next]).multiplyScalar(0.5).addScaledVector(normal, 0.02);
        const inPt = centerPoly[i];

        const cornerPts = [
          v.clone().lerp(center, 0.08),
          midNext.clone().lerp(v, 0.35),
          inPt.clone().lerp(v, 0.35),
          midPrev.clone().lerp(v, 0.35)
        ];
        this.createPolygonSticker(cornerPts, { face: faceName, part: 'corner', index: i, type: 'megaminx' });
      }
    });
  }

  createPolygonSticker(points, userData) {
    const geo = new THREE.BufferGeometry();
    const verts = [];
    const center = new THREE.Vector3();
    points.forEach(p => center.add(p));
    center.multiplyScalar(1 / points.length);

    // Ensure normal points strictly outward from puzzle center (0, 0, 0)
    let p0 = points[0];
    let p1 = points[1];
    let v0 = new THREE.Vector3().subVectors(p0, center);
    let v1 = new THREE.Vector3().subVectors(p1, center);
    let cross = new THREE.Vector3().crossVectors(v0, v1);
    const needReverse = cross.dot(center) < 0;

    for (let i = 0; i < points.length; i++) {
      const next = (i + 1) % points.length;
      verts.push(center.x, center.y, center.z);
      if (needReverse) {
        verts.push(points[next].x, points[next].y, points[next].z);
        verts.push(points[i].x, points[i].y, points[i].z);
      } else {
        verts.push(points[i].x, points[i].y, points[i].z);
        verts.push(points[next].x, points[next].y, points[next].z);
      }
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      color: 0xFFFFFF,
      roughness: 0.25,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData = userData;
    this.puzzleGroup.add(mesh);
    this.interactiveMeshes.push(mesh);
  }

  // ==========================================
  // 4. SKEWB 3D BUILDER (Cube with center diamond & 4 corner triangles)
  // ==========================================
  buildSkewb3D() {
    const H = 1.2;
    const coreGeo = new THREE.BoxGeometry(H * 1.95, H * 1.95, H * 1.95);
    const coreMat = new THREE.MeshStandardMaterial({ color: 0x18181B, roughness: 0.8 });
    this.puzzleGroup.add(new THREE.Mesh(coreGeo, coreMat));

    const faces = [
      { face: 'U', n: new THREE.Vector3(0, 1, 0), u: new THREE.Vector3(1, 0, 0), v: new THREE.Vector3(0, 0, -1) },
      { face: 'D', n: new THREE.Vector3(0, -1, 0), u: new THREE.Vector3(1, 0, 0), v: new THREE.Vector3(0, 0, 1) },
      { face: 'F', n: new THREE.Vector3(0, 0, 1), u: new THREE.Vector3(1, 0, 0), v: new THREE.Vector3(0, 1, 0) },
      { face: 'B', n: new THREE.Vector3(0, 0, -1), u: new THREE.Vector3(-1, 0, 0), v: new THREE.Vector3(0, 1, 0) },
      { face: 'L', n: new THREE.Vector3(-1, 0, 0), u: new THREE.Vector3(0, 0, -1), v: new THREE.Vector3(0, 1, 0) },
      { face: 'R', n: new THREE.Vector3(1, 0, 0), u: new THREE.Vector3(0, 0, 1), v: new THREE.Vector3(0, 1, 0) },
    ];

    faces.forEach(({ face, n, u, v }) => {
      const to3D = (px, py) => {
        return n.clone().multiplyScalar(H * 1.015)
          .add(u.clone().multiplyScalar(px))
          .add(v.clone().multiplyScalar(py));
      };

      // 1. Center Diamond (CCW in (u,v) plane: Top -> Left -> Bottom -> Right)
      const shrinkD = 0.94;
      const diamondPts = [
        to3D(0, H * shrinkD),
        to3D(-H * shrinkD, 0),
        to3D(0, -H * shrinkD),
        to3D(H * shrinkD, 0)
      ];
      this.createPolygonSticker(diamondPts, { face, part: 'center', type: 'skewb' });

      // 2. 4 Corner Triangles (all CCW so normal points strictly outward)
      // TL (0): (-H, H) -> (-H, 0) -> (0, H)
      // TR (1): (H, H) -> (0, H) -> (H, 0)
      // BR (2): (H, -H) -> (H, 0) -> (0, -H)
      // BL (3): (-H, -H) -> (0, -H) -> (-H, 0)
      const cornerDefs = [
        [to3D(-H, H), to3D(-H, 0), to3D(0, H)], // TL (0)
        [to3D(H, H), to3D(0, H), to3D(H, 0)],   // TR (1)
        [to3D(H, -H), to3D(H, 0), to3D(0, -H)], // BR (2)
        [to3D(-H, -H), to3D(0, -H), to3D(-H, 0)]// BL (3)
      ];

      cornerDefs.forEach((pts, i) => {
        const c = new THREE.Vector3().add(pts[0]).add(pts[1]).add(pts[2]).multiplyScalar(1 / 3);
        const shrink = 0.91;
        const q0 = c.clone().add(pts[0].clone().sub(c).multiplyScalar(shrink));
        const q1 = c.clone().add(pts[1].clone().sub(c).multiplyScalar(shrink));
        const q2 = c.clone().add(pts[2].clone().sub(c).multiplyScalar(shrink));
        this.createPolygonSticker([q0, q1, q2], { face, part: 'corner', index: i, type: 'skewb' });
      });
    });
  }

  // ==========================================
  // 5. WINDMILL CUBE 3D BUILDER (4 Triangles meeting at center on each face)
  // ==========================================
  buildWindmill3D() {
    const H = 1.2;
    const coreGeo = new THREE.BoxGeometry(H * 1.95, H * 1.95, H * 1.95);
    const coreMat = new THREE.MeshStandardMaterial({ color: 0x18181B, roughness: 0.8 });
    this.puzzleGroup.add(new THREE.Mesh(coreGeo, coreMat));

    const faces = [
      { face: 'U', n: new THREE.Vector3(0, 1, 0), u: new THREE.Vector3(1, 0, 0), v: new THREE.Vector3(0, 0, -1) },
      { face: 'D', n: new THREE.Vector3(0, -1, 0), u: new THREE.Vector3(1, 0, 0), v: new THREE.Vector3(0, 0, 1) },
      { face: 'F', n: new THREE.Vector3(0, 0, 1), u: new THREE.Vector3(1, 0, 0), v: new THREE.Vector3(0, 1, 0) },
      { face: 'B', n: new THREE.Vector3(0, 0, -1), u: new THREE.Vector3(-1, 0, 0), v: new THREE.Vector3(0, 1, 0) },
      { face: 'L', n: new THREE.Vector3(-1, 0, 0), u: new THREE.Vector3(0, 0, -1), v: new THREE.Vector3(0, 1, 0) },
      { face: 'R', n: new THREE.Vector3(1, 0, 0), u: new THREE.Vector3(0, 0, 1), v: new THREE.Vector3(0, 1, 0) },
    ];

    faces.forEach(({ face, n, u, v }) => {
      const to3D = (px, py) => {
        return n.clone().multiplyScalar(H * 1.015)
          .add(u.clone().multiplyScalar(px))
          .add(v.clone().multiplyScalar(py));
      };

      // 4 Triangles meeting at center (0, 0):
      // 0: Top, 1: Right, 2: Bottom, 3: Left
      const rawTriangles = [
        [to3D(-H, H), to3D(H, H), to3D(0, 0)],    // Top
        [to3D(H, H), to3D(H, -H), to3D(0, 0)],   // Right
        [to3D(H, -H), to3D(-H, -H), to3D(0, 0)], // Bottom
        [to3D(-H, -H), to3D(-H, H), to3D(0, 0)]  // Left
      ];

      rawTriangles.forEach((pts, idx) => {
        const c = new THREE.Vector3().add(pts[0]).add(pts[1]).add(pts[2]).multiplyScalar(1 / 3);
        const shrink = 0.92;
        const q0 = c.clone().add(pts[0].clone().sub(c).multiplyScalar(shrink));
        const q1 = c.clone().add(pts[1].clone().sub(c).multiplyScalar(shrink));
        const q2 = c.clone().add(pts[2].clone().sub(c).multiplyScalar(shrink));
        this.createPolygonSticker([q0, q1, q2], { face, index: idx, type: 'windmill' });
      });
    });
  }

  // ==========================================
  // 6. 3x3x4 CUBOID 3D BUILDER
  // ==========================================
  build3x3x43D() {
    const W = 2.4;  // X axis (3 columns)
    const D = 2.4;  // Z axis (3 columns)
    const H = 3.2;  // Y axis (4 layers)
    const cubieS = 0.8;

    const coreGeo = new THREE.BoxGeometry(W * 0.98, H * 0.98, D * 0.98);
    const coreMat = new THREE.MeshStandardMaterial({ color: 0x18181B, roughness: 0.8 });
    this.puzzleGroup.add(new THREE.Mesh(coreGeo, coreMat));

    const stickerS = cubieS * 0.90;
    const planeGeo = new THREE.PlaneGeometry(stickerS, stickerS);

    // Top (U) & Bottom (D) faces (3x3 grid)
    ['U', 'D'].forEach(face => {
      const isU = (face === 'U');
      const yVal = isU ? (H / 2 + 0.015) : (-H / 2 - 0.015);
      const rotX = isU ? (-Math.PI / 2) : (Math.PI / 2);

      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const mat = new THREE.MeshStandardMaterial({
            color: 0xFFFFFF,
            roughness: 0.25,
            side: THREE.DoubleSide,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -1
          });
          const mesh = new THREE.Mesh(planeGeo, mat);
          const x = (c - 1) * cubieS;
          const z = (r - 1) * cubieS;
          mesh.position.set(x, yVal, z);
          mesh.rotation.x = rotX;
          mesh.userData = { face, r, c, type: '3x3x4' };
          this.puzzleGroup.add(mesh);
          this.interactiveMeshes.push(mesh);
        }
      }
    });

    // Side faces (F, B, L, R) - 4 rows x 3 columns
    const sides = [
      { face: 'F', rotY: 0, posZ: D / 2 + 0.015, posX: 0 },
      { face: 'B', rotY: Math.PI, posZ: -D / 2 - 0.015, posX: 0 },
      { face: 'L', rotY: -Math.PI / 2, posZ: 0, posX: -W / 2 - 0.015 },
      { face: 'R', rotY: Math.PI / 2, posZ: 0, posX: W / 2 + 0.015 },
    ];

    sides.forEach(({ face, rotY, posZ, posX }) => {
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 3; c++) {
          const mat = new THREE.MeshStandardMaterial({
            color: 0xFFFFFF,
            roughness: 0.25,
            side: THREE.DoubleSide,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -1
          });
          const mesh = new THREE.Mesh(planeGeo, mat);
          const y = (1.5 - r) * cubieS; // r=0: 1.2, r=1: 0.4, r=2: -0.4, r=3: -1.2
          const colOffset = (c - 1) * cubieS;

          if (face === 'F' || face === 'B') {
            mesh.position.set(colOffset, y, posZ);
          } else {
            mesh.position.set(posX, y, colOffset);
          }
          mesh.rotation.y = rotY;
          mesh.userData = { face, r, c, type: '3x3x4' };
          this.puzzleGroup.add(mesh);
          this.interactiveMeshes.push(mesh);
        }
      }
    });
  }

  // ==========================================
  // COLOR SYNCHRONIZATION
  // ==========================================
  updateColors() {
    if (!this.state) return;

    this.interactiveMeshes.forEach(mesh => {
      const u = mesh.userData;
      if (!u) return;

      let hexColor = '#FFFFFF';
      if (u.type === 'sticker') {
        const faceGrid = this.state.faces[u.face];
        if (faceGrid && faceGrid[u.r] && faceGrid[u.r][u.c]) {
          hexColor = faceGrid[u.r][u.c];
        }
      } else if (u.type === 'pyraminx') {
        const faceArray = this.state.faces[u.face];
        if (faceArray && faceArray[u.index]) {
          hexColor = faceArray[u.index];
        }
      } else if (u.type === 'megaminx') {
        const faceData = this.state.faces[u.face];
        if (faceData) {
          if (u.part === 'center') hexColor = faceData.center;
          else if (u.part === 'edge') hexColor = faceData.edges[u.index];
          else if (u.part === 'corner') hexColor = faceData.corners[u.index];
        }
      } else if (u.type === 'skewb') {
        const faceData = this.state.faces[u.face];
        if (faceData) {
          if (u.part === 'center') hexColor = faceData.center;
          else if (u.part === 'corner') hexColor = faceData.corners[u.index];
        }
      } else if (u.type === 'windmill') {
        const faceArray = this.state.faces[u.face];
        if (faceArray && faceArray[u.index]) {
          hexColor = faceArray[u.index];
        }
      } else if (u.type === '3x3x4') {
        const faceGrid = this.state.faces[u.face];
        if (faceGrid && faceGrid[u.r] && faceGrid[u.r][u.c]) {
          hexColor = faceGrid[u.r][u.c];
        }
      }

      u.color = hexColor;
      if (mesh.material && mesh.material.color) {
        mesh.material.color.set(hexColor);
      }
    });
  }

  resetCamera() {
    this.camera.position.set(4, 3.5, 5);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  resize() {
    if (!this.container || !this.renderer) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  animate() {
    requestAnimationFrame(this.animate);
    if (this.controls) this.controls.update();
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  exportImage() {
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL('image/png');
  }
}

window.ThreeCubeView = ThreeCubeView;
