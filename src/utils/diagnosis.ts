import { lcmArray } from './math';

const isPrime = (n: number): boolean => n > 1 && !Array.from({ length: n - 2 }, (_, i) => i + 2).some(i => n % i === 0);

export interface DiagnosisContext {
  tracks: Array<{
    id: string;
    name: string;
    steps: number;
    pulses: number;
    offset: number;
    chaosEnabled: boolean;
    entropy: number;
    evolveEnabled: boolean;
    mutationRate: number;
    mutationSpeed: number;
    ratchet: number;
    isMuted: boolean;
    isTonal: boolean;
    scaleId?: string;
    synthType?: string;
    arRate?: number;
    arDepth?: number;
    wfAmount?: number;
    wfSymmetry?: number;
    addPartials?: number;
    addBrightness?: number;
  }>;
  globalState: {
    bpm: number;
    temporalityMode: string;
    jitter: number;
    swing: number;
    mmHistoryLength: number;
    mmLastRatio?: string;
    mmOriginalBpm?: number;
  };
  computed: {
    mcm: number;
    eclipseTime: string;
    hitRate: number | null;
  };
}

export interface DiagnosisInsight {
  id: string;
  icon: string;
  insight: string;
  suggestion: string;
  priority: number;
}

interface DiagnosisRule {
  id: string;
  category: 'estructura' | 'temporalidad' | 'densidad' | 'tonal' | 'combinacion';
  icon: string;
  condition: (ctx: DiagnosisContext) => boolean;
  insight: (ctx: DiagnosisContext) => string;
  suggestion: (ctx: DiagnosisContext) => string;
  priority: number;
}

function formatEclipseTime(mcm: number, bpm: number): string {
  const sixteenthDuration = 60 / (bpm * 4);
  const totalSeconds = mcm * sixteenthDuration;
  if (totalSeconds < 60) return `${Math.round(totalSeconds)}s`;
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.round(totalSeconds % 60);
  return `${mins}m ${secs}s`;
}

function getActiveTracks(ctx: DiagnosisContext) {
  return ctx.tracks.filter(t => !t.isMuted && t.id !== 'cloud');
}

function getRhythmicTracks(ctx: DiagnosisContext) {
  return getActiveTracks(ctx).filter(t => !t.isTonal);
}

