# Northwind Collections — herramienta de gestión de cobranza

Herramienta interna para el equipo de finanzas de Northwind (SaaS B2B): visibilidad de la cartera, priorización de clientes en mora y registro de gestiones de cobranza. Reemplaza la planilla manual de los lunes por una cola de trabajo priorizada con criterio explícito.

> 🚧 **En desarrollo.** Este README se completará con instrucciones de instalación y uso a medida que avance la implementación.

## Documentación

| Documento | Contenido |
|---|---|
| [DECISIONS.md](DECISIONS.md) | Las decisiones de producto y técnicas más importantes, con fundamento, alternativas descartadas y trade-offs |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Plan estructural: capas del backend, modelo de datos, especificación del scoring, estrategia de testing |
| [FUNCTIONAL.md](FUNCTIONAL.md) | Análisis funcional: cómo se comporta la aplicación para el usuario, pantalla por pantalla |
| [AI_LOG.md](AI_LOG.md) | Registro del uso de IA durante el desarrollo |

## Stack

- **Backend:** NestJS + TypeORM + PostgreSQL
- **Frontend:** React + Vite + TanStack Query
- **Infra local:** Docker Compose (solo para la base de datos)

## Cómo levantar el proyecto

### Requisitos

- Node.js 20 o superior
- Docker (con Docker Compose)

### Pasos

```bash
# 1. Instalar dependencias (raíz + api + web)
npm run install:all

# 2. Configurar variables de entorno
#    (los valores por defecto funcionan para desarrollo local, no hace falta editarlos)
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# 3. Levantar PostgreSQL con Docker
docker compose up -d

# 4. Levantar API + frontend juntos
npm run dev
```

| Servicio | URL |
|---|---|
| Frontend | http://localhost:5173 |
| API | http://localhost:3000/api/health |
| Swagger (docs de la API) | http://localhost:3000/api/docs |

### Consideraciones sobre la base de datos

- **Docker Compose levanta únicamente PostgreSQL**; la API y el frontend corren con Node local (mejor experiencia de desarrollo: hot reload y debugging sin fricción de volúmenes).
- Los datos **persisten entre reinicios** en el volumen `postgres_data`. Para empezar de cero: `docker compose down -v` y volver a levantar.
- Si ya tenés un Postgres propio ocupando el puerto 5432, cambiá `DATABASE_PORT` en `apps/api/.env` y volvé a levantar el compose — no hace falta tocar código.
- Docker Desktop debe estar corriendo antes del paso 3. Si la API loguea un error de conexión al arrancar, Postgres todavía estaba inicializándose: esperá unos segundos y reintentá.

## El producto en una frase

El sistema **sugiere y ordena** (a quién contactar, en qué orden, por qué); la persona **decide y actúa**. Tres pantallas: dashboard de salud de cartera → cola de trabajo priorizada → detalle del cliente con registro de gestiones, promesas de pago y pagos.
