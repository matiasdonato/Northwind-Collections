import 'dotenv/config';
import { DataSource } from 'typeorm';

/**
 * DataSource para la CLI de TypeORM (migraciones y seed).
 * La aplicación configura su propia conexión en AppModule vía ConfigService;
 * ambos leen las mismas variables de entorno (.env).
 */
export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
  username: process.env.DATABASE_USER ?? 'northwind',
  password: process.env.DATABASE_PASSWORD ?? 'northwind',
  database: process.env.DATABASE_NAME ?? 'northwind_collections',
  entities: ['src/modules/**/infrastructure/entities/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
});
