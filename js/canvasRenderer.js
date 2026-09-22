/**
 * canvasRenderer.js - 2D Canvas & Vector SVG Rendering Engine
 * Handles Face View (with adjacent OLL/PLL rims), Layer Slice View, Full Unfolded Net View.
 */

class CubeCanvasRenderer {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.state = null; // Cube state
    this.viewMode = 'face'; // 'face' | 'slice' | 'net'
    this.activeFace = 'U';
    this.activeSliceIndex = 0;
    this.sliceAxis = 'Y'; // 'Y' (Horizontal/E), 'X' (Vertical/M), 'Z' (Vertical/S)
    
    // View Options
    this.showRim = false; // Only show cross-section by default (no extraneous rims)
    this.showLabels = false; // Piece index or coordinate labels
    this.showFaceNames = true;
    this.rimThicknessRatio = 0.22; // Thickness of adjacent rim relative to face size
    this.backgroundColor = 'transparent'; // 'transparent' | '#FFFFFF' | '#1E1E1E'
    this.cornerRoundness = 0.12; // Sticker corner roundness ratio

    // Interaction state
    this.zoom = 1.0;
    this.pan = { x: 0, y: 0 };
    this.isPanning = false;
    this.panStart = { x: 0, y: 0 };
    this.hoveredItem = null;
    this.isPainting = false;

    // Callbacks
    this.onPaint = options.onPaint || null;
    this.onPickColor = options.onPickColor || null;

    // Cache of interactive hit-regions
    this.hitRegions = [];

