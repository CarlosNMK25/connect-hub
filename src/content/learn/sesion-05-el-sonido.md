# Cuaderno de Aprendizaje
## Sesión 5 — El Sonido

> Euclidean IDM Machine · Aprendizaje desde el sonido  
> Prerrequisito: Sesiones 1-4 completadas · Duración estimada: 70-90 minutos

---

## Antes de empezar

Las sesiones anteriores trabajaron la estructura del tiempo — cuántos golpes, en qué ciclo, con qué precisión, con qué nivel de azar.

Esta sesión trabaja el timbre — de qué está hecho cada sonido antes de que llegue al oído. La misma estructura rítmica puede sonar como un tambor, una cuerda pulsada, una nube de granos, o un sintetizador metálico. El motor de síntesis es lo que decide.

Hay tres capas de sonido en la app:

1. **Síntesis percusiva** — Kick, Snare y Hat tienen sus propios motores especializados.
2. **Síntesis tonal** — La pista Tone tiene 9 tipos de síntesis intercambiables.
3. **Síntesis granular y ambiental** — La pista Cloud opera de forma completamente distinta.

Los seis buses de efectos globales se añaden encima de todo esto.

Carga el preset **Soleá Completa**. Pulsa Play.

---

## PARTE 1 — Síntesis percusiva: Kick, Snare y Hat

### El Kick

El Kick usa dos motores simultáneos: un **MembraneSynth** para el cuerpo y un **NoiseSynth** para el click de ataque.

Los parámetros que más cambian su carácter:

| Control | Efecto en el sonido |
|---------|-------------------|
| **Pitch Decay** (0.01-0.5s) | Cuánto tarda en bajar el tono desde el ataque. Bajo = seco. Alto = "boing" largo |
| **Octaves** (1-16) | Cuántas octavas baja el tono. Bajo = golpe plano. Alto = descenso dramático de pitch |
| **Decay** (0.1-1s) | Duración del cuerpo del golpe |
| **Click Type** | pink = redondo y cálido · white = agresivo y brillante · brown = sub profundo |

### Ejercicio 1.1 — Esculpir el kick

Con solo el Kick sonando (silencia el resto) y E(4,16) para escuchar golpes aislados:

1. Baja **Pitch Decay a 0.01** y **Octaves a 2**. Escucha — kick plano, seco.
2. Sube **Pitch Decay a 0.3** y **Octaves a 8**. Escucha — "boing" largo con descenso dramático.
3. Pon **Octaves = 12**, **Decay = 0.6**, **Click Type = brown**. Escucha — sub profundo de techno.
4. Pon **Octaves = 3**, **Decay = 0.15**, **Click Type = white**. Escucha — golpe de cajón flamenco seco.

**Lo que acabas de hacer:** Con los mismos cuatro parámetros, pasaste de sub techno a cajón flamenco. El algoritmo euclidiano dispara el mismo trigger — el timbre decide el mundo al que pertenece.

### El Snare

El Snare usa **NoiseSynth** (el ruido) más un **MembraneSynth** opcional para el cuerpo.

| Control | Efecto |
|---------|--------|
| **Decay** (0.05-0.5s) | Corto = caja seca (hip-hop). Largo = redoblante abierto |
| **Noise Type** | white = brillante · pink = redondo · brown = oscuro y grave |
| **Body Enabled** | Añade tono al ruido. Da cuerpo y pitch al snare |
| **Body Pitch** | Frecuencia del cuerpo (60-300Hz) |

### Ejercicio 1.2 — El snare en tres mundos

Con solo el Snare sonando y E(2,8):

1. Noise = white, Decay = 0.08, Body OFF → snare de hip-hop clásico
2. Noise = pink, Decay = 0.2, Body ON, Pitch = 180Hz → snare de rock
3. Noise = brown, Decay = 0.35, Body ON, Pitch = 80Hz → caja grave, casi un tom

### El Hat

El Hat tiene dos modos de síntesis completamente diferentes:

**Modo Noise:** NoiseSynth filtrado. El hat estándar.
**Modo FM (MetalSynth):** Síntesis FM con múltiples operadores. Produce timbres metálicos e inarmónicos.

| Control FM | Efecto |
|-----------|--------|
| **Harmonicity** (1-20) | Relación entre frecuencias. Bajo = metálico suave. Alto = estridente |
| **Mod Index** (0-100) | Intensidad de modulación. Alto = muy metálico y ruidoso |

### Ejercicio 1.3 — Hat Noise vs Hat FM

