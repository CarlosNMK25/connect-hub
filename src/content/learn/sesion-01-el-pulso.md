# Cuaderno de Aprendizaje
## Sesión 1 — El Pulso

> Euclidean IDM Machine · Aprendizaje desde el sonido  
> Prerrequisito: ninguno · Duración estimada: 45-60 minutos

---

## Antes de empezar

Abre la app. Pulsa **Play** en el HeaderBar. Escucha 30 segundos sin tocar nada.

Lo que escuchas es el preset que esté activo. No importa cuál sea. El objetivo de estos 30 segundos es calibrar el oído — pasar de "escuchar música" a "escuchar estructura".

Cuando termines, pulsa **Pause**.

---

## El concepto en una frase

Cada pista tiene un ciclo. El ciclo tiene dos cosas: **cuántos espacios** y **cuántos golpes**. El algoritmo de Euclides distribuye esos golpes de la manera más uniforme posible dentro de esos espacios.

Eso es todo. El resto es consecuencia.

---

## PARTE 1 — Steps: la longitud del ciclo

### Qué es

**Steps** es cuántos espacios tiene el ciclo. Si Steps = 12, hay 12 espacios disponibles. Si Steps = 16, hay 16.

La pista Kick muestra estos espacios como cuadrados en su visualización de patrón. Los cuadrados iluminados son golpes. Los oscuros son silencios.

### Ejercicio 1.1 — Escuchar la longitud

1. Carga el preset **Soleá Completa** desde la Library.
2. Asegúrate de que solo la pista **Kick** está sonando (silencia Snare, Hat, Cloud y Tone con sus botones Mute).
3. Pulsa Play.
4. Cuenta los cuadrados del Kick en voz alta mientras suena: **1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12**.
5. El ciclo se repite exactamente al llegar a 12.

**Qué escuchas:** Un ciclo de 12 espacios. Es el compás flamenco — la base de toda la música flamenca.

### Ejercicio 1.2 — Cambiar la longitud

Con el Kick sonando y los demás en mute:

1. Cambia **Steps de Kick de 12 a 16**.
2. Escucha. El ciclo ahora tiene 16 espacios — el 4/4 de la música electrónica occidental.
3. Vuelve a **Steps = 12**. Escucha la diferencia.
4. Pon **Steps = 11**. Escucha. Es un ciclo de número primo — no encaja en 4/4 ni en 3/4. Ese desajuste es IDM.
5. Vuelve a **Steps = 12**.

**Qué notar:** Steps = 12 tiene una gravedad que Steps = 16 no tiene. Esa gravedad es el compás flamenco.

---

## PARTE 2 — Pulses: cuántos golpes

### Qué es

**Pulses** es cuántos golpes hay dentro del ciclo. Siempre menor o igual a Steps.

Con Steps = 12 y Pulses = 5, hay 5 golpes distribuidos en 12 espacios. El algoritmo de Bjorklund los coloca de la manera más uniforme posible — no todos juntos al principio, sino repartidos.

### Ejercicio 2.1 — Escuchar la densidad

Con el Kick sonando (Steps = 12, resto en mute):

| Pulses | Densidad | Nombre |
|--------|----------|--------|
| 2 | 17% | Mínima presencia |
| 3 | 25% | Espacioso |
| 5 | 42% | **Soleá** |
| 6 | 50% | Guajira (hemiola) |
| 7 | 58% | **Bulería** |
| 10 | 83% | Muy denso |

Prueba cada valor en ese orden. Para cada uno:
- Escucha 4-6 ciclos.
- Observa el patrón de cuadrados — cómo se redistribuyen los golpes.
- Nótate interiormente si la música "pide movimiento" (densidad alta) o "pide silencio" (densidad baja).

### Ejercicio 2.2 — La transformación en tiempo real

1. Pon Pulses = 5. Escucha. Es la Soleá.
2. Sin parar la reproducción, sube a Pulses = 7. Escucha.
3. Sin parar, baja a Pulses = 3. Escucha.

**Qué notar:** Acabas de pasar de Soleá a Bulería a algo abstracto y espacioso, sin cambiar nada más. Un solo número transforma el carácter emocional de la música. El algoritmo no entiende de Soleá ni de Bulería — genera estructuras. El nombre lo pone la tradición.

