export interface ManualMeta {
  id: string;
  slug: string;
  title: string;
  session: number;
  subtitle: string;
  duration: string;
  prerequisite: string;
  description: string;
  fileName: string;
}

export const MANUALS: ManualMeta[] = [
  {
    id: 'sesion-01',
    slug: 'sesion-01-el-pulso',
    title: 'El Pulso',
    session: 1,
    subtitle: 'Steps, Pulses y Offset — los tres parámetros fundamentales',
    duration: '45-60 min',
    prerequisite: 'Ninguno',
    description: 'Aprende cómo el algoritmo de Euclides distribuye golpes en un ciclo. Descubre la conexión entre la Soleá flamenca y el IDM algorítmico.',
    fileName: 'sesion-01-el-pulso.md',
  },
  {
    id: 'sesion-02',
    slug: 'sesion-02-el-dialogo',
    title: 'El Diálogo',
    session: 2,
    subtitle: 'MCM, Eclipse y PhaseRadar — cómo las pistas se relacionan',
    duration: '45-60 min',
    prerequisite: 'Sesión 1 completada',
    description: 'Descubre qué ocurre cuando cada pista tiene su propio ciclo. MCM, Eclipse, poliritmia y la diferencia estructural entre flamenco e IDM.',
    fileName: 'sesion-02-el-dialogo.md',
  },
];

export async function loadManualContent(fileName: string): Promise<string> {
  const modules = import.meta.glob('./*.md', { query: '?raw', import: 'default' });
  const key = `./${fileName}`;
  if (!modules[key]) throw new Error(`Manual not found: ${fileName}`);
  return (await modules[key]()) as string;
}
