/**
 * cubeModels.js - Comprehensive Twisty Puzzle & Cube Geometry Definitions
 * Supports: 1x1 ~ 7x7 NxNxN cubes, Pyraminx, Megaminx, Skewb
 */

const PALETTES = {
  wca: [
    { name: '흰색 (White)', hex: '#FFFFFF', textDark: true },
    { name: '노랑 (Yellow)', hex: '#FFD500', textDark: true },
    { name: '초록 (Green)', hex: '#009E60', textDark: false },
    { name: '파랑 (Blue)', hex: '#0051BA', textDark: false },
    { name: '주황 (Orange)', hex: '#FF5800', textDark: false },
    { name: '빨강 (Red)', hex: '#C41E3A', textDark: false },
  ],
  megaminx: [
    { name: '흰색 (White)', hex: '#FFFFFF', textDark: true },
    { name: '노랑 (Yellow)', hex: '#FFEB3B', textDark: true },
    { name: '빨강 (Red)', hex: '#D32F2F', textDark: false },
    { name: '주황 (Orange)', hex: '#FF6F00', textDark: false },
    { name: '연두 (Lime)', hex: '#76FF03', textDark: true },
    { name: '초록 (Dark Green)', hex: '#1B5E20', textDark: false },
    { name: '하늘 (Cyan)', hex: '#00E5FF', textDark: true },
    { name: '파랑 (Dark Blue)', hex: '#0D47A1', textDark: false },
    { name: '분홍 (Pink)', hex: '#F06292', textDark: true },
    { name: '보라 (Purple)', hex: '#7B1FA2', textDark: false },
    { name: '회색 (Grey)', hex: '#78909C', textDark: false },
    { name: '베이지 (Beige)', hex: '#FFF9C4', textDark: true },
  ],
  education: [
    { name: '미정/회색 (Grey/Unsolved)', hex: '#9E9E9E', textDark: false },
    { name: '어두운회색 (Dark Grey)', hex: '#424242', textDark: false },
    { name: '검정 (Black/Core)', hex: '#212121', textDark: false },
    { name: '투명/흰색 (Blank)', hex: '#F5F5F5', textDark: true },
    { name: '강조 보라 (Highlight)', hex: '#9C27B0', textDark: false },
    { name: '강조 청록 (Teal)', hex: '#009688', textDark: false },
  ]
};

