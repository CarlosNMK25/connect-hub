

## Plan: Hacer tooltips visibles sin recorte

### Problema
Los `StudyTooltip` se renderizan con `position: absolute` dentro de contenedores que tienen `overflow-hidden` (línea 243 de `EuclideanTrack.tsx`). Esto corta los tooltips cuando intentan salir del contenedor padre.

### Solución
Cambiar los tooltips a **React Portal** (`ReactDOM.createPortal`) para renderizarlos en `document.body`, con posición `fixed` calculada dinámicamente respecto al elemento trigger.

### Cambios en `src/components/euclidean/EuclideanTrack.tsx`

1. **Rediseñar `StudyTooltip`**: En lugar de `absolute bottom-full`, usar un portal que:
   - Reciba una ref del elemento trigger
   - Calcule posición con `getBoundingClientRect()` del trigger
   - Se renderice en `document.body` con `position: fixed` y `z-index: 9999`
   - Posicione el tooltip encima del elemento (o debajo si no cabe arriba)

2. **Adaptar cada uso de `StudyTooltip`**: Cada wrapper `div` con `onMouseEnter`/`onMouseLeave` necesita una ref. Para evitar crear 17+ refs individuales, usar un patrón de ref callback que guarde el elemento hover activo:
   - Un único `hoveredRef = useRef<HTMLElement | null>(null)` que se asigna en `onMouseEnter`
   - El tooltip portal lee la posición de `hoveredRef.current`

3. **Quitar `overflow-hidden`** de la línea 243 si es posible (pero el portal lo hace innecesario).

### Implementación del componente StudyTooltip renovado

```typescript
const StudyTooltip = ({ content, visible, anchorEl }: { 
  content: string; visible: boolean; anchorEl: HTMLElement | null 
}) => {
  const [pos, setPos] = useState({ top: 0, left: 0 });
  
  useEffect(() => {
    if (visible && anchorEl) {
      const rect = anchorEl.getBoundingClientRect();
      setPos({
        top: rect.top - 8, // above element
        left: rect.left + rect.width / 2
      });
    }
  }, [visible, anchorEl]);

  return createPortal(
    <AnimatePresence>
      {visible && (
        <motion.div
          style={{ position: 'fixed', top: pos.top, left: pos.left, transform: 'translate(-50%, -100%)' }}
          className="z-[9999] w-72 p-3 bg-white border border-system-accent/40 rounded-xl shadow-2xl pointer-events-none"
          ...
        >
          <div className="text-[10px] font-mono leading-relaxed text-idm-ink uppercase">
            {content}
          </div>
          <div className="arrow..." />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
```

### Patrón de uso simplificado

Usar un solo ref + estado para el anchor element:

```typescript
const [hoveredParamEl, setHoveredParamEl] = useState<HTMLElement | null>(null);

// En cada onMouseEnter:
onMouseEnter={(e) => { isStudyMode && setHoveredParam('pulses'); setHoveredParamEl(e.currentTarget as HTMLElement); }}
onMouseLeave={() => { setHoveredParam(null); setHoveredParamEl(null); }}

// Un solo StudyTooltip al final del componente:
<StudyTooltip 
  content={hoveredParam ? getMicroText(hoveredParam, voice) : ''} 
  visible={!!hoveredParam && isStudyMode} 
  anchorEl={hoveredParamEl} 
/>
```

Esto elimina los 17+ `<StudyTooltip>` individuales y los reemplaza por uno solo.

### Archivo modificado
- `src/components/euclidean/EuclideanTrack.tsx`

### No se toca
- Ningún otro archivo

