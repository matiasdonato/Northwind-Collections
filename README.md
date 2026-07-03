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
- **Infra local:** Docker Compose

## El producto en una frase

El sistema **sugiere y ordena** (a quién contactar, en qué orden, por qué); la persona **decide y actúa**. Tres pantallas: dashboard de salud de cartera → cola de trabajo priorizada → detalle del cliente con registro de gestiones, promesas de pago y pagos.
