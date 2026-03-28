# Cuaderno de Aprendizaje
## Sesión 3 — El Tiempo Humano

> Euclidean IDM Machine · Aprendizaje desde el sonido  
> Prerrequisito: Sesiones 1 y 2 completadas · Duración estimada: 50-60 minutos

---

## Antes de empezar

En las sesiones anteriores trabajaste con el *qué* del ritmo — cuántos golpes, en cuántos espacios, desde dónde.

Esta sesión trabaja el *cuándo* exacto de cada golpe. Mismo patrón, mismos números. Pero dependiendo de cómo gestione la app el tiempo interno, la música puede sonar mecánica, grooveada, flotante o perturbadora.

Carga el preset **Soleá Completa**. Pulsa Play. Escucha 30 segundos.

Lo que escuchas ahora va a sonar diferente en los próximos 60 minutos — sin cambiar un solo parámetro rítmico.

---

## El concepto central

Un secuenciador perfecto dispara cada golpe exactamente en su posición matemática. Ningún músico humano hace eso. La diferencia entre una máquina y un músico no es la estructura — es la relación con el tiempo.

Esta app tiene cinco maneras de gestionar esa relación. Se llaman **modos de temporalidad** y están en GlobalControls.

---

## PARTE 1 — GRID: la máquina perfecta

### Qué es

GRID es la cuantización perfecta. Cada golpe cae exactamente donde el cálculo dice que debe caer. Sin desviación. Sin humanización.

Es el modo más honesto de la app: te muestra el algoritmo puro, sin interpretación.

### Ejercicio 1.1 — Escuchar la máquina

1. Carga **Soleá Completa**.
2. En GlobalControls, selecciona temporalidad **GRID**.
3. Pon **Jitter = 0** y **Swing = 0**.
4. Pulsa Play. Escucha 2 minutos.

**Qué notar:** Es correcto. Es preciso. Tiene la estructura de la Soleá. Pero algo le falta — esa cualidad que hace que quieras mover el cuerpo. Eso que falta es lo que vas a añadir en el resto de la sesión.

---

## PARTE 2 — MPC: el swing clásico

### Qué es

El **swing** retrasa las notas que caen en los tiempos débiles — los "off-beats", los contratiempos. Las notas fuertes caen en su sitio. Las débiles llegan un poco tarde.

Eso crea la sensación de "empuje hacia adelante" — el groove del hip-hop, el house, el boom-bap.

El modo MPC replica el comportamiento del sampler MPC de Akai, que definió el sonido del hip-hop de los 90.

Con Swing = 50%: los contratiempos llegan a mitad de camino entre su posición y la siguiente nota fuerte.  
Con Swing = 0%: igual que GRID.  
Con Swing = 100%: shuffle extremo — los contratiempos casi se convierten en tresillos.

### Ejercicio 2.1 — Encontrar el swing

1. Mantén **Soleá Completa** activa.
2. Cambia temporalidad a **MPC**.
3. Pon Jitter = 0.
4. Sube Swing lentamente de 0 a 100, deteniéndote en estos valores:
   - Swing = 20: escucha 4 ciclos
   - Swing = 40: escucha 4 ciclos
   - Swing = 60: escucha 4 ciclos
   - Swing = 80: escucha 4 ciclos

**Qué notar:** Hay un punto — distinto para cada persona — donde el ritmo "engancha". Antes de ese punto suena rígido. Después de ese punto suena exagerado. Anota en qué valor de Swing está ese punto para ti.

Para referencia: la Soleá clásica funciona mejor entre Swing = 15 y Swing = 35 en modo MPC.

---

## PARTE 3 — DILLA: la imprecisión orgánica

### Qué es

J Dilla no usaba swing en el sentido clásico. Usaba imprecisión selectiva: cada instrumento tiene su propio grado de "soltado".

En esta app, el modo DILLA aplica un multiplicador de jitter diferente por pista:

| Pista | Multiplicador |
|-------|--------------|
| Kick  | 0.1× — muy ajustado al grid |
| Snare | 1.2× — ligeramente flotante |
| Hat   | 1.5× — el más suelto |
| Cloud | 0.5× — semi-ajustado |

El resultado: el kick es la columna vertebral, inamovible. El hat flota. El snare está en algún punto entre los dos. Es el groove "borracho" — tarde pero musical.

### Ejercicio 3.1 — Escuchar la selectividad

