/**
 * PEDAGOGY CONSTANTS
 * Structured data for the "Study Mode" (Capa Pedagógica)
 * Based on the "Arquitecturas de la Temporalidad" thesis.
 */

export interface PedagogyMicro {
  [key: string]: string;
}

export type PedagogyVoice = 'technical' | 'literary';

export interface PedagogyMeso {
  title: string;
  condition: string;
  template: string;
}

export interface PedagogyMacro {
  title: string;
  content: string;
}

export const PEDAGOGY = {
  micro: {
    pulses: "E(k, n): k onsets distribuidos en n pasos por Bjorklund (máxima uniformidad). Densidad ρ = k/n. Rango: [0, n]. ↑k → patrón más saturado; k/n = 1 = four-on-the-floor. E(5,12) ≈ 0.42 → Soleá; E(3,8) = 0.375 → Tresillo cubano.",
    steps: "Cardinalidad n del anillo cíclico ℤ/nℤ donde se distribuyen los pulsos. Rango: [2, 32]. n par → simetría binaria (4/4, 6/8); n primo → asimetría máxima (7, 11, 13 impiden subdivisiones iguales). n=12 → compás de amalgama 12/8; n=16 → rejilla estándar de caja de ritmos.",
    offset: "Rotación cíclica σʳ: desplaza el patrón r posiciones sin alterar su estructura interválica. Rango: [0, n-1]. Equivalente a seleccionar un modo del patrón (como modos de una escala). σ² sobre E(5,12) de Soleá → acentuación de Bulería.",
    probability: "Cada onset sigue una distribución Bernoulli(p). Hits esperados = k·p; varianza = k·p·(1-p). Rango: [0, 1]. p=1 → patrón determinista; p=0.5 → máxima entropía binaria por step. Permite secuenciación generativa donde el silencio es estructural.",
    chaos: "Factor β que modula p → p' = p^(1/(1+β)), comprimiendo las probabilidades hacia la incertidumbre. Rango: [0, 1]. β=0 → sin efecto; β=1 → p'≈√p, los steps probables pierden certeza. Desintegra patrones rígidos en nubes estocásticas tipo Autechre.",
    evolve: "Mutación cíclica: cada N ciclos (speed), cada step tiene 50% de ser perturbado por δ ∈ [-rate, +rate], clamp [0,1]. Rate: [1-30%], Speed: [1-8x]. Genera drift paramétrico: el patrón diverge del original como un proceso de Markov sin estado absorbente.",
    bpm: "Pulso maestro. Período por beat T = 60/BPM (seg); resolución por step = T/n. Rango: [40, 300]. A 120 BPM con n=16, cada step = 31.25ms. BPMs altos comprimen el jitter perceptible; BPMs bajos exponen cada micro-variación.",
    swing: "Desplazamiento determinista de tiempos pares: t' = t_grid + α·(t_next − t_grid), α ∈ [0, 0.75]. α=0 → rejilla recta; α=0.67 → shuffle ternario (triplet feel). Herencia directa de la MPC-3000 de Roger Linn. α=0.5 → groove estándar boom-bap.",
    dynamics: "Rango de velocity [v_min, v_max] asignado a cada onset. Rango del slider: [0, 1] como proporción del rango total. Dinámica alta → acentuación orgánica por distribución uniforme en el rango; dinámica baja → velocidad plana (metrónomo). En flamenco, el acento define el palo.",
    jitter: "Desplazamiento temporal gaussiano 𝒩(0, σ²) aplicado a cada onset en ms. σ proporcional al valor del slider. Rango: [0, ~50ms]. Altera los IOI (Inter-Onset Intervals) simulando imprecisión humana. σ < 10ms → humanización sutil; σ > 30ms → inestabilidad rítmica tipo glitch.",
    volume: "Ganancia lineal de la pista en el bus de mezcla. Rango: [0, 1] → [-∞, 0] dB. Define la jerarquía rítmica: qué elemento es ancla estructural (kick) y cuál es ornamento (hat). No es solo nivel — es peso perceptual en la polirritmia.",
    delaySend: "Nivel de envío al bus de delay (feedback loop). Rango: [0, 1]. Genera repeticiones que crean polirritmias fantasma: un onset en step k produce ecos en k+d, k+2d… reforzando o contradiendo la geometría euclidiana original.",
    reverbSend: "Nivel de envío al bus de reverberación. Rango: [0, 1]. Sitúa el onset en un espacio acústico simulado (RT60). Envíos altos difuminan la precisión temporal del patrón, creando una «niebla» donde el ritmo emerge como textura continua.",
    sampleRoi: "Región de Interés [start, end] dentro del buffer de audio, en proporción normalizada [0, 1]. Define qué segmento del sample se reproduce. Permite micro-cirugía: extraer solo el transiente de ataque (0-5%) o la cola tonal (80-100%).",
    pitch: "Transposición en semitonos por resampling. Rango: [-24, +24] st. Altera frecuencia (f' = f · 2^(st/12)) y duración inversamente. Pitch negativo → bombo profundo desde un chasquido; pitch positivo → micro-glitch de alta frecuencia desde un golpe grave.",
    grainSize: "Ventana temporal de cada grano en síntesis granular, en ms. Rango: [1, 500ms]. >50ms → fragmentos tonales reconocibles; 20-50ms → zona transicional; <20ms → textura de ruido (el grano es más corto que un ciclo de onda audible).",
    overlap: "Factor de superposición entre granos consecutivos. Rango: [1, 8x]. Overlap alto → densidad de nube sedosa y continua (cloud); overlap bajo → stutter rítmico donde cada grano es un evento discreto. Define la transición de granular percusivo a textural.",
    spray: "Dispersión aleatoria del puntero de lectura del grano respecto a la posición ROI. Rango: [0, 1] como proporción del buffer. Spray=0 → lectura secuencial fiel; spray=1 → posición totalmente aleatoria. Convierte audio reconocible en atmósfera abstracta.",
    bitCrush: "Reducción de resolución digital: requantiza la amplitud a 2^b niveles. Rango: [2, 16] bits. 16 bits → CD quality; 8 bits → estética retro/chiptune; 4 bits → distorsión de cuantización agresiva con armónicos no lineales.",
  } as PedagogyMicro,

  microLiterary: {
    pulses: "Cuántos golpes reparte el algoritmo de Euclides en el ciclo. E(5,12) genera el patrón de la Soleá flamenca; E(5,11) es territorio Autechre. Un solo pulso de diferencia separa siglos de tradición de la vanguardia algorítmica.",
    steps: "La longitud total del ciclo rítmico o \"anillo\". Define el espacio temporal donde los pulsos buscarán su equilibrio máximo. En el flamenco, el 12 es la cifra sagrada; en el IDM, los números impares rompen la tiranía del compás de 4/4.",
    offset: "Rota el patrón respecto al primer tiempo del compás. Es el \"nudge\" que desplaza el acento, permitiendo que una estructura estable se convierta en un síncope agresivo. Cambiar el offset es como desplazar el \"uno\" en una jam de hip-hop experimental.",
    probability: "La probabilidad de que un pulso programado llegue a sonar. Introduce el concepto de \"silencio activo\": el patrón existe en potencia, pero solo se manifiesta parcialmente. Es la base de la secuenciación generativa que evita la fatiga auditiva.",
    chaos: "Multiplica la incertidumbre de las probabilidades individuales. A niveles bajos, introduce dudas sutiles; a niveles altos, desintegra el patrón en una nube estocástica. Es el control del \"error controlado\" característico del glitch-hop.",
    evolve: "Permite que el patrón aprenda y cambie con cada ciclo. La mutación constante asegura que el ritmo nunca sea una foto fija, sino un organismo vivo que evoluciona. Es la encarnación del \"eterno retorno\" donde nada se repite exactamente igual.",
    bpm: "La velocidad del pulso maestro. Define la densidad de eventos por segundo y altera nuestra percepción del jitter: a BPMs altos, el caos se percibe como textura; a BPMs bajos, como duda humana.",
    swing: "El retraso determinista de los tiempos débiles, herencia directa de las MPC de Roger Linn. Crea ese \"empuje\" característico del boom-bap clásico. Es una rejilla rígida pero desplazada que invita al movimiento.",
    dynamics: "Controla el rango de intensidad (velocity) de los golpes. Una dinámica alta permite que el algoritmo \"acentúe\" de forma natural, emulando la intención de un percusionista. En el flamenco, el acento es la brújula que define el palo.",
    jitter: "Micro-timing gaussiano que desplaza los golpes milisegundos antes o después de su tiempo teórico. Rompe la perfección robótica del ordenador para entrar en el \"duende\" del error humano. Es la diferencia entre un metrónomo y un corazón.",
    volume: "El peso específico de cada pista en el espacio sonoro. Más que un control de nivel, es una herramienta de jerarquía rítmica. Define qué elemento es el ancla y cuál es el adorno.",
    delaySend: "Envía el sonido a un bucle de repeticiones que genera polirritmias fantasmales. El delay transforma un pulso seco en una cascada de ecos que refuerzan la geometría del patrón original.",
    reverbSend: "Sitúa el ritmo en un espacio físico o imaginario. En el IDM, la reverb se usa a menudo para \"emborronar\" la precisión matemática, creando atmósferas donde el ritmo parece emerger de una niebla industrial.",
    sampleRoi: "Define la \"Región de Interés\" dentro del archivo de audio sagrado. Permite realizar una micro-cirugía sonora, extrayendo solo el ataque de un cante o la cola de un glitch. Es el bisturí digital en acción.",
    pitch: "Transpone la frecuencia del sample, alterando su timbre y duración. Un pitch bajo puede convertir un chasquido en un bombo profundo; un pitch alto transforma un quejío en un micro-glitch de alta frecuencia.",
    grainSize: "El tamaño de las partículas en la síntesis granular. Granos pequeños crean texturas metálicas y nubes de polvo sonoro; granos grandes permiten reconocer fragmentos del audio original. Es la atomización del tiempo.",
    overlap: "Cuántos granos se superponen entre sí. Define la densidad de la \"nube\" sonora. Un overlap alto crea texturas sedosas y continuas; un overlap bajo genera un tartamudeo rítmico (stutter) puramente IDM.",
    spray: "La dispersión aleatoria del punto de lectura de los granos. Introduce un caos espacial y temporal que desdibuja el origen del sonido. Es la técnica definitiva para convertir una voz flamenca en una atmósfera abstracta.",
    bitCrush: "Reduce la resolución digital del sonido, introduciendo ruido de cuantización y armónicos agresivos. Evoca la estética de los samplers de 8 bits y la degradación industrial del lo-fi experimental.",
  } as PedagogyMicro,

  meso: {
    polyrhythm: {
      title: "Poliritmia Emergente",
      condition: "Steps de 2+ pistas son diferentes",
      template: "Estás operando en un ciclo de {p1}/{s1} contra {p2}/{s2}. Esta interferencia crea un patrón largo que tarda mucho en repetirse, una técnica clave en el IDM de finales de los 90 como el de *Autechre* en 'LP5'. La complejidad no nace del caos, sino del cruce de dos órdenes simples."
    },
    mcmEclipse: {
      title: "El Ciclo del Eclipse (MCM)",
      condition: "MCM (LCM) de los steps > 128",
      template: "El sistema actual tiene un Mínimo Común Múltiplo de {lcm} pasos. Esto significa que el \"eclipse\" rítmico (donde todos los tracks vuelven a coincidir en el uno) tarda {lcm} pulsos en ocurrir. Estás construyendo una arquitectura temporal que desafía la memoria a corto plazo del oyente."
    },
    primeAesthetics: {
      title: "La Estética del Primo",
      condition: "Algún valor de Steps es un número primo",
      template: "Al usar un ciclo de {p}/{s} pasos con base prima, estás rompiendo la simetría binaria de la música occidental. Los números primos son los ladrillos del IDM más cerebral, ya que obligan al cerebro a buscar un patrón que se desplaza constantemente respecto al pulso de 4/4."
    },
    entropy: {
      title: "Índice de Vida (Entropía)",
      condition: "Chaos + Evolve + Jitter > umbral alto",
      template: "Con una entropía combinada alta, el patrón ha dejado de ser una secuencia para convertirse en un organismo. La suma de mutación cíclica y jitter gaussiano emula la \"imperfección orgánica\" que el colectivo *Anticon* buscaba en sus producciones de hip-hop abstracto."
    },
    flamenco: {
      title: "Raíz Flamenca",
      condition: "Preset de palo flamenco cargado",
      template: "Este patrón E({p}, {s}) es la base rítmica de la tradición. Nota cómo los acentos definen la identidad del palo. Estás usando un algoritmo del siglo XXI para invocar una estructura emocional con siglos de historia."
    }
  } as Record<string, PedagogyMeso>,

  macro: {
    euclideanRhythm: {
      title: "¿Qué es un ritmo euclidiano?",
      content: "El algoritmo de Bjorklund, originalmente diseñado para aceleradores de partículas, distribuye un número de pulsos en un ciclo de la forma más uniforme posible. Esta \"distribución óptima\" no es solo una curiosidad matemática; es el código fuente de casi todos los ritmos tradicionales del mundo. Desde el Shiko africano hasta la rumba cubana, la humanidad ha buscado intuitivamente la geometría que Euclides describió hace milenios. En esta app, esa geometría es el lienzo sobre el que pintas con probabilidades y ruido."
    },
    soleaCenter: {
      title: "La Soleá como centro gravitatorio",
      content: "La Soleá, con su ciclo de 12 tiempos y su estructura de acentos desplazados, es el \"agujero negro\" rítmico del flamenco. Matemáticamente, es una de las estructuras más ricas que se pueden generar con permutaciones de grupos de 2 y 3. Su \"distancia de intercambio\" respecto a otros ritmos como la Bulería es mínima, lo que demuestra que el flamenco es un sistema dinámico de transformaciones topológicas. Al manipular los pulsos aquí, estás recorriendo el mismo mapa de tensiones que un palmero profesional."
    },
    complexityResistance: {
      title: "Complejidad como resistencia",
      content: "En un mundo dominado por el 4/4 de la música comercial, el uso de polirritmias y métricas impares es un acto de resistencia cultural. El IDM y el flamenco comparten esta naturaleza: ambos son lenguajes de minorías que exigen una escucha activa y un compromiso intelectual. La complejidad no busca confundir, sino crear un espacio donde la predicción fácil es imposible. Cuando configuras un patrón que tarda 500 pasos en repetirse, estás reclamando la soberanía sobre tu propio tiempo."
    },
    duendeGlitch: {
      title: "Duende y Glitch: El accidente feliz",
      content: "El \"duende\" flamenco es ese momento inefable donde el error y la pasión se encuentran; el \"glitch\" es su equivalente electrónico, donde el fallo de la máquina revela una belleza inesperada. Ambos conceptos celebran la pérdida de control. Una secuencia euclidiana perfecta es solo matemáticas; una secuencia euclidiana con jitter, caos y mutación es arte. Esta máquina está diseñada para que busques ese punto de ruptura donde la lógica se desmorona y aparece la emoción."
    },
    silenceInstrument: {
      title: "El silencio como instrumento",
      content: "En la música generativa, lo que no suena es tan importante como lo que suena. La rejilla de pasos es un mapa de posibilidades, y la probabilidad es el filtro que decide qué se manifiesta. El silencio entre los pulsos euclidianos crea el \"espacio negativo\" necesario para que el ritmo respire. Como en el cante jondo, los silencios (los \"respiros\") son los que dan peso a la nota siguiente. No estás programando sonidos, estás esculpiendo el silencio."
    },
    soleaAlgorithm: {
      title: "De la Soleá al algoritmo",
      content: "La convergencia entre la tradición oral del flamenco y los algoritmos de computación no es una coincidencia, sino una propiedad emergente de la física del ritmo. Ambos sistemas buscan resolver el mismo problema: cómo dividir el tiempo de forma que sea a la vez estable y sorprendente. La Euclidean IDM Machine demuestra que un productor de laptop en Bristol y un guitarrista en Jerez están, en esencia, ejecutando procesos mentales similares. El código es simplemente una nueva forma de escribir una partitura que ya estaba grabada en nuestros huesos."
    },
    granularCante: {
      title: "Síntesis granular y cante",
      content: "\"El cante flamenco es, en esencia, síntesis granular orgánica\". Esta frase de la tesis central del proyecto explica cómo los melismas y vibratos de un cantaor fragmentan la voz en micro-eventos tonales. Al usar el motor de nubes de esta app sobre muestras de voz, no estás destruyendo el cante, lo estás expandiendo. Estás permitiendo que un segundo de emoción se congele en una textura infinita, permitiendo un análisis forense de la pasión humana a través de la tecnología granular."
    },
    anticonRap: {
      title: "Anticon: El rap como IDM",
      content: "El colectivo Anticon (Doseone, Jel, Alias) revolucionó el hip-hop al tratar la MPC no como un metrónomo, sino como un instrumento de improvisación libre, a menudo ignorando la cuantización. Su estética de \"arritmia controlada\" es el puente perfecto entre el IDM y el hip-hop experimental. Esta app captura ese espíritu al permitir que el Jitter y el Chaos rompan la rejilla. Cuando el ritmo parece \"arrastrarse\" o \"tropezar\", estás invocando la libertad creativa de la escena indie-hop de Oakland de los años 2000."
    }
  } as Record<string, PedagogyMacro>
};