Con solo el Hat sonando y E(7,12):

1. Modo **Noise**, Noise Type = white, Decay = 0.04 → hat de hi-hat convencional
2. Cambia a modo **FM**, Harmonicity = 5, Mod Index = 30 → sonido metálico
3. FM, Harmonicity = 12, Mod Index = 70 → inarmónico, casi roto
4. FM, Harmonicity = 2, Mod Index = 15 → timbre de platillo suave

---

## PARTE 2 — Los 9 tipos de síntesis tonal

La pista **Tone** tiene 9 tipos de síntesis seleccionables. Todos usan las mismas notas, la misma escala y el mismo patrón rítmico — solo cambia el timbre.

La mejor manera de entenderlos es escucharlos en secuencia con la misma configuración rítmica.

### Ejercicio 2.1 — El tour de síntesis

Configuración base para este ejercicio:
- Tone: E(4,12), escala **phrygianDominant**, Markov Style = **Scale**, Temperature = 30
- Kick: E(5,12) sonando
- Resto: silenciado

Con esta base, prueba cada tipo de síntesis en Tone. Para cada uno escucha **6-8 ciclos** antes de pasar al siguiente:

---

**MONO** — El más directo.
Un oscilador con filtro. Limpio, sin adornos. El sonido "de sintetizador" básico.
*Úsalo cuando:* quieres una base limpia o un lead directo sin color extra.

---

**FM** — El metálico.
Una onda modula la frecuencia de otra. Produce parciales inarmónicos.
- **FM Ratio** bajo (1-3): más armónico, tímbrico
- **FM Ratio** alto con fracciones (π, 1.7): inarmónico, casi ruidoso
- **FM Index** alto: más complejo y metálico

*Úsalo cuando:* quieres textura IDM, sonidos de bronce sintético, o timbres que "no existen" acústicamente.

---

**WAVETABLE (wf)** — El analógico cálido.
Un oscilador pasado por una curva de distorsión (wavefolding). Añade armónicos de manera controlada.
- **WF Amount** bajo: limpio
- **WF Amount** alto: rico en armónicos, saturado
- **WF Symmetry**: cambia el carácter de la distorsión

*Úsalo cuando:* quieres el calor de los sintetizadores analógicos o sonidos de pad con textura.

---

**ADDITIVE** — El brillante.
Suma N osciladores senoidales en frecuencias armónicas.
- **Partials** (2-8): cuántos armónicos. Más = más brillante y complejo
- **Brightness**: qué tan presentes son los armónicos altos

*Úsalo cuando:* quieres control preciso del timbre o sonidos de órgano sintético.

---

**AMBIENT** — El generativo.
Osciladores con duraciones asimétricas que se repiten en bucles de longitudes distintas — el mismo principio que el modo ENO de Cloud, pero aplicado a síntesis tonal. Los bucles nunca se alinean, generando un fondo que no se repite.
- **Ambient Volume**: volumen del generador

*Úsalo cuando:* quieres un fondo tonal continuo que evolucione sin intervención, como un paisaje sonoro autónomo.

> **Nota — AR Mod:** Todos los tipos de síntesis tienen acceso a modulación de amplitud (AR Rate 20-2000Hz, AR Depth). No es un tipo independiente — es una capa de modulación que añade pulsación rítmica interna a cualquier synth. AR Rate bajo (20-80Hz) crea pulsos audibles; AR Rate alto (200Hz+) fusiona el pulso con el timbre.

---

**PAD** — El coral.
Varias voces ligeramente desafinadas entre sí.
- **Pad Voices** (2-7): cuántas voces. Más = más denso y coral
- **Pad Detune** (0-100¢): cuánto se desafinan. Alto = efecto chorus intenso
- **Pad Attack** (0.3s): la entrada suave es característica del pad

*Úsalo cuando:* quieres texturas de acordes, fondos atmosféricos, o el sonido de cuerdas sintéticas.

---

**DRONE** — El sostenido.
Un FeedbackDelay que se retroalimenta creando un tono sostenido.
- **Drone Feedback** (0-0.99): cuánto se regenera. Cerca de 0.99 = casi infinito
- **Drone Filter**: brillo del drone

*Úsalo cuando:* quieres una nota base que permanezca mientras el resto evoluciona.

---

**KS (Karplus-Strong)** — La cuerda pulsada.
Ruido → delay → filtro → feedback. Simula físicamente una cuerda.
- **KS Decay** (0.9-0.999): duración de la nota. 0.999 = cuerda larga
- **KS Brightness**: cuánta luz tiene el ataque

