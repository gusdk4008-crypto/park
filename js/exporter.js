/**
 * exporter.js - Image Export & Clipboard Copy System
 * Supports high-res PNG (transparent/white), JPG, SVG, and Direct Clipboard Copy
 */

class CubeExporter {
  constructor(renderer2D, view3D) {
    this.renderer2D = renderer2D;
    this.view3D = view3D;
  }

  /**
   * Downloads an image file
   */
  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /**
   * Export 2D View as PNG
   */
  export2DPNG({ scale = 2, background = 'transparent', filename = 'cube_section.png' } = {}) {
    const offscreen = this.renderer2D.exportImage(scale, 'png', background);
    offscreen.toBlob((blob) => {
      if (blob) {
        this.downloadBlob(blob, filename);
      }
    }, 'image/png');
  }

  /**
   * Export 2D View as JPG
   */
  export2DJPG({ scale = 2, quality = 0.95, filename = 'cube_section.jpg' } = {}) {
    // JPG requires opaque background
    const offscreen = this.renderer2D.exportImage(scale, 'jpeg', '#FFFFFF');
    offscreen.toBlob((blob) => {
      if (blob) {
        this.downloadBlob(blob, filename);
      }
    }, 'image/jpeg', quality);
  }

  /**
   * Copy 2D View directly to System Clipboard (PNG)
   */
  async copy2DToClipboard({ scale = 2, background = 'transparent' } = {}) {
    try {
      const offscreen = this.renderer2D.exportImage(scale, 'png', background);
      return new Promise((resolve, reject) => {
        offscreen.toBlob(async (blob) => {
          if (!blob) {
            reject(new Error('Failed to create blob'));
            return;
          }
          try {
            const item = new ClipboardItem({ 'image/png': blob });
            await navigator.clipboard.write([item]);
            resolve(true);
          } catch (err) {
            console.error('Clipboard write error:', err);
            reject(err);
          }
        }, 'image/png');
      });
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  /**
   * Export 3D View as PNG
   */
  export3DPNG({ filename = 'cube_3d.png' } = {}) {
    if (!this.view3D) return;
    const dataUrl = this.view3D.exportImage();
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  /**
   * Copy 3D View to Clipboard
   */
  async copy3DToClipboard() {
    if (!this.view3D) return;
    const dom = this.view3D.renderer.domElement;
    return new Promise((resolve, reject) => {
      dom.toBlob(async (blob) => {
        if (!blob) return reject(new Error('Blob creation failed'));
        try {
          const item = new ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([item]);
          resolve(true);
        } catch (err) {
          reject(err);
        }
      }, 'image/png');
    });
  }

  /**
   * Export All Faces Summary Sheet (한 장에 모든 면 단면 종합)
   */
  exportAllFacesSheet({ scale = 2, filename = 'all_faces_sheet.png' } = {}) {
    const config = CUBE_TYPES[this.renderer2D.state.cubeId];
    if (!config) return;

    const faces = config.faces;
    const faceCount = faces.length;
    const cols = (faceCount <= 6) ? 3 : 4;
    const rows = Math.ceil(faceCount / cols);

    const cellW = 320 * scale;
    const cellH = 320 * scale;
    const padding = 20 * scale;

    const sheetCanvas = document.createElement('canvas');
    sheetCanvas.width = cols * cellW + padding * 2;
    sheetCanvas.height = rows * cellH + padding * 2 + 50 * scale; // Extra space for header
    const ctx = sheetCanvas.getContext('2d');

    // Background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, sheetCanvas.width, sheetCanvas.height);

    // Title
    ctx.fillStyle = '#0F172A';
    ctx.font = `bold ${24 * scale}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`${config.name} - 전면 단면도 종합 시트`, sheetCanvas.width / 2, 40 * scale);

    // Render each face onto sheet
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = cellW;
    tempCanvas.height = cellH;
    const tempRenderer = new CubeCanvasRenderer(tempCanvas);
    tempRenderer.state = this.renderer2D.state;
    tempRenderer.viewMode = 'face';
    tempRenderer.showRim = false;
    tempRenderer.showFaceNames = true;
    tempRenderer.showLabels = this.renderer2D.showLabels;
    tempRenderer.backgroundColor = 'transparent';

    faces.forEach((face, idx) => {
      const c = idx % cols;
      const r = Math.floor(idx / cols);
      const x = padding + c * cellW;
      const y = padding + 50 * scale + r * cellH;

      tempRenderer.activeFace = face;
      tempRenderer.render();

      ctx.drawImage(tempCanvas, x, y);
    });

    sheetCanvas.toBlob((blob) => {
      if (blob) {
        this.downloadBlob(blob, filename);
      }
    }, 'image/png');
  }

  /**
   * Export Vector SVG format of current face or net view
   */
  exportSVG({ filename = 'cube_section.svg' } = {}) {
    const r = this.renderer2D;
    const w = 600;
    const h = 600;
    const config = CUBE_TYPES[r.state.cubeId];

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">\n`;
    svg += `  <style>\n    .sticker { stroke: #18181B; stroke-width: 2; stroke-linejoin: round; }\n    .label { font-family: sans-serif; font-size: 12px; font-weight: bold; text-anchor: middle; dominant-baseline: central; }\n  </style>\n`;

    if (r.backgroundColor && r.backgroundColor !== 'transparent') {
      svg += `  <rect width="100%" height="100%" fill="${r.backgroundColor}" />\n`;
    }

    if (r.viewMode === 'face' && config.type === 'nxn') {
      const grid = r.state.faces[r.activeFace];
      const N = grid.length;
      const baseSize = 380;
      const cellSize = baseSize / N;
      const gap = Math.max(3, cellSize * 0.04);
      const stickerSize = cellSize - gap;
      const startX = (w - baseSize) / 2;
      const startY = (h - baseSize) / 2;

      svg += `  <!-- Main Face: ${r.activeFace} -->\n  <g id="face-${r.activeFace}">\n`;
      for (let row = 0; row < N; row++) {
        for (let col = 0; col < N; col++) {
          const color = grid[row][col];
          const x = startX + col * cellSize + gap / 2;
          const y = startY + row * cellSize + gap / 2;
          svg += `    <rect class="sticker" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${stickerSize.toFixed(1)}" height="${stickerSize.toFixed(1)}" rx="6" fill="${color}" />\n`;
        }
      }
      svg += `  </g>\n`;

      // Rim
      if (r.showRim) {
        const rims = getAdjacentRimsNxN(r.activeFace, N);
        if (rims) {
          const rimThickness = cellSize * 0.38;
          const rimOffset = gap * 1.5;

          // Top
          for (let i = 0; i < N; i++) {
            const coord = rims.top.coord(i);
            const color = r.state.faces[rims.top.face]?.[coord.r]?.[coord.c] || '#475569';
            const rx = startX + i * cellSize + gap / 2;
            const ry = startY - rimThickness - rimOffset;
            svg += `    <rect class="sticker" x="${rx.toFixed(1)}" y="${ry.toFixed(1)}" width="${stickerSize.toFixed(1)}" height="${rimThickness.toFixed(1)}" rx="3" fill="${color}" />\n`;
          }
          // Bottom
          for (let i = 0; i < N; i++) {
            const coord = rims.bottom.coord(i);
            const color = r.state.faces[rims.bottom.face]?.[coord.r]?.[coord.c] || '#475569';
            const rx = startX + i * cellSize + gap / 2;
            const ry = startY + N * cellSize + rimOffset;
            svg += `    <rect class="sticker" x="${rx.toFixed(1)}" y="${ry.toFixed(1)}" width="${stickerSize.toFixed(1)}" height="${rimThickness.toFixed(1)}" rx="3" fill="${color}" />\n`;
          }
          // Left
          for (let i = 0; i < N; i++) {
            const coord = rims.left.coord(i);
            const color = r.state.faces[rims.left.face]?.[coord.r]?.[coord.c] || '#475569';
            const rx = startX - rimThickness - rimOffset;
            const ry = startY + i * cellSize + gap / 2;
            svg += `    <rect class="sticker" x="${rx.toFixed(1)}" y="${ry.toFixed(1)}" width="${rimThickness.toFixed(1)}" height="${stickerSize.toFixed(1)}" rx="3" fill="${color}" />\n`;
          }
          // Right
          for (let i = 0; i < N; i++) {
            const coord = rims.right.coord(i);
            const color = r.state.faces[rims.right.face]?.[coord.r]?.[coord.c] || '#475569';
            const rx = startX + N * cellSize + rimOffset;
            const ry = startY + i * cellSize + gap / 2;
            svg += `    <rect class="sticker" x="${rx.toFixed(1)}" y="${ry.toFixed(1)}" width="${rimThickness.toFixed(1)}" height="${stickerSize.toFixed(1)}" rx="3" fill="${color}" />\n`;
          }
        }
      }
    } else {
      // Fallback raster embedded if complex geometric SVG
      const off = r.exportImage(2, 'png', '#FFFFFF');
      svg += `  <image href="${off.toDataURL('image/png')}" width="${w}" height="${h}" />\n`;
    }

    svg += `</svg>`;

    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    this.downloadBlob(blob, filename);
  }
}

window.CubeExporter = CubeExporter;