---

## PARTE 3 — Offset: desde dónde empieza

### Qué es

**Offset** rota el patrón. Los mismos golpes, el mismo ciclo — pero empieza desde otro punto.

Con Steps = 12, Pulses = 5:
- Offset = 0 → **Soleá**
- Offset = 2 → **Siguiriya**

Esos dos palos tienen exactamente los mismos 5 golpes en 12 espacios. La diferencia emocional — contemplativo vs trágico — es una rotación de 2 posiciones.

### Ejercicio 3.1 — Soleá y Siguiriya

1. Configura Kick: Steps = 12, Pulses = 5, Offset = 0.
2. Escucha 6 ciclos.
3. Cambia Offset a 2.
4. Escucha 6 ciclos.
5. Vuelve a Offset = 0.
6. Alterna varias veces mientras escuchas.

**Qué notar:** El primer golpe cambia de posición. Toda la frase rítmica se desplaza. La densidad es idéntica. El carácter es completamente distinto.

### Ejercicio 3.2 — Explorar el espacio de offsets

Con Kick en Steps = 12, Pulses = 5:

Prueba todos los offsets de 0 a 11. Para cada uno escucha 2-3 ciclos. No hay nombres para todos — solo hay posiciones. Elige el que más te interese y anótalo.

---

## PARTE 4 — Los tres parámetros juntos

Ahora desmuta todas las pistas y carga de nuevo **Soleá Completa**.

El Kick tiene Steps = 12, Pulses = 5, Offset = 0.  
El Snare tiene Steps = 12, Pulses = 2, Offset = 3.  
El Hat tiene Steps = 12, Pulses = 12.

Todas en el mismo ciclo de 12. Eso es lo que crea el compás.

### Ejercicio 4.1 — Transformar la Soleá en IDM

Este ejercicio es el más importante de la sesión. No hay respuesta correcta — hay una escucha.

```
Estado inicial: Soleá Completa, todas las pistas activas.

Paso 1: Cambia Steps de Hat a 11. Escucha 8 ciclos.
Paso 2: Cambia Steps de Hat a 13. Escucha 8 ciclos.
Paso 3: Cambia Steps de Snare a 11. Escucha 8 ciclos.
Paso 4: Sube BPM a 128. Escucha 8 ciclos.
Paso 5: Cambia Steps de Kick a 11. Escucha 8 ciclos.
```

**La pregunta:** ¿En qué paso dejaste de escuchar flamenco?

No hay respuesta incorrecta. El ejercicio es que puedas señalar un momento concreto.

---

## PARTE 5 — La conexión con la tesis

Lo que acabas de hacer en el Ejercicio 4.1 es la tesis académica del proyecto hecha audible.

Empezaste con E(5,12) — Soleá, 2.300 años de tradición flamenca.  
Terminaste con múltiples ciclos primos — territorio Autechre, IDM puro.

El algoritmo es el mismo en los dos extremos. Solo cambiaron los números.

Esto no es una metáfora. Es literalmente lo que ocurrió en la app.

---

## Resumen de la sesión

| Control | Qué hace | Rango útil |
|---------|----------|------------|
| **Steps** | Longitud del ciclo | 12 = flamenco · 16 = electrónica · primos = IDM |
| **Pulses** | Cuántos golpes | 2-3 = espacioso · 5-7 = denso · igual a Steps = continuo |
| **Offset** | Desde dónde empieza | 0 = Soleá · 2 = Siguiriya · resto = territorio libre |

---

## Para la próxima sesión

**Sesión 2 — El diálogo.** Cómo las cinco pistas se relacionan entre sí. MCM en vivo. Lo que pasa cuando cada pista tiene su propio ciclo.

Antes de esa sesión, si quieres profundizar: abre el **Thesis Drawer** (botón ℹ en el HeaderBar) y lee el primer ensayo. Habla exactamente de lo que acabas de escuchar.

---

*Cuaderno generado en sesión de aprendizaje · Euclidean IDM Machine v16 · 28 marzo 2026*
