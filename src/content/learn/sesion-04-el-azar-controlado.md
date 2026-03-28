# Cuaderno de Aprendizaje
## Sesión 4 — El Azar Controlado

> Euclidean IDM Machine · Aprendizaje desde el sonido  
> Prerrequisito: Sesiones 1, 2 y 3 completadas · Duración estimada: 60-75 minutos

---

## Antes de empezar

En las sesiones anteriores construiste ritmos fijos — patrones que se repiten igual cada ciclo. La estructura cambiaba cuando tú movías un slider. La máquina obedecía.

Esta sesión introduce algo diferente: **algoritmos que toman decisiones propias** dentro de los límites que tú defines. La máquina deja de obedecer y empieza a improvisar.

Hay cuatro sistemas de azar en la app. Cada uno opera a una escala diferente:

| Sistema | Escala | Pregunta que responde |
|---------|--------|----------------------|
| **Chaos + Entropy** | Cada golpe | ¿Este golpe suena o no? |
| **Evolve** | Cada ciclo | ¿Cómo cambia el patrón con el tiempo? |
| **L-System** | Al generar | ¿Qué estructura fractal produce esta regla? |
| **Markov** | Cada nota | ¿Qué nota viene después? |

Carga el preset **Soleá Completa**. Pulsa Play.

---

## PARTE 1 — Chaos y Entropy: el golpe que no llega

### Qué es Chaos

**Chaos** es un interruptor por pista. Cuando está activo, cada golpe del patrón tiene una probabilidad de sonar — no una certeza.

Sin Chaos: si el patrón dice que hay un golpe en el paso 3, ese golpe siempre suena.  
Con Chaos: si el patrón dice que hay un golpe en el paso 3, ese golpe *puede* no sonar.

La probabilidad base de cada paso es visible en la visualización del patrón — los cuadrados iluminados tienen una opacidad que indica su probabilidad.

### Qué es Entropy

**Entropy** es el multiplicador de esa probabilidad (rango 0-2):

- Entropy = 0.5: los golpes suenan la mitad de las veces
- Entropy = 1.0: sin cambio — las probabilidades base se mantienen
- Entropy = 1.5: los golpes suenan más frecuentemente que su probabilidad base

### Ejercicio 1.1 — El hat probabilístico

El Hat de la Soleá tiene Steps = 12 y Pulses = 12 — todos los pasos activos. Es la "escobilla" constante.

1. Localiza la pista **Hat**.
2. Activa **Chaos** en Hat.
3. Pon **Entropy = 0.7**.
4. Escucha 2 minutos.

**Qué notar:** La escobilla ya no es constante. Algunos pasos suenan, otros no. El patrón es el mismo — todos los pasos siguen siendo "activos" — pero la probabilidad filtra cuáles llegan al audio. El resultado suena orgánico, como una escobilla real tocada por alguien.

### Ejercicio 1.2 — Explorar el rango de Entropy

Con Chaos activo en Hat, prueba estos valores de Entropy:

| Entropy | Qué ocurre |
|---------|-----------|
| 0.3 | El hat casi desaparece |
| 0.7 | Escobilla flamenca orgánica |
| 1.0 | Sin cambio respecto al patrón base |
| 1.5 | Más golpes de los esperados |

Escucha 4 ciclos en cada valor antes de cambiar.

### Ejercicio 1.3 — Chaos en múltiples pistas

1. Activa Chaos en **Kick** con Entropy = 0.9.
2. Activa Chaos en **Snare** con Entropy = 0.85.
3. Mantén Chaos en **Hat** con Entropy = 0.7.
4. Escucha 3 minutos.

**Qué notar:** La estructura del compás sigue siendo reconocible — la densidad relativa entre pistas se mantiene. Pero cada ciclo es ligeramente distinto. Dos ciclos consecutivos nunca son idénticos. Es la diferencia entre un bucle y una interpretación.

---

## PARTE 2 — Evolve: el patrón que crece

### Qué es