1. Mantén **Soleá Completa**.
2. Cambia temporalidad a **DILLA**.
3. Pon Swing = 0. Jitter = 15.
4. Escucha 2 minutos, prestando atención específicamente al hat.

**Qué notar:** El kick es estable. El hat flota. Esa diferencia de estabilidad entre instrumentos es lo que crea el groove de Dilla — no el desplazamiento uniforme del MPC, sino la asimetría entre instrumentos.

### Ejercicio 3.2 — Comparar MPC vs Dilla

1. Misma Soleá, Jitter = 15, Swing = 30.
2. Alterna entre MPC y DILLA cada 8 ciclos.

**La diferencia:** MPC mueve todos los contratiempos igual. Dilla mueve cada instrumento en proporción diferente. MPC suena más mecánico aunque esté grooveado. Dilla suena más orgánico aunque la estructura sea idéntica.

---

## PARTE 4 — FLAMENCO: la gravedad hacia los acentos

### Qué es

El compás flamenco de 12 tiene acentos canónicos en las posiciones **3, 6, 8, 10 y 12**. Siglos de práctica colectiva identificaron esas posiciones como los puntos de gravedad del compás.

El modo FLAMENCO implementa esa gravedad matemáticamente:

- Las notas **próximas a un acento canónico** caen "sobre" el tiempo — sin desviación.
- Las notas en **mitad del ciclo**, lejos de cualquier acento, se relajan ligeramente.

Es el "soniquete" — esa sensación de peso interno que tiene el flamenco. Los palmeros lo sienten pero no lo pueden explicar. Esta app lo puede calcular.

### Ejercicio 4.1 — Escuchar el soniquete

1. Mantén **Soleá Completa**.
2. Cambia temporalidad a **FLAMENCO**.
3. Jitter = 3. Swing = 25.
4. Escucha 3 minutos sin tocar nada.

**Qué notar:** La sensación de "peso" en ciertos momentos del ciclo. Las notas no llegan todas igual de ajustadas — algunas caen con más convicción que otras. Eso es la gravedad hacia los acentos canónicos.

### Ejercicio 4.2 — Flamenco vs Grid

1. Alterna entre FLAMENCO (Jitter=3, Swing=25) y GRID (Jitter=0, Swing=0) cada 6 ciclos.

**La pregunta:** ¿En qué modo "se mueve" más el cuerpo? ¿Por qué?

---

## PARTE 5 — ARRITMIA: el tiempo roto

### Qué es

ARRITMIA aplica un desplazamiento determinista por instrumento y por paso. Cada combinación de pista + posición tiene siempre el mismo desplazamiento — calculado por una función hash. No es aleatorio: es siempre el mismo "caos".

El resultado: nada cae donde debería, pero el desplazamiento es reproducible. Cada ciclo suena igual de "roto" — pero siempre de la misma manera. Es el tiempo del Antipop Consortium, el colectivo de hip-hop experimental de Anticon.

### Ejercicio 5.1 — El tiempo roto

1. Mantén **Soleá Completa**.
2. Cambia temporalidad a **ARRITMIA**.
3. Jitter = 8. Swing = 50.
4. Escucha 2 minutos.

**Qué notar:** La estructura rítmica sigue siendo E(5,12) — los mismos 5 golpes en 12 espacios. Pero la sensación de "compás" desaparece. Nada llega cuando el oído lo espera. Es inestable de manera intencional.

### Ejercicio 5.2 — El límite de la desorientación

1. Con ARRITMIA activa, sube Swing de 0 a 100 lentamente.
2. Encuentra el punto donde la música deja de ser "inquietante" y se convierte en "incomprensible".

Anota ese valor. Es tu umbral personal de tolerancia al desorden temporal.

---

## PARTE 6 — El Jitter por sí solo

### Qué es

El **Jitter** es imprecisión temporal gaussiana — se aplica a todos los modos. Añade pequeñas variaciones aleatorias al tiempo de cada golpe. No es uniforme: los errores pequeños son frecuentes, los grandes son raros. Como un percusionista tocando de madrugada.

La distribución es gaussiana (curva de campana). Con Jitter = 20ms:
- El 68% de los golpes llegan dentro de ±6.7ms del tiempo exacto
- El 95% dentro de ±13.4ms
- Solo el 0.3% se desvía más de ±20ms — los "accidentes" que hacen que el ritmo suene vivo

### Ejercicio 6.1 — Calibrar el Jitter por estilo

Prueba estas configuraciones en GRID (para aislar el efecto del Jitter de los otros modos):