const CUBE_TYPES = {
  '3x3': {
    id: '3x3',
    name: '3×3×3 루빅스 큐브 (Standard)',
    category: '정육면체',
    order: 3,
    type: 'nxn',
    faces: ['U', 'L', 'F', 'R', 'B', 'D'],
    defaultColors: { U: '#FFFFFF', D: '#FFD500', F: '#009E60', B: '#0051BA', L: '#FF5800', R: '#C41E3A' },
    hasSlice: true,
    sliceCount: 3,
  },
  '2x2': {
    id: '2x2',
    name: '2×2×2 포켓 큐브 (Pocket Cube)',
    category: '정육면체',
    order: 2,
    type: 'nxn',
    faces: ['U', 'L', 'F', 'R', 'B', 'D'],
    defaultColors: { U: '#FFFFFF', D: '#FFD500', F: '#009E60', B: '#0051BA', L: '#FF5800', R: '#C41E3A' },
    hasSlice: true,
    sliceCount: 2,
  },
  '4x4': {
    id: '4x4',
    name: '4×4×4 루빅스 리벤지 (Revenge)',
    category: '정육면체',
    order: 4,
    type: 'nxn',
    faces: ['U', 'L', 'F', 'R', 'B', 'D'],
    defaultColors: { U: '#FFFFFF', D: '#FFD500', F: '#009E60', B: '#0051BA', L: '#FF5800', R: '#C41E3A' },
    hasSlice: true,
    sliceCount: 4,
  },
  '5x5': {
    id: '5x5',
    name: '5×5×5 프로페서 큐브 (Professor)',
    category: '정육면체',
    order: 5,
    type: 'nxn',
    faces: ['U', 'L', 'F', 'R', 'B', 'D'],
    defaultColors: { U: '#FFFFFF', D: '#FFD500', F: '#009E60', B: '#0051BA', L: '#FF5800', R: '#C41E3A' },
    hasSlice: true,
    sliceCount: 5,
  },
  '6x6': {
    id: '6x6',
    name: '6×6×6 빅 큐브 (V-Cube 6)',
    category: '정육면체',
    order: 6,
    type: 'nxn',
    faces: ['U', 'L', 'F', 'R', 'B', 'D'],
    defaultColors: { U: '#FFFFFF', D: '#FFD500', F: '#009E60', B: '#0051BA', L: '#FF5800', R: '#C41E3A' },
    hasSlice: true,
    sliceCount: 6,
  },
  '7x7': {
    id: '7x7',
    name: '7×7×7 빅 큐브 (V-Cube 7)',
    category: '정육면체',
    order: 7,
    type: 'nxn',
    faces: ['U', 'L', 'F', 'R', 'B', 'D'],
    defaultColors: { U: '#FFFFFF', D: '#FFD500', F: '#009E60', B: '#0051BA', L: '#FF5800', R: '#C41E3A' },
    hasSlice: true,
    sliceCount: 7,
  },
  '1x1': {
    id: '1x1',
    name: '1×1×1 미니 큐브',
    category: '정육면체',
    order: 1,
    type: 'nxn',
    faces: ['U', 'L', 'F', 'R', 'B', 'D'],
    defaultColors: { U: '#FFFFFF', D: '#FFD500', F: '#009E60', B: '#0051BA', L: '#FF5800', R: '#C41E3A' },
    hasSlice: false,
    sliceCount: 1,
  },
  'pyraminx': {
    id: 'pyraminx',
    name: '피라밍크스 (Pyraminx)',
    category: '이형 큐브',
    type: 'pyraminx',
    faces: ['U', 'L', 'R', 'B'],
    defaultColors: { U: '#FFD500', L: '#0051BA', R: '#C41E3A', B: '#009E60' }, // Yellow, Blue, Red, Green
    hasSlice: false,
  },
  'megaminx': {
    id: 'megaminx',
    name: '메가밍크스 (Megaminx - 12면체)',
    category: '이형 큐브',
    type: 'megaminx',
    faces: ['U', 'F', 'BR', 'R', 'BL', 'L', 'DR', 'DBR', 'B', 'DBL', 'DL', 'D'],
    defaultColors: {
      U: '#FFFFFF', F: '#D32F2F', BR: '#0D47A1', R: '#FFEB3B', BL: '#7B1FA2', L: '#1B5E20',
      DR: '#FF6F00', DBR: '#76FF03', B: '#FFF9C4', DBL: '#F06292', DL: '#00E5FF', D: '#78909C'
    },
    hasSlice: false,
  },
  'skewb': {
    id: 'skewb',
    name: '스큐브 (Skewb)',
    category: '이형 큐브',
    type: 'skewb',
    faces: ['U', 'L', 'F', 'R', 'B', 'D'],
    defaultColors: { U: '#FFFFFF', D: '#FFD500', F: '#009E60', B: '#0051BA', L: '#FF5800', R: '#C41E3A' },
    hasSlice: false,
  },
  'windmill': {
    id: 'windmill',
    name: '윈드밀 큐브 (Windmill / 바람개비)',
    category: '변형 큐브',
    type: 'windmill',
    faces: ['U', 'L', 'F', 'R', 'B', 'D'],
    defaultColors: { U: '#FFFFFF', D: '#FFD500', F: '#009E60', B: '#0051BA', L: '#FF5800', R: '#C41E3A' },
    hasSlice: false,
  },
  '3x3x4': {
    id: '3x3x4',
    name: '3×3×4 직육면체 큐브 (Cuboid)',
    category: '직육면체',
    type: '3x3x4',
    faces: ['U', 'L', 'F', 'R', 'B', 'D'],
    defaultColors: { U: '#FFFFFF', D: '#FFD500', F: '#009E60', B: '#0051BA', L: '#FF5800', R: '#C41E3A' },
    hasSlice: true,
    sliceCount: 4,
  }
};

