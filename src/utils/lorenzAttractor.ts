/**
 * Sistema de Lorenz — atractor caótico clásico.
 * Genera tres valores continuos (x, y, z) que nunca se repiten.
 * Parámetros estándar de Lorenz: σ=10, ρ=28, β=8/3
 */
export class LorenzAttractor {
  private x = 0.1;
  private y = 0;
  private z = 0;
  private sigma = 10;
  private rho = 28;
  private beta = 8 / 3;
  private dt = 0.005; // paso de integración

  step(): { x: number; y: number; z: number } {
    const dx = this.sigma * (this.y - this.x);
    const dy = this.x * (this.rho - this.z) - this.y;
    const dz = this.x * this.y - this.beta * this.z;

    this.x += dx * this.dt;
    this.y += dy * this.dt;
    this.z += dz * this.dt;

    return { x: this.x, y: this.y, z: this.z };
  }

  reset(): void {
    this.x = 0.1 + Math.random() * 0.01;
    this.y = 0;
    this.z = 0;
  }

  /**
   * Normaliza x a rango 0-1 (x típicamente oscila entre -20 y 20)
   */
  getNormalizedX(): number {
    return Math.max(0, Math.min(1, (this.x + 20) / 40));
  }

  /**
   * Normaliza z a rango 0-1 (z típicamente oscila entre 0 y 50)
   */
  getNormalizedZ(): number {
    return Math.max(0, Math.min(1, this.z / 50));
  }
}
