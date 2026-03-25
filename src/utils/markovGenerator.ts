// ============================================================
// GENERADOR DE MATRICES MARKOV
// TODO: orden 2 requiere tensor n×n×n — no implementado aún
// ============================================================

export type MarkovStyle = 'scale' | 'jumps' | 'flamenco' | 'idm' | 'chromatic';

/**
 * Genera una matriz de transición entre N notas.
 * notes: array de índices de escala disponibles (valores únicos de noteIndices[])
 * style: carácter del movimiento
 * temperature: 0 (determinista) a 100 (aleatorio)
 */
export function generateMarkovMatrix(
  notes: number[],
  style: MarkovStyle,
  temperature: number
): number[][] {
  const n = notes.length;
  if (n === 0) return [];
  if (n === 1) return [[1]];

  const matrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const interval = Math.abs(notes[j] - notes[i]);
      // P1 fix: distancia circular correcta
      const distance = Math.min(Math.abs(j - i), n - Math.abs(j - i));

      switch (style) {
        case 'scale':
          matrix[i][j] = distance === 1 ? 3.0 :
                          distance === 2 ? 1.5 :
                          distance === 0 ? 0.5 : 0.5;
          break;

        case 'jumps':
          matrix[i][j] = distance === 3 ? 3.0 :
                          distance === 4 ? 2.5 :
                          distance === 2 ? 1.0 :
                          distance === 1 ? 0.5 :
                          distance === 0 ? 0.3 : 0.8;
          break;

        case 'flamenco':
          matrix[i][j] = j === 0 ? 3.0 :
                          j === n - 1 ? 2.0 :
                          j === 1 ? 1.5 :
                          distance === 1 ? 1.0 : 0.5;
          break;

        case 'idm':
          matrix[i][j] = i === j ? 0.1 : 1.0;
          break;

        case 'chromatic':
          matrix[i][j] = interval === 1 ? 3.0 :
                          interval === 2 ? 1.5 :
                          i === j ? 0.3 : 0.5;
          break;
      }
    }

    // Aplicar temperatura: mezcla con distribución uniforme
    const temp = temperature / 100;
    const uniform = 1 / n;
    for (let j = 0; j < n; j++) {
      matrix[i][j] = (1 - temp) * matrix[i][j] + temp * uniform;
    }

    // Normalizar fila a suma 1
    const rowSum = matrix[i].reduce((a, b) => a + b, 0);
    if (rowSum > 0) {
      for (let j = 0; j < n; j++) {
        matrix[i][j] /= rowSum;
      }
    }
  }

  return matrix;
}

/**
 * Elige la siguiente nota dada la nota actual y la matriz.
 * currentNoteIndex: posición en el array 'notes' (no el valor MIDI)
 * matrix: matriz de transición generada por generateMarkovMatrix
 */
export function markovNextNote(
  currentNoteIndex: number,
  matrix: number[][]
): number {
  if (matrix.length === 0) return 0;
  const row = matrix[currentNoteIndex] ?? matrix[0];
  const rand = Math.random();
  let cumulative = 0;
  for (let i = 0; i < row.length; i++) {
    cumulative += row[i];
    if (rand < cumulative) return i;
  }
  return row.length - 1;
}