/**
 * Face metadata: Korean names and standard abbreviations
 */
const FACE_INFO = {
  U: { code: 'U', name: '윗면 (Up / Top)', short: '위' },
  D: { code: 'D', name: '아랫면 (Down / Bottom)', short: '아래' },
  F: { code: 'F', name: '앞면 (Front)', short: '앞' },
  B: { code: 'B', name: '뒷면 (Back)', short: '뒤' },
  L: { code: 'L', name: '왼쪽면 (Left)', short: '왼쪽' },
  R: { code: 'R', name: '오른쪽면 (Right)', short: '오른쪽' },
  // Megaminx specific faces
  BR: { code: 'BR', name: '뒷오른쪽 (Back-Right)', short: '뒤우' },
  BL: { code: 'BL', name: '뒷왼쪽 (Back-Left)', short: '뒤좌' },
  DR: { code: 'DR', name: '하단오른쪽 (Down-Right)', short: '하우' },
  DBR: { code: 'DBR', name: '하단뒷오른쪽 (Down-Back-Right)', short: '하뒤우' },
  DBL: { code: 'DBL', name: '하단뒷왼쪽 (Down-Back-Left)', short: '하뒤좌' },
  DL: { code: 'DL', name: '하단왼쪽 (Down-Left)', short: '하좌' },
};

/**
 * Adjacent face border mapping for NxN cubes (used for drawing the OLL/PLL rim stickers)
 * Format for face U:
 * Top edge touches B (Back) face's row 0
 * Bottom edge touches F (Front) face's row 0
 * Left edge touches L (Left) face's row 0
 * Right edge touches R (Right) face's row 0
 */
function getAdjacentRimsNxN(face, order) {
  // Returns { top: {face, getCoord(i)}, bottom, left, right }
  switch (face) {
    case 'U':
      return {
        top: { face: 'B', coord: (i) => ({ r: 0, c: order - 1 - i }) },
        bottom: { face: 'F', coord: (i) => ({ r: 0, c: i }) },
        left: { face: 'L', coord: (i) => ({ r: 0, c: i }) },
        right: { face: 'R', coord: (i) => ({ r: 0, c: order - 1 - i }) }
      };
    case 'D':
      return {
        top: { face: 'F', coord: (i) => ({ r: order - 1, c: i }) },
        bottom: { face: 'B', coord: (i) => ({ r: order - 1, c: order - 1 - i }) },
        left: { face: 'L', coord: (i) => ({ r: order - 1, c: order - 1 - i }) },
        right: { face: 'R', coord: (i) => ({ r: order - 1, c: i }) }
      };
    case 'F':
      return {
        top: { face: 'U', coord: (i) => ({ r: order - 1, c: i }) },
        bottom: { face: 'D', coord: (i) => ({ r: 0, c: i }) },
        left: { face: 'L', coord: (i) => ({ r: i, c: order - 1 }) },
        right: { face: 'R', coord: (i) => ({ r: i, c: 0 }) }
      };
    case 'B':
      return {
        top: { face: 'U', coord: (i) => ({ r: 0, c: order - 1 - i }) },
        bottom: { face: 'D', coord: (i) => ({ r: order - 1, c: order - 1 - i }) },
        left: { face: 'R', coord: (i) => ({ r: i, c: order - 1 }) },
        right: { face: 'L', coord: (i) => ({ r: i, c: 0 }) }
      };
    case 'L':
      return {
        top: { face: 'U', coord: (i) => ({ r: i, c: 0 }) },
        bottom: { face: 'D', coord: (i) => ({ r: order - 1 - i, c: 0 }) },
        left: { face: 'B', coord: (i) => ({ r: i, c: order - 1 }) },
        right: { face: 'F', coord: (i) => ({ r: i, c: 0 }) }
      };
    case 'R':
      return {
        top: { face: 'U', coord: (i) => ({ r: order - 1 - i, c: order - 1 }) },
        bottom: { face: 'D', coord: (i) => ({ r: i, c: order - 1 }) },
        left: { face: 'F', coord: (i) => ({ r: i, c: order - 1 }) },
        right: { face: 'B', coord: (i) => ({ r: i, c: 0 }) }
      };
    default:
      return null;
  }
}

