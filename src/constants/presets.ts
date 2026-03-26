/**
 * Euclidean Machine — Master Presets Library
 * 
 * Integrates Flamenco tradition with IDM/Autechre algorithmic complexity.
 */

export interface TrackPreset {
  pulses?: number;
  steps?: number;
  offset?: number;
  chaosEnabled?: boolean;
  entropy?: number;
  evolveEnabled?: boolean;
  mutationRate?: number;
  mutationSpeed?: number;
  baseProbability?: number;
  ratchet?: number; // 0-4
  volume?: number;
  delaySend?: number;
  reverbSend?: number;
  // Tonal (only for 'tone' track)
  rootNote?: number;      // MIDI (48 = C3)
  scaleId?: string;       // 'phrygianDominant', 'minor', etc.
  octaveRange?: number;   // 1-3
  noteIndices?: number[]; // per-step pitch index
  // Phase 4 — Pattern generators & Markov
  patternMode?: 'euclidean' | 'lsystem' | 'ca';
  lsSeed?: string;
  lsRuleA?: string;
  lsIterations?: number;
  noteMode?: 'euclidean' | 'markov';
  markovStyle?: string;
  markovTemperature?: number;
  markovAnchor?: number;
  // Phase 6B/6C
  stretchEnabled?: boolean;
  stretchRate?: number;
  eqEnabled?: boolean;
  eqHpfFreq?: number;
  eqLpfFreq?: number;
  synthType?: string;
  cloudMode?: string;
  grainSize?: number;
  overlap?: number;
  spray?: number;
  // Phase 6D — Layer 2 Time Stretch
  layer2StretchEnabled?: boolean;
  layer2StretchRate?: number;
  layer2Blend?: number;
  layer2Pitch?: number;
  // Phase 7A/7B — Panning + Frequency Shifter
  pan?: number;
  freqShiftEnabled?: boolean;
  freqShift?: number;
  // Phase 8 — Percussive Synthesis
  kickPitchDecay?: number;
  kickOctaves?: number;
  kickDecay?: number;
  kickClickType?: string;
  hatMode?: string;
  hatHarmonicity?: number;
  hatModIndex?: number;
  hatResonance?: number;
  hatDecay?: number;
  hatNoiseType?: string;
  snareDecay?: number;
  snareNoiseType?: string;
  snareBodyEnabled?: boolean;
  snareBodyPitch?: number;
  snareBodyDecay?: number;
  // Phase 9 — Freeze / Gated Reverb
  freezeSend?: number;
  // Phase 10 — Extreme Loop
  extremeLoopEnabled?: boolean;
  extremeLoopSize?: number;
  extremeLoopPoint?: number;
  // Sampler mode
  mode?: 'GATE' | 'TRIGGER' | 'ONE-SHOT';
}

export interface ScenePreset {
  id: string;
  name: string;
  type: 'master' | 'atomic';
  category: 'Flamenco' | 'IDM' | 'Glitch' | 'Experimental';
  description: string;
  bpm?: number;
  jitter?: number;
  swing?: number;
  dynamics?: number;
  temporalityMode?: string; // 'grid' | 'mpc' | 'dilla' | 'flamenco' | 'arritmia'
  tracks?: {
    [trackId: string]: TrackPreset;
  };
  config?: TrackPreset;
}

