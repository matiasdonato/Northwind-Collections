# Northwind Collections — herramienta de gestión de cobranza

Herramienta interna para el equipo de finanzas de Northwind (SaaS B2B): visibilidad de la cartera, priorización de clientes en mora y registro de gestiones de cobranza. Reemplaza la planilla manual de los lunes por una cola de trabajo priorizada con criterio explícito.

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

# 3. Levantar la base de datos y prepararla (ver detalle abajo)
npm run setup

# 4. Levantar API + frontend juntos
npm run dev
```

### ¿Qué hace `npm run setup`?

Es un atajo que ejecuta estos tres pasos; podés correrlos por separado si preferís:

```bash
docker compose up -d --wait                    # 3a. Levanta PostgreSQL 16 en Docker (espera a que esté healthy)
npm run migration:run --prefix apps/api        # 3b. Crea las tablas (migraciones TypeORM)
npm run seed --prefix apps/api                 # 3c. Puebla datos sintéticos (17 clientes con los arquetipos del negocio)
```

La conexión usa los valores del `.env` de la API, que coinciden con los del `docker-compose.yml` — por eso funciona sin configurar nada.

| Servicio | URL |
|---|---|
| Frontend | http://localhost:5173 |
| API | http://localhost:3000/api/health |
| Swagger (docs de la API) | http://localhost:3000/api/docs |

## Cómo probar el flujo principal

El flujo end-to-end replica el lunes del equipo de cobranza (5 minutos):

1. Abrí **http://localhost:5173** → el **Dashboard** muestra la salud de la cartera: % de mora, monto vencido, aging por antigüedad y composición por segmento.
2. Clickeá el tramo **61-90 días** del aging (o el botón "Cola de trabajo") → la **cola priorizada**: clientes en mora ordenados por riesgo × monto, cada uno con su segmento y una acción sugerida.
3. Entrá a **Nimbus Software** (tiene 2 promesas de pago incumplidas) → el detalle muestra sus facturas, el historial de gestiones y el score con su desglose (botón *"¿Por qué este score?"*).
4. Registrá una gestión: tipo **Promesa de pago**, con una fecha futura → aparece en el historial como *Vigente* y el cliente baja de prioridad en la cola.
5. En la factura más vieja, clickeá **Registrar pago** (el monto viene precargado con el saldo) → la factura pasa a *Pagada*, el score baja al instante y la promesa queda *Cumplida*.
6. Volvé al Dashboard → el % de mora y el aging se movieron. Los datos quedaron persistidos: reiniciá la app (`Ctrl+C` y `npm run dev`) y siguen ahí.

Para volver los datos de demo al estado inicial: `npm run db:seed`.

### Verificación automática

```bash
npm test          # 102 tests unitarios (dominio + casos de uso), corre sin DB
npm run test:e2e  # 5 tests end-to-end contra Postgres (requiere la DB levantada)
```

La documentación de la API está en **http://localhost:3000/api/docs** (Swagger) y el diagrama del modelo de datos en [docs/data-model.svg](docs/data-model.svg).

### Consideraciones sobre la base de datos

- **Docker Compose levanta únicamente PostgreSQL**; la API y el frontend corren con Node local (mejor experiencia de desarrollo: hot reload y debugging sin fricción de volúmenes).
- Los datos **persisten entre reinicios** en el volumen `postgres_data`. Para empezar de cero: `docker compose down -v` y volver a levantar.
- Si ya tenés un Postgres propio ocupando el puerto 5432, cambiá `DATABASE_PORT` en `apps/api/.env` y volvé a levantar el compose — no hace falta tocar código.
- Docker Desktop debe estar corriendo antes del paso 3. Si la API loguea un error de conexión al arrancar, Postgres todavía estaba inicializándose: esperá unos segundos y reintentá.

## El producto en una frase

El sistema **sugiere y ordena** (a quién contactar, en qué orden, por qué); la persona **decide y actúa**. Tres pantallas: dashboard de salud de cartera → cola de trabajo priorizada → detalle del cliente con registro de gestiones, promesas de pago y pagos.
