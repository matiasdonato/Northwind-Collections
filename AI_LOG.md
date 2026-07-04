# AI_LOG.md

Registro del uso de IA (Claude Code) durante el desarrollo: qué le pedí, dónde ayudó, dónde lo corregí y qué decidí no delegarle. Las entradas están en orden cronológico.

---

## Sesión 1 — Análisis del problema y definición del MVP

**Qué le pedí:** después de leer el enunciado, mi lectura fue que el pedido de la CEO ("saber dónde poner foco") es un problema de **priorización**, no de automatización — automatizar recordatorios sería repetir el error que el propio enunciado describe como ruido. Sobre esa idea planteé el producto: una herramienta que reemplace la planilla de los lunes con una vista de la cartera y una cola de clientes priorizada, con el stack que ya tenía decidido (NestJS + React + PostgreSQL) y aplicando TDD y clean architecture. Le pedí a Claude que desafiara esa lectura, la contrastara contra el enunciado y me ayudara a aterrizarla en un alcance concreto de 3 días.

**Dónde ayudó:** en concretar la idea en entregables: la descomposición en 3 flujos cerrados (dashboard → cola priorizada → gestión), la propuesta de segmentos mapeados a los arquetipos literales del enunciado (el grande que paga a 75 días, la startup sin caja, el zombi), y los factores y pesos iniciales del scoring. También en validar el descarte de ML: mi intuición era usar reglas explicables y el contraste lo confirmó con un argumento que sumé al documento — con 420 clientes no hay datos para entrenar nada, y finanzas necesita *entender* el score para confiar en él.

**Qué me reservé:** la tesis del producto y la decisión final de alcance (qué entra y qué queda afuera). Cada descarte quedó documentado como decisión de producto en DECISIONS.md, no como falta de tiempo.

**Reflexión:** usar la IA como sparring de una idea propia rinde mucho más que pedirle "hazme un MVP" — eso hubiera dado algo genérico. Llegar con una tesis formada y pedirle que la ataque y la concrete es donde está el apalancamiento real.

---

## Sesión 2 — Validación del dominio y del modelo de interacción

**Qué le pedí:** validar mi entendimiento del dominio de cobranza y de la mecánica del producto antes de diseñar: cómo se mide exactamente la morosidad, y la relación entre pantallas (lista → detalle, qué escritura afecta qué vista).

**Dónde ayudó:** al discutir la métrica surgió una ambigüedad real del enunciado: la mora puede medirse **por monto** o **por cantidad de clientes**, y no da lo mismo (un solo cliente de USD 15.000 mueve mucho una medida y casi nada la otra). Decidí medir por monto — es lo que le duele a la caja y lo que mira finanzas — y lo dejé como supuesto documentado, mostrando ambas donde es barato.

**Reflexión:** no delegar el entendimiento del dominio. Preguntar y discutir hasta poder explicar la mecánica completa sin la herramienta adelante es lo que me deja en condiciones de defender el diseño en una demo. Si no puedo explicar el producto sin la IA, el producto no es mío.

---

## Sesión 3 — Documentación de decisiones y arquitectura

**Qué le pedí:** con las decisiones ya tomadas (arquitectura en capas con dominio puro, TDD sobre la lógica de scoring, monorepo con Docker Compose), le pedí que las redactara en documentos formales: DECISIONS.md (cada decisión con fundamento, alternativas descartadas y trade-offs), ARCHITECTURE.md (plan técnico) y FUNCTIONAL.md (comportamiento de la aplicación para el usuario).

**Dónde lo corregí:** propuso **Prisma** como ORM y lo rechacé: elegí **TypeORM** por la integración oficial con NestJS (`@nestjs/typeorm`) y porque su patrón de repositorios encaja directo con la arquitectura de puertos y adaptadores que definí. Le pedí que re-fundamentara la elección y documentara el trade-off aceptado (migraciones más manuales, tipado de queries menos estricto). De esa discusión salió además un refinamiento arquitectónico que incorporé: las entidades TypeORM con decoradores viven en infraestructura, no en el dominio, para mantener el dominio 100% libre del ORM.

**Qué me reservé:** todas las decisiones de stack y arquitectura; a la IA le delegué la redacción y el formato, no el criterio. Cada documento lo revisé contra lo que decidimos antes de darlo por bueno.

**Reflexión:** corregir a la IA en una decisión de stack y obligarla a re-fundamentar la alternativa que yo elegí produjo mejor documentación que aceptar su primera propuesta. La herramienta argumenta bien cualquier opción razonable; elegir la opción sigue siendo trabajo mío.

---

## Sesión 4 — Backend completo con TDD

**Qué le pedí:** implementar el backend siguiendo el ciclo TDD estricto y la arquitectura definida: primero los specs del dominio en rojo (commiteados como tales), después la implementación en verde, y recién entonces subir por las capas (casos de uso → controllers/DTOs/entidades → migración → seed → e2e).

**Dónde ayudó:** la velocidad de ejecución del ciclo completo manteniendo la disciplina de capas: 102 tests unitarios sobre lógica pura sin tocar la base de datos, y el dominio quedó efectivamente sin ninguna dependencia de NestJS ni TypeORM (los casos de uso se inyectan por factory para no decorar clases de aplicación).

**Dónde el TDD atrapó errores de la propia IA:** dos casos concretos que documento porque son el argumento a favor del método. (1) En la tendencia de pago, la primera implementación ordenaba el historial por fecha de pago; el test de "improving" falló y expuso que debía ordenarse por ciclo de facturación (un pago puntual reciente puede ser anterior en el tiempo a un pago tardío del ciclo previo). (2) Un helper de fechas del test generaba fechas inválidas silenciosamente (NaN en el sort); el test de ordenamiento del historial lo detectó.

**Qué me reservé:** la calibración del scoring y la segmentación (pesos, umbrales, la regla de que la mora temprana ≤30 días sin señales de alarma es administrativa y no "en riesgo") — son decisiones de producto, no de código. También la decisión de smoke-testear todos los endpoints a mano contra la base real antes de dar por cerrado el backend, además de los tests automáticos.

**Reflexión:** commitear los specs en rojo antes que la implementación deja evidencia del proceso y obliga a especificar el comportamiento antes de escribirlo. La combinación specs-primero + revisión manual de la cola generada (verificar que los arquetipos del seed caen en el segmento esperado) me dio más confianza que cualquiera de las dos cosas por separado.

---

## Sesión 5 — Frontend

**Qué le pedí:** las tres pantallas de FUNCTIONAL.md consumiendo la API real: cliente HTTP tipado, hooks de TanStack Query, y las vistas con sus estados de carga/error/vacío.

**Dónde ayudó:** velocidad pura en la capa de presentación — tipos espejo de la API, formularios con feedback, y el patrón de invalidación ("toda escritura invalida todas las queries", justificado porque las tres vistas derivan de los mismos datos y el volumen es chico).

**Qué verifiqué yo:** el flujo completo en el navegador antes de commitear: registrar un pago desde la UI y ver la factura pasar a Pagada y el score bajar de 66 a 44 en vivo, sin errores de consola. La consigna pide "manejo visible de estados de carga y error"; eso no se verifica leyendo el código sino usándolo.

**Reflexión:** en el frontend delegué más que en el dominio (acá los errores se ven; en el motor de scoring un error silencioso prioriza mal durante semanas). El criterio de cuánto delegar según el costo de equivocarse en cada capa fue la decisión de uso de IA más importante del proyecto.
