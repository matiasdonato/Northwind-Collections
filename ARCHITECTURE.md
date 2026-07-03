# ARCHITECTURE.md

Plan estructural y decisiones técnicas del proyecto. Complementa a [DECISIONS.md](DECISIONS.md) (decisiones de producto) con el *cómo* técnico.

---

## 1. Visión general

```
┌─────────────────┐       HTTP/JSON        ┌──────────────────┐        SQL         ┌────────────┐
│   apps/web      │ ─────────────────────► │    apps/api      │ ─────────────────► │ PostgreSQL │
│ React + Vite    │   (TanStack Query)     │     NestJS       │    (TypeORM)       │  (Docker)  │
│ SPA             │ ◄───────────────────── │  REST + Swagger  │ ◄───────────────── │            │
└─────────────────┘                        └──────────────────┘                    └────────────┘
```

- **Monorepo** con dos aplicaciones (`apps/api`, `apps/web`) y Docker Compose para la infraestructura local.
- El frontend consume exclusivamente la API real (sin datos mockeados en el cliente, requisito del challenge).
- Los datos se poblan con un **seed sintético** que representa los arquetipos de cliente del enunciado.

### Estructura del repositorio

```
/
├── apps/
│   ├── api/                  # Backend NestJS
│   └── web/                  # Frontend React + Vite
├── docs/
│   └── data-model.png        # Diagrama del modelo de datos (requisito)
├── docker-compose.yml        # PostgreSQL local
├── .env.example              # Variables necesarias, versionado (requisito)
├── README.md
├── DECISIONS.md
├── ARCHITECTURE.md
└── AI_LOG.md
```

---

## 2. Backend (NestJS)

### 2.1 Principio rector: clean architecture pragmática

Aplicamos la separación de capas de clean architecture donde aporta valor real, sin ceremonias que no se justifican en un proyecto de este tamaño. La regla de dependencias es estricta en una sola dirección:

```
infrastructure ──depende de──► application ──depende de──► domain
                                                          (domain no depende de nada)
```

- **`domain/`** — el corazón del sistema: entidades y la lógica de negocio de cobranza (cálculo de aging, scoring de riesgo, segmentación, estado de facturas). **Funciones y clases puras: sin decoradores de Nest, sin TypeORM, sin I/O.** Reciben datos, devuelven resultados. Esto las hace triviales de testear y es donde se aplica TDD.
- **`application/`** — casos de uso que orquestan: `GetDashboard`, `GetWorkQueue`, `RegisterPayment`, `RegisterCollectionAction`. Definen **puertos** (interfaces de repositorio) que la infraestructura implementa.
- **`infrastructure/`** — todo lo que toca el mundo exterior: controllers HTTP, DTOs con validación, entidades y repositorios TypeORM. Es la capa reemplazable.

**Por qué así y no más estricto:** clean architecture "completa" (value objects para todo, mappers en cada frontera, CQRS) multiplicaría los archivos sin cambiar ninguna propiedad del sistema a esta escala. La inversión de dependencias se aplica donde paga: la lógica de scoring no sabe que existe TypeORM, así que se testea sin base de datos y sobreviviría un cambio de ORM.

**Nota sobre las entidades TypeORM:** las entidades con decoradores (`@Entity`, `@Column`) viven en `infrastructure/`, no en `domain/`. El dominio define sus propios tipos planos (interfaces/clases puras) y los repositorios traducen entre ambos. Así el dominio queda 100% libre del ORM, que es el punto de la arquitectura.

### 2.2 Estructura de módulos

```
apps/api/src/
├── main.ts                        # Bootstrap: ValidationPipe global, Swagger
├── app.module.ts
├── modules/
│   ├── customers/                 # Clientes: listado, detalle
│   ├── invoices/                  # Facturas y pagos
│   ├── collections/               # El módulo central: scoring, cola, acciones
│   │   ├── domain/
│   │   │   ├── risk-scoring.ts    # Score 0-100 + desglose explicable
│   │   │   ├── segmentation.ts    # Reglas de segmento (4 arquetipos)
│   │   │   ├── aging.ts           # Buckets 0-30/31-60/61-90/+90
│   │   │   └── *.spec.ts          # Tests unitarios (TDD)
│   │   ├── application/
│   │   │   ├── get-work-queue.usecase.ts
│   │   │   ├── register-action.usecase.ts
│   │   │   └── ports/             # Interfaces de repositorio
│   │   └── infrastructure/
│   │       ├── collections.controller.ts
│   │       ├── dto/               # class-validator
│   │       ├── entities/          # Entidades TypeORM (@Entity)
│   │       └── typeorm-*.repository.ts
│   └── dashboard/                 # KPIs y aging agregados
└── database/
    ├── data-source.ts             # Configuración TypeORM
    ├── migrations/                # Migraciones versionadas
    └── seed.ts                    # Datos sintéticos
```