**Evolve** muta las probabilidades de los pasos con el tiempo. Cada cierto número de ciclos — controlado por **Mutation Speed** — las probabilidades de cada paso se desplazan aleatoriamente una cantidad controlada por **Mutation Rate**.

No muta el patrón euclidiano en sí — muta las probabilidades de cada paso dentro de ese patrón. El resultado es que la densidad y el carácter del patrón cambian gradualmente, de forma autónoma.

| Control | Rango | Efecto |
|---------|-------|--------|
| **Mutation Rate** | 0-1 | Cuánto puede cambiar una probabilidad por mutación |
| **Mutation Speed** | 0.1-10 | Cada cuántos ciclos ocurre la mutación |

### Ejercicio 2.1 — Evolución lenta

1. Carga **Soleá Completa**. Silencia Cloud y Tone.
2. En el **Hat**, activa **Evolve**. Pon Rate = 0.08, Speed = 4.
3. Pulsa Play. No toques nada durante **5 minutos**.

**Qué escuchar:** Los primeros 2 minutos el hat suena reconocible. Hacia el minuto 3, algo ha cambiado — la distribución de golpes es diferente. Hacia el minuto 5, puede que sea casi irreconocible o puede que haya vuelto a algo similar al original. El proceso es impredecible pero gradual.

### Ejercicio 2.2 — Evolución rápida

1. Misma configuración pero: Rate = 0.3, Speed = 1.
2. Escucha 2 minutos.

**La diferencia:** Con Speed = 1 y Rate alto, el patrón muta en cada ciclo y los cambios son grandes. Es inestabilidad acelerada — el patrón no tiene tiempo de establecerse antes de cambiar.

### Ejercicio 2.3 — El preset Confield como demostración

1. Carga el preset **Confield**.
2. Pulsa Play. No toques nada durante **10 minutos**.

Confield tiene Evolve activo en todas las pistas con Rate 0.15-0.25 y Speed = 1. El resultado es una textura en transformación continua que nunca colapsa ni se estabiliza. Es el comportamiento al que Autechre aproximó en el álbum del mismo nombre.

**La pregunta:** ¿En qué momento dejaste de intentar "seguir" el ritmo y simplemente lo escuchaste como textura?

---

## PARTE 3 — L-System: fractales rítmicos

### Qué es

Un **L-System** es un sistema de reescritura. Empieza con un símbolo y aplica reglas para expandirlo:

- **X** se convierte en otra secuencia
- **O** se convierte en otra secuencia
- Repite N veces

El resultado es un patrón con **autosimilitud** — si miras una parte del patrón y luego el patrón completo, tienen la misma estructura a diferentes escalas. Como un fractal.

La app tiene cuatro reglas de reescritura disponibles:

| Regla | Cómo evoluciona | Carácter |
|-------|----------------|---------|
| **XO** | X→XO, O→X | Fibonacci. Crece orgánicamente |
| **XX** | X→XX, O→X | Doblado. Se vuelve denso rápido |
| **XOO** | X→XOO, O→X | Disperso. Silencios largos |
| **XOOX** | X→XOOX, O→OX | Complejo. Irregular |

### Ejercicio 3.1 — Ver el fractal

1. En la pista **Snare**, busca el selector de **Pattern Generator** y elige **L-System**.
2. Selecciona regla **XO**, iteraciones = 1. Observa el patrón.
3. Sube a iteraciones = 2. Observa.
4. Sube a iteraciones = 3. Observa.
5. Sube a iteraciones = 4. Observa.

**Qué notar visualmente:** Con XO a 4 iteraciones, el patrón tiene grupos de golpes que se parecen entre sí a diferentes escalas. La misma estructura aparece en grande y en pequeño. Eso es autosimilitud.

### Ejercicio 3.2 — Escuchar Fibonacci

1. Snare con L-System XO, 4 iteraciones.
2. Hat con L-System XOO, 5 iteraciones.
3. Kick euclidiano normal: Steps = 12, Pulses = 5.
4. Pulsa Play. Escucha 3 minutos.

