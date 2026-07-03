# DECISIONS.md

Registro de las decisiones más importantes del proyecto: qué se decidió, por qué, qué alternativas se descartaron y qué trade-off se aceptó. El objetivo es que cualquier persona del equipo pueda entender no solo *qué* se construyó, sino *el razonamiento* detrás.

> Contexto: el requerimiento original es deliberadamente ambiguo ("necesitamos una herramienta para gestionar la cobranza y anticiparnos a los problemas... algo que nos ayude a saber dónde poner foco"). Estas decisiones son la traducción de ese requerimiento a algo concreto y entregable en 3 días.

---

## Decisión 1 — El producto es una herramienta de priorización, no de automatización

**Decisión:** el MVP no envía recordatorios automáticos ni automatiza la cobranza. Le da al equipo de finanzas (2 personas) visibilidad de la cartera y una cola de trabajo priorizada que reemplaza la planilla que hoy arman a mano los lunes.

**Por qué:**
- El pedido literal de la CEO es "saber dónde poner foco". Eso es un problema de priorización, no de automatización.
- El enunciado describe explícitamente que los recordatorios automáticos actuales **son el problema** ("son ruido: los clientes grandes los ignoran, los chicos se ofenden"). Construir más automatización sería repetir el error existente.
- Los tres dolores listados (mora sin explicación, morosos heterogéneos, recordatorios ruidosos) se resuelven con lo mismo: **segmentar y priorizar antes de actuar**. La acción (llamar, escribir, escalar) la decide y ejecuta una persona con contexto; la herramienta le dice a quién, en qué orden y por qué.

**Alternativa descartada:** motor de envío de emails con plantillas y cadencias. Descartada porque automatizar sobre una segmentación que todavía no existe amplifica el ruido, y porque el envío real de emails es integración (SMTP, deliverability, unsubscribes), no producto.

**Trade-off aceptado:** el usuario tiene que ejecutar las acciones a mano. Con 420 clientes y ~30-60 en mora, es un volumen perfectamente manejable para 2 personas si está bien priorizado.

---

## Decisión 2 — Alcance del MVP: 3 flujos sólidos

**Decisión:** el MVP tiene exactamente tres flujos, elegidos para cubrir el ciclo completo de trabajo del equipo de cobranza:

1. **Dashboard de salud de cartera** — responde "¿por qué subió la mora y cómo está compuesta?": KPIs (% mora por monto, monto vencido total, DSO, promesas de pago activas) y aging report por buckets (0-30 / 31-60 / 61-90 / +90 días).
2. **Cola de trabajo priorizada** — responde "¿dónde pongo foco hoy?": lista de clientes en mora ordenada por riesgo × monto expuesto, con segmento y acción sugerida.
3. **Gestión de cobranza** — el flujo transaccional end-to-end: registrar acciones (llamada, email, nota), promesas de pago con fecha, y pagos (totales o parciales) que actualizan el estado de las facturas. Cada registro recalcula el score, la cola y el dashboard.

**Por qué:** los tres flujos forman un ciclo cerrado (ver → priorizar → actuar → volver a ver) que replica el trabajo real del lunes del equipo de finanzas, pero con criterio explícito en lugar de intuición sobre una planilla. Preferimos tres flujos completos y usables a cinco a medias.

**Fuera de alcance (deliberadamente, no por falta de tiempo):** ver Decisión 7.

---

## Decisión 3 — Scoring de riesgo por reglas explicables, no machine learning

**Decisión:** el riesgo de cada cliente se calcula con un motor de reglas determinístico y transparente (días de mora, monto expuesto, promesas incumplidas, comportamiento histórico de pago), que produce un score 0-100 y un segmento con nombre de negocio.

**Por qué:**
- **No hay datos para ML.** Con 420 clientes y sin historial etiquetado de "incobrables", cualquier modelo estadístico sería ruido con apariencia de ciencia. Sobreajustaría o daría resultados indefendibles.
- **La confianza es requisito.** Las 2 personas de finanzas tienen que poder mirar un score y entender por qué: "está 80 días vencido, incumplió una promesa de pago y debe 3× su ticket mensual" es accionable; "el modelo dice 0.87" no lo es. Si no confían en la priorización, vuelven a la planilla y la herramienta muere.
- **Las reglas son el camino correcto *hacia* ML:** la propia herramienta, al registrar acciones, promesas y pagos, empieza a acumular el dataset histórico que en 6-12 meses haría viable un modelo predictivo real. Las reglas no son un "plan B", son la fase 1 correcta.

**Alternativa descartada:** score predictivo con modelo estadístico. Descartada por falta de datos y de explicabilidad, no por complejidad técnica.

---

## Decisión 4 — Los segmentos salen de los arquetipos reales del negocio

**Decisión:** los clientes se clasifican en 4 segmentos que mapean directamente a los perfiles descritos en el problema:

| Segmento | Perfil | Acción sugerida |
|---|---|---|
| **Al día** | Sin deuda vencida | No molestar |
| **Mora administrativa** | Cliente que paga tarde de forma consistente y predecible (ej: el grande que paga a 75 días por proceso interno) | Recordatorio suave / esperar su ciclo |
| **En riesgo** | Mora creciente, comportamiento que empeora, o promesa de pago incumplida | Llamar, entender la situación |
| **Crítico / zombi** | +90 días vencido, sin pagos ni respuesta, consumiendo el servicio | Escalar: decisión comercial (suspensión, plan de pago, legal) |