| Estilo | Jitter | Efecto |
|--------|--------|--------|
| Máquina pura | 0ms | Perfecto, mecánico |
| Flamenco tradicional | 2-4ms | Estable con respiración |
| Hip-hop / MPC | 8-15ms | Suelto pero controlado |
| IDM / Autechre | 12-20ms | Desestabilizador intencional |
| Caos | 35-50ms | Los golpes pierden posición |

Para cada valor, escucha 4-6 ciclos con la Soleá antes de pasar al siguiente.

**La observación clave:** Hasta aproximadamente 15ms, el Jitter humaniza sin desorientar. Por encima de 20ms, empieza a cambiar la percepción del compás. Por encima de 35ms, el ritmo pierde su identidad.

---

## PARTE 7 — Los cinco modos con la misma música

Este es el ejercicio central de la sesión.

### Ejercicio 7.1 — La Soleá en cinco tiempos

Configuración fija: **Soleá Completa**, Jitter = 8ms, Swing = 30%.

Escucha 8 ciclos en cada modo, en este orden:

```
GRID → MPC → DILLA → FLAMENCO → ARRITMIA
```

No cambies nada más que el modo de temporalidad. Jitter y Swing se mantienen en 8ms y 30%.

**Después de escuchar los cinco, responde:**
1. ¿Qué modo te pareció más musical?
2. ¿Cuál te pareció más honesto con el compás flamenco?
3. ¿Cuál te pareció más IDM?
4. ¿Cuál querrías escuchar durante 20 minutos seguidos?

No hay respuestas incorrectas. Pero tus respuestas te dicen algo sobre qué tipo de tiempo te interesa.

---

## PARTE 8 — Conectar con lo que escuchaste antes

Si escuchaste **Donuts** de J Dilla y **Confield** de Autechre antes de esta sesión:

### Dilla en la app

Lo que Dilla hace en Donuts — ese kick inamovible sobre el que el snare y el hat flotan sin caer exactamente donde deberían — es literalmente el modo DILLA de la app. Los multiplicadores 0.1×/1.2×/1.5× son una abstracción de su práctica.

### Autechre en la app

Lo que Autechre hace en Confield no es solo ritmo en ciclos primos (Sesión 2). Es también temporalidad rota. El modo ARRITMIA con Jitter alto es la aproximación más cercana que tiene la app al tiempo de Confield.

### Ejercicio 8.1 — Recrear texturas conocidas

1. Carga el preset **Confield** desde la Library.
2. Activa temporalidad ARRITMIA, Jitter = 16ms, Swing = 35.
3. Escucha 3 minutos.
4. Compara mentalmente con lo que recuerdas de Confield.

---

## Resumen de la sesión

| Modo | Qué hace | Referente |
|------|----------|-----------|
| **GRID** | Cuantización perfecta | El algoritmo sin interpretación |
| **MPC** | Swing uniforme en off-beats | Hip-hop, house, boom-bap |
| **DILLA** | Jitter diferente por instrumento | J Dilla, late hip-hop |
| **FLAMENCO** | Gravedad hacia acentos canónicos | Soniquete, palmeros |
| **ARRITMIA** | Desplazamiento determinista | Antipop Consortium, Autechre |

| Control | Rango útil | Efecto |
|---------|------------|--------|
| **Swing** | 15-40% | Groove natural. Más alto = exagerado |
| **Jitter** | 2-4ms = flamenco · 8-15ms = hip-hop · 12-20ms = IDM |

---

## La conexión con la tesis

La tesis dice que flamenco e IDM son proyecciones del mismo algoritmo.

Esta sesión añade una dimensión nueva: no solo es el *qué* del ritmo — también es el *cuándo* exacto de cada golpe. El modo FLAMENCO y el modo ARRITMIA son dos maneras opuestas de humanizar el mismo E(5,12): uno gravita hacia los acentos canónicos del compás flamenco, el otro los destruye deliberadamente.

La elección del modo de temporalidad es una declaración estética. No hay correcto ni incorrecto. Solo hay intención.

---

## Para la próxima sesión

**Sesión 4 — El azar controlado.** Chaos, Entropy, Evolve, Markov. Los algoritmos que improvisan dentro de la estructura. La diferencia entre un patrón que se repite y un patrón que crece.

---

*Cuaderno generado en sesión de aprendizaje · Euclidean IDM Machine v16 · 28 marzo 2026*