**Qué notar:** El Snare y el Hat tienen estructuras fractales que se entrelazan con el Kick euclidiano. La combinación genera una textura que tiene coherencia sin ser repetitiva en el sentido simple.

---

## PARTE 4 — Markov: la melodía que improvisa

### Qué es

Una **cadena de Markov** genera la siguiente nota basándose estadísticamente en la nota actual. No es aleatoria pura — hay probabilidades que favorecen ciertos movimientos sobre otros.

La app tiene cinco estilos de movimiento melódico:

| Estilo | Favorece | Evita | Referente |
|--------|----------|-------|-----------|
| **Scale** | Pasos de 1-2 grados | Saltos | Melodías cantables |
| **Jumps** | Saltos de 3-4 grados | Repetición | Jazz, contrapunto |
| **Flamenco** | Root y última nota usada | Todo lo demás | El instinto del cantaor |
| **IDM** | Cambio constante | Repetir la misma nota | Autechre |
| **Chromatic** | Semitonos y tonos | Saltos grandes | Líneas cromáticas |

### La Temperatura

El parámetro **Temperature** (0-100) mezcla el estilo seleccionado con aleatoriedad pura:

- Temperature = 0: sigue el estilo al 100% — máxima dirección
- Temperature = 50: mitad estilo, mitad azar
- Temperature = 100: completamente aleatorio — el estilo no importa

### El Anchor

**Anchor** hace que cada N notas, la melodía vuelva forzadamente al root (la nota raíz). Previene que la melodía "se pierda" en el espacio de notas disponibles.

### Ejercicio 4.1 — Escuchar los cinco estilos

1. Carga el preset **Markov Flamenca**.
2. Asegúrate de que la pista **Tone** está activa.
3. Localiza el control **Markov Style** en Tone.
4. Con Temperature = 25 y Anchor = 4, prueba cada estilo:

```
Flamenco → escucha 8 ciclos
Scale    → escucha 8 ciclos
Jumps    → escucha 8 ciclos
IDM      → escucha 8 ciclos
Chromatic → escucha 8 ciclos
```

**Qué notar:**
- **Flamenco:** La melodía gravita hacia el inicio. Siempre vuelve a casa.
- **Scale:** Movimiento suave, cantable. Casi predecible.
- **Jumps:** Angular, sorprendente. Contrapuntístico.
- **IDM:** Nunca repite. Siempre cambia. Sin hogar.
- **Chromatic:** Cromatismo — cada nota es vecina de la siguiente.

### Ejercicio 4.2 — El efecto de la Temperatura

1. Mantén estilo **Flamenco**, Anchor = 4.
2. Prueba estos valores de Temperature:

| Temperature | Qué escuchas |
|-------------|-------------|
| 5 | Casi determinista — siempre el mismo movimiento |
| 25 | Mayormente flamenco con pequeñas sorpresas |
| 50 | Mitad flamenco, mitad azar |
| 80 | Poco flamenco reconocible |
| 100 | Aleatorio puro — el estilo ha desaparecido |

**La pregunta:** ¿A qué temperatura el estilo flamenco deja de ser reconocible? Ese número es tu umbral personal de identidad estilística.

### Ejercicio 4.3 — La cadena de Markov flamenca

1. Configura Tone con: Markov Style = **Flamenco**, Temperature = 20, Anchor = 4.
2. Escala: **phrygianDominant** (Frigio Dominante).
3. Activa las pistas percusivas de la Soleá.
4. Escucha 5 minutos sin tocar nada.

**Qué ocurre:** El algoritmo de Markov con estilo flamenco tiene probabilidades que gravitan hacia el root y la última nota usada — exactamente el instinto melódico del cantaor flamenco: siempre volver a casa, siempre recordar de dónde se viene. La escala Frigio Dominante añade el color armónico. El resultado puede sonar auténticamente a cante aunque ningún humano lo esté improvisando.

---

## PARTE 5 — Combinar los cuatro sistemas

