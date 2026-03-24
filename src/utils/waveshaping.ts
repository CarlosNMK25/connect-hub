// Funciones de waveshaping para West Coast synthesis
// Usadas por el modo 'wf' de la pista tonal

/**
 * Transfer function para wavefolding estilo Buchla 259.
 * Genera una curva Float32Array de 65536 muestras para WaveShaperNode.
 * @param amount — intensidad del fold (0 = sin fold, 10 = fold máximo)
 * @param symmetry — sesgo de la curva (-1 a 1, 0 = simétrico)
 */
export function buildWavefoldCurve(
  amount: number,
  symmetry: number = 0
): Float32Array {
  const curve = new Float32Array(65536);
  for (let i = 0; i < 65536; i++) {
    const x = (i / 32768) - 1; // -1 a 1
    const biased = x + symmetry * 0.5;
    const folded = Math.sin(biased * Math.PI * (amount + 1));
    curve[i] = Math.max(-1, Math.min(1, folded));
  }
  return curve;
}

/**
 * Simula la respuesta no-lineal de un Vactrol (LDR + LED).
 * El decay es más lento que el attack — característica del Buchla 292.
 * @param velocity — velocidad del hit (0-1)
 * @param baseFreq — frecuencia base del filtro en Hz
 */
export function vactrolfiltFreq(
  velocity: number,
  baseFreq: number = 200
): number {
  // Respuesta exponencial con asimetría attack/decay
  return baseFreq + Math.pow(velocity, 0.7) * 8000;
}