Cada golpe suena como una pulsación de cuerda — guitarra, koto, banjo sintético.

*Úsalo cuando:* quieres ritmo percusivo-tonal, melodías con carácter físico.

---

**MODAL** — La resonancia.
Un banco de filtros resonantes en frecuencias modales. Simula la resonancia de cuerpos físicos.
- **Modal Body**: tipo de cuerpo resonante (string, plate, bell...)

Produce timbres de campana, marimba, vibráfono sintético.

*Úsalo cuando:* quieres percusión con altura definida o timbres de instrumento de percusión afinada.

---

### Ejercicio 2.2 — El mismo ritmo, nueve mundos

Después del tour, vuelve a escuchar solo tres tipos pero esta vez con toda la Soleá activa:

1. **KS** — ¿Cómo cambia el carácter del preset?
2. **FM** con Ratio = 2.1, Index = 40 — ¿Suena más IDM o más flamenco?
3. **PAD** con Voices = 5, Detune = 40¢ — ¿Qué atmósfera crea?

---

## PARTE 3 — Cloud: granular y ENO

La pista **Cloud** funciona de manera radicalmente diferente a todo lo anterior. No sintetiza notas — trabaja con fragmentos de audio.

### Modo Granular

Divide cualquier audio en "granos" de milisegundos y los recombina. El tamaño del grano determina el resultado:

| Grain Size | Efecto |
|-----------|--------|
| 10-50ms | El audio original desaparece. Solo textura de "nube" |
| 50-200ms | Mezcla de textura y reconocibilidad |
| 200-500ms | El audio emerge con textura añadida |
| >500ms | Casi original, con leve efecto |

Los otros parámetros:

| Control | Efecto |
|---------|--------|
| **Overlap** (0-1) | Solapamiento entre granos. Alto = más suave y continuo |
| **Spray** (0-1000ms) | Varianza del punto de lectura. Alto = los granos saltan por todo el audio |
| **BitCrush** (1-16 bits) | Cuantización de audio. 1 bit = lo-fi extremo · 16 bits = limpio |

### Ejercicio 3.1 — El continuum granular

1. Silencia todas las pistas excepto **Cloud**.
2. Asegúrate de que Cloud está en modo granular (no ENO).
3. Pon Grain Size = 20ms, Overlap = 0.5, Spray = 0. Escucha.
4. Sube Grain Size a 100ms. Escucha.
5. Sube a 500ms. Escucha.
6. Sube a 1500ms. Escucha.

**Qué notar:** A 20ms es pura textura atmosférica. A 1500ms empieza a sonar como el audio subyacente con una ligera aura. El punto más interesante suele estar entre 80ms y 300ms.

### Ejercicio 3.2 — BitCrush

Con Grain Size = 150ms:

1. BitCrush = 16 (máxima calidad). Escucha.
2. Baja a BitCrush = 8 (calidad de videojuego 8-bit). Escucha.
3. Baja a BitCrush = 4. Escucha.
4. Baja a BitCrush = 2. Escucha — casi solo dos valores posibles de amplitud.

**Qué notar:** BitCrush bajo sobre textura granular crea un efecto que no existe en ningún otro instrumento — lo-fi granular. Es el sonido de Burial, de Boards of Canada, de cierto IDM contemplativo.

### Modo ENO

Brian Eno en "Music for Airports" (1978) tocó notas en un piano y las grabó en bucles de longitudes distintas. Como ningún bucle tenía una longitud que fuera múltiplo entero de los otros, las combinaciones nunca se repetían igual.

El modo **ENO** de Cloud implementa exactamente eso: 4 loops de audio con duraciones base [2.3, 3.7, 5.1, 7.3] segundos. Ningún MCM entero existe entre esas longitudes.

### Ejercicio 3.3 — La música que no se repite

1. Cambia Cloud a modo **ENO**.
2. Silencia todas las pistas excepto Cloud.
3. Escucha **5 minutos** sin tocar nada.

**Lo que ocurre:** Las cuatro capas de audio se desplazan continuamente unas respecto a otras. Cada combinación de superposición ocurre solo una vez. Es composición por sistema, no por nota.

4. Después de los 5 minutos, activa el Kick con E(3,12) y escucha cómo interactúa el ambiente con la percusión.

---

## PARTE 4 — Los seis buses de efectos globales

