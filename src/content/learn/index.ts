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
  {
    id: 'sesion-03',
    slug: 'sesion-03-el-tiempo-humano',
    title: 'El Tiempo Humano',
    session: 3,
    subtitle: 'Grid, MPC, Dilla, Flamenco, Arritmia — cinco maneras de sentir el tiempo',
    duration: '50-60 min',
    prerequisite: 'Sesiones 1 y 2 completadas',
    description: 'Mismo patrón, mismos números. Pero dependiendo del modo de temporalidad, la música suena mecánica, grooveada, flotante o perturbadora. Cinco formas de humanizar el algoritmo.',
    fileName: 'sesion-03-el-tiempo-humano.md',
  },
  {
    id: 'sesion-04',
    slug: 'sesion-04-el-azar-controlado',
    title: 'El Azar Controlado',
    session: 4,
    subtitle: 'Chaos, Evolve, L-System, Markov — algoritmos que improvisan',
    duration: '60-75 min',
    prerequisite: 'Sesiones 1, 2 y 3 completadas',
    description: 'Cuatro sistemas de azar a diferentes escalas temporales. La máquina deja de obedecer y empieza a improvisar dentro de los límites que tú defines.',
    fileName: 'sesion-04-el-azar-controlado.md',
  },
];

export async function loadManualContent(fileName: string): Promise<string> {
  const modules = import.meta.glob('./*.md', { query: '?raw', import: 'default' });
  const key = `./${fileName}`;
  if (!modules[key]) throw new Error(`Manual not found: ${fileName}`);
  return (await modules[key]()) as string;
}
