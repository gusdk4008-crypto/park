/**
 * app.js - Main Application Controller for CubeSection Studio
 * Manages State, UI Interactions, Tools, Undo/Redo, Sync between 2D & 3D, and Exports
 */

document.addEventListener('DOMContentLoaded', () => {
  // Application State
  const App = {
    cubeId: '3x3',
    cubeState: null,
    selectedColor: '#FFD500', // Default selected: Yellow
    currentPaletteType: 'wca',
    activeTool: 'brush', // 'brush' | 'bucket' | 'eyedropper' | 'eraser'
    history: [],
    historyIndex: -1,
    maxHistory: 50,
    
    // Components
    renderer2D: null,
    view3D: null,
    exporter: null,
  };

  // Initialize
  init();

  function init() {
    // 1. Create Initial Cube State
    App.cubeState = createCubeState(App.cubeId);
    saveHistoryState();

    // 2. Initialize 2D Canvas Renderer
    const canvas = document.getElementById('mainCanvas');
    App.renderer2D = new CubeCanvasRenderer(canvas, {
      onPaint: (hit) => onStickerPaint(hit),
      onPickColor: (col) => selectColor(col)
    });
    App.renderer2D.setState(App.cubeState);

    // Resize canvas to fill container
    setTimeout(() => {
      App.renderer2D.resize();
    }, 50);
    window.addEventListener('resize', () => App.renderer2D.resize());

    // 3. Initialize 3D View
    const threeContainer = document.getElementById('threeContainer');
    App.view3D = new ThreeCubeView(threeContainer, {
      onPaint: (hit) => onStickerPaint(hit),
      onPickColor: (col) => selectColor(col)
    });
    App.view3D.setState(App.cubeState);

    // 4. Initialize Exporter
    App.exporter = new CubeExporter(App.renderer2D, App.view3D);

    // 5. Setup UI and Event Listeners
    setupPalette();
    setupToolButtons();
    setupFacePills();
    setupEventListeners();
    setupKeyboardShortcuts();
    updateUI();
  }

  // ==========================================
  // UNDO / REDO HISTORY
  // ==========================================
  function saveHistoryState() {
    // Drop redo states
    if (App.historyIndex < App.history.length - 1) {
      App.history = App.history.slice(0, App.historyIndex + 1);
    }
    // Deep clone
    App.history.push(JSON.parse(JSON.stringify(App.cubeState)));
    if (App.history.length > App.maxHistory) {
      App.history.shift();
    } else {
      App.historyIndex++;
    }
    updateUndoRedoButtons();
  }

  function undo() {
    if (App.historyIndex > 0) {
      App.historyIndex--;
      App.cubeState = JSON.parse(JSON.stringify(App.history[App.historyIndex]));
      syncStateToViews();
      updateUndoRedoButtons();
      showToast('실행 취소되었습니다.');
    }
  }

  function redo() {
    if (App.historyIndex < App.history.length - 1) {
      App.historyIndex++;
      App.cubeState = JSON.parse(JSON.stringify(App.history[App.historyIndex]));
      syncStateToViews();
      updateUndoRedoButtons();
      showToast('다시 실행되었습니다.');
    }
  }

  function updateUndoRedoButtons() {
    const btnUndo = document.getElementById('btnUndo');
    const btnRedo = document.getElementById('btnRedo');
    if (btnUndo) btnUndo.disabled = (App.historyIndex <= 0);
    if (btnRedo) btnRedo.disabled = (App.historyIndex >= App.history.length - 1);
  }

  function syncStateToViews() {
    App.renderer2D.setState(App.cubeState);
    App.view3D.setState(App.cubeState);
    updateFacePillsBadges();
  }

  // ==========================================
  // COLORING & TOOL LOGIC
  // ==========================================
  function onStickerPaint(hit) {
    if (!hit) return;
    const config = CUBE_TYPES[App.cubeId];
    if (!config) return;

    if (App.activeTool === 'eyedropper') {
      if (hit.color) {
        selectColor(hit.color);
        showToast(`색상 추출 완료: ${hit.color}`);
      }
      return;
    }

    let targetColor = App.selectedColor;
    if (App.activeTool === 'eraser') {
      // Restore default face color
      targetColor = config.defaultColors[hit.face] || '#FFFFFF';
    }

    if (App.activeTool === 'bucket') {
      if (hit.type === 'slice') {
        const k = hit.sliceIdx;
        const N = config.order || 3;
        if (!App.cubeState.slices) App.cubeState.slices = [];
        App.cubeState.slices[k] = Array(N).fill(null).map(() => Array(N).fill(targetColor));
        if (k === 0 && App.cubeState.faces.U) fillFace('U', targetColor);
        else if (k === N - 1 && App.cubeState.faces.D) fillFace('D', targetColor);
      } else {
        fillFace(hit.face, targetColor);
      }
      saveHistoryState();
      syncStateToViews();
      return;
    }

    // Brush or Eraser: Paint single sticker
    let changed = false;
    if (hit.type === 'slice') {
      const k = hit.sliceIdx;
      const N = config.order || 3;
      if (!App.cubeState.slices) App.cubeState.slices = [];
      if (!App.cubeState.slices[k]) {
        App.cubeState.slices[k] = Array(N).fill(null).map(() => Array(N).fill('#334155'));
      }
      if (App.cubeState.slices[k][hit.r][hit.c] !== targetColor) {
        App.cubeState.slices[k][hit.r][hit.c] = targetColor;
        if (k === 0 && App.cubeState.faces.U) {
          App.cubeState.faces.U[hit.r][hit.c] = targetColor;
        } else if (k === N - 1 && App.cubeState.faces.D) {
          App.cubeState.faces.D[hit.r][hit.c] = targetColor;
        }
        changed = true;
      }
    } else if (hit.type === 'sticker' || hit.type === 'rim' || hit.type === '3x3x4') {
      const f = hit.face;
      if (App.cubeState.faces[f] && App.cubeState.faces[f][hit.r]) {
        if (App.cubeState.faces[f][hit.r][hit.c] !== targetColor) {
          App.cubeState.faces[f][hit.r][hit.c] = targetColor;
          changed = true;
        }
      }
    } else if (hit.type === 'pyraminx') {
      if (App.cubeState.faces[hit.face] && App.cubeState.faces[hit.face][hit.index] !== targetColor) {
        App.cubeState.faces[hit.face][hit.index] = targetColor;
        changed = true;
      }
    } else if (hit.type === 'megaminx') {
      const faceData = App.cubeState.faces[hit.face];
      if (faceData) {
        if (hit.part === 'center') faceData.center = targetColor;
        else if (hit.part === 'edge') faceData.edges[hit.index] = targetColor;
        else if (hit.part === 'corner') faceData.corners[hit.index] = targetColor;
        changed = true;
      }
    } else if (hit.type === 'skewb') {
      const faceData = App.cubeState.faces[hit.face];
      if (faceData) {
        if (hit.part === 'center') faceData.center = targetColor;
        else if (hit.part === 'corner') faceData.corners[hit.index] = targetColor;
        changed = true;
      }
    } else if (hit.type === 'windmill') {
      if (App.cubeState.faces[hit.face] && App.cubeState.faces[hit.face][hit.index] !== targetColor) {
        App.cubeState.faces[hit.face][hit.index] = targetColor;
        changed = true;
      }
    }

    if (changed) {
      App.renderer2D.render();
      App.view3D.updateColors();
      updateFacePillsBadges();
      // Debounced history save on mouse up (handled globally)
    }
  }

  function fillFace(face, color) {
    const config = CUBE_TYPES[App.cubeId];
    if (!config || !App.cubeState.faces[face]) return;

    if (config.type === 'nxn' || config.type === '3x3x4') {
      const grid = App.cubeState.faces[face];
      for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[0].length; c++) {
          grid[r][c] = color;
        }
      }
    } else if (config.type === 'pyraminx' || config.type === 'windmill') {
      App.cubeState.faces[face].fill(color);
    } else if (config.type === 'megaminx') {
      App.cubeState.faces[face].center = color;
      App.cubeState.faces[face].edges.fill(color);
      App.cubeState.faces[face].corners.fill(color);
    } else if (config.type === 'skewb') {
      App.cubeState.faces[face].center = color;
      App.cubeState.faces[face].corners.fill(color);
    }
  }

  // ==========================================
  // PALETTE & COLOR PICKER
  // ==========================================
  function setupPalette() {
    const container = document.getElementById('paletteContainer');
    container.innerHTML = '';

    const list = PALETTES[App.currentPaletteType] || PALETTES.wca;
    list.forEach((item) => {
      const swatch = document.createElement('div');
      swatch.className = 'color-swatch';
      swatch.style.backgroundColor = item.hex;
      swatch.style.color = item.textDark ? '#000000' : '#FFFFFF';
      swatch.title = `${item.name} (${item.hex})`;
      if (item.hex.toLowerCase() === App.selectedColor.toLowerCase()) {
        swatch.classList.add('active');
      }

      swatch.addEventListener('click', () => {
        selectColor(item.hex);
      });

      container.appendChild(swatch);
    });
  }

  function selectColor(hex) {
    App.selectedColor = hex;
    document.getElementById('currentColorHex').textContent = hex.toUpperCase();
    document.getElementById('customColorInput').value = hex;

    // Highlight matching swatch
    document.querySelectorAll('.color-swatch').forEach(sw => {
      const bg = rgbToHex(sw.style.backgroundColor);
      if (bg.toLowerCase() === hex.toLowerCase()) {
        sw.classList.add('active');
      } else {
        sw.classList.remove('active');
      }
    });
  }

  function rgbToHex(col) {
    if (!col) return '';
    if (col.startsWith('#')) return col;
    const match = col.match(/\d+/g);
    if (!match || match.length < 3) return col;
    return '#' + ((1 << 24) + (parseInt(match[0]) << 16) + (parseInt(match[1]) << 8) + parseInt(match[2])).toString(16).slice(1);
  }

  // ==========================================
  // TOOL BUTTONS
  // ==========================================
  function setupToolButtons() {
    const tools = ['toolBrush', 'toolBucket', 'toolEyedropper', 'toolEraser'];
    tools.forEach(id => {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.addEventListener('click', () => {
        tools.forEach(otherId => document.getElementById(otherId)?.classList.remove('active'));
        btn.classList.add('active');
        App.activeTool = btn.dataset.tool;
      });
    });
  }

  // ==========================================
  // FACE PILLS & SLICE BAR
  // ==========================================
  function setupFacePills() {
    const container = document.getElementById('facePillsContainer');
    container.innerHTML = '';

    const config = CUBE_TYPES[App.cubeId];
    if (!config) return;

    config.faces.forEach(face => {
      const info = FACE_INFO[face] || { name: face, short: face };
      const btn = document.createElement('button');
      btn.className = `pill-btn ${face === App.renderer2D.activeFace ? 'active' : ''}`;
      btn.dataset.face = face;

      const badge = document.createElement('span');
      badge.className = 'pill-color-badge';
      badge.style.backgroundColor = config.defaultColors[face] || '#FFFFFF';

      const label = document.createElement('span');
      label.textContent = `${face} (${info.short})`;

      btn.appendChild(badge);
      btn.appendChild(label);

      btn.addEventListener('click', () => {
        document.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        App.renderer2D.setActiveFace(face);
      });

      container.appendChild(btn);
    });

    updateFacePillsBadges();
  }

  function updateFacePillsBadges() {
    const config = CUBE_TYPES[App.cubeId];
    if (!config) return;

    document.querySelectorAll('.pill-btn').forEach(btn => {
      const face = btn.dataset.face;
      const badge = btn.querySelector('.pill-color-badge');
      if (badge && App.cubeState.faces[face]) {
        let repColor = '#FFFFFF';
        if (Array.isArray(App.cubeState.faces[face])) {
          if (Array.isArray(App.cubeState.faces[face][0])) {
            // Center of NxN
            const N = App.cubeState.faces[face].length;
            const mid = Math.floor(N / 2);
            repColor = App.cubeState.faces[face][mid][mid];
          } else {
            repColor = App.cubeState.faces[face][0];
          }
        } else if (App.cubeState.faces[face].center) {
          repColor = App.cubeState.faces[face].center;
        }
        badge.style.backgroundColor = repColor;
      }
    });
  }

  // ==========================================
  // EVENT LISTENERS SETUP
  // ==========================================
  function setupEventListeners() {
    // Cube Dropdown
    const cubeSelect = document.getElementById('cubeSelect');
    cubeSelect.addEventListener('change', (e) => {
      const newId = e.target.value;
      switchCube(newId);
    });

    // Palette Tabs
    document.getElementById('tabPaletteWca').addEventListener('click', (e) => {
      setPaletteTab('wca', e.target);
    });
    document.getElementById('tabPaletteMega').addEventListener('click', (e) => {
      setPaletteTab('megaminx', e.target);
    });
    document.getElementById('tabPaletteEdu').addEventListener('click', (e) => {
      setPaletteTab('education', e.target);
    });

    // Custom Color Input
    const customColorInput = document.getElementById('customColorInput');
    customColorInput.addEventListener('input', (e) => {
      selectColor(e.target.value);
    });

    // Pattern Presets
    document.querySelectorAll('.btn-preset[data-preset]').forEach(btn => {
      btn.addEventListener('click', () => {
        const preset = btn.dataset.preset;
        if (preset === 'solved') {
          App.cubeState = createCubeState(App.cubeId);
        } else {
          applyPatternPreset(App.cubeState, preset);
        }
        saveHistoryState();
        syncStateToViews();
        showToast(`'${btn.textContent.trim()}' 패턴이 적용되었습니다.`);
      });
    });

    // View Mode Tabs
    const modeTabs = [
      { id: 'tabViewFace', mode: 'face' },
      { id: 'tabViewSlice', mode: 'slice' },
      { id: 'tabViewNet', mode: 'net' },
    ];
    modeTabs.forEach(({ id, mode }) => {
      document.getElementById(id).addEventListener('click', (e) => {
        modeTabs.forEach(t => document.getElementById(t.id).classList.remove('active'));
        e.currentTarget.classList.add('active');

        App.renderer2D.setViewMode(mode);

        const subbarFace = document.getElementById('subbarFaceView');
        const subbarSlice = document.getElementById('subbarSliceView');

        if (mode === 'face') {
          subbarFace.style.display = 'flex';
          subbarSlice.style.display = 'none';
        } else if (mode === 'slice') {
          subbarFace.style.display = 'none';
          subbarSlice.style.display = 'flex';
          updateSliceSlider();
        } else {
          subbarFace.style.display = 'none';
          subbarSlice.style.display = 'none';
        }
      });
    });

    // Slice Slider
    const sliceSlider = document.getElementById('sliceSlider');
    sliceSlider.addEventListener('input', (e) => {
      const idx = parseInt(e.target.value);
      const config = CUBE_TYPES[App.cubeId];
      const maxSlice = (config.type === '3x3x4') ? 4 : (config.sliceCount || config.order || 3);
      App.renderer2D.setActiveSlice(idx, 'Y');

      let label = `${idx + 1}층`;
      if (idx === 0) label += ' (상층 윗면)';
      else if (idx === maxSlice - 1) label += ' (하층 밑면)';
      else label += ' (중간층)';
      document.getElementById('sliceLabel').textContent = label;
    });

    // Checkboxes (Rim & Labels)
    document.getElementById('chkShowRim').addEventListener('change', (e) => {
      App.renderer2D.showRim = e.target.checked;
      App.renderer2D.render();
    });
    document.getElementById('chkShowLabels').addEventListener('change', (e) => {
      App.renderer2D.showLabels = e.target.checked;
      App.renderer2D.render();
    });

    // Canvas Pan/Zoom Floating Buttons
    document.getElementById('btnZoomIn').addEventListener('click', () => {
      App.renderer2D.zoom = Math.min(App.renderer2D.zoom * 1.2, 4.0);
      App.renderer2D.render();
    });
    document.getElementById('btnZoomOut').addEventListener('click', () => {
      App.renderer2D.zoom = Math.max(App.renderer2D.zoom * 0.8, 0.4);
      App.renderer2D.render();
    });
    document.getElementById('btnResetView').addEventListener('click', () => {
      App.renderer2D.resetTransform();
    });

    // 3D View Reset Angle
    document.getElementById('btnReset3D').addEventListener('click', () => {
      App.view3D.resetCamera();
    });

    // Undo / Redo Header Buttons
    document.getElementById('btnUndo').addEventListener('click', undo);
    document.getElementById('btnRedo').addEventListener('click', redo);

    // Save history on pointerup/mouseup after painting
    const onActionEnd = () => {
      if (App.renderer2D && App.renderer2D.isPainting) {
        saveHistoryState();
      }
    };
    window.addEventListener('mouseup', onActionEnd);
    window.addEventListener('pointerup', onActionEnd);
    window.addEventListener('touchend', onActionEnd);

    // ==========================================
    // EXPORT & CLIPBOARD ACTIONS
    // ==========================================
    // Quick Copy
    document.getElementById('btnQuickCopy').addEventListener('click', copyToClipboardAction);
    document.getElementById('btnCopyCurrentClipboard').addEventListener('click', copyToClipboardAction);

    // Quick Export PNG
    document.getElementById('btnQuickExport').addEventListener('click', () => exportCurrentAction('png'));
    document.getElementById('btnExportCurrentPNG').addEventListener('click', () => exportCurrentAction('png'));
    document.getElementById('btnExportJPG').addEventListener('click', () => exportCurrentAction('jpeg'));
    document.getElementById('btnExportSVG').addEventListener('click', exportSVGAction);
    document.getElementById('btnExport3DImage').addEventListener('click', export3DAction);
    document.getElementById('btnExportAllFacesSheet').addEventListener('click', exportAllFacesAction);
  }

  function setPaletteTab(type, targetEl) {
    App.currentPaletteType = type;
    document.querySelectorAll('#tabPaletteWca, #tabPaletteMega, #tabPaletteEdu').forEach(b => b.classList.remove('active'));
    targetEl.classList.add('active');
    setupPalette();
  }

  function updateSliceSlider() {
    const config = CUBE_TYPES[App.cubeId];
    if (!config) return;
    const maxSlice = (config.type === '3x3x4') ? 4 : (config.sliceCount || config.order || 3);
    const slider = document.getElementById('sliceSlider');
    if (slider) {
      slider.max = Math.max(1, maxSlice - 1);
      slider.value = 0;
      document.getElementById('sliceLabel').textContent = '1층 (상층 윗면)';
      App.renderer2D.setActiveSlice(0, 'Y');
    }
  }

  function switchCube(cubeId) {
    const config = CUBE_TYPES[cubeId];
    if (!config) return;

    App.cubeId = cubeId;
    App.cubeState = createCubeState(cubeId);
    App.history = [];
    App.historyIndex = -1;
    saveHistoryState();

    document.getElementById('cubeCategoryLabel').textContent = config.category;

    // Reset face to default face
    App.renderer2D.activeFace = config.faces[0];
    setupFacePills();
    syncStateToViews();

    // Reset slice slider if in slice mode
    if (App.renderer2D.viewMode === 'slice') {
      updateSliceSlider();
    }

    showToast(`'${config.name}' 로 변경되었습니다.`);
  }

  // ==========================================
  // EXPORT HANDLERS
  // ==========================================
  function getExportOptions() {
    const scale = parseInt(document.getElementById('exportScale').value) || 2;
    const background = document.getElementById('exportBg').value;
    return { scale, background };
  }

  async function copyToClipboardAction() {
    const { scale, background } = getExportOptions();
    try {
      await App.exporter.copy2DToClipboard({ scale, background });
      showToast('📋 이미지가 클립보드에 복사되었습니다! (HWP, PPT, Word에 Ctrl+V로 붙여넣기)');
    } catch (err) {
      showToast('⚠️ 클립보드 복사 실패. 아래의 "PNG 다운로드"를 이용해 주세요.');
    }
  }

  function exportCurrentAction(format) {
    const { scale, background } = getExportOptions();
    const config = CUBE_TYPES[App.cubeId];
    const viewName = App.renderer2D.viewMode === 'face' ? `${App.renderer2D.activeFace}면`
      : App.renderer2D.viewMode === 'slice' ? `${App.renderer2D.activeSliceIndex + 1}층단면`
      : '전개도';
    const filename = `${config.id}_${viewName}_section.${format === 'jpeg' ? 'jpg' : 'png'}`;

    if (format === 'jpeg') {
      App.exporter.export2DJPG({ scale, filename });
    } else {
      App.exporter.export2DPNG({ scale, background, filename });
    }
    showToast(`💾 '${filename}' 다운로드가 시작되었습니다.`);
  }

  function exportSVGAction() {
    const config = CUBE_TYPES[App.cubeId];
    const filename = `${config.id}_${App.renderer2D.activeFace}_section.svg`;
    App.exporter.exportSVG({ filename });
    showToast(`📐 '${filename}' SVG 벡터 다운로드가 시작되었습니다.`);
  }

  function export3DAction() {
    const config = CUBE_TYPES[App.cubeId];
    const filename = `${config.id}_3d_snapshot.png`;
    App.exporter.export3DPNG({ filename });
    showToast(`🧊 3D 큐브 스크린샷 '${filename}' 다운로드 완료!`);
  }

  function exportAllFacesAction() {
    const { scale } = getExportOptions();
    const config = CUBE_TYPES[App.cubeId];
    const filename = `${config.id}_all_faces_sheet.png`;
    App.exporter.exportAllFacesSheet({ scale, filename });
    showToast(`📑 '${filename}' 전면 종합 시트가 저장되었습니다.`);
  }

  // ==========================================
  // KEYBOARD SHORTCUTS
  // ==========================================
  function setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Ignore when typing in inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        copyToClipboardAction();
      } else if (e.key.toLowerCase() === 'b') {
        document.getElementById('toolBrush').click();
      } else if (e.key.toLowerCase() === 'g') {
        document.getElementById('toolBucket').click();
      } else if (e.key.toLowerCase() === 'i') {
        document.getElementById('toolEyedropper').click();
      } else if (e.key.toLowerCase() === 'e') {
        document.getElementById('toolEraser').click();
      } else if (e.key >= '1' && e.key <= '6') {
        // Pick from current palette
        const idx = parseInt(e.key) - 1;
        const swatches = document.querySelectorAll('.color-swatch');
        if (swatches[idx]) {
          swatches[idx].click();
        }
      }
    });
  }

  // ==========================================
  // TOAST NOTIFICATION
  // ==========================================
  let toastTimer = null;
  function showToast(msg) {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMessage');
    if (!toast || !toastMsg) return;

    toastMsg.textContent = msg;
    toast.classList.add('show');

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }

  function updateUI() {
    selectColor(App.selectedColor);
  }
});
