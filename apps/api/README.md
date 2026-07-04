# API — Northwind Collections

Backend en NestJS + TypeORM + PostgreSQL. Para la visión general del proyecto y las instrucciones completas de instalación, ver el [README de la raíz](../../README.md).

## Requisitos

- Node.js 20+
- PostgreSQL corriendo (ver `docker-compose.yml` en la raíz)
- Archivo `.env` (copiar de `.env.example`)

## Scripts

```bash
npm run start:dev          # Levanta la API en modo watch (puerto 3000)
npm run build              # Compila a dist/
npm test                   # Tests unitarios (dominio y controllers)
npm run test:e2e           # Tests end-to-end (requiere la DB levantada)

npm run migration:run      # Aplica las migraciones pendientes
npm run migration:generate # Genera una migración a partir de cambios en entidades
npm run migration:revert   # Revierte la última migración
npm run seed               # Pobla la DB con datos sintéticos
```

## Endpoints

La documentación interactiva (Swagger) está disponible en `http://localhost:3000/api/docs` con la API levantada.

## Estructura

Cada módulo sigue una separación en capas (ver [ARCHITECTURE.md](../../ARCHITECTURE.md) §2):

- `domain/` — lógica de negocio pura, sin framework ni ORM. Aquí viven scoring, segmentación y aging, con sus tests unitarios.
- `application/` — casos de uso y puertos (interfaces de repositorio).
- `infrastructure/` — controllers, DTOs, entidades y repositorios TypeORM.