### Ejercicio 5.1 — La improvisación completa

Construye esta configuración desde cero:

```
Kick:  E(5,12) · Chaos ON · Entropy=0.9 · Temporalidad FLAMENCO · Jitter=3ms
Snare: E(3,12, offset=3) · Evolve ON · Rate=0.06 · Speed=3
Hat:   L-System XO · 4 iteraciones · Chaos ON · Entropy=0.7
Tone:  E(5,12) · Markov FLAMENCO · Temperature=25 · Anchor=4 · Escala phrygianDominant
BPM:   85
```

Pulsa Play. No toques nada durante **8 minutos**.

**Lo que está ocurriendo:**
- El Kick tiene la estructura fija de la Soleá, pero no todos los golpes llegan.
- El Snare evoluciona lentamente — su carácter cambia cada 3 ciclos.
- El Hat genera un fractal fractal de Fibonacci que es probabilístico.
- La Tone improvisa una melodía flamenca que nunca repite exactamente.

El conjunto es una pieza que se compone sola dentro de los límites que tú definiste.

### Ejercicio 5.2 — El accidente feliz

Después de los 8 minutos del ejercicio anterior:

1. Observa en qué momento del ejercicio el resultado te pareció más interesante.
2. Si recuerdas aproximadamente cuándo fue, intenta recrearlo modificando los parámetros.
3. Si no puedes recrearlo, guárdalo en **Escena 0** del Song Mode.

**La lección:** Parte del trabajo con sistemas generativos es reconocer cuándo algo funciona, no solo producirlo intencionalmente. Esa capacidad de reconocimiento es una habilidad musical.

---

## PARTE 6 — La diferencia entre estructura y improvisación

Esta es la distinción más importante de la sesión.

En las sesiones 1, 2 y 3 la app era un instrumento que obedecía. Tú definías el patrón. La app lo ejecutaba. El control era tuyo.

En esta sesión la app tiene agencia propia dentro de límites que tú defines. Tú defines el espacio — el algoritmo explora ese espacio.

Eso cambia tu rol: **de compositor a diseñador de sistemas**.

No estás escribiendo notas. Estás configurando las condiciones dentro de las cuales las notas emergen. Es lo que hace Autechre. Es lo que hacía Conlon Nancarrow con sus pianolas perforadas. Es, en cierto sentido, lo que hace el palmero flamenco que no toca exactamente en el tiempo sino que deja que el tiempo lo encuentre.

---

## Resumen de la sesión

| Sistema | Control principal | Escala temporal | Rol |
|---------|------------------|----------------|-----|
| **Chaos + Entropy** | Entropy (0-2) | Cada golpe | ¿Suena o no? |
| **Evolve** | Rate + Speed | Cada N ciclos | ¿Cómo cambia? |
| **L-System** | Regla + Iteraciones | Al generar | ¿Qué forma? |
| **Markov** | Style + Temperature | Cada nota | ¿Qué nota sigue? |

---

## La conexión con la tesis

La tesis habla de convergencia entre flamenco e IDM. Esta sesión añade la dimensión del tiempo largo: los sistemas generativos son la razón por la que IDM puede ser a la vez estructurado e irrepetible.

Pero el paralelo con el flamenco es más profundo de lo que parece: el cantaor flamenco también improvisa dentro de una estructura fija. El compás es invariable. La melodía, la ornamentación, la duración de cada frase — eso es improvisación dentro del sistema. Chaos + Evolve + Markov son la versión algorítmica de exactamente ese proceso.

La diferencia es que el cantaor lleva décadas interiorizando el sistema. La app lo aprende en milisegundos.

---

## Para la próxima sesión

**Sesión 5 — El sonido.** Síntesis y FX. Cada tipo de synth disponible en la pista Tone, los seis buses globales de efectos, el motor granular de Cloud. Entender cómo se construye el timbre antes de que llegue al oído.

---

*Cuaderno generado en sesión de aprendizaje · Euclidean IDM Machine v16 · 28 marzo 2026*