### 2.3 API REST

Documentada con Swagger en `/api/docs` (`@nestjs/swagger`). Endpoints principales:

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/dashboard/kpis` | % mora, monto vencido, DSO, promesas activas |
| `GET` | `/api/dashboard/aging` | Aging report por buckets (monto y # clientes) |
| `GET` | `/api/work-queue` | Clientes en mora ordenados por prioridad, con score, segmento y acción sugerida |
| `GET` | `/api/customers/:id` | Detalle: facturas, historial de acciones, desglose del score |
| `POST` | `/api/customers/:id/actions` | Registrar gestión: llamada, email, nota o promesa de pago |
| `POST` | `/api/invoices/:id/payments` | Registrar pago total o parcial |

**Validación de inputs (requisito):** todos los `POST` usan DTOs con `class-validator` y `ValidationPipe` global (`whitelist: true, forbidNonWhitelisted: true`): tipos, rangos (montos > 0), enums de tipo de acción, fechas válidas. Errores devuelven `400` con detalle por campo.

### 2.4 Modelo de datos

Principio: **persistimos hechos, derivamos juicios.** Facturas, pagos y acciones son hechos inmutables del negocio; score, segmento y aging son juicios derivados que se calculan al leer (DECISIONS.md, Decisión 5).

```
customers                      invoices                       payments
─────────                      ────────                       ────────
id            PK               id            PK               id          PK
name                           customer_id   FK → customers   invoice_id  FK → invoices
size          enum             amount        decimal          amount      decimal
              (small/mid/      issued_date   date             paid_at     date
               enterprise)     due_date      date             created_at
mrr           decimal          status        enum
created_at                                   (open/partially_paid/
                                              paid/void)
                               created_at

collection_actions
──────────────────
id             PK
customer_id    FK → customers
invoice_id     FK → invoices (nullable: una gestión puede ser a nivel cliente)
type           enum (call / email / note / payment_promise)
notes          text
promised_date  date (solo para promesas)
promise_status enum (pending / kept / broken) (solo para promesas)
created_at
```

Notas:
- `invoices.status` sí se persiste (es un hecho transaccional que cambia con pagos), pero se actualiza **dentro de la misma transacción** que crea el pago — nunca puede divergir.
- Los montos son `decimal`, nunca `float` (dinero).
- El diagrama visual se mantiene en dbdiagram.io (formato DBML versionado en `docs/data-model.dbml`) y se exporta a `docs/data-model.png` (requisito del challenge).

### 2.5 Motor de scoring (especificación de dominio)

Entrada: facturas + pagos + acciones de un cliente + fecha actual. Salida: `{ score: 0-100, segment, breakdown }` donde `breakdown` explica cada componente (la explicabilidad es requisito de producto, Decisión 3).

Componentes del score (pesos iniciales, ajustables en un solo lugar):

| Factor | Peso | Racional |
|---|---|---|
| Días de mora de la factura más vieja | 40% | El mejor predictor simple de incobrabilidad |
| Monto vencido relativo al MRR del cliente | 25% | Exposición: cuánto duele si no paga |
| Promesas de pago incumplidas | 20% | Señal fuerte de deterioro de la relación |
| Tendencia de pago (¿paga cada vez más tarde?) | 15% | Anticipación: detecta deterioro antes de la mora grave |

Segmentación (reglas evaluadas en orden):

1. Sin facturas vencidas → **Al día**
2. Mora +90 días sin ningún pago reciente → **Crítico / zombi**
3. Promesa incumplida, o tendencia de pago empeorando, o mora 30-90 creciente → **En riesgo**
4. Paga tarde pero de forma consistente (varianza baja en sus días-hasta-pago históricos) → **Mora administrativa**

Prioridad en la cola de trabajo: `score × monto vencido` (normalizado). Un zombi de USD 200 no debe desplazar a un cliente en riesgo de USD 15.000.

> Estos umbrales y pesos son supuestos de producto documentados; en la vida real se calibrarían en los 30 minutos con la analista de cobranza.

### 2.6 Estrategia de testing

Filosofía del challenge: *"queremos los tests correctos, no muchos"*. Traducción:

| Capa | Qué se testea | Cómo |
|---|---|---|
| **Dominio** (scoring, aging, segmentación, aplicación de pagos) | Exhaustivamente, con TDD: cada regla, cada borde (factura que vence hoy, pago parcial, promesa que vence hoy, cliente sin historial) | Tests unitarios puros (Jest), sin DB ni Nest. Rápidos (< 1s la suite) |
| **API** | Los 2 endpoints de escritura (acciones, pagos): happy path + validación de inputs + efectos en DB | Tests e2e (supertest) contra Postgres de test |
| **Frontend** | No se testea en el MVP | El costo/beneficio en 3 días no se justifica; la lógica vive en el backend |

**Por qué TDD en el dominio:** es la parte con más ramas lógicas y la que justifica el producto (si el score está mal, la herramienta prioriza mal y pierde la confianza del usuario). Escribir los tests primero fuerza a especificar las reglas antes de implementarlas — exactamente lo que haríamos con la analista de cobranza al lado.

---

## 3. Frontend (React)

### 3.1 Stack y justificación

| Pieza | Elección | Por qué |
|---|---|---|
| Build/dev server | **Vite** | El estándar actual para SPAs React (Create React App está deprecado). Cero configuración: `npm create vite@latest` y listo. No es un framework: una vez creado el proyecto, se escribe React estándar |
| Framework | **React SPA** (sin Next.js) | Herramienta interna detrás de una API: no necesita SSR ni SEO. Una SPA elimina toda esa complejidad |
| Estado del servidor | **TanStack Query** | Cache, revalidación y — clave para el challenge — estados `isLoading` / `isError` de primera clase en cada query: el requisito de "manejo visible de carga y error" sale idiomático en lugar de artesanal |
| Estado global de UI | **Ninguno (sin Redux)** | No hay estado compartido complejo que lo justifique; el estado del servidor lo maneja TanStack Query y el resto es estado local |
| Routing | **React Router** | 3 vistas: estándar de facto |
| Estilos | **Tailwind CSS** | Velocidad de desarrollo; el challenge pide usable, no Dribbble |

### 3.2 Vistas

```
apps/web/src/
├── api/               # Cliente HTTP (fetch tipado) + hooks de TanStack Query
├── pages/
│   ├── DashboardPage      # KPIs + aging chart
│   ├── WorkQueuePage      # Tabla priorizada: cliente, segmento, score, monto, acción sugerida
│   └── CustomerDetailPage # Facturas + desglose del score + historial + formularios de gestión
├── components/
│   ├── ui/                # Genéricos: Spinner, ErrorState, EmptyState, Badge de segmento
│   └── ...
└── main.tsx
```

Flujo de usuario que cierra el círculo (el flujo end-to-end del challenge):

```
Dashboard ("la mora está en 14%, concentrada en +90 días")
   → Cola de trabajo ("estos 12 clientes primero, este es zombi, este prometió y no pagó")
      → Detalle de cliente → registrar llamada / promesa / pago
         → la DB persiste → score y dashboard se recalculan → el ciclo vuelve a empezar