export const PRESETS: ScenePreset[] = [
  // --- ESCENAS MAESTRAS (MASTER) ---
  {
    id: 'solea-master',
    name: 'Soleá Completa',
    type: 'master',
    category: 'Flamenco',
    description: 'Escena completa: Kick (Base), Snare (Respuesta síncopada) y Hat (Escobilla). (E 5, 12)',
    bpm: 80,
    jitter: 2,
    swing: 0,
    dynamics: 60,
    tracks: {
      kick: { pulses: 5, steps: 12, offset: 0 },
      snare: { pulses: 2, steps: 12, offset: 3 },
      hat: { pulses: 12, steps: 12, offset: 0, baseProbability: 0.7 }
    }
  },
  {
    id: 'buleria-master',
    name: 'Bulería Completa',
    type: 'master',
    category: 'Flamenco',
    description: 'Escena completa: Máxima energía. Kick y Snare conversando en amalgama de 12.',
    bpm: 220,
    jitter: 3,
    swing: 10,
    dynamics: 75,
    tracks: {
      kick: { pulses: 7, steps: 12, offset: 0 },
      snare: { pulses: 5, steps: 12, offset: 2 },
      hat: { pulses: 12, steps: 12, offset: 0 }
    }
  },
  {
    id: 'async-master',
    name: 'Async Ecosystem',
    type: 'master',
    category: 'IDM',
    description: 'Escena completa: Colisión de ciclos 11, 13 y 17. Evolución rítmica infinita.',
    bpm: 128,
    jitter: 12,
    swing: 0,
    dynamics: 85,
    tracks: {
      kick: { pulses: 5, steps: 11, offset: 0 },
      snare: { pulses: 7, steps: 13, offset: 4 },
      hat: { pulses: 9, steps: 17, offset: 0 }
    }
  },

  // --- FUSIÓN (MASTER) ---
  {
    id: 'tercer-cielo',
    name: 'Tercer Cielo',
    type: 'master',
    category: 'Experimental',
    description: 'Refree/Márquez — Glitch + síntesis + cante. Soleá contemplativa con melodía frigia y reverb inmensa.',
    bpm: 72,
    jitter: 4,
    swing: 20,
    dynamics: 55,
    temporalityMode: 'flamenco',
    tracks: {
      kick: { pulses: 3, steps: 12, offset: 0, ratchet: 0, volume: 0.7, delaySend: 0.1, reverbSend: 0.4 },
      snare: { pulses: 2, steps: 12, offset: 5, ratchet: 1, evolveEnabled: true, mutationRate: 0.03, mutationSpeed: 4, volume: 0.5, delaySend: 0.3, reverbSend: 0.6 },
      hat: { pulses: 5, steps: 12, offset: 0, ratchet: 0, chaosEnabled: true, entropy: 1.2, baseProbability: 0.6, volume: 0.4, delaySend: 0.15, reverbSend: 0.3 },
      tone: { pulses: 4, steps: 12, offset: 2, ratchet: 0, evolveEnabled: true, mutationRate: 0.05, mutationSpeed: 2, rootNote: 48, scaleId: 'phrygianDominant', octaveRange: 2, noteIndices: [0, 3, 1, 4, 0, 5, 2, 4, 1, 3, 5, 2], volume: 0.6, delaySend: 0.25, reverbSend: 0.8 },
      cloud: { pulses: 3, steps: 12, offset: 0, volume: 0.3, delaySend: 0.2, reverbSend: 0.7 }
    }
  },
  {
    id: 'malamente',
    name: 'Malamente',
    type: 'master',
    category: 'Experimental',
    description: 'Rosalía trap-flamenco — Palmas + 808 + swing agresivo. El hat con ratchet ×3 define el trap.',
    bpm: 140,
    jitter: 2,
    swing: 55,
    dynamics: 90,
    temporalityMode: 'mpc',
    tracks: {
      kick: { pulses: 4, steps: 16, offset: 0, ratchet: 0, volume: 0.9, delaySend: 0, reverbSend: 0.1 },
      snare: { pulses: 4, steps: 16, offset: 4, ratchet: 0, volume: 0.8, delaySend: 0.05, reverbSend: 0.15 },
      hat: { pulses: 10, steps: 16, offset: 0, ratchet: 2, chaosEnabled: true, entropy: 1.15, baseProbability: 0.85, volume: 0.55, delaySend: 0, reverbSend: 0 },
      tone: { pulses: 3, steps: 12, offset: 0, ratchet: 0, rootNote: 43, scaleId: 'phrygianDominant', octaveRange: 1, noteIndices: [0, 0, 4, 0, 0, 3, 0, 0, 2, 0, 4, 0], volume: 0.75, delaySend: 0.1, reverbSend: 0.05 },
      cloud: { pulses: 2, steps: 16, offset: 0, volume: 0.2, delaySend: 0, reverbSend: 0.3 }
    }
  },
  {
    id: 'arrhythmia',
    name: 'Arrhythmia',
    type: 'master',
    category: 'Experimental',
    description: 'Antipop Consortium fracturado — rap-IDM donde nada cae donde debería. Primos + Chaos + Evolve.',
    bpm: 105,
    jitter: 8,
    swing: 70,
    dynamics: 80,
    temporalityMode: 'arritmia',
    tracks: {
      kick: { pulses: 3, steps: 11, offset: 0, ratchet: 0, chaosEnabled: true, entropy: 1.3, volume: 0.85, delaySend: 0.05, reverbSend: 0.2 },
      snare: { pulses: 4, steps: 13, offset: 3, ratchet: 1, chaosEnabled: true, entropy: 1.2, evolveEnabled: true, mutationRate: 0.08, mutationSpeed: 1, volume: 0.7, delaySend: 0.2, reverbSend: 0.25 },
      hat: { pulses: 7, steps: 17, offset: 5, ratchet: 0, chaosEnabled: true, entropy: 1.4, evolveEnabled: true, mutationRate: 0.12, mutationSpeed: 1, volume: 0.5, delaySend: 0.1, reverbSend: 0.15 },
      tone: { pulses: 5, steps: 11, offset: 2, ratchet: 0, chaosEnabled: true, entropy: 1.25, evolveEnabled: true, mutationRate: 0.06, mutationSpeed: 2, rootNote: 45, scaleId: 'minor', octaveRange: 2, noteIndices: [0, 4, 2, 6, 1, 5, 3, 7, 0, 4, 2], volume: 0.6, delaySend: 0.15, reverbSend: 0.35 },
      cloud: { pulses: 3, steps: 11, offset: 0, volume: 0.25, delaySend: 0.25, reverbSend: 0.5 }
    }
  },
  {
    id: 'confield',
    name: 'Confield',
    type: 'master',
    category: 'IDM',
    description: 'Autechre abstracción pura — donde el ritmo es textura y la textura es ritmo. Todo muta.',
    bpm: 118,
    jitter: 16,
    swing: 35,
    dynamics: 95,
    temporalityMode: 'dilla',
    tracks: {
      kick: { pulses: 5, steps: 19, offset: 0, ratchet: 0, chaosEnabled: true, entropy: 1.5, evolveEnabled: true, mutationRate: 0.15, mutationSpeed: 1, volume: 0.8, delaySend: 0.1, reverbSend: 0.2 },
      snare: { pulses: 3, steps: 17, offset: 7, ratchet: 3, chaosEnabled: true, entropy: 1.6, evolveEnabled: true, mutationRate: 0.20, mutationSpeed: 1, volume: 0.6, delaySend: 0.3, reverbSend: 0.3 },
      hat: { pulses: 11, steps: 23, offset: 0, ratchet: 1, chaosEnabled: true, entropy: 1.8, evolveEnabled: true, mutationRate: 0.25, mutationSpeed: 1, volume: 0.45, delaySend: 0.05, reverbSend: 0.1 },
      tone: { pulses: 7, steps: 19, offset: 4, ratchet: 2, chaosEnabled: true, entropy: 1.3, evolveEnabled: true, mutationRate: 0.10, mutationSpeed: 1, rootNote: 50, scaleId: 'wholeTone', octaveRange: 2, noteIndices: [0, 5, 2, 4, 1, 3, 5, 0, 4, 2, 1, 3, 5, 4, 0, 2, 3, 1, 5], volume: 0.5, delaySend: 0.2, reverbSend: 0.4 },
      cloud: { pulses: 4, steps: 19, offset: 0, volume: 0.35, delaySend: 0.3, reverbSend: 0.6 }
    }
  },
  {
    id: 'duende-digital',
    name: 'Duende Digital',
    type: 'master',
    category: 'Experimental',
    description: 'Fusión pura — Soleá + tonal + IDM. Donde flamenco e IDM son indistinguibles.',
    bpm: 85,
    jitter: 5,
    swing: 40,
    dynamics: 65,
    temporalityMode: 'flamenco',
    tracks: {
      kick: { pulses: 5, steps: 12, offset: 0, ratchet: 1, volume: 0.8, delaySend: 0.05, reverbSend: 0.3 },
      snare: { pulses: 3, steps: 12, offset: 3, ratchet: 0, chaosEnabled: true, entropy: 1.15, evolveEnabled: true, mutationRate: 0.04, mutationSpeed: 3, volume: 0.65, delaySend: 0.15, reverbSend: 0.4 },
      hat: { pulses: 8, steps: 17, offset: 0, ratchet: 0, evolveEnabled: true, mutationRate: 0.08, mutationSpeed: 1, volume: 0.5, delaySend: 0.1, reverbSend: 0.2 },
      tone: { pulses: 5, steps: 12, offset: 1, ratchet: 0, evolveEnabled: true, mutationRate: 0.03, mutationSpeed: 4, rootNote: 48, scaleId: 'phrygianDominant', octaveRange: 2, noteIndices: [0, 1, 4, 3, 0, 5, 2, 4, 1, 0, 3, 2], volume: 0.65, delaySend: 0.2, reverbSend: 0.7 },
      cloud: { pulses: 4, steps: 12, offset: 0, volume: 0.35, delaySend: 0.25, reverbSend: 0.8 }
    }
  },

  // --- PATRONES ATÓMICOS (ATOMIC) ---
  {
    id: 'solea-atom',
    name: 'Soleá (Base)',
    type: 'atomic',
    category: 'Flamenco',
    description: 'Patrón atómico de Soleá. Inyectar para establecer base de 12. (E 5, 12)',
    config: { pulses: 5, steps: 12, offset: 0 }
  },
  {
    id: 'buleria-atom',
    name: 'Bulería (Base)',
    type: 'atomic',
    category: 'Flamenco',
    description: 'Patrón atómico de Bulería. Inyectar para síncopa rápida. (E 7, 12)',
    config: { pulses: 7, steps: 12, offset: 0 }
  },
  {
    id: 'siguiriya-atom',
    name: 'Siguiriya (Base)',
    type: 'atomic',
    category: 'Flamenco',
    description: 'Patrón atómico de Siguiriya. Amalgama 2-2-3-3-2. (E 5, 12 reordenado)',
    config: { pulses: 5, steps: 12, offset: 2 }
  },
  {
    id: 'guajira-atom',
    name: 'Guajira (Base)',
    type: 'atomic',
    category: 'Flamenco',
    description: 'Patrón atómico de Guajira. Hemiola 6/8 vs 3/4. (E 6, 12)',
    config: { pulses: 6, steps: 12, offset: 0 }
  },
  {
    id: 'folded-atom',
    name: 'Folded 13',
    type: 'atomic',
    category: 'IDM',
    description: 'Patrón atómico asimétrico. (E 7, 13)',
    config: { pulses: 7, steps: 13, offset: 2 }
  },
  {
    id: 'async-atom',
    name: 'Async 11',
    type: 'atomic',
    category: 'IDM',
    description: 'Patrón atómico de interferencia. (E 5, 11)',
    config: { pulses: 5, steps: 11, offset: 4 }
  },
  {
    id: 'detroit-atom',
    name: 'Detroit Grid',
    type: 'atomic',
    category: 'IDM',
    description: 'Patrón atómico de rejilla pura. (E 16, 16)',
    config: { pulses: 16, steps: 16, offset: 0 }
  },

  // --- PHASE 4: GENERATIVE PRESETS ---
  {
    id: 'fibonacci-tree',
    name: 'Árbol de Fibonacci',
    type: 'master',
    category: 'Experimental',
    description: 'L-System + Markov: dos motores generativos en diálogo. Snare y Hat usan L-Systems con reglas distintas; la melodía usa Markov con anclaje.',
    bpm: 105,
    jitter: 6,
    swing: 30,
    dynamics: 70,
    temporalityMode: 'dilla',
    tracks: {
      kick: { pulses: 3, steps: 8, offset: 0, volume: 0.85, delaySend: 0.05, reverbSend: 0.2 },
      snare: { pulses: 4, steps: 8, offset: 0, patternMode: 'lsystem', lsSeed: 'XO', lsRuleA: 'XO', lsIterations: 4, volume: 0.7, delaySend: 0.15, reverbSend: 0.3 },
      hat: { pulses: 5, steps: 8, offset: 0, patternMode: 'lsystem', lsSeed: 'X', lsRuleA: 'XOO', lsIterations: 5, volume: 0.5, delaySend: 0.1, reverbSend: 0.15 },
      tone: { pulses: 4, steps: 12, offset: 0, noteMode: 'markov', markovStyle: 'scale', markovTemperature: 35, markovAnchor: 8, rootNote: 48, scaleId: 'minor', octaveRange: 2, noteIndices: [0, 2, 4, 1, 3, 5, 2, 4, 0, 3, 1, 5], volume: 0.6, delaySend: 0.2, reverbSend: 0.5 },
    }
  },
  {
    id: 'markov-flamenca',
    name: 'Cadena de Markov Flamenca',
    type: 'master',
    category: 'Experimental',
    description: 'Soleá + Markov flamenco: el algoritmo aprende el instinto del cante. Melodía generada por cadena de Markov con gravedad hacia la tónica y el semitono inferior.',
    bpm: 80,
    jitter: 3,
    swing: 15,
    dynamics: 60,
    temporalityMode: 'flamenco',
    tracks: {
      kick: { pulses: 5, steps: 12, offset: 0, volume: 0.8, delaySend: 0.05, reverbSend: 0.3 },
      snare: { pulses: 3, steps: 12, offset: 2, volume: 0.65, delaySend: 0.1, reverbSend: 0.35 },
      hat: { pulses: 2, steps: 12, offset: 6, baseProbability: 0.8, volume: 0.45, delaySend: 0.05, reverbSend: 0.2 },
      tone: { pulses: 5, steps: 12, offset: 0, noteMode: 'markov', markovStyle: 'flamenco', markovTemperature: 25, markovAnchor: 4, rootNote: 52, scaleId: 'phrygianDominant', octaveRange: 2, noteIndices: [0, 1, 4, 3, 0, 5, 2, 4, 1, 0, 3, 2], volume: 0.65, delaySend: 0.2, reverbSend: 0.7 },
    }
  },

  // --- PHASE 6C: FIELD RECORDING PRESET ---
  {
    id: 'field-recording',
    name: 'Lluvia Granular',
    type: 'master',
    category: 'Experimental',
    description: 'Pipeline Field Recording: carga un sample de campo y esculpe textura ambient con EQ, stretch y granular.',
    bpm: 72,
    jitter: 1,
    swing: 0,
    dynamics: 40,
    temporalityMode: 'grid',
    tracks: {
      kick: { pulses: 1, steps: 16, volume: 0 },
      snare: { pulses: 1, steps: 16, volume: 0 },
      hat: { pulses: 1, steps: 16, volume: 0 },
      tone: {
        pulses: 3, steps: 16, offset: 0,
        synthType: 'ambient',
        rootNote: 48,
        scaleId: 'minor',
        octaveRange: 2,
        stretchEnabled: true,
        stretchRate: 0.5,
        eqEnabled: true,
        eqHpfFreq: 120,
        eqLpfFreq: 6000,
        reverbSend: 0.85,
        delaySend: 0.3,
        volume: 0.7,
      },
      cloud: {
        pulses: 4, steps: 16, offset: 0,
        cloudMode: 'granular',
        grainSize: 400,
        overlap: 0.6,
        spray: 200,
        eqEnabled: true,
        eqHpfFreq: 80,
        eqLpfFreq: 8000,
        reverbSend: 0.9,
        volume: 0.6,
      },
    }
  },
  // --- PHASE 6D: LAYER 2 TIME STRETCH PRESETS ---
  {
    id: 'amen-layers',
    name: 'Amen Layers',
    type: 'master',
    category: 'Experimental',
    description: 'Break Layering: mismo break, dos velocidades, un timbre nuevo. Cargar Amen Break en Hat y en su Layer 2.',
    bpm: 160,
    jitter: 1,
    swing: 0,
    dynamics: 70,
    temporalityMode: 'grid',
    tracks: {
      kick: { pulses: 4, steps: 16, volume: 0.7 },
      snare: { pulses: 2, steps: 16, volume: 0.6 },
      hat: {
        pulses: 8, steps: 16, volume: 0.8,
        layer2StretchEnabled: true,
        layer2StretchRate: 0.5,
        layer2Blend: 0.5,
        layer2Pitch: -12,
        reverbSend: 0.2,
      },
      tone: { pulses: 0, steps: 16, volume: 0 },
      cloud: { volume: 0 },
    }
  },
  {
    id: 'burial-texture',
    name: 'Burial Texture',
    type: 'master',
    category: 'Experimental',
    description: 'Break Layering: dos velocidades complementarias crean textura densa estilo Burial.',
    bpm: 130,
    jitter: 2,
    swing: 30,
    dynamics: 65,
    temporalityMode: 'dilla',
    tracks: {
      kick: { pulses: 3, steps: 16, volume: 0.65 },
      snare: { pulses: 2, steps: 16, volume: 0.55 },
      hat: {
        pulses: 6, steps: 16, volume: 0.7,
        stretchEnabled: true,
        stretchRate: 0.75,
        eqEnabled: true,
        eqLpfFreq: 8000,
        layer2StretchEnabled: true,
        layer2StretchRate: 1.5,
        layer2Blend: 0.4,
        layer2Pitch: 7,
        reverbSend: 0.35,
      },
      tone: { pulses: 0, steps: 16, volume: 0 },
      cloud: { volume: 0 },
    }
  },

  // --- PHASE 7: DSP ADVANCED PRESET ---
  {
    id: 'bode-machine',
    name: 'Bode Machine',
    type: 'master',
    category: 'IDM',
    description: 'Frequency Shifter en todas las pistas — timbres inarmónicos puros. Markov IDM + Crossfeed. Todo desplazado, nada natural.',
    bpm: 120,
    jitter: 4,
    swing: 0,
    dynamics: 80,
    temporalityMode: 'arritmia',
    tracks: {
      kick: { pulses: 4, steps: 16, offset: 0, freqShiftEnabled: true, freqShift: 150, volume: 0.85, delaySend: 0.05, reverbSend: 0.15 },
      snare: { pulses: 3, steps: 16, offset: 4, freqShiftEnabled: true, freqShift: 75, volume: 0.7, delaySend: 0.1, reverbSend: 0.2 },
      hat: { pulses: 7, steps: 16, offset: 0, pan: 0.7, freqShiftEnabled: true, freqShift: 200, volume: 0.55, delaySend: 0.05, reverbSend: 0.1 },
      tone: { pulses: 5, steps: 16, offset: 0, noteMode: 'markov', markovStyle: 'idm', markovTemperature: 80, markovAnchor: 0, rootNote: 48, scaleId: 'chromatic', octaveRange: 2, freqShiftEnabled: true, freqShift: 50, noteIndices: [0, 3, 7, 2, 9, 4, 11, 1, 6, 8, 5, 10, 3, 7, 0, 9], volume: 0.6, delaySend: 0.15, reverbSend: 0.3 },
      cloud: { pulses: 4, steps: 16, offset: 0, cloudMode: 'granular', grainSize: 300, overlap: 0.5, spray: 150, volume: 0.4, delaySend: 0.1, reverbSend: 0.4 },
    }
  },
];
