# Web — Northwind Collections

Frontend en React + Vite. Consume la API del backend (`apps/api`); para la visión general del proyecto y las instrucciones completas de instalación, ver el [README de la raíz](../../README.md).

## Requisitos

- Node.js 20+
- La API levantada en `http://localhost:3000` (ver README de la raíz)
- Archivo `.env` (copiar de `.env.example`)

## Scripts

```bash
npm run dev       # Levanta el frontend en http://localhost:5173
npm run build     # Compila a dist/
npm run preview   # Sirve el build de producción localmente
```

## Stack

- **TanStack Query** para el estado del servidor (cache, revalidación y estados de carga/error).
- **React Router** para la navegación entre las tres vistas (dashboard, cola de trabajo, detalle de cliente).
- **Tailwind CSS** para estilos.

El comportamiento esperado de cada pantalla está especificado en [FUNCTIONAL.md](../../FUNCTIONAL.md).
