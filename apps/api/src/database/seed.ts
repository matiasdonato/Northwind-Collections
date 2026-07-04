/**
 * Seed de datos sintéticos.
 * Se implementará junto con las entidades del dominio (clientes, facturas,
 * pagos y gestiones), generando los arquetipos descritos en FUNCTIONAL.md.
 */
import dataSource from './data-source';

async function seed() {
  await dataSource.initialize();
  console.log('Conexión OK. Todavía no hay entidades que poblar (seed pendiente de implementación).');
  await dataSource.destroy();
}

seed().catch((error) => {
  console.error('Seed falló:', error);
  process.exit(1);
});