/**
 * Creates an empty or default colored state for a cube type
 */
function createCubeState(cubeTypeId) {
  const config = CUBE_TYPES[cubeTypeId];
  if (!config) return null;

  const state = {
    cubeId: cubeTypeId,
    faces: {}
  };

  if (config.type === 'nxn') {
    const N = config.order;
    state.slices = [];
    for (let k = 0; k < N; k++) {
      const sliceGrid = [];
      for (let r = 0; r < N; r++) {
        const row = [];
        for (let c = 0; c < N; c++) {
          if (k === 0) row.push(config.defaultColors.U || '#FFFFFF');
          else if (k === N - 1) row.push(config.defaultColors.D || '#FFD500');
          else row.push('#334155');
        }
        sliceGrid.push(row);
      }
      state.slices.push(sliceGrid);
    }
    config.faces.forEach(face => {
      state.faces[face] = [];
      const col = config.defaultColors[face] || '#FFFFFF';
      for (let r = 0; r < N; r++) {
        const row = [];
        for (let c = 0; c < N; c++) {
          row.push(col);
        }
        state.faces[face].push(row);
      }
    });
  } else if (config.type === 'pyraminx') {
    // 4 faces, each has 9 triangles (tier 0: 1, tier 1: 3, tier 2: 5)
    config.faces.forEach(face => {
      const col = config.defaultColors[face];
      state.faces[face] = Array(9).fill(col);
    });
  } else if (config.type === 'megaminx') {
    // 12 faces, each face has 11 stickers (1 center pentagon, 5 edges, 5 corners)
    config.faces.forEach(face => {
      const col = config.defaultColors[face];
      state.faces[face] = {
        center: col,
        edges: Array(5).fill(col),
        corners: Array(5).fill(col),
      };
    });
  } else if (config.type === 'skewb') {
    // 6 faces, each face has 1 center diamond and 4 corner triangles
    config.faces.forEach(face => {
      const col = config.defaultColors[face];
      state.faces[face] = {
        center: col,
        corners: Array(4).fill(col), // TL, TR, BR, BL
      };
    });
  } else if (config.type === 'windmill') {
    config.faces.forEach(face => {
      const col = config.defaultColors[face] || '#FFFFFF';
      state.faces[face] = Array(4).fill(col); // 4 triangles meeting at center (Top, Right, Bottom, Left)
    });
  } else if (config.type === '3x3x4') {
    state.slices = [];
    for (let k = 0; k < 4; k++) {
      const sliceGrid = [];
      for (let r = 0; r < 3; r++) {
        const row = [];
        for (let c = 0; c < 3; c++) {
          if (k === 0) row.push(config.defaultColors.U || '#FFFFFF');
          else if (k === 3) row.push(config.defaultColors.D || '#FFD500');
          else row.push('#334155');
        }
        sliceGrid.push(row);
      }
      state.slices.push(sliceGrid);
    }
    ['U', 'D'].forEach(face => {
      const col = config.defaultColors[face];
      state.faces[face] = [
        [col, col, col],
        [col, col, col],
        [col, col, col]
      ];
    });
    ['F', 'B', 'L', 'R'].forEach(face => {
      const col = config.defaultColors[face];
      state.faces[face] = [
        [col, col, col],
        [col, col, col],
        [col, col, col],
        [col, col, col]
      ];
    });
  }

  return state;
}

/**
 * Preset generator for popular patterns
 */
