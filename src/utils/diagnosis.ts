/**
 * Fase D — Intérprete en Tiempo Real
 * 25 reglas de diagnóstico musical. Funciones puras, sin dependencias de React.
 */

import { lcmArray } from './math';

// --- Interfaces ---

export interface DiagnosisTrack {
  id: string;
  name: string;
  steps: number;
  pulses: number;
  offset: number;
  chaosEnabled: boolean;
  entropy: number;
  evolveEnabled: boolean;
  mutationRate: number;
  ratchet: number;
  scaleId?: string;
  rootNote?: number;
  isTonal?: boolean;
}

export interface DiagnosisInput {
  tracks: DiagnosisTrack[];
  temporalityMode: string;
  jitter: number;
  swing: number;
  dynamics: number;
  bpm: number;
  hitRate: number | null;
}

export interface DiagnosisInsight {
  id: string;
  category: 'structure' | 'temporality' | 'density' | 'tonal' | 'combination';
  icon: string;
  insight: string;
  suggestion: string;
  priority: number;
}

// --- Helpers ---

function isPrime(n: number): boolean {
  if (n < 2) return false;
  if (n < 4) return true;
  if (n % 2 === 0 || n % 3 === 0) return false;
  for (let i = 5; i * i <= n; i += 6) {
    if (n % i === 0 || n % (i + 2) === 0) return false;
  }
  return true;
}

function formatEclipseTime(mcm: number, bpm: number): string {
  const seconds = (mcm * 60) / (bpm * 4);
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const min = Math.floor(seconds / 60);
  const sec = Math.round(seconds % 60);
  return sec > 0 ? `${min}m ${sec}s` : `${min}m`;
}

// --- Rule engine ---

