/**
 * Contenido pedagógico para los 10 presets de la Euclidean Machine.
 * Cada ficha tiene 5 secciones expandibles en el panel Engine Room → Diagnóstico.
 */

export interface PresetPedagogy {
  listening: string;
  structure: string;
  origin: string;
  experiments: string[];
  connections: string[];
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
      'Baja los pulses a 9: E(9,16). Acabas de pasar de rejilla llena a ritmo euclidiano. Aparecen huecos y con ellos aparece la estructura. Nota cómo 9 golpes en 16 ya suenan completamente distinto: hay respiración.',
    ],
    connections: [
      'Guajira (Base): E(6,12). Densidad 50% — la mitad de Detroit Grid. La simetría sin la saturación.',
      'Async Ecosystem: El opuesto filosófico — nada se repite, nada es predecible.',
      'Soleá (Base): E(5,12). Densidad 42%. La selección deliberada de silencios frente a la pared de sonido.',
    ],
  },
};