const RULES: DiagnosisRule[] = [
  // ═══ ESTRUCTURA (5) ═══
  {
    id: 'sync-total',
    category: 'estructura',
    icon: '⊙',
    priority: 35,
    condition: (ctx) => {
      const rhythmic = getRhythmicTracks(ctx);
      if (rhythmic.length < 2) return false;
      return rhythmic.every(t => t.steps === rhythmic[0].steps);
    },
    insight: (ctx) => {
      const rhythmic = getRhythmicTracks(ctx);
      return `Todas las pistas comparten el mismo ciclo de ${rhythmic[0].steps} pasos. Se reinician juntas cada ${ctx.computed.eclipseTime}. Es máxima estabilidad — pero también máxima predictibilidad. El oído detecta la repetición rápido.`;
    },
    suggestion: () => 'Cambia una pista a un número primo de steps (11, 13, 17) para romper la simetría y expandir el ciclo.',
  },
  {
    id: 'pista-prima',
    category: 'estructura',
    icon: 'ℙ',
    priority: 45,
    condition: (ctx) => getRhythmicTracks(ctx).some(t => isPrime(t.steps)),
    insight: (ctx) => {
      const t = getRhythmicTracks(ctx).find(t => isPrime(t.steps))!;
      return `${t.name} está en un ciclo de ${t.steps} pasos (primo). Los primos no se dividen limpiamente por nada — cualquier otra pista con distinto ciclo generará interferencia máxima. Es la herramienta de Autechre para garantizar no-repetición.`;
    },
    suggestion: () => 'Combina con otra pista en ciclo primo diferente. El MCM será el producto de ambos — complejidad explosiva.',
  },
  {
    id: 'mcm-infinito',
    category: 'estructura',
    icon: '∞',
    priority: 50,
    condition: (ctx) => ctx.computed.mcm > 1000,
    insight: (ctx) => `El ciclo completo tarda ${ctx.computed.eclipseTime} en repetirse. Estás en zona de evolución infinita — el oyente no puede anticipar cuándo volverán a coincidir las pistas. Cada segundo que escuchas es único en la escala de la memoria humana.`,
    suggestion: () => 'Observa el countdown de Eclipse. Cuando llegue a cero, habrás escuchado algo que no se repetirá en minutos.',
  },
  {
    id: 'mcm-corto',
    category: 'estructura',
    icon: '◎',
    priority: 40,
    condition: (ctx) => ctx.computed.mcm > 0 && ctx.computed.mcm < 20,
    insight: (ctx) => `El ciclo se reinicia cada ${ctx.computed.eclipseTime}. La repetición es rápida y evidente. En el flamenco esto es natural — el compás de 12 repite cada 3.6 segundos a 80 BPM. En el IDM, buscarías expandirlo.`,
    suggestion: () => 'Si quieres más complejidad, cambia un track a steps primo (11, 13, 17). Un solo cambio puede multiplicar el MCM por 10.',
  },
  {
    id: 'offsets-cero',
    category: 'estructura',
    icon: '⌖',
    priority: 30,
    condition: (ctx) => {
      const rhythmic = getRhythmicTracks(ctx);
      return rhythmic.length >= 2 && rhythmic.every(t => t.offset === 0);
    },
    insight: () => 'Todas las pistas empiezan en el mismo punto. No hay desfase entre ellas — los acentos coinciden. En el flamenco, esto equivale a "cerrar a tierra": todos golpean el uno juntos.',
    suggestion: () => 'Desplaza el snare con offset 3-5. La síncopa aparece al mover el acento — es la diferencia entre una marcha militar y un compás de Soleá.',
  },

  // ═══ TEMPORALIDAD (4) ═══
  {
    id: 'flamenco-12',
    category: 'temporalidad',
    icon: '🔥',
    priority: 55,
    condition: (ctx) => ctx.globalState.temporalityMode === 'flamenco' && getActiveTracks(ctx).some(t => t.steps === 12),
    insight: () => 'Modo Flamenco sobre compás de 12. Los golpes gravitan hacia los acentos canónicos (tiempos 3, 6, 8, 10, 12). Es el "soniquete" — esa gravedad interna que los palmeros sienten pero no pueden explicar. Los golpes no caen donde dice la matemática — caen donde pide el compás.',
    suggestion: () => 'Sube el swing al 50% para intensificar la atracción. Baja a 10% para un soniquete sutil, casi subliminal.',
  },
  {
    id: 'flamenco-no12',
    category: 'temporalidad',
    icon: '🌀',
    priority: 45,
    condition: (ctx) => ctx.globalState.temporalityMode === 'flamenco' && !getActiveTracks(ctx).some(t => t.steps === 12),
    insight: () => 'Modo Flamenco sobre ciclos no-tradicionales. La gravedad se aplica usando los propios golpes del patrón euclidiano como acentos — no los del compás de 12. Es una fusión genuina: el feeling flamenco sin la estructura flamenca. Un territorio sin nombre.',
    suggestion: () => 'Prueba a cambiar una pista a 12 steps. Escucha cómo la gravedad "reconoce" la estructura flamenca y se asienta.',
  },
  {
    id: 'dilla-jitter-bajo',
    category: 'temporalidad',
    icon: '🎧',
    priority: 50,
    condition: (ctx) => ctx.globalState.temporalityMode === 'dilla' && ctx.globalState.jitter < 3,
    insight: (ctx) => `Dilla necesita jitter para existir. Su magia es que el kick se queda firme mientras hats y snare flotan. A ${ctx.globalState.jitter}ms no hay diferencia perceptible entre pistas — todos suenan igual de "rectos".`,
    suggestion: () => 'Sube el jitter a 10-15ms. El kick apenas se moverá (escala 0.1×) pero el hat flotará un 150%. Ahí está el Dilla.',
  },
  {
    id: 'arritmia-swing-bajo',
    category: 'temporalidad',
    icon: '⚡',
    priority: 45,
    condition: (ctx) => ctx.globalState.temporalityMode === 'arrhythmia' && ctx.globalState.swing < 10,
    insight: () => 'Arritmia sin swing es un grid normal. El swing es lo que controla cuánto se distorsiona la rejilla — a 0% los golpes caen exactamente donde el grid dice. Arritmia necesita swing para desplazar.',
    suggestion: () => 'Sube el swing al 50-70%. Los golpes empezarán a huir del grid. A 70% es Antipop Consortium puro.',
  },

  // ═══ DENSIDAD (3) ═══
  {
    id: 'hitrate-bajo',
    category: 'densidad',
    icon: '○',
    priority: 55,
    condition: (ctx) => ctx.computed.hitRate !== null && ctx.computed.hitRate < 50,
    insight: (ctx) => `Más de la mitad de los golpes programados no suenan. El Hit Rate al ${Math.round(ctx.computed.hitRate!)}% significa que el silencio domina. En la estética de Anticon, esto es "espacio negativo rítmico" — lo que no suena esculpe lo que suena. En el flamenco, los respiros entre golpes dan peso al siguiente acento.`,
    suggestion: () => 'Observa qué pistas tienen Chaos activo. Reduce el entropy para recuperar golpes, o déjalo así si buscas esa respiración.',
  },
  {
    id: 'hitrate-determinista',
    category: 'densidad',
    icon: '■',
    priority: 40,
    condition: (ctx) => ctx.computed.hitRate !== null && ctx.computed.hitRate > 95 && !getActiveTracks(ctx).some(t => t.chaosEnabled),
    insight: (ctx) => `Patrón casi perfectamente determinista. Hit Rate al ${Math.round(ctx.computed.hitRate!)}% — lo que programaste es lo que suena, ciclo tras ciclo. Sin Chaos ni Evolve, cada repetición es idéntica. Es la estética del techno: hipnosis por repetición.`,
    suggestion: () => 'Activa Chaos en el hat (entropy 1.2×) para inyectar duda. O activa Evolve (Rate 5%) para que el patrón derive lentamente. La vida entra por las grietas.',
  },
  {
    id: 'evolve-masivo',
    category: 'densidad',
    icon: '🧬',
    priority: 60,
    condition: (ctx) => getActiveTracks(ctx).filter(t => t.evolveEnabled).length >= 3,
    insight: (ctx) => {
      const count = getActiveTracks(ctx).filter(t => t.evolveEnabled).length;
      return `Mutación generalizada. Las probabilidades de ${count} pistas están derivando en paralelo. En unos minutos, el patrón será irreconocible respecto al estado inicial. Es lo que Autechre llama "sistemas generativos autónomos" — defines las reglas y observas qué emerge.`;
    },
    suggestion: () => 'Abre el Engine Room y mira cómo el Hit Rate baja con el tiempo. Cuando llegue a ~60%, estarás escuchando un patrón que la app inventó sola.',
  },

  // ═══ TONAL (3) ═══
  {
    id: 'escala-flamenca',
    category: 'tonal',
    icon: '🎸',
    priority: 45,
    condition: (ctx) => getActiveTracks(ctx).some(t => t.isTonal && t.scaleId === 'phrygianDominant'),
    insight: () => 'Escala Frigia Dominante — la escala del flamenco. El semitono entre la primera y segunda nota (ej: C→Db) crea la tensión que define el cante jondo. En la tradición árabe se llama Hijaz. Es la misma escala que tocan guitarristas flamencos desde hace siglos, ahora distribuida por un algoritmo euclidiano.',
    suggestion: () => 'Cambia a Minor para escuchar cómo desaparece la tensión flamenca. Vuelve a Phrygian Dominant. Ese semitono inicial es el ADN sonoro del flamenco.',
  },
  {
    id: 'escala-whole-tone',
    category: 'tonal',
    icon: '🌊',
    priority: 40,
    condition: (ctx) => getActiveTracks(ctx).some(t => t.isTonal && t.scaleId === 'wholeTone'),
    insight: () => 'Escala de tonos enteros: cada nota está a la misma distancia de la siguiente. No hay tónica, no hay dominante, no hay gravedad. Debussy la usó para pintar impresionismo. Autechre la usa para eliminar jerarquía. Todo suena igualmente familiar e igualmente extraño.',
    suggestion: () => 'Compara con Phrygian Dominant. La frigia tiene un centro claro (la primera nota "manda"). La Whole Tone no — es democracia tonal.',
  },
  {
    id: 'tone-kick-dialogo',
    category: 'tonal',
    icon: '↔',
    priority: 50,
    condition: (ctx) => {
      const active = getActiveTracks(ctx);
      const tone = active.find(t => t.isTonal);
      const kick = active.find(t => t.id === 'kick');
      return !!tone && !!kick && tone.steps === kick.steps && tone.offset !== kick.offset;
    },
    insight: (ctx) => {
      const active = getActiveTracks(ctx);
      const tone = active.find(t => t.isTonal)!;
      const kick = active.find(t => t.id === 'kick')!;
      const delta = Math.abs(tone.offset - kick.offset);
      return `El Tone y el Kick comparten ciclo de ${tone.steps} pero están desfasados ${delta} steps. Es un diálogo: la melodía sigue al ritmo con retraso, como una guitarra que responde al zapateado. En el flamenco, esta relación se llama "temple" — el momento donde cante y toque se buscan sin coincidir exactamente.`;
    },
    suggestion: () => 'Ajusta el offset del Tone a 0. Ahora melodía y ritmo caen juntos — el diálogo desaparece y se convierte en unísono. ¿Qué prefieres?',
  },

  // ═══ COMBINACIÓN (5) ═══
  {
    id: 'fusion-flamenco-idm',
    category: 'combinacion',
    icon: '✦',
    priority: 80,
    condition: (ctx) => {
      const active = getActiveTracks(ctx);
      return ctx.globalState.temporalityMode === 'flamenco' &&
        active.some(t => t.steps === 12) &&
        active.some(t => isPrime(t.steps));
    },
    insight: () => 'Has encontrado el cruce. Compás flamenco de 12 en la base, ciclo primo arriba, y gravedad del soniquete uniendo los dos mundos. Es lo que Rosalía intuye en "Malamente" y Refree formaliza en "Tercer Cielo": la tradición y el algoritmo como lenguajes del mismo impulso.',
    suggestion: () => 'Activa Evolve en la pista prima. La interferencia rítmica mutará lentamente — el cruce entre mundos se moverá bajo tus pies.',
  },
  {
    id: 'zapateado-digital',
    category: 'combinacion',
    icon: '👢',
    priority: 75,
    condition: (ctx) => {
      const kick = getActiveTracks(ctx).find(t => t.id === 'kick');
      return !!kick && kick.ratchet >= 1 && ctx.globalState.temporalityMode === 'flamenco';
    },
    insight: (ctx) => {
      const kick = getActiveTracks(ctx).find(t => t.id === 'kick')!;
      return `Kick con ratchet en modo Flamenco: zapateado digital. Cada pisada tiene rebote — la "ligereza" del baile. En el flamenco tradicional, el zapateado alterna entre golpe seco (gravedad) y rebote (aire). El ratchet ×${kick.ratchet + 1} es el aire. La gravedad del modo Flamenco es la tierra.`;
    },
    suggestion: () => 'Compara ratchet ×1 (doble golpe sutil) con ×3 (ráfaga). El ×1 es zapateado; el ×3 es redoble de cajón.',
  },
  {
    id: 'caos-generativo-total',
    category: 'combinacion',
    icon: '🌪',
    priority: 85,
    condition: (ctx) => {
      const active = getActiveTracks(ctx);
      return active.filter(t => t.chaosEnabled).length >= 2 &&
        active.filter(t => t.evolveEnabled).length >= 2 &&
        ctx.computed.mcm > 500;
    },
    insight: (ctx) => `Sistema generativo autónomo. Chaos introduce azar instantáneo, Evolve introduce deriva lenta, y el MCM de ${ctx.computed.mcm} garantiza que el ciclo no se repite en ${ctx.computed.eclipseTime}. Ya no estás componiendo — estás definiendo un ecosistema y observando qué vida emerge. Es la filosofía de Autechre en "Confield": el artista diseña el proceso, no el resultado.`,
    suggestion: () => 'Déjalo sonar 5 minutos. Luego guarda como User Preset. Has capturado un instante irrepetible de un proceso infinito.',
  },
  {
    id: 'grid-plano',
    category: 'combinacion',
    icon: '▦',
    priority: 35,
    condition: (ctx) => {
      const active = getActiveTracks(ctx);
      return ctx.globalState.temporalityMode === 'grid' &&
        active.length >= 2 &&
        active.every(t => t.steps === 16 && !t.chaosEnabled && !t.evolveEnabled);
    },
    insight: () => 'Rejilla pura de 16 sin variación. Es el estado base — techno de Detroit, cuatro al suelo, repetición como mantra. La expresión no viene del patrón sino de lo que hagas con velocity, filtros y FX. Jeff Mills construyó una carrera sobre esta rejilla.',
    suggestion: () => 'Activa un solo elemento: Chaos en el hat, o Evolve en el snare, o cambia el hat a 17 steps. Un cambio mínimo transforma la rejilla en algo vivo.',
  },
  {
    id: 'tone-evolve-flamenco',
    category: 'combinacion',
    icon: '🌙',
    priority: 70,
    condition: (ctx) => {
      const tone = getActiveTracks(ctx).find(t => t.isTonal);
      return !!tone && tone.evolveEnabled && ctx.globalState.temporalityMode === 'flamenco';
    },
    insight: (ctx) => {
      const tone = getActiveTracks(ctx).find(t => t.isTonal)!;
      return `Melodía mutante sobre compás flamenco. Las probabilidades de la pista tonal derivan un ${Math.round(tone.mutationRate * 100)}% cada ${tone.mutationSpeed} ciclos — algunas notas empezarán a fallar y otras a reforzarse. Es como un cantaor que cada vez que repite una copla la cambia ligeramente, nunca dos veces igual. El cante jondo como sistema generativo.`;
    },
    suggestion: () => 'Baja el Evolve Rate a 2-3% para una deriva casi imperceptible. Las mejores mutaciones son las que no notas hasta que de repente te das cuenta de que el patrón ya no es el que era.',
  },
  // === Reglas de síntesis tonal ===
  {
    id: 'fm-con-ar',
    category: 'tonal' as const,
    icon: '≈',
    priority: 55,
    condition: (ctx) => {
      const tone = getActiveTracks(ctx).find(t => t.isTonal);
      return !!tone && tone.synthType === 'fm' && (tone.arDepth ?? 0) > 200;
    },
    insight: (ctx) => {
      const tone = getActiveTracks(ctx).find(t => t.isTonal)!;
      return `FM Synthesis con Audio-Rate Modulation activa. El LFO a ${tone.arRate ?? 80}Hz está creando sidebands — frecuencias nuevas por encima y por debajo de cada armónico FM. Es modulación de la modulación: el territorio donde Autechre y los sintetizadores Buchla convergen.`;
    },
    suggestion: () => 'Sube arRate a 400-800Hz. Las sidebands empezarán a cruzarse con los armónicos FM y crearán diferencias de frecuencia audibles como notas fantasma.',
  },
  {
    id: 'wf-fold-alto',
    category: 'tonal' as const,
    icon: '∿',
    priority: 50,
    condition: (ctx) => {
      const tone = getActiveTracks(ctx).find(t => t.isTonal);
      return !!tone && tone.synthType === 'wf' && (tone.wfAmount ?? 0) > 6;
    },
    insight: (ctx) => {
      const tone = getActiveTracks(ctx).find(t => t.isTonal)!;
      return `Wavefolding intenso (fold ${(tone.wfAmount ?? 0).toFixed(1)}). La onda se ha doblado sobre sí misma ${Math.floor(tone.wfAmount ?? 0)} veces — el espectro original es irreconocible. Esto es síntesis West Coast en estado puro: complejidad tímbrica que ningún oscilador convencional puede generar.`;
    },
    suggestion: () => 'Mueve wfSymmetry lejos del centro (±0.7). La asimetría del fold crea armónicos pares que añaden \'calidez\' al caos espectral.',
  },
  {
    id: 'add-brightness-extremo',
    category: 'tonal' as const,
    icon: '∑',
    priority: 45,
    condition: (ctx) => {
      const tone = getActiveTracks(ctx).find(t => t.isTonal);
      return !!tone && tone.synthType === 'add' && ((tone.addBrightness ?? 0.5) < 0.1 || (tone.addBrightness ?? 0.5) > 0.9);
    },
    insight: (ctx) => {
      const tone = getActiveTracks(ctx).find(t => t.isTonal)!;
      const bright = tone.addBrightness ?? 0.5;
      return `Síntesis aditiva en extremo de pendiente espectral. Con Bright ${bright < 0.5 ? 'bajo' : 'alto'} el timbre es ${bright < 0.5 ? 'oscuro — el fundamental domina, los armónicos susurran' : 'metálico — todos los parciales tienen el mismo peso, sin jerarquía natural'}. La Yamaha DX7 usaba valores intermedios (0.3-0.6) para imitar instrumentos acústicos.`;
    },
    suggestion: () => 'Compara Bright 0.0 y 1.0 con la misma nota. Son dos filosofías opuestas del sonido: la naturaleza (decaimiento 1/n) contra la máquina (todos iguales).',
  },
  {
    id: 'synth-flamenco',
    category: 'combinacion' as const,
    icon: '♭',
    priority: 70,
    condition: (ctx) => {
      const tone = getActiveTracks(ctx).find(t => t.isTonal);
      return !!tone && tone.synthType === 'wf' && ctx.globalState.temporalityMode === 'flamenco' && tone.scaleId === 'phrygianDominant';
    },
    insight: () => 'Wavefolding sobre compás flamenco con escala Phrygian Dominant. La síntesis West Coast de Buchla genera timbres que los instrumentos acústicos flamencos no pueden producir — pero sobre la misma geometría armónica. Es Raúl Refree en \'Tercer Cielo\': la tradición y el algoritmo compartiendo el mismo espacio.',
    suggestion: () => 'Sube wfAmount a 5-6 y activa Evolve. El timbre mutará sobre el compás fijo — el duende electrónico.',
  },
  {
    id: 'ar-zona-critica',
    category: 'tonal' as const,
    icon: '≋',
    priority: 60,
    condition: (ctx) => {
      const tone = getActiveTracks(ctx).find(t => t.isTonal);
      return !!tone && (tone.arDepth ?? 0) > 0 && (tone.arRate ?? 80) >= 200 && (tone.arRate ?? 80) <= 800;
    },
    insight: (ctx) => {
      const tone = getActiveTracks(ctx).find(t => t.isTonal)!;
      return `Audio-Rate Modulation en zona crítica (${tone.arRate ?? 80}Hz). Entre 200 y 800Hz el LFO crea sidebands que caen dentro del rango de frecuencias fundamentales — se perciben como notas adicionales, no como timbre. Es la técnica §6.3 del documento IDM: el límite entre modulación y síntesis.`;
    },
    suggestion: () => 'Afina arRate a exactamente 220Hz (La3) o 440Hz (La4). Las sidebands resonarán con los armónicos de la nota tonal y crearán intervalos musicales en lugar de ruido.',
  },
  {
    id: 'add-parciales-primos',
    category: 'tonal' as const,
    icon: 'ℙ',
    priority: 40,
    condition: (ctx) => {
      const tone = getActiveTracks(ctx).find(t => t.isTonal);
      return !!tone && tone.synthType === 'add' && [3, 5, 7].includes(tone.addPartials ?? 4);
    },
    insight: (ctx) => {
      const tone = getActiveTracks(ctx).find(t => t.isTonal)!;
      return `Síntesis aditiva con ${tone.addPartials ?? 4} parciales — número primo. Los parciales primos no comparten subarmónicos entre sí, lo que genera un timbre sin periodicidad regular. El oído percibe riqueza sin poder identificar el patrón. Es el mismo principio que usas en el motor rítmico: números primos = máxima no-repetición.`;
    },
    suggestion: () => 'Compara 4 parciales (no primo) con 5 (primo). La diferencia es sutil pero el timbre de 5 tiene una irregularidad característica que el de 4 no tiene.',
  },
];

export function computeMcm(tracks: DiagnosisContext['tracks']): number {
  const active = tracks.filter(t => !t.isMuted && t.id !== 'cloud');
  if (active.length === 0) return 0;
  return lcmArray(active.map(t => t.steps));
}

export function computeEclipseTime(mcm: number, bpm: number): string {
  return formatEclipseTime(mcm, bpm);
}

export function evaluateDiagnosis(ctx: DiagnosisContext): DiagnosisInsight[] {
  const matched = RULES
    .filter(rule => {
      try { return rule.condition(ctx); } catch { return false; }
    })
    .map(rule => ({
      id: rule.id,
      icon: rule.icon,
      insight: rule.insight(ctx),
      suggestion: rule.suggestion(ctx),
      priority: rule.priority,
    }));

  // Mutual exclusion: sync-total suppresses offsets-cero and grid-plano
  const hasSyncTotal = matched.some(m => m.id === 'sync-total');
  const filtered = hasSyncTotal
    ? matched.filter(m => m.id !== 'offsets-cero' && m.id !== 'grid-plano')
    : matched;

  return filtered
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 3);
}