export function diagnose(input: DiagnosisInput): DiagnosisInsight[] {
  const { tracks, temporalityMode, jitter, swing, bpm, hitRate } = input;
  const insights: DiagnosisInsight[] = [];

  // Pre-compute
  const rhythmic = tracks.filter(t => t.id !== 'cloud');
  const stepValues = rhythmic.map(t => t.steps);
  const mcm = stepValues.length > 0 ? lcmArray(stepValues) : 0;
  const eclipseTime = formatEclipseTime(mcm, bpm);
  const tonalTrack = tracks.find(t => t.isTonal);
  const kickTrack = tracks.find(t => t.id === 'kick');

  // ═══ ESTRUCTURA ═══

  // sync-total
  if (rhythmic.length > 1 && rhythmic.every(t => t.steps === rhythmic[0].steps)) {
    insights.push({
      id: 'sync-total', category: 'structure', icon: '⊙', priority: 35,
      insight: `Todas las pistas comparten el mismo ciclo de ${rhythmic[0].steps} pasos. Se reinician juntas cada ${eclipseTime}. Es máxima estabilidad — pero también máxima predictibilidad. El oído detecta la repetición rápido.`,
      suggestion: 'Cambia una pista a un número primo de steps (11, 13, 17) para romper la simetría y expandir el ciclo.',
    });
  }

  // pista-prima
  const primeTrack = rhythmic.find(t => isPrime(t.steps));
  if (primeTrack) {
    insights.push({
      id: 'pista-prima', category: 'structure', icon: 'ℙ', priority: 45,
      insight: `${primeTrack.name} está en un ciclo de ${primeTrack.steps} pasos (primo). Los primos no se dividen limpiamente por nada — cualquier otra pista con distinto ciclo generará interferencia máxima. Es la herramienta de Autechre para garantizar no-repetición.`,
      suggestion: 'Combina con otra pista en ciclo primo diferente. El MCM será el producto de ambos — complejidad explosiva.',
    });
  }

  // mcm-infinito
  if (mcm > 1000) {
    insights.push({
      id: 'mcm-infinito', category: 'structure', icon: '∞', priority: 50,
      insight: `El ciclo completo tarda ${eclipseTime} en repetirse. Estás en zona de evolución infinita — el oyente no puede anticipar cuándo volverán a coincidir las pistas. Cada segundo que escuchas es único en la escala de la memoria humana.`,
      suggestion: 'Observa el countdown de Eclipse. Cuando llegue a cero, habrás escuchado algo que no se repetirá en minutos.',
    });
  }

  // mcm-corto
  if (mcm > 0 && mcm < 20) {
    insights.push({
      id: 'mcm-corto', category: 'structure', icon: '◎', priority: 40,
      insight: `El ciclo se reinicia cada ${eclipseTime}. La repetición es rápida y evidente. En el flamenco esto es natural — el compás de 12 repite cada 3.6 segundos a 80 BPM. En el IDM, buscarías expandirlo.`,
      suggestion: 'Si quieres más complejidad, cambia un track a steps primo (11, 13, 17). Un solo cambio puede multiplicar el MCM por 10.',
    });
  }

  // offsets-cero
  if (rhythmic.length > 1 && rhythmic.every(t => t.offset === 0)) {
    insights.push({
      id: 'offsets-cero', category: 'structure', icon: '⌖', priority: 30,
      insight: 'Todas las pistas empiezan en el mismo punto. No hay desfase entre ellas — los acentos coinciden. En el flamenco, esto equivale a "cerrar a tierra": todos golpean el uno juntos.',
      suggestion: 'Desplaza el snare con offset 3-5. La síncopa aparece al mover el acento — es la diferencia entre una marcha militar y un compás de Soleá.',
    });
  }

  // ═══ TEMPORALIDAD ═══

  // flamenco-12
  if (temporalityMode === 'flamenco' && rhythmic.some(t => t.steps === 12)) {
    insights.push({
      id: 'flamenco-12', category: 'temporality', icon: '🔥', priority: 55,
      insight: 'Modo Flamenco sobre compás de 12. Los golpes gravitan hacia los acentos canónicos (tiempos 3, 6, 8, 10, 12). Es el "soniquete" — esa gravedad interna que los palmeros sienten pero no pueden explicar. Los golpes no caen donde dice la matemática — caen donde pide el compás.',
      suggestion: 'Sube el swing al 50% para intensificar la atracción. Baja a 10% para un soniquete sutil, casi subliminal.',
    });
  }

  // flamenco-no12
  if (temporalityMode === 'flamenco' && !rhythmic.some(t => t.steps === 12)) {
    insights.push({
      id: 'flamenco-no12', category: 'temporality', icon: '🌀', priority: 45,
      insight: 'Modo Flamenco sobre ciclos no-tradicionales. La gravedad se aplica usando los propios golpes del patrón euclidiano como acentos — no los del compás de 12. Es una fusión genuina: el feeling flamenco sin la estructura flamenca. Un territorio sin nombre.',
      suggestion: 'Prueba a cambiar una pista a 12 steps. Escucha cómo la gravedad "reconoce" la estructura flamenca y se asienta.',
    });
  }

  // dilla-jitter-bajo
  if (temporalityMode === 'dilla' && jitter < 3) {
    insights.push({
      id: 'dilla-jitter-bajo', category: 'temporality', icon: '🎧', priority: 50,
      insight: `Dilla necesita jitter para existir. Su magia es que el kick se queda firme mientras hats y snare flotan. A ${jitter}ms no hay diferencia perceptible entre pistas — todos suenan igual de "rectos".`,
      suggestion: 'Sube el jitter a 10-15ms. El kick apenas se moverá (escala 0.1×) pero el hat flotará un 150%. Ahí está el Dilla.',
    });
  }

  // arritmia-swing-bajo
  if (temporalityMode === 'arritmia' && swing < 10) {
    insights.push({
      id: 'arritmia-swing-bajo', category: 'temporality', icon: '⚡', priority: 45,
      insight: 'Arritmia sin swing es un grid normal. El swing es lo que controla cuánto se distorsiona la rejilla — a 0% los golpes caen exactamente donde el grid dice. Arritmia necesita swing para desplazar.',
      suggestion: 'Sube el swing al 50-70%. Los golpes empezarán a huir del grid. A 70% es Antipop Consortium puro.',
    });
  }

  // ═══ DENSIDAD ═══

  // hitrate-bajo
  if (hitRate !== null && hitRate < 50) {
    insights.push({
      id: 'hitrate-bajo', category: 'density', icon: '○', priority: 55,
      insight: `Más de la mitad de los golpes programados no suenan. El Hit Rate al ${hitRate}% significa que el silencio domina. En la estética de Anticon, esto es "espacio negativo rítmico" — lo que no suena esculpe lo que suena. En el flamenco, los respiros entre golpes dan peso al siguiente acento.`,
      suggestion: 'Observa qué pistas tienen Chaos activo. Reduce el entropy para recuperar golpes, o déjalo así si buscas esa respiración.',
    });
  }

  // hitrate-determinista
  if (hitRate !== null && hitRate > 95 && !rhythmic.some(t => t.chaosEnabled)) {
    insights.push({
      id: 'hitrate-determinista', category: 'density', icon: '■', priority: 40,
      insight: `Patrón casi perfectamente determinista. Hit Rate al ${hitRate}% — lo que programaste es lo que suena, ciclo tras ciclo. Sin Chaos ni Evolve, cada repetición es idéntica. Es la estética del techno: hipnosis por repetición.`,
      suggestion: 'Activa Chaos en el hat (entropy 1.2×) para inyectar duda. O activa Evolve (Rate 5%) para que el patrón derive lentamente. La vida entra por las grietas.',
    });
  }

  // evolve-masivo
  const evolveCount = rhythmic.filter(t => t.evolveEnabled).length;
  if (evolveCount >= 3) {
    insights.push({
      id: 'evolve-masivo', category: 'density', icon: '🧬', priority: 60,
      insight: `Mutación generalizada. Las probabilidades de ${evolveCount} pistas están derivando en paralelo. En unos minutos, el patrón será irreconocible respecto al estado inicial. Es lo que Autechre llama "sistemas generativos autónomos" — defines las reglas y observas qué emerge.`,
      suggestion: 'Abre el Engine Room y mira cómo el Hit Rate baja con el tiempo. Cuando llegue a ~60%, estarás escuchando un patrón que la app inventó sola.',
    });
  }

  // ═══ TONAL ═══

  // escala-flamenca
  if (tonalTrack && tonalTrack.scaleId === 'phrygianDominant') {
    insights.push({
      id: 'escala-flamenca', category: 'tonal', icon: '🎸', priority: 45,
      insight: 'Escala Frigia Dominante — la escala del flamenco. El semitono entre la primera y segunda nota (ej: C→Db) crea la tensión que define el cante jondo. En la tradición árabe se llama Hijaz. Es la misma escala que tocan guitarristas flamencos desde hace siglos, ahora distribuida por un algoritmo euclidiano.',
      suggestion: 'Cambia a Minor para escuchar cómo desaparece la tensión flamenca. Vuelve a Phrygian Dominant. Ese semitono inicial es el ADN sonoro del flamenco.',
    });
  }

  // escala-whole-tone
  if (tonalTrack && tonalTrack.scaleId === 'wholeTone') {
    insights.push({
      id: 'escala-whole-tone', category: 'tonal', icon: '🌊', priority: 40,
      insight: 'Escala de tonos enteros: cada nota está a la misma distancia de la siguiente. No hay tónica, no hay dominante, no hay gravedad. Debussy la usó para pintar impresionismo. Autechre la usa para eliminar jerarquía. Todo suena igualmente familiar e igualmente extraño.',
      suggestion: 'Compara con Phrygian Dominant. La frigia tiene un centro claro (la primera nota "manda"). La Whole Tone no — es democracia tonal.',
    });
  }

  // tone-kick-dialogo
  if (tonalTrack && kickTrack && tonalTrack.steps === kickTrack.steps && tonalTrack.offset !== kickTrack.offset) {
    const delta = Math.abs(tonalTrack.offset - kickTrack.offset);
    insights.push({
      id: 'tone-kick-dialogo', category: 'tonal', icon: '↔', priority: 50,
      insight: `El Tone y el Kick comparten ciclo de ${tonalTrack.steps} pero están desfasados ${delta} steps. Es un diálogo: la melodía sigue al ritmo con retraso, como una guitarra que responde al zapateado. En el flamenco, esta relación se llama "temple" — el momento donde cante y toque se buscan sin coincidir exactamente.`,
      suggestion: 'Ajusta el offset del Tone a 0. Ahora melodía y ritmo caen juntos — el diálogo desaparece y se convierte en unísono. ¿Qué prefieres?',
    });
  }

  // ═══ COMBINACIÓN ═══

  // fusion-flamenco-idm
  if (temporalityMode === 'flamenco' && rhythmic.some(t => t.steps === 12) && rhythmic.some(t => isPrime(t.steps))) {
    insights.push({
      id: 'fusion-flamenco-idm', category: 'combination', icon: '✦', priority: 80,
      insight: 'Has encontrado el cruce. Compás flamenco de 12 en la base, ciclo primo arriba, y gravedad del soniquete uniendo los dos mundos. Es lo que Rosalía intuye en "Malamente" y Refree formaliza en "Tercer Cielo": la tradición y el algoritmo como lenguajes del mismo impulso.',
      suggestion: 'Activa Evolve en la pista prima. La interferencia rítmica mutará lentamente — el cruce entre mundos se moverá bajo tus pies.',
    });
  }

  // zapateado-digital
  if (kickTrack && kickTrack.ratchet >= 1 && temporalityMode === 'flamenco') {
    insights.push({
      id: 'zapateado-digital', category: 'combination', icon: '👢', priority: 75,
      insight: `Kick con ratchet en modo Flamenco: zapateado digital. Cada pisada tiene rebote — la "ligereza" del baile. En el flamenco tradicional, el zapateado alterna entre golpe seco (gravedad) y rebote (aire). El ratchet ×${kickTrack.ratchet + 1} es el aire. La gravedad del modo Flamenco es la tierra.`,
      suggestion: 'Compara ratchet ×1 (doble golpe sutil) con ×3 (ráfaga). El ×1 es zapateado; el ×3 es redoble de cajón.',
    });
  }

  // caos-generativo-total
  const chaosCount = rhythmic.filter(t => t.chaosEnabled).length;
  const evolveCountCombo = rhythmic.filter(t => t.evolveEnabled).length;
  if (chaosCount >= 2 && evolveCountCombo >= 2 && mcm > 500) {
    insights.push({
      id: 'caos-generativo-total', category: 'combination', icon: '🌪', priority: 85,
      insight: `Sistema generativo autónomo. Chaos introduce azar instantáneo, Evolve introduce deriva lenta, y el MCM de ${mcm} garantiza que el ciclo no se repite en ${eclipseTime}. Ya no estás componiendo — estás definiendo un ecosistema y observando qué vida emerge. Es la filosofía de Autechre en "Confield": el artista diseña el proceso, no el resultado.`,
      suggestion: 'Déjalo sonar 5 minutos. Luego guarda como User Preset. Has capturado un instante irrepetible de un proceso infinito.',
    });
  }

  // grid-plano
  if (
    rhythmic.every(t => t.steps === 16) &&
    temporalityMode === 'grid' &&
    !rhythmic.some(t => t.chaosEnabled) &&
    !rhythmic.some(t => t.evolveEnabled)
  ) {
    insights.push({
      id: 'grid-plano', category: 'combination', icon: '▦', priority: 35,
      insight: 'Rejilla pura de 16 sin variación. Es el estado base — techno de Detroit, cuatro al suelo, repetición como mantra. La expresión no viene del patrón sino de lo que hagas con velocity, filtros y FX. Jeff Mills construyó una carrera sobre esta rejilla.',
      suggestion: 'Activa un solo elemento: Chaos en el hat, o Evolve en el snare, o cambia el hat a 17 steps. Un cambio mínimo transforma la rejilla en algo vivo.',
    });
  }

  // tone-evolve-flamenco
  if (tonalTrack && tonalTrack.evolveEnabled && temporalityMode === 'flamenco') {
    insights.push({
      id: 'tone-evolve-flamenco', category: 'combination', icon: '🌙', priority: 70,
      insight: `Melodía mutante sobre compás flamenco. Las probabilidades de la pista tonal derivan un ${Math.round(tonalTrack.mutationRate * 100)}% cada ciclo — algunas notas empezarán a fallar y otras a reforzarse. Es como un cantaor que cada vez que repite una copla la cambia ligeramente, nunca dos veces igual. El cante jondo como sistema generativo.`,
      suggestion: 'Baja el Evolve Rate a 2-3% para una deriva casi imperceptible. Las mejores mutaciones son las que no notas hasta que de repente te das cuenta de que el patrón ya no es el que era.',
    });
  }

  // Sort by priority desc, return top 3
  insights.sort((a, b) => b.priority - a.priority);
  return insights.slice(0, 3);
}
