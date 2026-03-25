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
    reverbMix: "Proporción wet/dry del bus global de reverberación. Rango: [0, 1]. Controla cuánto del espacio acústico simulado se mezcla con la señal directa. Mix=0 → sonido seco e íntimo; mix=1 → todo es reverberación, el ataque se disuelve en el espacio. El RT60 define el tamaño de la sala virtual.",
    delayMix: "Proporción wet/dry del bus global de delay. Rango: [0, 1]. Define la prominencia de las repeticiones respecto a la señal original. Mix bajo → eco sutil que refuerza el groove; mix alto → las repeticiones dominan creando un paisaje rítmico de ecos.",
    delayFeedback: "Coeficiente de retroalimentación del delay: cada repetición se re-inyecta multiplicada por este factor. Rango: [0, 1]. Feedback=0 → un solo eco (slap-back); feedback=0.9 → cascada de repeticiones que decaen lentamente; feedback≈1 → auto-oscilación infinita, territorio dub/industrial.",
    fxHighPass: "Filtro paso-alto (HPF) en la cadena global de efectos. Frecuencia de corte en Hz. Rango: [20, 2000]. Elimina frecuencias por debajo del corte con pendiente de 12dB/oct. Útil para limpiar sub-graves del delay/reverb que enturbiarían la mezcla. A 500Hz+ → efecto radio/telefónico.",
    fxLowPass: "Filtro paso-bajo (LPF) en la cadena global de efectos. Frecuencia de corte en Hz. Rango: [500, 20000]. Elimina frecuencias por encima del corte. Suaviza los armónicos agresivos del delay/bitcrush. A <2kHz → efecto lo-fi analógico; a 20kHz → transparente.",
    monitorTemporal: "Visualización del jitter temporal en tiempo real. Muestra la distribución de las desviaciones de timing respecto a la rejilla teórica. Una campana estrecha = precisión mecánica; una distribución ancha = humanización. Permite diagnosticar visualmente si el micro-timing suena 'vivo' o 'robótico'.",
    monitorDistribution: "Histograma de energía por posición en el patrón. Revela qué steps concentran más hits a lo largo del tiempo, considerando probabilidades y caos. Un histograma plano = energía uniforme; picos pronunciados = acentuación emergente. Es el 'mapa de calor' del ritmo.",
    monitorRange: "Medidor del rango dinámico efectivo. Muestra la distribución de velocities (intensidades) generadas. Rango estrecho = patrón plano y mecánico; rango amplio = expresividad dinámica. El dynamics slider define los límites, pero la distribución real depende de la probabilidad y el caos.",
    monitorScatter: "Diagrama de dispersión que cruza timing (eje X) con velocity (eje Y) para cada hit. Revela correlaciones entre micro-timing y dinámica. Un cluster compacto = máquina de ritmos; dispersión amplia = percusionista humano. Es la huella digital del groove.",
    patternSync: "Sincronía del Patrón: mide el MCM (Mínimo Común Múltiplo) de los steps de todas las pistas activas. MCM = punto donde todos los ciclos coinciden simultáneamente en el beat 1. MCM bajo → los patrones se realinean rápido (sensación de estabilidad); MCM alto (>1000) → zona de evolución cuasi-infinita donde la repetición exacta es imperceptible. Es la métrica fundamental de la complejidad polirrítmica.",
    rhythmicEntropy: "Índice de entropía rítmica H = -Σ pᵢ·log₂(pᵢ) calculado sobre la distribución de probabilidades, jitter y caos de todas las pistas. H bajo → determinismo, patrones predecibles; H alto → máxima incertidumbre, territorio generativo. Combina chaos, evolve y jitter en un solo indicador de 'vida' del sistema.",
    mcmValue: "Mínimo Común Múltiplo (MCM/LCM) de los valores de steps de todas las pistas activas. Determina cuántos pasos transcurren antes de que todos los patrones vuelvan a coincidir en su posición inicial. MCM=16 con dos pistas de 8 y 16 → ciclo corto; MCM=1001 con pistas de 7, 11 y 13 → ciclo astronómico.",
    syncImpact: "Impacto de sincronización: porcentaje que indica cuánto contribuye cada pista a la complejidad del MCM global. Calculado como la proporción entre el MCM con y sin esa pista. Un impacto alto significa que eliminar esa pista simplificaría drásticamente el ciclo global.",
    phaseRadar: "Radar de fase circular que visualiza la posición actual de cada pista dentro de su ciclo individual. Cada pista se representa como un punto en un anillo proporcional a sus steps. Cuando todos los puntos se alinean → momento de sincronía (beat 1 global). La velocidad angular de cada punto depende de n: pistas con más steps giran más lento.",
    eclipseCountdown: "Countdown en tiempo real hasta el próximo eclipse rítmico (momento en que todos los patrones coinciden en el beat 1). Calculado como (MCM − step_actual) × duración_semicorchea. Cuando MCM es bajo (16-32), los eclipses son frecuentes y el countdown se recicla rápido. Con MCM alto (>1000), el eclipse puede tardar minutos, indicando una poliritmia de evolución lenta donde la repetición exacta es imperceptible.",
    hitRate: "Porcentaje de onsets que realmente sonaron vs los que fueron programados por el algoritmo euclidiano. Hit Rate = hits / (hits + misses) × 100. Con probabilidad=1 y chaos=0, el hit rate es 100% (determinista). Al activar Chaos o reducir la probabilidad, los onsets se filtran estocásticamente y el hit rate baja, indicando cuánto silencio activo está generando el sistema. Es el termómetro de la densidad efectiva del patrón.",
    fmRatio: "Harmonicity — relación de frecuencia entre portadora y modulador. Valores enteros (1, 2, 3) = timbres armónicos. Valores no enteros (1.5, 2.718) = inarmónicos, metálicos. Autechre usa ratios irracionales para leads que suenan 'rotos pero musicales'.",
    fmIndex: "Modulación Index — profundidad del FM. A 0 suena como el oscilador puro. A 10 empieza la riqueza armónica. A 30+ el espectro colapsa en ruido denso. Aphex Twin usa índices >50 para sus leads más agresivos.",
    wfAmount: "Intensidad del wavefolding — cuántas veces se dobla la onda sobre sí misma. A 0 es el triángulo puro. A 3-4 aparecen los armónicos característicos del Buchla. A 8+ el timbre colapsa en densidad espectral máxima. Técnica §7.1 del documento IDM.",
    wfSymmetry: "Sesgo de la curva de wavefold — desplaza el punto de doblez respecto al centro. A 0 es simétrico (armónicos pares e impares). Positivo enfatiza impares. Negativo crea asimetría que el oído percibe como 'calidez' o 'suciedad' según el contexto.",
    addPartials: "Número de parciales armónicos activos. 2 = fundamental + octava, timbre hueco. 4 = timbre completo natural. 8 = denso, rico, casi como un instrumento acústico. Cada parcial es un oscilador sine a frecuencia n×fundamental.",
    addBrightness: "Pendiente espectral — mezcla entre caída natural (1/n, oscuro) y amplitud plana (todos iguales, brillante). A 0 los graves dominan. A 1 todos los parciales tienen el mismo peso — timbre metálico, artificial. Additive synthesis pura de Yamaha DX7 usaba pendientes intermedias.",
    arRate: "Frecuencia del LFO de audio-rate (20-2000Hz). Por debajo de 20Hz es vibrato/tremolo convencional. Entre 20-100Hz crea sidebands audibles — nuevas frecuencias que no existían en la señal original. A 440Hz el LFO crea una frecuencia diferencia audible. Técnica §6.3 IDM.",
    arDepth: "Profundidad de la modulación audio-rate en Hz. A 0 el LFO está parado — sin efecto. A 100Hz crea sidebands sutiles. A 1000Hz+ el timbre cambia radicalmente — aparecen frecuencias de diferencia e intermodulación que el oído interpreta como inarmónicas o metálicas.",
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
    reverbMix: "El grado en que el ritmo habita un espacio imaginario. A cero, cada golpe es un hecho seco y presente; al máximo, el patrón se disuelve en su propia reverberación como un eco en una catedral abandonada. Es la distancia entre el oyente y el evento sonoro.",
    delayMix: "Cuánto protagonismo tienen los ecos respecto al golpe original. Un delay sutil es como una sombra que confirma la existencia del sonido; un delay dominante convierte cada onset en el inicio de una cadena infinita de fantasmas rítmicos.",
    delayFeedback: "La memoria del eco. Con feedback bajo, cada repetición es un recuerdo que se desvanece; con feedback alto, el eco se alimenta de sí mismo hasta generar una espiral sonora autorreferente. En el dub jamaicano, el feedback extremo era un acto de rebeldía contra la linealidad del tiempo.",
    fxHighPass: "Un filtro que elimina los graves de la cadena de efectos, como si la reverberación perdiera su peso gravitatorio. Sube el corte y los ecos se vuelven etéreos, espectrales, como escuchar el ritmo a través de una pared. Herramienta esencial del minimalismo electrónico.",
    fxLowPass: "Un filtro que recorta los agudos de los efectos, suavizando las aristas de cada eco y reverberación. Es la niebla que difumina los contornos del sonido. En el lo-fi, el paso-bajo es el equivalente sonoro de una fotografía desenfocada: sugiere más de lo que muestra.",
    monitorTemporal: "El electrocardiograma del ritmo. Cada punto es la desviación de un golpe respecto a su tiempo teórico. Una línea recta es un metrónomo; una línea errática es un corazón que late con emoción. Aquí se ve, literalmente, la diferencia entre programar y tocar.",
    monitorDistribution: "El mapa de calor de la energía rítmica. Revela dónde se concentran los golpes a lo largo del tiempo, dibujando los acentos que emergen del caos probabilístico. Es como ver la fotografía de larga exposición de un patrón que nunca se repite exactamente igual.",
    monitorRange: "El termómetro de la expresividad. Un rango dinámico estrecho es un robot; un rango amplio es un ser humano que acaricia y golpea el instrumento. Este monitor muestra si tu patrón tiene 'respiración' o si está atrapado en la monotonía de la intensidad plana.",
    monitorScatter: "La huella dactilar del groove. Cada punto representa un golpe en el espacio bidimensional del cuándo (timing) y el cuánto (intensidad). Los clusters revelan hábitos; la dispersión revela libertad. Un percusionista de flamenco y una caja de ritmos TR-808 dibujan constelaciones radicalmente distintas.",
    patternSync: "El reloj cósmico de los ritmos cruzados. Mide cuánto tarda el universo polirrítmico en volver a su estado inicial — como los planetas alineándose en una conjunción. Cuando el número es bajo, los patrones se abrazan con frecuencia; cuando es alto, estás componiendo una pieza que no se repite en la escala de la memoria humana.",
    rhythmicEntropy: "El termómetro de lo impredecible. Resume en un solo número cuánta 'vida' tiene el sistema: ¿es un metrónomo o un organismo? La entropía rítmica combina el caos, la mutación y el micro-timing en un índice que va desde la certeza absoluta hasta el borde del caos creativo.",
    mcmValue: "El número mágico: cuántos pasos deben pasar antes de que todos los patrones vuelvan a coincidir en el 'uno'. Con ciclos de 7, 11 y 13, el eclipse rítmico tarda 1001 pasos. Es la arquitectura invisible que define si tu poliritmia tiene memoria corta o se despliega como una galaxia espiral.",
    syncImpact: "La huella gravitatoria de cada pista en el sistema. Un impacto alto significa que esa pista es la responsable de la complejidad del ciclo global — es el número primo que impide la simplificación. Eliminarla sería como quitar la especia secreta de un plato: todo se vuelve predecible.",
    phaseRadar: "Un radar circular donde cada pista es un satélite en órbita. Los puntos giran a velocidades distintas según la longitud de su ciclo, y el momento en que todos se alinean es el 'eclipse' rítmico. Es la visualización más intuitiva de la poliritmia: ves literalmente cómo los tiempos se persiguen y se encuentran.",
    eclipseCountdown: "El reloj de arena del eclipse rítmico. Cuenta los segundos que faltan para que todos los satélites se alineen en el mismo meridiano — el momento donde la poliritmia colapsa brevemente en unísono antes de volver a divergir. En ciclos cortos es un metrónomo cósmico; en ciclos largos, es una promesa lejana que transforma la escucha en una espera contemplativa.",
    hitRate: "El pulso vital del patrón. Mide cuántos golpes programados realmente llegaron a sonar, revelando la tensión entre intención y azar. Al 100% el algoritmo manda; al 50% el silencio y el sonido negocian en igualdad de condiciones. Es el indicador más directo de cuánto 'aire' respira tu ritmo — cuánto espacio le has dado al fantasma del silencio para habitar entre los golpes.",
    fmRatio: "El ratio FM es la distancia entre dos voces que cantan juntas. Cuando es un número limpio, armonizan. Cuando es irracional, crean tensión — como dos relojes que nunca sincronizan del todo.",
    fmIndex: "El Index FM es cuánto tiembla la voz. A 0 es cristalina. A 50 es un grito.",
    wfAmount: "El fold es origami sónico. Doblar la onda una vez crea un pliegue. Doblarla ocho veces crea una textura que el oído no puede desenredar.",
    wfSymmetry: "La simetría del fold decide si la onda respira igual por los dos lados. Rota hacia un lado y el sonido pierde su equilibrio — como una silla con una pata más corta.",
    addPartials: "Los parciales son las voces del coro. Con 2 cantan al unísono y la octava. Con 8 cantan todas las voces de la serie armónica — la física del sonido hecha visible.",
    addBrightness: "El brillo es cuánto poder cedes a los armónicos agudos. A 0 el fundamental manda. A 1 es una democracia espectral — todos los armónicos votan igual.",
    arRate: "Cuando el modulador supera 20Hz deja de ser movimiento y se convierte en sonido. El LFO ya no balancea la nota — la infecta con nuevas frecuencias.",
    arDepth: "La profundidad AR decide qué tan lejos viaja la infección. A 0 no hay enfermedad. A 3000Hz el sonido ya no recuerda de dónde vino.",
    // Ratchet
    ratchet: "Retrigger por step: subdivide la duración del step en n+1 disparos equidistantes con curva de decay exponencial v(r) = v₀·0.65ʳ. Rango: [0, 4]. Ratchet=0 → disparo único; ratchet=2 → tripleta interna (3 disparos). Emula el redoble de cajón flamenco o el hi-hat trap de 32nds. A BPMs altos, ratchet ≥3 comprime los retriggers al límite de resolución temporal (~8ms).",
    metricModulation: "Modulación métrica: BPM' = BPM × (a/b) donde a/b ∈ {3/2, 4/3, 5/4, 2/3, 3/4, 4/5}. Rango resultante: [40, 240]. Convierte una subdivisión percibida en el nuevo beat. Ej: 120 × 3/2 = 180 — el tresillo se convierte en negra. Técnica de Stravinsky (Rite of Spring) y Nancarrow (Studies for Player Piano). Modulaciones encadenadas crean derivas de tempo exponenciales.",
    // Layer 2
    layer2Blend: "Mezcla entre sample principal (Layer 1) y capa secundaria (Layer 2). Rango: [0, 1]. A 0 solo suena Layer 1; a 1 suena exclusivamente Layer 2. La crossfade es lineal en amplitud. Permite crear timbres híbridos: kick con capa de textura, hat con capa de ruido granular.",
    layer2Pitch: "Transposición independiente de Layer 2 por resampling. Rango: [-24, +24] st. Independiente del pitch de Layer 1. f₂' = f₂ · 2^(st/12). Permite detuning entre capas (ej: +7st = quinta) para crear intervalos fijos o texturas inarmónicas cuando se combinan capas de timbre diferente.",
    layer2Offset: "Desplazamiento temporal de Layer 2 respecto al onset principal. Rango: [0, 500ms]. A 0ms ambas capas disparan simultáneamente. A 50-100ms crea un efecto de 'flam' (doble ataque). A >200ms Layer 2 actúa como cola o eco seco. Define la micro-estructura temporal dentro de un solo step.",
    layer2Filter: "Filtro paso-bajo (LPF) aplicado exclusivamente a Layer 2. Rango: [200, 8000Hz], pendiente 12dB/oct. Permite oscurecer la capa secundaria para que actúe como cuerpo/resonancia sin competir con el ataque de Layer 1. A 200Hz solo pasan sub-graves; a 8000Hz el filtro es transparente.",
    // Advanced Synths — PAD
    padVoices: "Número de osciladores en unísono del sintetizador PAD. Rango: [3, 7]. Cada voz se detuna ligeramente respecto a la fundamental según padDetune. 3 voces → acorde tríada implícito; 7 voces → densidad coral tipo Juno-60 con batimiento (beating) complejo entre armónicos cercanos.",
    padDetune: "Spread de detuning en cents entre las voces del PAD. Rango: [0, 100 cents]. 0 → unísono perfecto (sin batimiento); 15-30 → chorus clásico; 50-100 → cluster microtonalmente denso. El batimiento resultante f_beat = |f₁-f₂| crea una modulación de amplitud periódica que el oído percibe como 'anchura'.",
    padAttack: "Tiempo de ataque de la envolvente del PAD en segundos. Rango: [0.01, 2.0]. 0.01s → ataque percusivo (click + pad); 0.3s → entrada suave estándar; 2.0s → swell glacial donde el acorde emerge como niebla. Define si el PAD marca el ritmo euclidiano o lo disuelve.",
    // Advanced Synths — DRONE
    droneFeedback: "Coeficiente de feedback del delay loop que sostiene el drone. Rango: [0.70, 0.98]. A 0.70 el drone decae en ~1s (burst). A 0.98 el drone se sostiene >30s (bordón infinito). Valores >0.95 crean acumulación armónica por superposición de ciclos. Es el equivalente digital de la cuerda de bordón de la guitarra flamenca.",
    droneFilterFreq: "Frecuencia del LPF en el loop de feedback del drone. Rango: [200, 8000Hz]. Controla el brillo del tono sostenido. A 200Hz solo sobrevive la fundamental (bordón oscuro); a 8000Hz los armónicos superiores se preservan (drone brillante). Emula la resonancia de una cuerda metálica vs una de nylon.",
    // Advanced Synths — KS (Karplus-Strong)
    ksDecay: "Feedback del loop de Karplus-Strong — controla el sustain de la cuerda virtual. Rango: [0.80, 0.999]. A 0.80 la cuerda se apaga en <100ms (pizzicato seco). A 0.999 vibra >5s (cuerda de sitar). El algoritmo KS es síntesis física: un pulso de ruido filtrado en un delay loop = cuerda pulsada. Inventado por Karplus y Strong en 1983.",
    ksBrightness: "Frecuencia del LPF en el loop KS. Rango: [500, 8000Hz]. Simula el material de la cuerda: 500Hz → cuerda de gut (guitarra barroca); 3000Hz → nylon clásico; 8000Hz → acero brillante. Cada ciclo del loop pierde los armónicos por encima del corte, emulando la disipación natural de energía en una cuerda real.",
    // Advanced Synths — MODAL
    modalBody: "Tipo de resonador modal: 'bell' (campana — frecuencias inarmónicas espaciadas por ×2.09, ×3.43), 'plate' (placa — modos densos y cercanos), 'string' (cuerda — serie armónica natural 1:2:3:4). Define la estructura de parciales del resonador. La síntesis modal descompone un cuerpo vibrante en sus frecuencias propias.",
    modalDecay: "Multiplicador de decay de los modos resonantes. Rango: [0.5, 3.0]. A 0.5 los modos se extinguen rápido (golpe seco). A 3.0 resuenan prolongadamente (gong). Los modos agudos decaen más rápido que los graves (decay_n = base_decay / n), emulando la física real de cuerpos vibrantes.",
    // Advanced Synths — AMBIENT
    ambientVolume: "Volumen de los loops ambient generativos. Rango: [0.1, 1.0]. Controla el nivel de la textura atmosférica respecto al patrón rítmico. A 0.1 → apenas perceptible (subliminal); a 1.0 → dominante (el ritmo emerge desde la textura). Define la relación figura-fondo sonora.",
    ambientSpeed: "Multiplicador de velocidad de los loops ambient. Rango: [0.5, 2.0]. A 0.5 → tiempo dilatado, texturas glaciales; a 1.0 → velocidad nominal; a 2.0 → granulado acelerado. Altera la densidad temporal de la textura sin afectar el pitch (timestretch implícito).",
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

export function getMicroText(key: string, voice: PedagogyVoice): string {
  return voice === 'literary'
    ? (PEDAGOGY.microLiterary[key] ?? PEDAGOGY.micro[key] ?? '')
    : (PEDAGOGY.micro[key] ?? '');
}
