/**
 * Euclidean Machine (Nivel 1) - Master Presets Library
 * 
 * This library integrates Flamenco tradition with IDM/Autechre algorithmic complexity.
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
  baseProbability?: number; // Applied to all steps in the track
}

export interface ScenePreset {
  id: string;
  name: string;
  type: 'master' | 'atomic';
  category: 'Flamenco' | 'IDM' | 'Glitch' | 'Experimental';
  description: string;
  bpm?: number;
  jitter?: number; // 0-20ms
  swing?: number; // 0-100%
  dynamics?: number; // 0-100%
  tracks?: {
    [trackId: string]: TrackPreset;
  };
  config?: TrackPreset; // For atomic patterns
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
  }
];