function applyPatternPreset(state, patternName) {
  const config = CUBE_TYPES[state.cubeId];
  if (!config) return;

  if (config.type === 'nxn' && config.order === 3) {
    if (patternName === 'checkerboard') {
      // 3x3 Checkerboard pattern
      const def = config.defaultColors;
      const pairs = {
        U: [def.U, def.D],
        D: [def.D, def.U],
        F: [def.F, def.B],
        B: [def.B, def.F],
        L: [def.L, def.R],
        R: [def.R, def.L],
      };
      config.faces.forEach(f => {
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 3; c++) {
            const idx = (r + c) % 2;
            state.faces[f][r][c] = pairs[f][idx];
          }
        }
      });
    } else if (patternName === 'cube_in_cube') {
      // 3x3 Cube in Cube pattern
      const solved = createCubeState('3x3');
      const f = state.faces;
      // Front face
      f.F[0][0] = f.F[0][1] = f.F[0][2] = f.F[1][0] = f.F[2][0] = '#009E60';
      f.F[1][1] = f.F[1][2] = f.F[2][1] = f.F[2][2] = '#FFFFFF';
      // Up face
      f.U[0][0] = f.U[0][1] = f.U[0][2] = f.U[1][0] = f.U[2][0] = '#FFFFFF';
      f.U[1][1] = f.U[1][2] = f.U[2][1] = f.U[2][2] = '#C41E3A';
      // Right face
      f.R[0][0] = f.R[0][1] = f.R[0][2] = f.R[1][0] = f.R[2][0] = '#C41E3A';
      f.R[1][1] = f.R[1][2] = f.R[2][1] = f.R[2][2] = '#009E60';
    } else if (patternName === 'dots') {
      // Dots / Flower pattern (swapped centers)
      const def = config.defaultColors;
      state.faces.U[1][1] = def.D;
      state.faces.D[1][1] = def.U;
      state.faces.F[1][1] = def.B;
      state.faces.B[1][1] = def.F;
      state.faces.L[1][1] = def.R;
      state.faces.R[1][1] = def.L;
    } else if (patternName === 'cross_oll') {
      // Top face has Yellow Cross with rest Grey (OLL problem format)
      const def = config.defaultColors;
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          if (r === 1 || c === 1) {
            state.faces.U[r][c] = '#FFD500'; // Yellow cross
          } else {
            state.faces.U[r][c] = '#9E9E9E'; // Grey corner
          }
        }
      }
    } else if (patternName === 'reset_blank') {
      config.faces.forEach(f => {
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 3; c++) {
            state.faces[f][r][c] = '#FFFFFF';
          }
        }
      });
    } else if (patternName === 'reset_grey') {
      config.faces.forEach(f => {
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 3; c++) {
            state.faces[f][r][c] = '#9E9E9E';
          }
        }
      });
    }
  } else {
    // Generic resets
    if (patternName === 'reset_blank') {
      setAllStickers(state, '#FFFFFF');
    } else if (patternName === 'reset_grey') {
      setAllStickers(state, '#9E9E9E');
    }
  }
}

function setAllStickers(state, color) {
  const config = CUBE_TYPES[state.cubeId];
  if (!config) return;

  if (config.type === 'nxn') {
    config.faces.forEach(f => {
      const rows = state.faces[f].length;
      const cols = state.faces[f][0].length;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          state.faces[f][r][c] = color;
        }
      }
    });
  } else if (config.type === 'pyraminx') {
    config.faces.forEach(f => {
      for (let i = 0; i < state.faces[f].length; i++) {
        state.faces[f][i] = color;
      }
    });
  } else if (config.type === 'megaminx') {
    config.faces.forEach(f => {
      state.faces[f].center = color;
      state.faces[f].edges.fill(color);
      state.faces[f].corners.fill(color);
    });
  } else if (config.type === 'skewb') {
    config.faces.forEach(f => {
      state.faces[f].center = color;
      state.faces[f].corners.fill(color);
    });
  } else if (config.type === 'windmill') {
    config.faces.forEach(f => {
      state.faces[f].fill(color);
    });
  } else if (config.type === '3x3x4') {
    ['U', 'D'].forEach(f => {
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          state.faces[f][r][c] = color;
        }
      }
    });
    ['F', 'B', 'L', 'R'].forEach(f => {
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 3; c++) {
          state.faces[f][r][c] = color;
        }
      }
    });
  }
}

// Export to window for global access
window.PALETTES = PALETTES;
window.CUBE_TYPES = CUBE_TYPES;
window.FACE_INFO = FACE_INFO;
window.getAdjacentRimsNxN = getAdjacentRimsNxN;
window.createCubeState = createCubeState;
window.applyPatternPreset = applyPatternPreset;
window.setAllStickers = setAllStickers;