Los efectos en esta app no son inserciones en la cadena de señal — son **buses paralelos**. El audio original no se destruye: una parte de la señal se envía al bus de efectos, y esa señal procesada se mezcla con la original.

Cada pista tiene controles de **Send** — cuánta señal manda a cada bus.

### Bus 1: Delay

FeedbackDelay sincronizado a corchea ("8n"). El delay repite la señal en múltiplos del tempo.

**Delay Send:** cuánta señal manda al delay. 0 = sin delay. 1 = señal completa al delay.  
**Delay Mix:** volumen total del bus de delay en el master.

### Ejercicio 4.1 — El delay como textura rítmica

1. Soleá Completa, todas las pistas activas.
2. Sube **Delay Send del Kick a 0.4**.
3. Sube **Delay Mix a 0.5**.
4. Escucha cómo el delay del kick crea ecos rítmicos sincronizados al tempo.
5. Sube Delay Send del Tone a 0.6. Escucha cómo la melodía se extiende en el tiempo.

### Bus 2: Reverb

Reverb de sala de 2.5 segundos. Añade espacio acústico.

**Reverb Mix** en GlobalControls controla el volumen total del bus.

### Ejercicio 4.2 — El espacio

1. Sube **Reverb Send de Tone a 0.8**.
2. Sube **Reverb Mix a 0.6**.
3. Escucha cómo la melodía se expande en el espacio.
4. Sube también **Reverb Send de Cloud a 0.7**.

**Qué notar:** La reverb en Cloud + Tone crea la sensación de que los sonidos vienen de un espacio físico grande — una iglesia, una cueva, un espacio abierto.

### Bus 3: Gated Reverb (GRV)

La reverb se corta abruptamente con un gate en lugar de decaer naturalmente. Produce el efecto de batería de los años 80 — el "boom" de Phil Collins.

### Ejercicio 4.3 — Gated Reverb

1. Abre el panel **AdvancedFxPanel** (botón GRV en la interfaz).
2. Activa **Gated Reverb**.
3. Sube **GRV Send del Snare a 0.7**.
4. Escucha. El snare tiene una cola de reverb que se corta en lugar de disolverse.
5. Ajusta el **threshold del gate** para cambiar cuándo se corta.

### Bus 4: Freeze Reverb (FRZ)

Un feedback loop de ~95% — la reverb no decae, se acumula. Cada sonido añade una capa que permanece.

### Ejercicio 4.4 — La catedral que crece

1. Activa **Freeze Reverb** en AdvancedFxPanel.
2. Sube **FRZ Send de Tone a 0.6** y **FRZ Send de Cloud a 0.5**.
3. Escucha durante **3 minutos** sin tocar nada.

**Qué ocurre:** Las capas de sonido se acumulan indefinidamente. Después de 3 minutos el ambiente es mucho más denso que al principio. Es el preset "Freeze Cathedral" en acción.

### Bus 5: Reverse Reverb (RVR)

La reverb crece *antes* del sonido en lugar de decaer después. El efecto es que el sonido parece anunciarse a sí mismo — el ambiente llega antes que la nota.

### Ejercicio 4.5 — El tiempo invertido

1. Activa **Reverse Reverb** en AdvancedFxPanel.
2. Sube **RVR Send de Tone a 0.5**.
3. Escucha. ¿Puedes percibir el efecto de "anticipación" antes de cada nota?

Este efecto funciona mejor con notas lentas y baja densidad — con Tone en E(3,12) a 70 BPM.

### Bus 6: Spectral Delay (SDLY)

Tres bandas de frecuencia — graves, medios, agudos — con delays independientes. Cada banda llega en un momento distinto.

### Ejercicio 4.6 — La cascada espectral

1. Activa **Spectral Delay** en AdvancedFxPanel.
2. Configura tiempos: Low = 0ms, Mid = 150ms, High = 350ms.
3. Sube **SDLY Send de Tone a 0.7**.
4. Escucha cómo la melodía se "abre" en el tiempo por bandas de frecuencia.

**Lo que ocurre:** Los graves llegan primero. Los medios llegan 150ms después. Los agudos llegan 350ms después. Una sola nota se convierte en un evento extendido en el tiempo.

---

## PARTE 5 — El Frequency Shifter

El Frequency Shifter no es un efecto de bus — está en la cadena de señal de cada pista individualmente. Desplaza **todas las frecuencias la misma cantidad en Hz**.