    this.initEvents();
  }

  setState(state) {
    this.state = state;
    this.render();
  }

  setViewMode(mode) {
    this.viewMode = mode;
    this.resetTransform();
    this.render();
  }

  setActiveFace(face) {
    this.activeFace = face;
    this.render();
  }

  setActiveSlice(index, axis = 'Y') {
    this.activeSliceIndex = index;
    this.sliceAxis = axis;
    this.render();
  }

  resetTransform() {
    this.zoom = 1.0;
    this.pan = { x: 0, y: 0 };
    this.render();
  }

  initEvents() {
    const cvs = this.canvas;

    cvs.addEventListener('mousedown', (e) => {
      if (e.button === 1 || (e.button === 0 && e.shiftKey)) { // Middle button or Shift+Left for Pan
        this.isPanning = true;
        this.panStart = { x: e.clientX - this.pan.x, y: e.clientY - this.pan.y };
        cvs.style.cursor = 'grab';
        return;
      }
      if (e.button === 0) {
        this.isPainting = true;
        this.handlePointerAction(e);
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isPanning) {
        this.pan.x = e.clientX - this.panStart.x;
        this.pan.y = e.clientY - this.panStart.y;
        this.render();
        return;
      }

      const rect = cvs.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;

      if (clientX >= 0 && clientX <= rect.width && clientY >= 0 && clientY <= rect.height) {
        const hit = this.hitTest(clientX, clientY);
        if (hit !== this.hoveredItem) {
          this.hoveredItem = hit;
          this.render();
        }
        if (this.isPainting && hit) {
          this.handlePointerAction(e);
        }
      } else {
        if (this.hoveredItem) {
          this.hoveredItem = null;
          this.render();
        }
      }
    });

    window.addEventListener('mouseup', () => {
      this.isPanning = false;
      this.isPainting = false;
      cvs.style.cursor = 'default';
    });

    cvs.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      const newZoom = Math.min(Math.max(this.zoom * zoomFactor, 0.4), 4.0);
      
      const rect = cvs.getBoundingClientRect();
      const mouseX = e.clientX - rect.left - cvs.width / 2;
      const mouseY = e.clientY - rect.top - cvs.height / 2;

      this.pan.x -= mouseX * (zoomFactor - 1);
      this.pan.y -= mouseY * (zoomFactor - 1);
      this.zoom = newZoom;
      this.render();
    }, { passive: false });
  }

  handlePointerAction(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const hit = this.hitTest(x, y);
    if (!hit) return;

    if (e.altKey) {
      // Eyedropper mode via Alt key
      if (this.onPickColor) {
        this.onPickColor(hit.color);
      }
      return;
    }

    if (this.onPaint) {
      this.onPaint(hit);
    }
  }

  hitTest(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;

    // Convert CSS client coordinates to canvas internal pixel coordinates
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const px = clientX * scaleX;
    const py = clientY * scaleY;

    // Apply exact transformation matrix used in render()
    this.ctx.save();
    this.ctx.translate(this.canvas.width / 2 + this.pan.x, this.canvas.height / 2 + this.pan.y);
    this.ctx.scale(this.zoom, this.zoom);

    let found = null;
    for (let i = this.hitRegions.length - 1; i >= 0; i--) {
      const region = this.hitRegions[i];
      if (this.ctx.isPointInPath(region.path, px, py)) {
        found = region;
        break;
      }
    }
    this.ctx.restore();
    return found;
  }

  isPointInPath(path, x, y) {
    return this.ctx.isPointInPath(path, x, y);
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.render();
  }

  /**
   * Main Render function
   */
  render() {
    if (!this.state) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Clear
    ctx.clearRect(0, 0, w, h);
    if (this.backgroundColor && this.backgroundColor !== 'transparent') {
      ctx.fillStyle = this.backgroundColor;
      ctx.fillRect(0, 0, w, h);
    }

    // Reset hit regions
    this.hitRegions = [];

    // Save context transform
    ctx.save();

    // Center and apply pan & zoom
    ctx.translate(w / 2 + this.pan.x, h / 2 + this.pan.y);
    ctx.scale(this.zoom, this.zoom);

    const config = CUBE_TYPES[this.state.cubeId];

    if (this.viewMode === 'face') {
      this.renderFaceView(ctx, config);
    } else if (this.viewMode === 'slice') {
      this.renderSliceView(ctx, config);
    } else if (this.viewMode === 'net') {
      this.renderNetView(ctx, config);
    }

    ctx.restore();
  }

  // ==========================================
  // 1. FACE SECTION VIEW (with adjacent rim)
  // ==========================================
  renderFaceView(ctx, config) {
    const face = this.activeFace;
    const baseSize = Math.min(this.canvas.width, this.canvas.height) * 0.72;
    
    if (config.type === 'nxn' || config.type === '3x3x4') {
      this.renderNxNFace(ctx, config, face, 0, 0, baseSize, this.showRim);
    } else if (config.type === 'pyraminx') {
      this.renderPyraminxFace(ctx, face, 0, 0, baseSize);
    } else if (config.type === 'megaminx') {
      this.renderMegaminxFace(ctx, face, 0, 0, baseSize);
    } else if (config.type === 'skewb') {
      this.renderSkewbFace(ctx, face, 0, 0, baseSize);
    } else if (config.type === 'windmill') {
      this.renderWindmillFace(ctx, face, 0, 0, baseSize);
    }

    // Face Name Title
    if (this.showFaceNames) {
      ctx.save();
      ctx.fillStyle = '#94A3B8';
      ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      const info = FACE_INFO[face] || { name: face };
      ctx.fillText(`${info.name} 단면`, 0, -baseSize / 2 - 20);
      ctx.restore();
    }
  }

  renderNxNFace(ctx, config, face, cx, cy, size, includeRim = false) {
    const grid = this.state.faces[face];
    if (!grid) return;
    const rows = grid.length;
    const cols = grid[0].length;
    const cellSize = size / Math.max(rows, cols);
    const gap = Math.max(3, cellSize * 0.04);
    const stickerSize = cellSize - gap;
    const startX = cx - (cols * cellSize) / 2;
    const startY = cy - (rows * cellSize) / 2;
    const radius = Math.max(3, stickerSize * this.cornerRoundness);

    // 1. Draw Main Face Grid
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const color = grid[r][c];
        const sx = startX + c * cellSize + gap / 2;
        const sy = startY + r * cellSize + gap / 2;
        
        const path = new Path2D();
        this.addRoundedRect(path, sx, sy, stickerSize, stickerSize, radius);

        this.drawSticker(ctx, path, color, { face, r, c, type: 'sticker' });

        // Optional label
        if (this.showLabels) {
          this.drawLabel(ctx, `${r},${c}`, sx + stickerSize / 2, sy + stickerSize / 2, color);
        }
      }
    }

    // 2. Draw Adjacent Rims (only if explicitly enabled)
    if (includeRim && config.type === 'nxn' && rows === cols) {
      const order = rows;
      const rims = getAdjacentRimsNxN(face, order);
      if (rims) {
        const rimThickness = cellSize * 0.45;
        const rimOffset = gap * 1.5;

        // Top Rim
        for (let i = 0; i < order; i++) {
          const coord = rims.top.coord(i);
          const color = this.state.faces[rims.top.face]?.[coord.r]?.[coord.c] || '#475569';
          const rx = startX + i * cellSize + gap / 2;
          const ry = startY - rimThickness - rimOffset;
          const path = new Path2D();
          this.addRoundedRect(path, rx, ry, stickerSize, rimThickness, radius * 0.6);
          this.drawSticker(ctx, path, color, { face: rims.top.face, r: coord.r, c: coord.c, type: 'rim', rimSide: 'top', rimIndex: i });
        }

        // Bottom Rim
        for (let i = 0; i < order; i++) {
          const coord = rims.bottom.coord(i);
          const color = this.state.faces[rims.bottom.face]?.[coord.r]?.[coord.c] || '#475569';
          const rx = startX + i * cellSize + gap / 2;
          const ry = startY + rows * cellSize + rimOffset;
          const path = new Path2D();
          this.addRoundedRect(path, rx, ry, stickerSize, rimThickness, radius * 0.6);
          this.drawSticker(ctx, path, color, { face: rims.bottom.face, r: coord.r, c: coord.c, type: 'rim', rimSide: 'bottom', rimIndex: i });
        }

        // Left Rim
        for (let i = 0; i < order; i++) {
          const coord = rims.left.coord(i);
          const color = this.state.faces[rims.left.face]?.[coord.r]?.[coord.c] || '#475569';
          const rx = startX - rimThickness - rimOffset;
          const ry = startY + i * cellSize + gap / 2;
          const path = new Path2D();
          this.addRoundedRect(path, rx, ry, rimThickness, stickerSize, radius * 0.6);
          this.drawSticker(ctx, path, color, { face: rims.left.face, r: coord.r, c: coord.c, type: 'rim', rimSide: 'left', rimIndex: i });
        }

        // Right Rim
        for (let i = 0; i < order; i++) {
          const coord = rims.right.coord(i);
          const color = this.state.faces[rims.right.face]?.[coord.r]?.[coord.c] || '#475569';
          const rx = startX + cols * cellSize + rimOffset;
          const ry = startY + i * cellSize + gap / 2;
          const path = new Path2D();
          this.addRoundedRect(path, rx, ry, rimThickness, stickerSize, radius * 0.6);
          this.drawSticker(ctx, path, color, { face: rims.right.face, r: coord.r, c: coord.c, type: 'rim', rimSide: 'right', rimIndex: i });
        }
      }
    }
  }

  // ==========================================
  // 2. LAYER SLICE VIEW (층별 절단면 단면도)
  // ==========================================
  renderSliceView(ctx, config) {
    if (config.type !== 'nxn' && config.type !== '3x3x4') {
      this.renderFaceView(ctx, config);
      return;
    }

    const N = (config.type === '3x3x4') ? 3 : (config.order || 3);
    const maxSlice = (config.type === '3x3x4') ? 4 : N;
    const sliceIdx = Math.min(Math.max(this.activeSliceIndex, 0), maxSlice - 1);
    const baseSize = Math.min(this.canvas.width, this.canvas.height) * 0.72;
    const cellSize = baseSize / N;
    const gap = Math.max(3, cellSize * 0.04);
    const stickerSize = cellSize - gap;
    const startX = -baseSize / 2;
    const startY = -baseSize / 2;
    const radius = Math.max(3, stickerSize * this.cornerRoundness);

    // Header Title
    ctx.save();
    ctx.fillStyle = '#94A3B8';
    ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    let sliceName = `가로 ${sliceIdx + 1}층 절단면 (총 ${maxSlice}층)`;
    if (sliceIdx === 0) sliceName += ' - 상층 (U면)';
    else if (sliceIdx === maxSlice - 1) sliceName += ' - 하층 (D면)';
    else sliceName += ' - 내부 절단면';
    ctx.fillText(sliceName, 0, -baseSize / 2 - 20);
    ctx.restore();

    // Pure Slice Matrix (단면 조각들만 깔끔하게 렌더링)
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const sx = startX + c * cellSize + gap / 2;
        const sy = startY + r * cellSize + gap / 2;

        let pieceColor = '#334155';
        if (this.state.slices && this.state.slices[sliceIdx] && this.state.slices[sliceIdx][r]) {
          pieceColor = this.state.slices[sliceIdx][r][c];
        } else if (sliceIdx === 0 && this.state.faces.U) {
          pieceColor = this.state.faces.U[r][c];
        } else if (sliceIdx === N - 1 && this.state.faces.D) {
          pieceColor = this.state.faces.D[r][c];
        }

        const path = new Path2D();
        this.addRoundedRect(path, sx, sy, stickerSize, stickerSize, radius);

        this.drawSticker(ctx, path, pieceColor, { sliceIdx, r, c, type: 'slice' });

        if (this.showLabels) {
          this.drawLabel(ctx, `${r},${c}`, sx + stickerSize / 2, sy + stickerSize / 2, pieceColor);
        }
      }
    }
  }

  // ==========================================
  // 3. FULL UNFOLDED NET VIEW (전개도)
  // ==========================================
  renderNetView(ctx, config) {
    if (config.type === 'nxn' || config.type === 'skewb' || config.type === 'windmill' || config.type === '3x3x4') {
      this.renderCubeNet(ctx, config);
    } else if (config.type === 'pyraminx') {
      this.renderPyraminxNet(ctx, config);
    } else if (config.type === 'megaminx') {
      this.renderMegaminxNet(ctx, config);
    } else {
      this.renderFaceView(ctx, config);
    }
  }

  renderCubeNet(ctx, config) {
    // Cross layout:
    //      [U]
    //  [L] [F] [R] [B]
    //      [D]
    const baseW = Math.min(this.canvas.width, this.canvas.height) * 0.85;
    const faceSize = baseW / 4.4;
    const spacing = faceSize * 1.08;

    const layout = [
      { face: 'U', x: 0, y: -spacing },
      { face: 'L', x: -spacing, y: 0 },
      { face: 'F', x: 0, y: 0 },
      { face: 'R', x: spacing, y: 0 },
      { face: 'B', x: spacing * 2, y: 0 },
      { face: 'D', x: 0, y: spacing }
    ];

    // Center offset
    const offsetX = -spacing * 0.5;

    layout.forEach(item => {
      const cx = item.x + offsetX;
      const cy = item.y;
      
      if (config.type === 'nxn' || config.type === '3x3x4') {
        this.renderNxNFace(ctx, config, item.face, cx, cy, faceSize, false);
      } else if (config.type === 'skewb') {
        this.renderSkewbFace(ctx, item.face, cx, cy, faceSize);
      } else if (config.type === 'windmill') {
        this.renderWindmillFace(ctx, item.face, cx, cy, faceSize);
      }

      // Face label
      ctx.save();
      ctx.fillStyle = '#E2E8F0';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(item.face, cx, cy - faceSize / 2 - 8);
      ctx.restore();
    });
  }

  // ==========================================
  // PYRAMINX RENDERING (Equilateral Triangle with 9 stickers)
  // ==========================================
  renderPyraminxFace(ctx, face, cx, cy, size) {
    const stickers = this.state.faces[face] || Array(9).fill('#FFD500');
    const h = size * Math.sqrt(3) / 2;
    const topY = cy - h * (2 / 3);
    const bottomY = cy + h * (1 / 3);

    const A = { x: cx, y: topY };
    const B = { x: cx - size / 2, y: bottomY };
    const C = { x: cx + size / 2, y: bottomY };

    const G = (i, j) => {
      const wA = 1 - i / 3;
      const wB = (i - j) / 3;
      const wC = j / 3;
      return {
        x: wA * A.x + wB * B.x + wC * C.x,
        y: wA * A.y + wB * B.y + wC * C.y
      };
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
      [G(2, 2), G(3, 2), G(3, 3)]  // 8
    ];

    triangles.forEach((pts, idx) => {
      const mx = (pts[0].x + pts[1].x + pts[2].x) / 3;
      const my = (pts[0].y + pts[1].y + pts[2].y) / 3;
      const shrink = 0.92;

      const path = new Path2D();
      pts.forEach((p, k) => {
        const qx = mx + (p.x - mx) * shrink;
        const qy = my + (p.y - my) * shrink;
        if (k === 0) path.moveTo(qx, qy);
        else path.lineTo(qx, qy);
      });
      path.closePath();

      const color = stickers[idx];
      this.drawSticker(ctx, path, color, { face, index: idx, type: 'pyraminx' });
    });
  }

  renderPyraminxNet(ctx, config) {
    const size = Math.min(this.canvas.width, this.canvas.height) * 0.38;
    const h = size * Math.sqrt(3) / 2;

    this.renderPyraminxFace(ctx, 'U', 0, 0, size);
    this.renderPyraminxFace(ctx, 'L', -size * 0.75, h * 0.5, size);
    this.renderPyraminxFace(ctx, 'R', size * 0.75, h * 0.5, size);
    this.renderPyraminxFace(ctx, 'B', 0, -h, size);
  }

  // ==========================================
  // MEGAMINX RENDERING (Matching reference photo: 1 center pentagon, 5 corner kites, 5 edge trapezoids)
  // ==========================================
  renderMegaminxFace(ctx, face, cx, cy, size) {
    const data = this.state.faces[face] || {
      center: '#FFFFFF',
      edges: Array(5).fill('#FFFFFF'),
      corners: Array(5).fill('#FFFFFF')
    };

    const R_outer = size * 0.46;
    const R_center = R_outer * 0.42;

    const angles = [];
    for (let i = 0; i < 5; i++) {
      angles.push(-Math.PI / 2 + (i * 2 * Math.PI) / 5);
    }

    // Outer pentagon vertices P0..P4
    const P = angles.map(ang => ({
      x: cx + R_outer * Math.cos(ang),
      y: cy + R_outer * Math.sin(ang)
    }));

    // Center pentagon vertices K0..K4
    const K = angles.map(ang => ({
      x: cx + R_center * Math.cos(ang),
      y: cy + R_center * Math.sin(ang)
    }));

    // 1. Center regular pentagon
    const centerPath = new Path2D();
    const shrinkC = 0.94;
    K.forEach((pt, i) => {
      const qx = cx + (pt.x - cx) * shrinkC;
      const qy = cy + (pt.y - cy) * shrinkC;
      if (i === 0) centerPath.moveTo(qx, qy);
      else centerPath.lineTo(qx, qy);
    });
    centerPath.closePath();
    this.drawSticker(ctx, centerPath, data.center, { face, part: 'center', type: 'megaminx' });

    // Edge cut points along outer boundary
    const E1 = [];
    const E2 = [];
    for (let i = 0; i < 5; i++) {
      const next = (i + 1) % 5;
      E1.push({
        x: P[i].x + 0.35 * (P[next].x - P[i].x),
        y: P[i].y + 0.35 * (P[next].y - P[i].y)
      });
      E2.push({
        x: P[i].x + 0.65 * (P[next].x - P[i].x),
        y: P[i].y + 0.65 * (P[next].y - P[i].y)
      });
    }

    // 2. 5 Corner Diamond/Kite Stickers (at each outer vertex P[i])
    for (let i = 0; i < 5; i++) {
      const prev = (i + 4) % 5;
      const pts = [P[i], E1[i], K[i], E2[prev]];
      const mx = (pts[0].x + pts[1].x + pts[2].x + pts[3].x) / 4;
      const my = (pts[0].y + pts[1].y + pts[2].y + pts[3].y) / 4;
      const shrink = 0.92;

      const path = new Path2D();
      pts.forEach((p, k) => {
        const qx = mx + (p.x - mx) * shrink;
        const qy = my + (p.y - my) * shrink;
        if (k === 0) path.moveTo(qx, qy);
        else path.lineTo(qx, qy);
      });
      path.closePath();
      this.drawSticker(ctx, path, data.corners[i], { face, part: 'corner', index: i, type: 'megaminx' });
    }

    // 3. 5 Edge Trapezoid Stickers (between corner i and corner next)
    for (let i = 0; i < 5; i++) {
      const next = (i + 1) % 5;
      const pts = [E1[i], E2[i], K[next], K[i]];
      const mx = (pts[0].x + pts[1].x + pts[2].x + pts[3].x) / 4;
      const my = (pts[0].y + pts[1].y + pts[2].y + pts[3].y) / 4;
      const shrink = 0.92;

      const path = new Path2D();
      pts.forEach((p, k) => {
        const qx = mx + (p.x - mx) * shrink;
        const qy = my + (p.y - my) * shrink;
        if (k === 0) path.moveTo(qx, qy);
        else path.lineTo(qx, qy);
      });
      path.closePath();
      this.drawSticker(ctx, path, data.edges[i], { face, part: 'edge', index: i, type: 'megaminx' });
    }
  }

  renderMegaminxNet(ctx, config) {
    const size = Math.min(this.canvas.width, this.canvas.height) * 0.22;
    const R = size * 0.82;

    // Top flower (U in center, 5 surrounding: F, BR, R, BL, L)
    this.renderMegaminxFace(ctx, 'U', -R * 1.5, 0, size);
    const faces1 = ['F', 'BR', 'R', 'BL', 'L'];
    for (let i = 0; i < 5; i++) {
      const ang = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
      const fx = -R * 1.5 + R * 1.15 * Math.cos(ang);
      const fy = R * 1.15 * Math.sin(ang);
      this.renderMegaminxFace(ctx, faces1[i], fx, fy, size);
    }

    // Bottom flower (D in center, 5 surrounding: DR, DBR, B, DBL, DL)
    this.renderMegaminxFace(ctx, 'D', R * 1.5, 0, size);
    const faces2 = ['DR', 'DBR', 'B', 'DBL', 'DL'];
    for (let i = 0; i < 5; i++) {
      const ang = Math.PI / 2 + (i * 2 * Math.PI) / 5;
      const fx = R * 1.5 + R * 1.15 * Math.cos(ang);
      const fy = R * 1.15 * Math.sin(ang);
      this.renderMegaminxFace(ctx, faces2[i], fx, fy, size);
    }
  }

  // ==========================================
  // SKEWB RENDERING (1 Center Diamond + 4 Corners)
  // ==========================================
  renderSkewbFace(ctx, face, cx, cy, size) {
    const data = this.state.faces[face] || { center: '#FFFFFF', corners: Array(4).fill('#FFFFFF') };
    const H = size * 0.40;

    // Center Diamond
    const midT = { x: cx, y: cy - H };
    const midR = { x: cx + H, y: cy };
    const midB = { x: cx, y: cy + H };
    const midL = { x: cx - H, y: cy };

    const shrinkD = 0.94;
    const centerPath = new Path2D();
    centerPath.moveTo(cx, cy - H * shrinkD);
    centerPath.lineTo(cx + H * shrinkD, cy);
    centerPath.lineTo(cx, cy + H * shrinkD);
    centerPath.lineTo(cx - H * shrinkD, cy);
    centerPath.closePath();
    this.drawSticker(ctx, centerPath, data.center, { face, part: 'center', type: 'skewb' });

    // 4 Corner Triangles: TL (0), TR (1), BR (2), BL (3)
    const corners = [
      [{ x: cx - H, y: cy - H }, midT, midL], // TL
      [{ x: cx + H, y: cy - H }, midR, midT], // TR
      [{ x: cx + H, y: cy + H }, midB, midR], // BR
      [{ x: cx - H, y: cy + H }, midL, midB], // BL
    ];

    corners.forEach((pts, i) => {
      const mx = (pts[0].x + pts[1].x + pts[2].x) / 3;
      const my = (pts[0].y + pts[1].y + pts[2].y) / 3;
      const shrink = 0.92;
      const p = new Path2D();
      pts.forEach((pt, k) => {
        const qx = mx + (pt.x - mx) * shrink;
        const qy = my + (pt.y - my) * shrink;
        if (k === 0) p.moveTo(qx, qy);
        else p.lineTo(qx, qy);
      });
      p.closePath();
      this.drawSticker(ctx, p, data.corners[i], { face, part: 'corner', index: i, type: 'skewb' });
    });
  }

  // ==========================================
  // WINDMILL CUBE RENDERING (4 Triangles meeting at center on each face)
  // ==========================================
  renderWindmillFace(ctx, face, cx, cy, size) {
    const stickers = this.state.faces[face] || Array(4).fill('#FFFFFF');
    const H = size * 0.44;

    // 4 Triangles meeting at center (cx, cy):
    // 0: Top, 1: Right, 2: Bottom, 3: Left
    const triangles = [
      [{ x: cx - H, y: cy - H }, { x: cx + H, y: cy - H }, { x: cx, y: cy }], // Top
      [{ x: cx + H, y: cy - H }, { x: cx + H, y: cy + H }, { x: cx, y: cy }], // Right
      [{ x: cx + H, y: cy + H }, { x: cx - H, y: cy + H }, { x: cx, y: cy }], // Bottom
      [{ x: cx - H, y: cy + H }, { x: cx - H, y: cy - H }, { x: cx, y: cy }], // Left
    ];

    triangles.forEach((pts, idx) => {
      const mx = (pts[0].x + pts[1].x + pts[2].x) / 3;
      const my = (pts[0].y + pts[1].y + pts[2].y) / 3;
      const shrink = 0.93;
      const q = pts.map(p => ({
        x: mx + (p.x - mx) * shrink,
        y: my + (p.y - my) * shrink
      }));

      const path = new Path2D();
      path.moveTo(q[0].x, q[0].y);
      path.lineTo(q[1].x, q[1].y);
      path.lineTo(q[2].x, q[2].y);
      path.closePath();

      this.drawSticker(ctx, path, stickers[idx], { face, index: idx, type: 'windmill' });
    });
  }

  // ==========================================
  // DRAW UTILITIES
  // ==========================================
  drawSticker(ctx, path, color, regionData) {
    const isHovered = this.hoveredItem && this.isMatch(this.hoveredItem, regionData);

    ctx.save();

    // Fill
    ctx.fillStyle = color || '#FFFFFF';
    ctx.fill(path);

    // Hover Highlight
    if (isHovered) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.fill(path);
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 3;
    } else {
      ctx.strokeStyle = '#18181B';
      ctx.lineWidth = 2;
    }

    ctx.stroke(path);
    ctx.restore();

    // Store for hit-testing
    this.hitRegions.push({
      path,
      color,
      ...regionData
    });
  }

  isMatch(a, b) {
    if (a.face !== b.face || a.type !== b.type) return false;
    if (a.r !== undefined && a.r !== b.r) return false;
    if (a.c !== undefined && a.c !== b.c) return false;
    if (a.index !== undefined && a.index !== b.index) return false;
    if (a.part !== undefined && a.part !== b.part) return false;
    return true;
  }

  addRoundedRect(path, x, y, width, height, radius) {
    path.moveTo(x + radius, y);
    path.lineTo(x + width - radius, y);
    path.quadraticCurveTo(x + width, y, x + width, y + radius);
    path.lineTo(x + width, y + height - radius);
    path.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    path.lineTo(x + radius, y + height);
    path.quadraticCurveTo(x, y + height, x, y + height - radius);
    path.lineTo(x, y + radius);
    path.quadraticCurveTo(x, y, x + radius, y);
    path.closePath();
  }

  drawLabel(ctx, text, x, y, bgColor) {
    ctx.save();
    // Contrast calculation
    const dark = this.isColorDark(bgColor);
    ctx.fillStyle = dark ? '#FFFFFF' : '#000000';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  isColorDark(hex) {
    if (!hex || hex[0] !== '#') return false;
    const r = parseInt(hex.substr(1, 2), 16) || 0;
    const g = parseInt(hex.substr(3, 2), 16) || 0;
    const b = parseInt(hex.substr(5, 2), 16) || 0;
    return (r * 0.299 + g * 0.587 + b * 0.114) < 140;
  }

  /**
   * Export high-resolution image of current view without clipping
   */
  exportImage(scale = 2, format = 'png', bgColor = 'transparent') {
    const offscreen = document.createElement('canvas');
    let exportW, exportH;

    if (this.viewMode === 'net') {
      // Widescreen canvas for unfolded net
      exportW = Math.round(1280 * scale);
      exportH = Math.round(960 * scale);
    } else {
      // Square canvas for Face or Slice view with generous padding
      exportW = Math.round(900 * scale);
      exportH = Math.round(900 * scale);
    }

    offscreen.width = exportW;
    offscreen.height = exportH;

    const offRenderer = new CubeCanvasRenderer(offscreen);
    offRenderer.state = this.state;
    offRenderer.viewMode = this.viewMode;
    offRenderer.activeFace = this.activeFace;
    offRenderer.activeSliceIndex = this.activeSliceIndex;
    offRenderer.sliceAxis = this.sliceAxis;
    offRenderer.showRim = this.showRim;
    offRenderer.showLabels = this.showLabels;
    offRenderer.showFaceNames = this.showFaceNames;
    offRenderer.backgroundColor = bgColor;
    // Always perfectly centered and unclipped, ignore screen drag pan & interactive zoom
    offRenderer.zoom = 1.0;
    offRenderer.pan = { x: 0, y: 0 };

    offRenderer.render();

    return offscreen;
  }
}

window.CubeCanvasRenderer = CubeCanvasRenderer;
