/**
 * Utilidades para el Sample Slicer.
 * Slices como punteros (start/end como fracción 0-1 del buffer) — sin copiar audio.
 */

/**
 * Calcula los boundaries equidistantes de N slices
 * como fracción 0-1 del buffer total.
 * Aplica zero-crossing snap en cada boundary.
 */
export function calculateSliceBoundaries(
  buffer: AudioBuffer,
  sliceCount: number
): Array<{ start: number; end: number }> {
  const data = buffer.getChannelData(0);
  const totalSamples = data.length;
  const samplesPerSlice = Math.floor(totalSamples / sliceCount);
  const slices: Array<{ start: number; end: number }> = [];

  for (let i = 0; i < sliceCount; i++) {
    const rawStart = i * samplesPerSlice;
    const rawEnd = i === sliceCount - 1
      ? totalSamples - 1
      : (i + 1) * samplesPerSlice;

    const snappedStart = i === 0
      ? 0
      : snapToZeroCrossing(data, rawStart, 64);
    const snappedEnd = i === sliceCount - 1
      ? totalSamples - 1
      : snapToZeroCrossing(data, rawEnd, 64);

    slices.push({
      start: snappedStart / totalSamples,
      end: snappedEnd / totalSamples,
    });
  }

  return slices;
}

/**
 * Busca el cruce por cero más cercano a `position`
 * dentro de una ventana de ±windowSize samples.
 */
function snapToZeroCrossing(
  data: Float32Array,
  position: number,
  windowSize: number
): number {
  let bestIdx = position;
  let bestDist = windowSize + 1;

  const start = Math.max(0, position - windowSize);
  const end = Math.min(data.length - 2, position + windowSize);

  for (let i = start; i < end; i++) {
    if (data[i] * data[i + 1] <= 0) {
      const dist = Math.abs(i - position);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
  }

  return bestIdx;
}

/** Genera el sliceOrder por defecto [0, 1, 2, ... N-1] */
export function defaultSliceOrder(sliceCount: number): number[] {
  return Array.from({ length: sliceCount }, (_, i) => i);
}

/** Genera array de defaults para reverse */
export function defaultSliceReverse(sliceCount: number): boolean[] {
  return new Array(sliceCount).fill(false);
}

/** Genera array de defaults para pitch */
export function defaultSlicePitch(sliceCount: number): number[] {
  return new Array(sliceCount).fill(0);
}

// TODO: micro-fades (applyMicroFade) para exportación futura.
// El crossfade en reproducción lo maneja GrainPlayer nativamente via grainSize y overlap.
