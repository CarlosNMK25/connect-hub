

# Fix Desbordamiento Horizontal en EuclideanTrack

## Problema
Los `min-width` rígidos en los 3 bloques del layout suman ~1120px, causando desbordamiento horizontal en pantallas ≤1440px.

## Cambios (solo CSS/Tailwind — archivo: `src/components/euclidean/EuclideanTrack.tsx`)

### 1. Contenedor principal (línea 239)
- Añadir `overflow-hidden` como red de seguridad
- Cambiar breakpoint de `xl:flex-row` a `2xl:flex-row` para que apile antes, y añadir un layout intermedio con `xl:flex-wrap`

### 2. Bloque Track Info (línea 241)
- Reducir `min-w-[180px]` → `min-w-[140px]` (el contenido real cabe en menos)

### 3. Bloque Waveform (línea 375)
- Reducir `min-w-[400px]` → `min-w-[250px]` — el waveform canvas es responsive por naturaleza
- Cambiar `flex-[1.5]` → `flex-1` en breakpoints medianos

### 4. Bloque Stats + Sliders (línea 420)
- Eliminar `min-w-[450px]` completamente — dejar que flex lo comprima
- Cambiar layout interno: en pantallas medianas los stats y sliders apilan verticalmente (`flex-col` siempre, `xl:flex-row`)

### 5. Grid de Sliders (línea 453)
- Eliminar `min-w-[300px]` — dejar que el grid se adapte naturalmente
- Los sliders con `w-full` ya son responsive

### 6. Panel Activity (línea 437)
- Mantener `hidden 2xl:flex` tal cual

## Estrategia de breakpoints

| Ancho | Comportamiento |
|---|---|
| < 1280px | Todo apilado en columna (sin cambio) |
| 1280-1535px | Track Info a la izquierda, Waveform + Controls apilan a la derecha |
| 1536px+ | Los 3 bloques en fila (layout actual) |

## Resumen técnico
- Solo cambios de clases Tailwind, cero lógica JS
- Sin re-renders adicionales
- Sin regresiones en 1920px+ (los min-w reducidos no afectan cuando hay espacio)
- El slider de Offset siempre visible y accesible