```

**Estados de carga y error (requisito):** toda vista renderiza tres estados explícitos — `isLoading` (skeleton/spinner), `isError` (mensaje + botón de reintento), datos vacíos (empty state con explicación). Nunca pantalla en blanco.

---

## 4. Infraestructura local y DX

- **`docker-compose.yml`**: PostgreSQL 16. La API y el front corren con Node local (mejor DX para desarrollo; dockerizar la app completa es opcional y trivial de agregar).
- **Levantado en 3 comandos** (objetivo < 10 min en máquina limpia, requisito):
  ```bash
  docker compose up -d          # Postgres
  cd apps/api && npm i && npm run setup   # migraciones + seed sintético
  npm run dev                   # API :3000 + web :5173 (concurrently desde la raíz)
  ```
- **Variables de entorno**: vía `.env` por app; `.env.example` versionado con todas las claves necesarias y valores de ejemplo funcionales para local (requisito). Nada hardcodeado.
- **Seed sintético**: genera ~40-60 clientes con facturas y pagos que reproducen los arquetipos del enunciado (grandes que pagan a 75 días, startups cortadas de un día para otro, zombis +90, clientes sanos), de modo que dashboard, segmentos y cola sean verificables a simple vista en la demo.

---

## 5. Convenciones de trabajo

- **Commits**: incrementales y descriptivos (formato `tipo: descripción`, ej. `feat: risk scoring engine with tests`), desde el primer día — el historial es parte de la evaluación.
- **TDD** en el dominio: test primero, implementación después; los specs conviven con el código (`*.spec.ts`).
- **AI_LOG.md**: se actualiza al final de cada sesión de trabajo con Claude Code (prompts relevantes + reflexión).

## 6. Escalabilidad: qué cambiaría con 100× la carga

Decisiones actuales que tienen camino de crecimiento conocido (ninguna requiere reescritura):

1. **Score on-read → materializado**: con decenas de miles de clientes, el cálculo pasaría a una vista materializada o snapshot nocturno. La lógica de dominio pura no cambia — solo quién la invoca y cuándo.
2. **Monolito modular → servicios**: los módulos NestJS ya tienen fronteras limpias (puertos/adaptadores); extraer `collections` a un servicio propio sería mover código, no reescribirlo.
3. **Paginación**: la cola y los listados nacen paginados desde la API aunque el front del MVP no lo necesite con 420 clientes.