La diferencia con el pitch shift:
- **Pitch shift:** multiplica todas las frecuencias por un factor. Las relaciones armónicas se mantienen.
- **Frequency shift:** suma una cantidad fija en Hz a todas las frecuencias. Las relaciones armónicas se rompen.

**Ejemplo:**
- Un sonido con armónicos en 100Hz, 200Hz, 300Hz (proporción 1:2:3)
- Shift +100Hz: 200Hz, 300Hz, 400Hz (proporción 2:3:4 — ya no es el mismo acorde)
- El sonido pierde su identidad tonal. Se vuelve inarmónico.

### Ejercicio 5.1 — Romper la armonía

1. Mantén Soleá Completa, todas las pistas activas.
2. En **Tone**, activa **FreqShift** y sube a +200Hz.
3. Escucha. La melodía ya no suena "afinada" — sus parciales ya no son armónicos.
4. En **Kick**, activa FreqShift a +150Hz.
5. En **Hat**, FreqShift a +300Hz.

**Qué notar:** Con Frequency Shifter en todo el mix, el resultado es completamente inarmónico. Es el preset "Bode Machine" — Autechre por excelencia. Ningún instrumento suena en una frecuencia "natural".

---

## PARTE 6 — Escuchar el preset "Freeze Cathedral"

Después de trabajar todos los elementos por separado, escucha un preset que los combina de forma extrema.

### Ejercicio 6.1 — Freeze Cathedral

1. Carga el preset **Freeze Cathedral**.
2. Pulsa Play. No toques nada durante **5 minutos**.

Lo que está ocurriendo:
- Todos los instrumentos tienen FreezeSend alto — cada sonido añade capas al ambiente acumulado.
- Cloud en modo ENO genera atmósfera que nunca repite.
- La reverb freeze acumula todo sin dejar que nada desaparezca.

**Qué notar:** Hacia el minuto 2-3, el ambiente tiene docenas de capas superpuestas. El volumen real no ha cambiado — lo que ha cambiado es la densidad del espacio acústico.

---

## Resumen de la sesión

### Los timbres percusivos

| Pista | Motor | Parámetro más decisivo |
|-------|-------|----------------------|
| Kick | MembraneSynth + NoiseSynth | Pitch Decay + Octaves |
| Snare | NoiseSynth + MembraneSynth opcional | Noise Type + Body |
| Hat | NoiseSynth o MetalSynth | Modo (Noise vs FM) |

### Los 9 tipos de síntesis tonal

| Tipo | Carácter | Para qué |
|------|----------|---------|
| mono | Limpio, directo | Bases, leads simples |
| fm | Metálico, inarmónico | IDM, textura compleja |
| wavetable | Cálido, analógico | Pads, ambient |
| additive | Brillante, armónico | Control preciso del timbre |
| ar | Pulsante | Modulación rítmica interna |
| pad | Denso, coral | Texturas de acordes |
| drone | Sostenido | Base fija continua |
| ks | Percusivo-tonal | Cuerda pulsada |
| modal | Resonante | Percusión afinada |

### Los 6 buses de efectos

| Bus | Efecto | Mejor uso |
|-----|--------|----------|
| Delay | Ecos rítmicos sincronizados | Kick, Tone |
| Reverb | Espacio acústico | Todo |
| Gated Reverb | Cola cortada bruscamente | Snare, batería de los 80s |
| Freeze | Acumulación infinita | Tone, Cloud, ambient |
| Reverse | Anticipación antes del sonido | Tone lento |
| Spectral Delay | Cascada por frecuencias | Tone, textura |

---

## La conexión con la tesis

La síntesis no es decoración sobre la estructura rítmica — **es parte de la identidad del género**.

Un E(5,12) con Kick de Pitch Decay largo + Tone con Markov flamenco en KS + Cloud ENO con Freeze es flamenco electrónico.

El mismo E(5,12) con Kick sub + Tone FM inarmónico + Frequency Shifter en todo + Hat MetalSynth es IDM.

La estructura matemática es idéntica. La síntesis y los efectos son los que sitúan el resultado en un mundo sonoro concreto. Eso no contradice la tesis — la completa: el algoritmo euclidiano define el esqueleto, la síntesis define la carne.

---

## Para la próxima sesión

**Sesión 6 — La composición.** Song Mode. Escenas, cadenas, performance en vivo. Cómo pasar de explorar parámetros a construir una pieza con estructura temporal.

---

*Cuaderno generado en sesión de aprendizaje · Euclidean IDM Machine v16 · 28 marzo 2026*