**Por qué:** el enunciado lo dice textualmente: "no todos los morosos son iguales". Tratar igual al cliente grande de proceso lento y al zombi de 90 días es exactamente lo que hace fallar los recordatorios actuales. La segmentación es lo que convierte "14% de mora" (un número opaco) en información accionable: cuánto de ese 14% es mora técnica cobrable y cuánto es riesgo real de pérdida.

---

## Decisión 5 — Score y aging se calculan al leer, no se almacenan

**Decisión:** el score, el segmento y los buckets de aging **no se persisten** en la base de datos; se calculan en el momento de la consulta a partir de facturas, pagos y acciones.

**Por qué:**
- **Consistencia garantizada:** el score depende del paso del tiempo (los días de mora cambian cada día aunque nadie toque nada). Si se almacenara, necesitaríamos jobs nocturnos de recálculo, con toda su superficie de fallas (jobs caídos, datos desactualizados, condiciones de carrera).
- **El costo es trivial a esta escala:** calcular scoring sobre 420 clientes con sus facturas es submilisegundo por cliente. Optimizar esto sería resolver un problema que no existe.
- **Simplifica el dominio:** una sola fuente de verdad (los hechos: facturas, pagos, acciones) y todo lo demás es derivado y puro, lo que además hace la lógica trivialmente testeable.

**Trade-off aceptado:** si la cartera creciera 100×, habría que materializar el cálculo (vista materializada o snapshot diario). Es una optimización conocida, con camino de migración claro, que sería prematura hoy.

---

## Decisión 6 — Stack y arquitectura: NestJS + PostgreSQL + TypeORM, React + Vite, monorepo con Docker Compose

**Decisión:** ver el detalle completo en [ARCHITECTURE.md](ARCHITECTURE.md). Lo esencial:

- **NestJS** (opción válida del enunciado) con una separación pragmática de clean architecture: la lógica de negocio (scoring, aging, segmentación) vive en una capa de dominio pura, sin dependencias de framework ni base de datos, desarrollada con TDD.
- **PostgreSQL** (requisito) con **TypeORM** como ORM: es el ORM con integración oficial en NestJS (`@nestjs/typeorm`), con entidades tipadas y migraciones versionadas. Las entidades viven en la capa de infraestructura, manteniendo el dominio libre de dependencias.
- **React + Vite** como SPA. Sin Next.js: es una herramienta interna detrás de login, no necesita SSR ni SEO; una SPA simple reduce conceptos y superficie de error. **TanStack Query** para el estado del servidor, que resuelve de forma idiomática los estados de carga y error visibles (requisito explícito).
- **Monorepo** (`apps/api` + `apps/web`) con **Docker Compose** para Postgres y seed automático de datos sintéticos: una persona que clona el repo levanta todo con un comando en menos de 10 minutos.

**Por qué (resumen):** cada pieza es la opción más simple que cumple los requisitos con calidad; ninguna es exótica; todas tienen camino de crecimiento conocido. La justificación pieza por pieza está en ARCHITECTURE.md.

---

## Decisión 7 — Qué queda explícitamente fuera del MVP (y por qué)

**Decisión:** los siguientes puntos se excluyen del alcance de 3 días de forma deliberada:

| Excluido | Por qué | Cuándo entraría |
|---|---|---|
| Envío real de emails/recordatorios | Es lo que hoy genera ruido; primero segmentar, después automatizar. Además es integración, no producto. | Semana 1-2 post-MVP, con plantillas por segmento |
| Predicción con ML | Sin datos históricos suficientes; las reglas explicables son mejores hoy (Decisión 3) | Cuando la herramienta acumule 6-12 meses de historial |
| Autenticación multiusuario y roles | El equipo son 2 personas; auth agrega superficie sin cambiar la propuesta de valor del MVP | Antes de producción real |
| Integración con el sistema de facturación real | No hay acceso a datos reales (por privacidad, según enunciado); seed sintético realista lo reemplaza | Primer paso post-MVP: es lo que vuelve la herramienta operativa |
| Multi-moneda | El enunciado factura en USD; se asume moneda única | Si el negocio lo requiere |

**Por qué documentarlo:** un alcance defendido vale más que features a medias. Cada exclusión tiene una razón de producto, no es deuda técnica silenciosa.

---

## Supuestos (ante ambigüedad, documentados)

1. **La mora se mide por monto** (monto vencido / monto por cobrar), no por cantidad de clientes: es la medida que le duele a la caja y la que mira un equipo de finanzas. El dashboard muestra también el conteo de clientes porque es barato y útil.
2. **Moneda única USD**, sin conversión.
3. **La herramienta reemplaza el flujo del lunes** (la planilla), no convive con ella: es la fuente de verdad de la gestión de cobranza.
4. **Una factura vencida está en mora desde el día siguiente a su vencimiento**, sin período de gracia (el período de gracia es configurable a futuro si finanzas lo pide).
5. **Los datos sintéticos** se generan representando los tres arquetipos del enunciado (grande lento, startup que se queda sin caja, zombi) para que la segmentación sea verificable a ojo en la demo.

---

## Cómo se extendería con 2 semanas más

En orden de prioridad:

1. **Integración con el sistema de facturación real** (import/sync): convierte el MVP en herramienta operativa.
2. **Recordatorios segmentados semi-automáticos:** plantillas por segmento, con aprobación humana antes del envío (la persona revisa la tanda del día y confirma). Automatización *sobre* la segmentación, no en lugar de ella.
3. **Autenticación y trazabilidad por usuario:** quién registró qué gestión.
4. **Historial y tendencias:** evolución de la mora por segmento mes a mes — responde con datos el "nadie sabe por qué subió".
5. **Recién entonces**, evaluar scoring estadístico con el histórico acumulado por la propia herramienta.
