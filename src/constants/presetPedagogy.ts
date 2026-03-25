/**
 * Contenido pedagógico para los presets de la Euclidean Machine.
 * Cada ficha tiene 5 secciones expandibles en el panel Engine Room → Diagnóstico.
 */

export interface PresetPedagogy {
  listening: string;
  structure: string;
  origin: string;
  experiments: string[];
  connections: string[];
  listeningGuide?: {
    order: number;
    idmRefs: string[];
    whatToHear: string;
    experiment: string;
    insight: string;
  };
}

export type PresetPedagogyMap = Record<string, PresetPedagogy>;

export const PRESET_PEDAGOGY: PresetPedagogyMap = {
  'solea-master': {
    listening: 'Un compás flamenco completo de 12 tiempos. El kick marca la estructura profunda de la Soleá, el snare responde con síncopas desplazadas, y el hi-hat teje una escobilla probabilística que no suena en todos los tiempos. Es un trío que conversa: pregunta, respuesta y textura.',
    structure: 'Kick E(5,12) a 80 BPM: 5 golpes en 12 posiciones. Densidad 42%. Snare E(2,12) con offset 3: solo 2 golpes, desplazados — es el "contracanto". Hat E(12,12) con probabilidad 70%: todos los steps activos pero solo suenan 7 de cada 10. El jitter a 2ms da un micro-temblor humano. Sin swing — el flamenco no usa swing MPC, tiene su propia gravedad.',
    origin: 'La Soleá es el palo madre del flamenco, la raíz de la que nacen casi todas las formas del cante jondo. Su ciclo de 12 tiempos es una amalgama que permite dividir el compás en grupos binarios (2+2+2) o ternarios (3+3), y el intérprete navega entre ambos. Los acentos canónicos caen en los tiempos 3, 6, 8, 10 y 12. A 80 BPM, cada ciclo dura 3.6 segundos — lo suficiente para que el oído lo perciba como una frase completa.',
    experiments: [
      'Sube los pulses del kick a 7. Acabas de pasar de Soleá a Bulería: mismo compás de 12, pero con 2 golpes más. Escucha cómo sube la energía sin cambiar la estructura.',
      'Activa Evolve en el hi-hat (Rate 5%, Speed 2x). Observa el Hit Rate en el panel Sync: irá bajando lentamente. La escobilla empieza a "respirar", dejando huecos impredecibles.',
      'Sube el jitter a 8ms. El trío deja de sonar a máquina y empieza a sonar a cuadro flamenco: cada golpe cae ligeramente fuera de sitio, como tres músicos que se escuchan pero no se miran.',
    ],
    connections: [
      'Bulería Completa: Misma estructura de 12, pero a 220 BPM con 7 pulsos en kick. Es la Soleá acelerada y densificada.',
      'Soleá (Base): El kick aislado, sin snare ni hat. Para estudiar el esqueleto.',
      'Async Ecosystem: El opuesto — ciclos que nunca coinciden. De la tradición al caos controlado.',
    ],
    listeningGuide: {
      order: 1,
      idmRefs: ['§1.4 Euclidean Rhythms', '§2.2 Métricas Asimétricas', '§3.3 Velocity Humanization'],
      whatToHear: 'El kick toca 5 veces en un ciclo de 12 pasos. Pero no en los pasos 1, 4, 7, 9 y 11 por capricho — el algoritmo de Bjorklund los distribuye para que los 7 silencios queden lo más uniformes posible. Escucha los silencios como si fueran notas. El beat 12 es el que resuelve siempre — la «caída a tierra» del flamenco. Cuando lo notes, ya estás oyendo compás.',
      experiment: 'Con la Soleá sonando, sube el Chaos del kick progresivamente: 10%, 20%, 40%, 60%. Escucha en qué punto exacto el patrón deja de sentirse flamenco. Cuando lo encuentres, bájalo un poco — acabas de localizar el umbral entre el duende y el glitch. Ese umbral no es el mismo para todos: es subjetivo, y eso es parte de la lección.',
      insight: 'El algoritmo de Bjorklund fue publicado en 1999 para distribuir pulsos en aceleradores de partículas. Godfried Toussaint demostró en 2005 que ese mismo algoritmo genera los ritmos más importantes del mundo — incluido el compás de soleá, que los cantaores llevan practicando desde el siglo XVIII. No es una coincidencia: ambos están buscando la distribución más uniforme posible. Las matemáticas y el cuerpo no llegaron al mismo sitio por accidente — es que la uniformidad tiene una sola solución óptima.',
    },
  },

  'buleria-master': {
    listening: 'Máxima energía flamenca. El kick martillea 7 golpes en 12, el snare responde con 5 golpes desplazados, y el hi-hat llena todo el espacio. A 220 BPM es taquicárdico — la velocidad del cierre de una fiesta flamenca cuando todos están de pie.',
    structure: 'Kick E(7,12) a 220 BPM: densidad 58%, casi 6 de cada 10 posiciones suenan. Snare E(5,12) con offset 2: el mismo patrón de la Soleá pero desplazado — el snare "es" una Soleá corrida. Hat E(12,12): todos los tiempos, sin probabilidad — es el pulso crudo. Jitter 3ms, swing 10%, dynamics 75%. El swing sutil evita que suene a metralleta.',
    origin: 'La Bulería es el palo de cierre de la juerga flamenca, donde convergen el baile, las palmas, el cante y la guitarra en velocidad máxima. Nació como aceleración de la Soleá y conserva su ciclo de 12, pero rellena los huecos. Matemáticamente, E(7,12) y E(5,12) están a distancia de intercambio 2: solo necesitas mover 2 golpes para transformar uno en otro. Son familia.',
    experiments: [
      'Baja el BPM a 80. Ahora tienes un E(7,12) lento — suena a una Soleá muy densa, casi ansiosa. La velocidad define el carácter tanto como el patrón.',
      'Cambia los steps del snare a 13. Acabas de romper la simetría: kick en 12, snare en 13. El MCM salta a 156 y las dos pistas dejan de coincidir limpiamente. Has creado un cruce entre flamenco y poliritmia IDM.',
      'Activa Chaos en el kick (entropy 1.3). Algunos golpes empezarán a fallar aleatoriamente. El patrón se "afloja" — es la diferencia entre un palmero preciso y uno que está al límite de su velocidad.',
    ],
    connections: [
      'Soleá Completa: 2 golpes menos en kick, 140 BPM menos. La calma antes de la tormenta.',
      'Bulería (Base): El kick aislado para estudiar el patrón.',
      'Guajira (Base): E(6,12) — el punto medio entre Soleá (5) y Bulería (7).',
    ],
    listeningGuide: {
      order: 2,
      idmRefs: ['§1.4 Euclidean Rhythms', '§2.2 Métricas Asimétricas', '§2.1 Polirritmos'],
      whatToHear: 'El mismo ciclo de 12 pasos que la Soleá, pero ahora con 7 hits en lugar de 5. Dos pasos más llenos significa dos silencios menos — y a 220 BPM, esa densidad extra cambia completamente el carácter. Escucha cómo los acentos canónicos del flamenco (posiciones 3, 6, 8, 10, 12 del ciclo) siguen ahí pero con menos aire entre ellos. La urgencia no viene del tempo — viene de la densidad euclidiana.',
      experiment: 'Baja el BPM a 80 sin cambiar nada más. Escucha si el patrón resultante te recuerda a la Soleá. Luego abre el Pattern Space y observa la distancia entre ambos presets. La swap distance entre E(5,12) y E(7,12) es de solo 2 movimientos — son familia cercana en el árbol filogenético del flamenco. Lo que separa la soleá de la bulería no es la geometría del ritmo: es la velocidad a la que se ejecuta esa geometría.',
      insight: 'En teoría de ritmos euclidianos, la «distancia de intercambio» mide cuántos movimientos mínimos necesitas para transformar un patrón en otro. Soleá y Bulería están a 2 movimientos de distancia — más cerca que cualquier otro par de palos flamencos principales. Eso explica por qué en el flamenco real se puede «romper por bulerías» desde la soleá sin que el tablao pierda el hilo. La transición tiene lógica matemática.',
    },
  },

  'async-master': {
    listening: 'Tres ciclos que nunca se encuentran. El kick gira en 11, el snare en 13, el hi-hat en 17. Cada pista vive en su propia órbita. Las coincidencias son accidentes hermosos que ocurren cada varios minutos. Es música que no se repite — estás escuchando cómo suena el infinito acotado.',
    structure: 'Kick E(5,11) a 128 BPM: ciclo impar, incómodo para el oído occidental. Snare E(7,13) con offset 4: otro primo, otro ciclo independiente. Hat E(9,17): el primo más grande, con 9 golpes — denso y rápido. MCM: 2.431 semicorcheas. A 128 BPM, el ciclo completo tarda 4 minutos y 44 segundos en repetirse. Jitter a 12ms: mucho — cada golpe tiembla notablemente. Dynamics al 85%.',
    origin: 'Este patrón es territorio Autechre. El dúo de Manchester construyó su estética rítmica sobre la interferencia de ciclos con longitudes primas que garantizan la no-repetición. Discos como "Confield" (2001) y "Draft 7.30" (2003) exploran este principio hasta sus consecuencias extremas. El truco es que 11, 13 y 17 son todos primos entre sí (coprimos), así que el MCM es su producto: 11 × 13 × 17 = 2.431. Máxima interferencia posible.',
    experiments: [
      'Mira el countdown de Eclipse en el panel Sync. Está en minutos. Ahora cambia el hat de 17 a 16 steps. El MCM se desploma a 208 — porque 16 comparte factores con otros números. Los primos son la clave de la complejidad.',
      'Activa Evolve en las tres pistas (Rate 10%, Speed 1x). El patrón que ya no se repetía ahora muta cada ciclo. Es complejidad sobre complejidad — lo que Autechre llama "sistemas generativos autónomos".',
      'Baja el jitter a 0ms. De repente suena mecánico, frío, preciso. El jitter de 12ms era lo que le daba vida. Sin él, es matemática pura — con él, es música.',
    ],
    connections: [
      'Async 11 (Base): El kick aislado, E(5,11). Para estudiar cómo suena un ciclo de 11.',
      'Folded 13 (Base): E(7,13) — el patrón del snare, aislado.',
      'Soleá Completa: El opuesto total. Tres pistas en 12, sincronizadas, tradicionales.',
    ],
    listeningGuide: {
      order: 4, // mapea desde async-ecosystem del MD
      idmRefs: ['§1.4 Euclidean Rhythms', '§2.1 Polirritmos', '§5.3 Self-Similarity'],
      whatToHear: 'Tres pistas con 11, 13 y 17 pasos — todos números primos. El MCM de esos tres números es 2.431 semicorcheas. A 128 BPM, un ciclo completo tarda 4 minutos y 44 segundos. Escucha durante al menos 2 minutos sin mirar la pantalla. ¿Notas que se repite o te parece libre? La respuesta que des define qué tipo de oyente eres — y ninguna es incorrecta.',
      experiment: 'Activa Evolve en el hat con una tasa de mutación baja. Ahora el ciclo ya era casi infinito y encima muta. Luego abre el Pattern Space y localiza este preset — está en la esquina más alejada de los presets flamencos. Esa distancia en el espacio visual es la distancia entre la estructura euclidiana como identidad cultural (flamenco) y la estructura euclidiana como sistema autónomo (Autechre).',
      insight: 'Autechre no usa números primos porque suenan bien — los usa porque los números primos no tienen divisores comunes, lo que garantiza que ningún subpatrón periódico simple emerja del sistema. Es una decisión de ingeniería con consecuencia estética: el oído busca patrones y no los encuentra de forma predecible. La complejidad percibida no es caos — es matemática con periodicidad demasiado larga para que la memoria auditiva humana la registre.',
    },
  },

  'solea-atom': {
    listening: 'El esqueleto de la Soleá: 5 golpes distribuidos en 12 posiciones. Nada más. Sin acompañamiento, sin adornos. Es la estructura desnuda del palo más profundo del flamenco.',
    structure: 'E(5,12). Posiciones activas: 1, 4, 6, 8, 10 (en notación 1-indexed). Densidad 42%. Los huecos entre golpes no son iguales: hay distancias de 2 y de 3. Esa asimetría es lo que define el carácter. Si los 5 golpes estuvieran equiespaciados en 12, no sonaría a flamenco — sonaría a reloj.',
    origin: 'E(5,12) fue identificado por Godfried Toussaint como uno de los patrones euclidianos más ubicuos del planeta. Aparece en la percusión del cante jondo, en la clave del son cubano, y en rituales africanos. Toussaint demostró además que la Soleá ocupa una posición central en el "mapa" de distancias rítmicas — está cerca de muchos otros patrones, como un cruce de caminos.',
    experiments: [
      'Aplica este patrón al kick. Luego aplica Bulería (Base) al snare. Tienes E(5,12) contra E(7,12): la conversación entre los dos palos fundamentales.',
      'Cambia el offset a 2. Ahora es E(5,12)+2 — técnicamente la Siguiriya. Mismo patrón, distinto punto de partida. Escucha cómo cambia completamente el acento.',
      'Cambia steps a 8 manteniendo 5 pulses: E(5,8) es el Cinquillo, la base de la rumba y el son cubano. De Jerez a La Habana con un slider.',
    ],
    connections: [
      'Bulería (Base): E(7,12). Distancia de intercambio: 2 golpes.',
      'Siguiriya (Base): E(5,12)+2. Mismo patrón, offset diferente.',
      'Guajira (Base): E(6,12). Un golpe más.',
      'Async 11: E(5,11). Mismos pulses, ciclo distinto. El puente flamenco→IDM.',
    ],
  },

  'buleria-atom': {
    listening: 'Un patrón denso y urgente: 7 golpes en 12 posiciones. Más de la mitad del ciclo está lleno. Es un martilleo organizado que deja poco espacio para respirar — la energía de la Bulería en estado puro.',
    structure: 'E(7,12). Densidad 58%. Comparado con E(5,12) Soleá, tiene 2 golpes más. Esos 2 golpes extra rellenan los huecos más grandes, creando un patrón donde la distancia máxima entre golpes se reduce. El resultado: más impulso, menos contemplación.',
    origin: 'La Bulería heredó la estructura de 12 de la Soleá pero la llenó hasta reventar. Es el palo de cierre, el clímax de la fiesta, donde la velocidad y la densidad se llevan al límite. Musicológicamente, E(7,12) es el complemento de E(5,12): si inviertes los golpes y silencios de uno, obtienes el otro.',
    experiments: [
      'Compara con Soleá: aplica Soleá (Base) a otra pista. Escucha las dos juntas. Los 5 golpes de la Soleá son un subconjunto de los 7 de la Bulería — todo lo que suena en la Soleá suena también en la Bulería, más 2 golpes extra.',
      'Baja los pulses a 3: E(3,12). Tres golpes en 12 — es el Tresillo, la célula rítmica más básica de la música afrocaribeña. Del flamenco denso al hueso mínimo.',
      'Sube los steps a 16: E(7,16). Misma cantidad de golpes pero en un ciclo más largo. Suena "estirado" — los huecos crecen y el patrón pierde urgencia.',
    ],
    connections: [
      'Soleá (Base): E(5,12). Distancia de intercambio: 2.',
      'Guajira (Base): E(6,12). El punto medio exacto entre Soleá y Bulería.',
      'Folded 13: E(7,13). Mismos 7 golpes pero en ciclo primo. Flamenco desencajado.',
    ],
  },

  // TODO: renombrar a siguiriya-master cuando exista el preset maestro completo
  'siguiriya-atom': {
    listening: 'El palo más oscuro del flamenco. Tiene los mismos 5 golpes en 12 que la Soleá, pero desplazados 2 posiciones. Ese desplazamiento cambia qué silencio cae dónde, y transforma una estructura contemplativa en algo dramático y tenso.',
    structure: 'E(5,12) con offset 2. Los golpes caen en posiciones distintas a la Soleá, creando una agrupación interna diferente: 2-2-3-3-2 en vez de 2-1-2-2-3-2. Misma densidad (42%), misma fórmula euclidiana, pero el acento "uno" aterriza en otro sitio del ciclo. Es la prueba de que el offset no es cosmético — es identidad.',
    origin: 'La Siguiriya es considerada la expresión más profunda y trágica del flamenco. Su compás es el más difícil de sentir para el no iniciado porque el "uno" no cae donde esperas. Históricamente se asocia con temas de muerte, pérdida y cárcel. Toussaint señaló que la Soleá y la Siguiriya son permutaciones del mismo patrón euclidiano — lo que las diferencia es "dónde empieza la historia".',
    experiments: [
      'Cambia el offset a 0. Ahora es la Soleá. Escucha el cambio de carácter con un solo movimiento — la misma estructura suena completamente distinta según dónde pongas el "uno".',
      'Aplica este patrón al snare mientras el kick lleva Soleá (offset 0). Soleá contra Siguiriya: la misma fórmula dos veces, pero desplazada. Es un diálogo entre dos versiones de la misma verdad.',
      'Sube el offset gradualmente de 0 a 11. Cada paso es una rotación del patrón — estás recorriendo las 12 posibles "lecturas" de E(5,12). Algunas son palos con nombre, otras son territorios sin explorar.',
    ],
    connections: [
      'Soleá (Base): Mismo patrón, offset 0. La versión "luminosa".',
      'Guajira (Base): E(6,12). Un golpe más, sin offset. Otra lectura del 12.',
      'Bulería (Base): E(7,12). Misma familia, más densidad.',
    ],
    listeningGuide: {
      order: 3, // TODO: renombrar a siguiriya-master cuando exista el preset maestro completo
      idmRefs: ['§1.4 Euclidean Rhythms', '§2.2 Métricas Asimétricas (amalgama quinaria)', '§3.3 Velocity Humanization'],
      whatToHear: 'La Siguiriya también usa 12 pasos, pero con un offset de +2 respecto a la Soleá — el mismo patrón E(5,12) rotado dos posiciones. Escucha dónde cae el primer golpe: ya no es en el 1 del ciclo, sino dos pasos después. Eso desplaza toda la acentuación. En el flamenco, la Siguiriya tiene carácter trágico precisamente porque el acento «llega tarde» respecto a donde el cuerpo lo espera. El offset no es un parámetro técnico — es emoción codificada en posición.',
      experiment: 'Abre el control de offset del kick y muévelo de 0 a +2 mientras suena. Escucha cómo el mismo patrón E(5,12) cambia de carácter con cada paso. En offset 0 es Soleá. En offset +2 es Siguiriya. Ahora prueba +6. No es ningún palo flamenco reconocido — estás en territorio propio. El offset es el parámetro que convierte la geometría en identidad.',
      insight: 'El sistema de palos flamencos no es un conjunto de ritmos distintos — es un conjunto de rotaciones y variaciones del mismo conjunto de patrones euclidianos sobre el ciclo de 12. La Siguiriya, la Soleá y la Guajira comparten geometría. Lo que los distingue es el offset, el tempo y la densidad. La app te permite navegar ese espacio con precisión matemática que ningún tratado de flamenco tradicional tiene.',
    },
  },

  'guajira-atom': {
    listening: 'Una hemiola: el oído no sabe si está en 6/8 o en 3/4. Los 6 golpes en 12 posiciones crean una ambigüedad rítmica que balancea entre lo binario y lo ternario. Es el palo más caribeño del flamenco — ligero, cálido y engañosamente simple.',
    structure: 'E(6,12). Densidad 50% — exactamente la mitad del ciclo está llena. Los 6 golpes se distribuyen equiespaciados: cada 2 posiciones. Eso genera un patrón perfectamente simétrico, que puede leerse como 2 grupos de 3 (ternario) o 3 grupos de 2 (binario). El cerebro oscila entre ambas lecturas. Eso es una hemiola.',
    origin: 'La Guajira entró al flamenco desde Cuba, traída por los emigrantes que volvían de las Américas. Su nombre viene del campesino cubano (guajiro). Conservó la hemiola 6/8 vs 3/4 que es la esencia de la música afrocaribeña. Es la prueba viva de la conexión transatlántica entre los ritmos euclidianos africanos, su evolución caribeña, y su adopción flamenca.',
    experiments: [
      'Intenta palmear en grupos de 3 mientras suena. Luego en grupos de 2. Notarás que ambos encajan — eso es la hemiola. Tu cerebro puede "decidir" qué metro escucha.',
      'Quita 1 pulso: E(5,12) — Soleá. Añade 1: E(7,12) — Bulería. La Guajira está exactamente en el medio. Es el punto de equilibrio de la familia flamenca de 12.',
      'Cambia steps a 8: E(6,8). Ahora tienes 6 golpes en 8 — muy denso, casi lleno. Suena a percusión africana o a drum\'n\'bass acelerado. El mismo número de golpes en un ciclo más corto comprime la energía.',
    ],
    connections: [
      'Soleá (Base): E(5,12). Un golpe menos. De la simetría a la asimetría.',
      'Bulería (Base): E(7,12). Un golpe más. De la simetría a la densidad.',
      'Detroit Grid: E(16,16). La simetría llevada al extremo — todo lleno, ningún hueco.',
    ],
  },

  'folded-atom': {
    listening: 'Un patrón que "cojea". Los 7 golpes en 13 posiciones nunca se asientan en un groove cómodo porque 13 no se divide limpiamente por nada. El oído busca el "uno" y no lo encuentra. Es la incomodidad convertida en textura.',
    structure: 'E(7,13) con offset 2. Densidad 54%. El 13 es primo — no tiene factores. Cualquier patrón en 13 steps suena "doblado" (folded) respecto a los compases habituales de 4, 8 o 16. Los 7 golpes se distribuyen en agrupaciones de 1 y 2 que rotan sin simetría obvia. El offset 2 coloca el primer golpe fuera del inicio, añadiendo desorientación.',
    origin: 'Los ciclos primos son una herramienta fundamental del IDM. Venetian Snares usó 7/4 extensamente en "Rossz Csillag Alatt Született" (2005). Autechre llevó los primos más lejos: ciclos de 11, 13, 17 y 19 que generan MCMs enormes al combinarse. El 13 específicamente tiene una relación interesante con el 12 flamenco: es "un 12 roto". Todo lo que funciona en 12 se desencaja ligeramente en 13 — como mirar el flamenco a través de un cristal deformante.',
    experiments: [
      'Aplica este patrón al snare mientras el kick lleva Soleá (E(5,12)). El MCM es 156 — kick y snare coinciden cada 156 semicorcheas. Estás en la frontera entre estructura y caos.',
      'Cambia los steps a 12 (mantén 7 pulses). Ahora E(7,12) — Bulería. El "cojeo" desaparece. Sientes cómo el primo desestabiliza lo que el 12 ordena.',
      'Sube el offset de 0 a 12 lentamente. En un ciclo primo, cada rotación suena radicalmente distinta. No hay posiciones "equivalentes" como en un ciclo par.',
    ],
    connections: [
      'Bulería (Base): E(7,12). Mismos 7 golpes, ciclo de 12. La versión "ordenada".',
      'Async 11: E(5,11). Otro primo, menos golpes. Más sparse.',
      'Async Ecosystem: Usa E(7,13) en el snare exactamente como está aquí.',
    ],
  },

  'async-atom': {
    listening: 'Un ciclo que no encaja en nada. 5 golpes en 11 posiciones: no cabe en 4/4, no cabe en 3/4, no cabe en 12/8. Es un ritmo "huérfano" que solo puede resolverse consigo mismo. Cada vez que completa un ciclo, los golpes caen en un sitio ligeramente distinto respecto al compás global.',
    structure: 'E(5,11) con offset 4. Densidad 45%. El 11 es primo, así que cualquier combinación con otros ciclos (12, 13, 16, 17) genera MCMs altos. Los 5 golpes se distribuyen en agrupaciones de 2 y 3 — una estructura que recuerda a la Soleá pero "estirada" un paso. El offset 4 garantiza que el primer golpe caiga lejos del inicio global.',
    origin: 'E(5,11) es uno de los patrones que Toussaint identificó como puente entre tradiciones. Tiene la misma cantidad de golpes que la Soleá (5) pero en un ciclo que no pertenece a ninguna tradición musical conocida. Es territorio puramente algorítmico — donde la matemática genera patrones que la humanidad no descubrió por intuición. Autechre lo utilizó como base en múltiples trabajos.',
    experiments: [
      'Cambia steps a 12 manteniendo 5 pulses. E(5,12) — estás de vuelta en la Soleá. Un solo step de diferencia separa la tradición de la vanguardia.',
      'Combina con una pista en 16 steps. MCM = 176. Combina con una en 13. MCM = 143. Combina con ambas. MCM = 2.288. Los primos multiplican la complejidad explosivamente.',
      'Baja el offset a 0 y sube el jitter a 15ms. Sin offset el patrón es más "recto"; con jitter extremo cada golpe tiembla. Es la combinación de estructura algorítmica y humanización que define al IDM de los 2000.',
    ],
    connections: [
      'Soleá (Base): E(5,12). Mismos pulses, ciclo familiar. El espejo flamenco.',
      'Folded 13: E(7,13). Otro primo, más denso. Se combinan bien.',
      'Async Ecosystem: Usa E(5,11) en el kick exactamente como está aquí.',
    ],
  },

  'detroit-atom': {
    listening: 'Todo. Cada posición del ciclo tiene un golpe. No hay silencios, no hay huecos, no hay respiro. Es la rejilla perfecta: 16 golpes en 16 posiciones, densidad del 100%. Es un pulso continuo que depende totalmente de la velocity y los FX para tener expresión.',
    structure: 'E(16,16). Densidad 100%. Es el caso degenerado del algoritmo euclidiano: cuando pulses = steps, no hay distribución que hacer — todo se llena. En este estado, el patrón euclidiano es irrelevante. Lo que importa es qué haces encima: probabilidades, chaos, evolve, velocity, jitter.',
    origin: 'Es la rejilla del techno de Detroit. Jeff Mills, Robert Hood, y la segunda ola de productores de Detroit construyeron su estética sobre el hi-hat continuo a 16ths: un muro de pulso que hipnotiza por repetición. La expresión no viene del patrón (no lo hay) sino de las sutilezas: un ghost note aquí, una variación de velocity allá, un cambio de filtro. Es el minimalismo rítmico absoluto.',
    experiments: [
      'Activa Chaos con entropy 1.5. De repente, el 100% se convierte en ~67%. Los huecos que aparecen son aleatorios — la rejilla perfecta se agrieta. Sube el entropy a 2.0 y observa cómo se desintegra.',
      'Sube las dynamics al 100%. Cada golpe tiene una intensidad diferente. Sin dynamics el muro es plano; con dynamics aparecen acentos fantasma que crean groove emergente.',
      'Cambia steps a 17: E(16,17). Un hueco. Un solo silencio rota a través del ciclo primo. Es la mínima perturbación posible — y es suficiente para crear movimiento.',
    ],
    connections: [
      'Bulería (Base): E(7,12). De la rejilla pura al ritmo flamenco.',
      'Async 11: E(5,11). De la simetría total al primo asimétrico.',
      'Guajira (Base): E(6,12). La hemiola: otra forma de simetría.',
    ],
  },

  // --- FUSION PRESETS ---
  'tercer-cielo': {
    listening: 'El encuentro entre el cante jondo y la electrónica de vanguardia. Todo respira a 72 BPM — el tempo de una conversación íntima. El kick marca la Soleá con solo 3 golpes, dejando enormes huecos. La pista tonal traza una melodía en escala frigia dominante que muta lentamente. La reverb lo envuelve todo en un espacio enorme, como una catedral abandonada.',
    structure: 'Base de Soleá (compás de 12) en todas las pistas. Kick E(3,12) — mínimo, solo ancla. Snare E(2,12)+5 con ratchet ×2 — cada golpe de snare rebota, como un eco de palmas. Hat E(5,12) con Chaos a 1.2× y probabilidad base del 60% — textura fantasmática. Tone E(4,12)+2 en Phrygian Dominant, con Evolve al 5% — la melodía se reescribe cada 2 ciclos. Modo Flamenco: los golpes gravitan hacia los acentos del compás. Reverb altísima en todo.',
    origin: 'Inspirado en "Tercer Cielo" de Raúl Refree y Rocío Márquez (2019) — el ejemplo más puro de fusión entre glitch, síntesis modular y cante flamenco. Refree usa granular y modulares para "congelar" momentos del cante, creando paisajes donde la tradición y la electrónica son indistinguibles. Este preset captura esa estética: lento, espacial, con la frigia dominante como hilo conductor.',
    experiments: [
      'Sube la reverb del Tone al 100%. La melodía se disuelve en un pad. Es síntesis granular simulada con reverb — el cante se convierte en atmósfera.',
      'Activa Evolve en el kick (Rate 3%, Speed 8x). La base empieza a dudar muy lentamente. Cada 8 ciclos, un golpe podría desaparecer. El suelo se vuelve frágil.',
      'Cambia la escala del Tone a Minor. De frigio dominante (tenso, flamenco) a menor natural (melancólico, cinematográfico). Mismo patrón, otro universo emocional.',
    ],
    connections: [
      'Soleá Completa: La base rítmica sin la capa tonal ni los FX. El esqueleto.',
      'Duende Digital: Más energía, más densidad, pero el mismo ADN flamenco.',
      'Confield: El opuesto estético — donde Tercer Cielo es contemplativo, Confield es abstracto.',
    ],
    listeningGuide: {
      order: 8,
      idmRefs: ['§3.1 Flamenco mode', '§10.2 Escalas no-occidentales', '§2.1 Polirritmo tonal'],
      whatToHear: 'El modo Flamenco aplica «gravedad» hacia los acentos canónicos del ciclo de 12 (posiciones 3, 6, 8, 10, 12) — los golpes que caen cerca de esos acentos se desplazan ligeramente hacia ellos, como si el pulso flamenco tuviera masa. Y la pista tonal tiene su propio patrón euclidiano E(4,12) completamente independiente del rítmico. Son dos sistemas euclidianos en diálogo: uno percusivo, uno melódico.',
      experiment: 'Cambia la escala de la pista tonal de Phrygian Dominant a Minor. Escucha qué pierde. Luego prueba Chromatic. El Phrygian Dominant tiene el intervalo II♭ — el medio tono desde la tónica que crea la tensión característica del cante jondo y de la música árabe-andaluza. Ese intervalo es lo que hace que suene «a madrugada en Jerez» y no a otra cosa. Cuando lo quitas, el sistema rítmico sigue igual pero la identidad cultural desaparece.',
      insight: 'La escala Phrygian Dominant es la misma que el Maqam Hijaz árabe, que el flamenco heredó del Al-Ándalus. Raúl Refree y Rocío Márquez la usaron en *Tercer Cielo* (2021) pasándola por síntesis modular y glitch — el referente directo de este preset. La escala no es un ornamento: es el ADN cultural que conecta Bagdad del siglo IX con un estudio de síntesis modular en Madrid en 2021 pasando por los tablaos de Jerez.',
    },
  },

  'malamente': {
    listening: 'Trap con acento flamenco. El kick y el snare marchan en 4/4 a 140 BPM con swing MPC agresivo — el empuje del hip-hop de Atlanta. Pero el hat hace triples (ratchet ×3) con Chaos, creando ese hi-hat nervioso del trap. La pista tonal corre en compás de 12 contra el 16 del resto — ahí está la poliritmia flamenco/trap. La melodía es grave (G2), pocas notas, como un bajo de 808 con escala frigia.',
    structure: 'Percusión en 16 steps (4/4 estándar). Kick E(4,16) — four-on-the-floor. Snare E(4,16)+4 — backbeat clásico. Hat E(10,16) con ratchet ×3 y Chaos — el hat que define el trap. Tone E(3,12) en Phrygian Dominant desde G2 — un bajo con solo 3 notas por ciclo de 12. El MCM de 16 y 12 es 48 — las pistas se cruzan cada 48 semicorcheas (≈5 segundos a 140 BPM). Modo MPC con swing al 55%: el groove empuja duro.',
    origin: 'Inspirado en "Malamente" de Rosalía (2018) — el tema que demostró que palmas + 808 + compás flamenco no son incompatibles. El productor El Guincho usó la estética del trap (hi-hats rápidos, kicks pesados, swing duro) sobre una estructura rítmica que respira flamenco. La clave: el trap es 4/4, el flamenco es 12. Cuando los combinas, el bajo "cojea" contra el beat — y ese cojeo es la magia.',
    experiments: [
      'Quita el ratchet del hat (ponlo a 0). El trap desaparece. Vuelve a ponerlo a 2. El ratchet ES el trap.',
      'Cambia los steps del Tone de 12 a 16. La poliritmia desaparece — el bajo ahora marcha con el beat. Suena más "normal" y menos interesante. Vuelve a 12.',
      'Sube el BPM a 180. De trap pasas a jungle-flamenco. El hat con ratchet a esa velocidad es pura ametralladora.',
    ],
    connections: [
      'Bulería Completa: Flamenco puro a alta velocidad. Misma energía, otra estética.',
      'Arrhythmia: Trap deconstruido — lo que pasa cuando rompes la simetría del 4/4.',
      'Detroit Grid: La rejilla pura de 16 sin flamenco. El DNA del kick four-on-the-floor.',
    ],
    listeningGuide: {
      order: 7,
      idmRefs: ['§3.1 MPC Classic (swing)', '§1.4 Euclidean', '§2.2 16 pasos'],
      whatToHear: 'El modo MPC Classic retrasa las semicorcheas de contratiempo exactamente como hacían los samplers MPC3000 de los años 90 — un retraso de aproximadamente un tercio del intervalo entre steps. No es mucho en milisegundos, pero es suficiente para que el oído lo registre como groove. Escucha el hat: toca en tiempo, fuera de tiempo, en tiempo, fuera de tiempo. Ese «fuera» tiene el timing exacto que Dilla convirtió en identidad.',
      experiment: 'Alterna entre MPC y Grid escuchando toda la mezcla. En Grid el patrón es correcto. En MPC el patrón groovea. Ahora activa también la pista tonal — en Phrygian Dominant sobre 140 BPM, el swing del MPC y la escala del cante jondo comparten espacio. Eso es lo que hace Rosalía en *El Mal Querer* (2018): el compás de palmas flamenco sobre producción trap con swing de sampler.',
      insight: 'El «swing del MPC» era técnicamente un error de cuantización del hardware — los chips de la época no podían subdividir el tiempo con suficiente precisión y los off-beats llegaban ligeramente tarde. Productores como Dilla convirtieron ese defecto en una estética. El «zapateado al aire» del flamenco — la resolución sincopada que llega un instante después de donde el cuerpo la espera — funciona exactamente igual: la identidad se construye en el retraso deliberado.',
    },
  },

  'arrhythmia': {
    listening: 'Un ritmo que se está cayendo constantemente pero nunca colapsa. Tres ciclos primos (11, 13, 17) garantizan que nada se alinea. Modo Arritmia desplaza cada golpe para maximizar la distancia al grid. Chaos activo en las 4 pistas — cada ciclo suena diferente. Evolve muta snare, hat y tone. Es un organismo rítmico que respira, tropieza y se recompone. A 105 BPM tiene ese tempo "hip-hop lento" que deja espacio para que el caos se asiente.',
    structure: 'Kick E(3,11), Snare E(4,13)+3, Hat E(7,17)+5, Tone E(5,11)+2. Todo primo, todo coprimo. MCM: 11×13×17 = 2.431. El ciclo completo tarda más de 4 minutos en repetirse. Chaos en todo: kick 1.3×, snare 1.2×, hat 1.4×, tone 1.25×. Evolve en snare (8%/ciclo), hat (12%/ciclo) y tone (6% cada 2 ciclos). Modo Arritmia con swing al 70% — los desplazamientos son extremos. La pista tonal en A2 menor con saltos amplios (noteIndices variados) — una línea de bajo que zigzaguea.',
    origin: 'Inspirado en "Arrhythmia" de Antipop Consortium (Warp Records, 2002). El trío de Oakland forzó la colisión entre lírica rap y arquitectura IDM. Sus MPC no cuantizaban — los beats "arrastraban" deliberadamente. Beans, High Priest y M. Sayyid rapeaban encima de ritmos que cambiaban de forma bajo sus pies. Este preset captura esa inestabilidad controlada: sabes que hay un patrón, pero no puedes predecir dónde caerá el siguiente golpe.',
    experiments: [
      'Cambia el modo de Arritmia a Grid. De repente todo se ordena. Mismo patrón, pero "correcto". Escucha cuánta personalidad pierde. La arritmia ES la estética.',
      'Desactiva Chaos en todo. El patrón se vuelve predecible. Hit Rate sube a 100%. La incertidumbre desaparece.',
      'Cambia los steps del kick de 11 a 12. El MCM baja drásticamente (de 2431 a algo manejable). Una pista no-prima "ancla" el sistema. Sientes la diferencia inmediatamente.',
    ],
    connections: [
      'Async Ecosystem: La base IDM sin la capa tonal ni la mutación. El esqueleto.',
      'Malamente: Trap estructurado — lo que pasa cuando ordenas el caos.',
      'Confield: Más abstracto, más cerebral, más frío.',
    ],
    listeningGuide: {
      order: 6,
      idmRefs: ['§3.2 Micro-Timing', '§2.2 11 pasos primos', '§1.5 Probabilistic Sequencing'],
      whatToHear: 'Las micro-barras grises debajo de cada step muestran el desplazamiento real de ese golpe respecto al grid. En modo Arritmia ningún golpe toca exactamente donde el grid lo indica — cada pista tiene un hash determinista calculado a partir de su trackId y posición. No es aleatorio: es sistemáticamente irregular. El patrón nunca miente de la misma manera dos veces, pero tampoco miente de forma impredecible.',
      experiment: 'Pon el hat en solo y alterna entre Grid y Arritmia varias veces seguidas. En Grid: metrónomo. En Arritmia: el hat respira, tiene peso, tiene personalidad. Ese «respirar» es exactamente lo que Anticon describía en sus notas de álbum como «expansión emocional del ritmo» — la convicción de que el tiempo regular es una convención impuesta, no una verdad natural.',
      insight: 'El álbum *Arrhythmia* (Antipop Consortium, Warp Records, 2002) no es un disco de beats irregulares por accidente técnico — es un manifiesto. El pulso cuantizado perfecto del 4/4 comercial es, en esa lectura, la hegemonía sonora del mercado. Deformarlo sistemáticamente es un acto de resistencia. La tesis del estudio llama a esto «síncopa como identidad» — el contratiempo como prueba de que el tiempo no pertenece a nadie.',
    },
  },

  'confield': {
    listening: 'Matemática hecha sonido. Cuatro ciclos primos (19, 17, 23, 19) con Chaos y Evolve al máximo en todo. Jitter a 16ms — cada golpe tiembla notablemente. Modo Dilla: el kick se mantiene casi firme pero todo lo demás flota en un espacio elástico. La pista tonal usa escala de tonos enteros — sin semitono, sin gravedad tonal, todo equidistante. Es música que rechaza la familiaridad deliberadamente. Cada segundo que escuchas es único: los patrones mutan, los golpes se pierden, las notas derivan.',
    structure: 'Kick E(5,19), Snare E(3,17)+7 con ratchet ×4, Hat E(11,23), Tone E(7,19)+4 con ratchet ×3. MCM: 19×17×23 = 7.429 — el ciclo completo tarda más de 10 minutos. Chaos extremo en todo: hat a 1.8× (casi la mitad de los golpes se pierden). Evolve agresivo: hat muta un 25% por ciclo, snare un 20%. La escala de tonos enteros (Whole Tone) elimina la jerarquía tonal — no hay nota "principal". Todo es igualmente extraño. Dynamics al 95%: los acentos son violentos, los ghost notes casi inaudibles.',
    origin: 'Inspirado en "Confield" de Autechre (Warp Records, 2001) — el disco que redefinió qué podía ser el ritmo electrónico. Sean Booth y Rob Brown usaron Max/MSP para crear sistemas generativos que producían patrones imposibles de programar manualmente. Cada track del álbum es un ecosistema autónomo donde las reglas mutan en tiempo real. Este preset captura esa filosofía: no estás escuchando un loop, estás escuchando un proceso.',
    experiments: [
      'Mira el Hit Rate en el panel Sync. Con Chaos a 1.8× en el hat, debería estar por debajo del 55%. Ahora desactiva Chaos en el hat. El Hit Rate sube a 100%. Escucha la diferencia: con Chaos, el hat es una textura irregular. Sin Chaos, es un muro.',
      'Cambia la escala del Tone de Whole Tone a Phrygian Dominant. De repente hay un centro tonal — una nota que "manda". El mismo patrón caótico adquiere dirección emocional.',
      'Baja el jitter a 0ms y cambia a modo Grid. Confield se convierte en techno abstracto. Preciso pero complejo. Es interesante cómo la misma complejidad rítmica suena radicalmente distinta con y sin humanización.',
    ],
    connections: [
      'Arrhythmia: Menos abstracto, más hip-hop. Primos + arritmia pero con más groove.',
      'Async Ecosystem: El antecesor — poliritmia prima sin las herramientas de fusión.',
      'Tercer Cielo: El polo opuesto — contemplación flamenca contra abstracción pura.',
    ],
    listeningGuide: {
      order: 5,
      idmRefs: ['§3.1 Dilla mode', '§3.2 Micro-Timing', '§2.2 Métricas Asimétricas (19 pasos primos)', '§5.1C Cellular Automata', '§5.3 Self-Similarity'],
      whatToHear: 'En Dilla mode, cada pista tiene un multiplicador de jitter distinto: el kick ×0.1 (muy tight), el snare ×1.2 (suelto), el hat ×1.5 (muy suelto). Escucha primero el kick solo, luego el hat solo. Son el mismo BPM pero tienen diferente «humanidad» — el kick suena más mecánico, el hat más orgánico. El hi-hat ya no sigue un patrón fijo — evoluciona solo. Escucha cómo en cada vuelta del ciclo el hi-hat es ligeramente distinto. Kick y Snare mantienen su patrón euclidiano estable, pero el Hat muta.',
      experiment: 'Cambia el modo de temporalidad de Dilla a Grid. Escucha qué le pasa a esa jerarquía de humanidad. Luego cambia la pista Hat de modo Euclidean a CA, Rule 30, Semilla Centro, Densidad 50, Velocidad "Cada 2". Cambia la Regla del CA entre 30, 90 y 110. Rule 30 es caótica e impredecible. Rule 90 genera simetrías que suenan casi melódicas. Rule 110 puede mantener estructuras estables durante muchos ciclos.',
      insight: 'Autechre construye sus piezas más avanzadas con exactamente este principio: un sustrato estable (kick, snare) sobre el que un elemento evoluciona según reglas autónomas. El resultado parece improvisado pero es completamente determinista. No hay azar — hay complejidad emergente. J Dilla descubrió empíricamente con el MPC que si retrasas el kick y adelantas el hat, el groove parece más humano. La app implementa exactamente ese sistema con multiplicadores por instrumento.',
    },
  },

  'duende-digital': {
    listening: 'El punto de encuentro. La Soleá y el algoritmo se abrazan. El kick marca E(5,12) con ratchet ×2 — el zapateado del siglo XXI, cada pisada tiene rebote. El hat en 17 steps rompe la simetría del 12, inyectando incertidumbre IDM en el compás flamenco. La pista tonal camina por la frigia dominante con Evolve — una melodía que muta tan lentamente que no sabes cuándo cambió. Modo Flamenco: los golpes gravitan hacia los acentos, el "soniquete" emerge naturalmente. Todo envuelto en reverb y cloud — la atmósfera que une los mundos.',
    structure: 'Kick E(5,12) — la Soleá pura con ratchet ×2 (doble golpe, como el zapateado). Snare E(3,12)+3 con Chaos sutil (1.15×) y Evolve lento (4% cada 3 ciclos) — las palmas que a veces dudan. Hat E(8,17) — rompiendo la simetría: 17 contra 12, MCM 204, ciclo de ~36 segundos. Tone E(5,12)+1 en Phrygian Dominant — el mismo patrón euclidiano que el kick pero desplazado 1 step y tocando notas. Es la guitarra siguiendo al zapateado, pero un paso detrás. Modo Flamenco a 85 BPM con Swing al 40%: gravedad hacia los acentos del compás.',
    origin: '"Duende" es la palabra flamenca para el momento donde la técnica desaparece y queda la emoción pura. "Digital" porque ese momento aquí lo produce un algoritmo. Este preset no tiene un referente único — es la tesis del proyecto hecha sonido. La Soleá y el Bjorklund. El zapateado y el ratchet. La frigia dominante y el parameter locking. El compás de 12 y el primo de 17. Flamenco e IDM como lenguajes del mismo impulso: resistir la simplicidad.',
    experiments: [
      'Quita el ratchet del kick. El "zapateado" desaparece. Ahora es solo un kick. Vuelve a poner ratchet ×1. Un solo retrigger y el kick cobra vida.',
      'Cambia los steps del hat de 17 a 12. Todo se alinea en compás de 12. Más flamenco puro, menos IDM. El MCM baja a 12. El countdown de Eclipse pasa de 36 segundos a 3.6 segundos. Sientes cómo la predictibilidad aumenta.',
      'Cambia el modo de Flamenco a Arritmia. El mismo patrón se desmorona — los acentos dejan de tener gravedad y cada golpe huye del grid. De duende a glitch en un click.',
      'Déjalo sonar 3 minutos. Evolve está trabajando en snare, hat y tone. El patrón de los primeros 30 segundos no es el de los últimos. Estás escuchando evolución.',
    ],
    connections: [
      'Soleá Completa: El ancestro — la Soleá sin capa tonal, sin ratchet, sin Evolve.',
      'Tercer Cielo: Más lento, más espacial, más contemplativo. La versión ambient del duende.',
      'Arrhythmia: La versión violenta — cuando el duende se convierte en trance.',
    ],
    listeningGuide: {
      order: 9,
      idmRefs: ['§3.4 Ratchet/Flam', '§3.1 Flamenco mode', '§10.2 Phrygian Dominant', '§1.4 Euclidean'],
      whatToHear: 'El kick tiene ratchet activo — cada golpe se dobla sobre sí mismo en un intervalo muy corto, con la segunda repetición a menor velocidad (decay 0.65). Es el flam electrónico: el gesto del zapateado que redobla antes de resolver. Y la pista tonal usa exactamente el mismo patrón E(5,12) que el kick pero con voz propia en Phrygian Dominant. Dos instancias del mismo algoritmo en capas distintas de la música.',
      experiment: 'Sube el ratchet del kick de 1 a 2, luego a 3. Escucha cómo un golpe simple se convierte en un redoble y luego en un grupeto. Ahora activa Evolve en la pista tonal con tasa baja. El patrón melódico empieza a mutar dentro del compás de soleá. Estás viendo simultáneamente §3.4 (Ratchet), §3.1 (Flamenco mode), §10.2 (escalas no-occidentales) y §1.5 (Evolve) del documento IDM. Este preset es el laboratorio completo.',
      insight: 'El Ratchet del documento IDM (§3.4), el redoble del zapateado flamenco y el «step repeat» de Autechre son el mismo gesto rítmico nombrado por tres tradiciones distintas: la computación musical académica, la tradición corporal gitana-andaluza y la producción electrónica experimental. La convergencia no es forzada — los tres llegaron independientemente a que un golpe que se niega a ser solo uno tiene más carga expresiva que uno que se resigna a serlo.',
    },
  },

  // --- PHASE 4: GENERATIVE PRESETS ---
  'fibonacci-tree': {
    listening: 'IDM orgánico: dos L-Systems generan los patrones de Snare y Hat desde reglas lingüísticas distintas, mientras la melodía usa una cadena de Markov con anclaje que varía en cada ciclo pero regresa periódicamente a la tónica. El Kick euclidiano E(3,8) ancla todo. Modo Dilla: el kick tight, el hat suelto.',
    structure: 'Kick E(3,8) — tresillo cubano euclidiano, el ancla. Snare en L-System con semilla XO, regla Fibonacci (X→XO, O→X), 4 iteraciones — patrón con proporción áurea. Hat en L-System con semilla X, regla Sparse (X→XOO), 5 iteraciones — patrón rareificado. Tone E(4,12) con Markov estilo Escala, temperatura 35, anclaje cada 8 notas — melodía en Minor que varía pero regresa. MCM de 8 y 12 = 24, ciclo corto pero con variación generativa infinita.',
    origin: 'Los L-Systems fueron propuestos por el biólogo Aristid Lindenmayer en 1968 para modelar el crecimiento de plantas. La regla Fibonacci (X→XO, O→X) genera secuencias donde la proporción entre golpes y silencios converge a la razón áurea φ ≈ 1.618. Los ritmos que escuchas siguen la misma lógica que la ramificación de un árbol: cada paso aplica la misma regla al resultado del paso anterior.',
    experiments: [
      'Sube las iteraciones del Snare de 4 a 6. Escucha cómo el patrón se vuelve más denso e impredecible.',
      'Pulsa REGEN en el Hat para regenerar su patrón con los mismos parámetros — el resultado es diferente pero con el mismo \'carácter\'.',
      'Cambia el estilo de Markov del Tone de Escala a IDM. La melodía pierde coherencia melódica y gana imprevisibilidad.',
      'Cambia el modo de temporalidad de Dilla a Grid. Escucha cómo se pierde la jerarquía de humanización.',
    ],
    connections: [
      'Async Ecosystem: Poliritmia prima sin motores generativos. El antecesor IDM.',
      'Confield: Más abstracto, con Chaos y Evolve. La evolución por mutación.',
      'Markov Flamenca: Markov con identidad cultural en vez de abstracción.',
    ],
    listeningGuide: {
      order: 11,
      idmRefs: ['§5.1A Markov', '§5.1B L-Systems', '§3.2 Microtiming'],
      whatToHear: 'Snare y Hat están generados por L-Systems con distintas reglas — escucha cómo sus patrones tienen estructura interna pero son irregulares. La pista Tone usa Markov con anclaje: sigue una melodía que varía en cada ciclo pero regresa periódicamente a la tónica. Todo junto suena como IDM orgánico — complejo pero con coherencia.',
      experiment: 'Sube las iteraciones del Snare de 4 a 6. Escucha cómo el patrón se vuelve más denso e impredecible. Luego pulsa REGEN en el Hat para regenerar su patrón con los mismos parámetros — el resultado es diferente pero con el mismo \'carácter\'. Esto es lo que distingue el L-System del azar: mismo proceso, resultados distintos pero relacionados.',
      insight: 'Los L-Systems fueron propuestos por el biólogo Lindenmayer para modelar el crecimiento de plantas. Los ritmos que escuchas siguen la misma lógica que la ramificación de un árbol: cada paso aplica la misma regla al resultado del paso anterior. La complejidad que percibes no fue diseñada — emergió de la repetición de algo simple.',
    },
  },

  'markov-flamenca': {
    listening: 'Soleá con alma algorítmica. El Kick marca E(5,12) — la estructura madre del flamenco. El Snare responde con 3 golpes desplazados, el Hat puntúa con solo 2. La melodía es generada por una cadena de Markov entrenada con el instinto flamenco: gravita hacia la tónica y el semitono inferior del modo frigio. Cada vuelta la melodía es diferente, pero siempre suena flamenca.',
    structure: 'Kick E(5,12) — Soleá canónica. Snare E(3,12)+2 — respuesta mínima. Hat E(2,12)+6 con probabilidad 80% — puntuación esparsa. Tone E(5,12) con Markov flamenco, temperatura 25, anclaje cada 4 notas, Phrygian Dominant desde E3. La temperatura baja (25) mantiene coherencia — las transiciones favorecen grados conjuntos y gravedad hacia la tónica. El anclaje cada 4 crea frases que respiran.',
    origin: 'La cadena de Markov no \'entiende\' el flamenco — solo maximiza ciertas transiciones sobre otras. Pero el resultado es culturalmente reconocible. El estilo \'flamenco\' de la matriz de transición refuerza la tónica y el semitono inferior (IIb), que son exactamente los pilares armónicos del jondeo. Esto plantea una pregunta que la app te deja responder con los oídos: ¿es el estilo musical una propiedad de la música, o de las probabilidades de transición entre sus notas?',
    experiments: [
      'Activa VER MATRIZ para ver las probabilidades de transición. Fíjate en la primera columna (tónica) y la última (sensible): tienen los valores más altos.',
      'Cambia el Estilo Markov a IDM — observa cómo la matriz se aplana, todas las probabilidades se igualan. Vuelve a Flamenco.',
      'Sube la temperatura de 25 a 80. La melodía se libera de la gravedad flamenca y empieza a saltar sin rumbo.',
      'Cambia el anclaje de \'Cada 4\' a OFF. Sin anclaje, la melodía puede alejarse indefinidamente de la tónica.',
    ],
    connections: [
      'Soleá Completa: La base rítmica sin Markov — melodía determinista o ausente.',
      'Tercer Cielo: Melodía tonal con Evolve en vez de Markov. Dos formas de variación.',
      'Fibonacci Tree: Markov abstracto (estilo Escala) vs Markov cultural (estilo Flamenco).',
    ],
    listeningGuide: {
      order: 12,
      idmRefs: ['§5.1A Markov Chains', '§10.2 Phrygian Dominant', '§3.1 Flamenco mode'],
      whatToHear: 'La melodía de la pista Tone es generada por una cadena de Markov entrenada con el instinto flamenco: gravita hacia la tónica y el semitono inferior del modo frigio — exactamente el movimiento característico del jondeo. Cada vuelta del ciclo la melodía es diferente, pero siempre suena flamenca. Escucha cómo el algoritmo ha capturado el temperamento del cante sin haber escuchado una sola grabación.',
      experiment: 'Activa VER MATRIZ para ver las probabilidades de transición. Fíjate en la primera columna (tónica) y la última (sensible): tienen los valores más altos. Ahora cambia el Estilo a IDM — observa cómo la matriz se aplana, todas las probabilidades se igualan. Vuelve a Flamenco. Ese cambio en los números es la diferencia entre el instinto cultural y la indiferencia algorítmica.',
      insight: 'La cadena de Markov no \'entiende\' el flamenco — solo maximiza ciertas transiciones sobre otras. Pero el resultado es culturalmente reconocible. Esto plantea una pregunta que la app te deja responder con los oídos: ¿es el estilo musical una propiedad de la música, o de las probabilidades de transición entre sus notas?',
    },
  },
};
