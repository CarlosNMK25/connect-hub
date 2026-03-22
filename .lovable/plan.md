

## Plan: Reescribir tooltips pedagógicos con rigor técnico-matemático

### Alcance

Reescribir los 17 textos del objeto `PEDAGOGY.micro` en `src/constants/pedagogy.ts` usando el formato de 4 líneas propuesto:

```
L1: Definición técnica (fórmula si aplica)
L2: Rango y unidades
L3: Efecto práctico (↑/↓)
L4: Conexión musical (ejemplo concreto)
```

### Archivo a modificar

`src/constants/pedagogy.ts` — solo la sección `micro`.

### Los 17 textos propuestos

1. **pulses** — `E(k, n)`: k onsets distribuidos en n pasos por Bjorklund (máxima uniformidad). Densidad ρ = k/n. Rango: [0, n]. ↑k → patrón más saturado; k/n = 1 = four-on-the-floor. E(5,12) ≈ 0.42 → Soleá; E(3,8) = 0.375 → Tresillo cubano.

2. **steps** — Cardinalidad n del anillo cíclico ℤ/nℤ donde se distribuyen los pulsos. Rango: [2, 32]. n par → simetría binaria (4/4, 6/8); n primo → asimetría máxima (7, 11, 13 impiden subdivisiones iguales). n=12 → compás de amalgama 12/8; n=16 → rejilla estándar de caja de ritmos.

3. **offset** — Rotación cíclica σʳ: desplaza el patrón r posiciones sin alterar su estructura interválica. Rango: [0, n-1]. Equivalent a seleccionar un modo del patrón (como modos de una escala). σ² sobre E(5,12) de Soleá → acentuación de Bulería.

4. **probability** — Cada onset sigue una distribución Bernoulli(p). Hits esperados = k·p; varianza = k·p·(1-p). Rango: [0, 1]. p=1 → patrón determinista; p=0.5 → máxima entropía binaria por step. Permite secuenciación generativa donde el silencio es estructural.

5. **chaos** — Factor β que modula p → p' = p^(1/(1+β)), comprimiendo las probabilidades hacia la incertidumbre. Rango: [0, 1]. β=0 → sin efecto; β=1 → p'≈√p, los steps probables pierden certeza. Desintegra patrones rígidos en nubes estocásticas tipo Autechre.

6. **evolve** — Mutación cíclica: cada N ciclos (speed), cada step tiene 50% de ser perturbado por δ ∈ [-rate, +rate], clamp [0,1]. Rate: [1-30%], Speed: [1-8x]. Genera drift paramétrico: el patrón diverge del original como un proceso de Markov sin estado absorbente.

7. **bpm** — Pulso maestro. Período por beat T = 60/BPM (seg); resolución por step = T/n. Rango: [40, 300]. A 120 BPM con n=16, cada step = 31.25ms. BPMs altos comprimen el jitter perceptible; BPMs bajos exponen cada micro-variación.

8. **swing** — Desplazamiento determinista de tiempos pares: t' = t_grid + α·(t_next − t_grid), α ∈ [0, 0.75]. α=0 → rejilla recta; α=0.67 → shuffle ternario (triplet feel). Herencia directa de la MPC-3000 de Roger Linn. α=0.5 → groove estándar boom-bap.

9. **dynamics** — Rango de velocity [v_min, v_max] asignado a cada onset. Rango del slider: [0, 1] como proporción del rango total. Dinámica alta → acentuación orgánica por distribución uniforme en el rango; dinámica baja → velocidad plana (metrónomo). En flamenco, el acento define el palo.

10. **jitter** — Desplazamiento temporal gaussiano 𝒩(0, σ²) aplicado a cada onset en ms. σ proporcional al valor del slider. Rango: [0, ~50ms]. Altera los IOI (Inter-Onset Intervals) simulando imprecisión humana. σ < 10ms → humanización sutil; σ > 30ms → inestabilidad rítmica tipo glitch.

11. **volume** — Ganancia lineal de la pista en el bus de mezcla. Rango: [0, 1] → [-∞, 0] dB. Define la jerarquía rítmica: qué elemento es ancla estructural (kick) y cuál es ornamento (hat). No es solo nivel — es peso perceptual en la polirritmia.

12. **delaySend** — Nivel de envío al bus de delay (feedback loop). Rango: [0, 1]. Genera repeticiones que crean polirritmias fantasma: un onset en step k produce ecos en k+d, k+2d... reforzando o contradiendo la geometría euclidiana original.

13. **reverbSend** — Nivel de envío al bus de reverberación. Rango: [0, 1]. Sitúa el onset en un espacio acústico simulado (RT60). Envíos altos difuminan la precisión temporal del patrón, creando una "niebla" donde el ritmo emerge como textura continua.

14. **sampleRoi** — Región de Interés [start, end] dentro del buffer de audio, en proporción normalizada [0, 1]. Define qué segmento del sample se reproduce. Permite micro-cirugía: extraer solo el transiente de ataque (0-5%) o la cola tonal (80-100%).

15. **pitch** — Transposición en semitonos por resampling. Rango: [-24, +24] st. Altera frecuencia (f' = f · 2^(st/12)) y duración inversamente. Pitch negativo → bombo profundo desde un chasquido; pitch positivo → micro-glitch de alta frecuencia desde un golpe grave.

16. **grainSize** — Ventana temporal de cada grano en síntesis granular, en ms. Rango: [1, 500ms]. >50ms → fragmentos tonales reconocibles; 20-50ms → zona transicional; <20ms → textura de ruido (el grano es más corto que un ciclo de onda audible).

17. **overlap** — Factor de superposición entre granos consecutivos. Rango: [1, 8x]. Overlap alto → densidad de nube sedosa y continua (cloud); overlap bajo → stutter rítmico donde cada grano es un evento discreto. Define la transición de granular percusivo a textural.

18. **spray** — Dispersión aleatoria del puntero de lectura del grano respecto a la posición ROI. Rango: [0, 1] como proporción del buffer. Spray=0 → lectura secuencial fiel; spray=1 → posición totalmente aleatoria. Convierte audio reconocible en atmósfera abstracta.

19. **bitCrush** — Reducción de resolución digital: requantiza la amplitud a 2^b niveles. Rango: [2, 16] bits. 16 bits → CD quality; 8 bits → estética retro/chiptune; 4 bits → distorsión de cuantización agresiva con armónicos no lineales.

### Lo que NO cambia

- Estructura del tipo `PedagogyMicro` (sigue siendo `Record<string, string>`)
- Capas meso y macro (intactas)
- Ningún otro archivo

### Decisiones de diseño

- Formato compacto en un solo string (no HTML multilínea) — compatible con el `StudyTooltip` actual que renderiza texto plano
- Se usan símbolos Unicode (ℤ, σ, α, β, ρ, 𝒩, ∈, →, ↑) para notación matemática sin dependencias
- Cada texto ~50-80 palabras: denso pero legible

