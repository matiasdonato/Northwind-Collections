# Análisis funcional

Describe cómo se comporta la aplicación desde el punto de vista del usuario: qué ve, qué puede hacer y cómo reacciona el sistema. Complementa a [DECISIONS.md](DECISIONS.md) (por qué se construye esto) y [ARCHITECTURE.md](ARCHITECTURE.md) (cómo se implementa).

---

## 1. Usuario y contexto de uso

**Usuario:** el equipo de finanzas de Northwind (2 personas). Perfil no técnico; hoy gestionan la cobranza con una planilla de Google Sheets que actualizan a mano los lunes.

**Trabajo que la aplicación reemplaza:** decidir cada semana a qué clientes morosos contactar, cómo y en qué orden, y llevar registro de esas gestiones.

**Principio de comportamiento general:** la aplicación *sugiere y ordena*; la persona *decide y actúa*. El sistema nunca contacta a un cliente por sí solo.

---

## 2. Mapa de la aplicación

Tres pantallas sobre los mismos datos, en tres niveles de zoom:

```
1. Dashboard        →  toda la cartera, resumida       (diagnóstico)
2. Cola de trabajo  →  clientes en mora, priorizados   (foco)
3. Detalle cliente  →  un cliente, con lupa            (acción)
```

- **Navegación:** barra superior con acceso directo a Dashboard y Cola. Al Detalle se llega clickeando un cliente en la Cola (patrón lista → detalle), o desde un link directo.
- **Datos:** toda escritura hecha en el Detalle (pagos, promesas, gestiones) se refleja en las tres pantallas, porque todas leen de la misma base.

---

## 3. Pantalla 1 — Dashboard

**Pregunta que responde:** "¿Cómo está la cartera y dónde está el problema?"

**Qué muestra:**

- **KPIs** (tarjetas):
  - **% de mora**: monto vencido / monto total por cobrar.
  - **Monto total vencido** (USD) y cantidad de clientes en mora.
  - **DSO** (días promedio de cobro).
  - **Promesas de pago activas**: cuántas y por qué monto.
- **Aging report**: gráfico de barras del monto vencido por antigüedad — buckets 0-30 / 31-60 / 61-90 / +90 días. Muestra monto y cantidad de clientes por bucket.
- **Composición por segmento**: cuánto del monto en mora corresponde a cada segmento (ver §6). Es lo que responde "¿el 14% es grave?": no es lo mismo 14% de mora administrativa que 14% de clientes zombi.

**Qué puede hacer el usuario:**
- Mirar (la pantalla es de solo lectura).
- **Clickear un bucket del aging o un segmento** → navega a la Cola de trabajo filtrada por ese criterio (ej: "ver los +90 días").

---

## 4. Pantalla 2 — Cola de trabajo

**Pregunta que responde:** "¿A quién contacto hoy y en qué orden?"

**Qué muestra:** una tabla con **solo los clientes que tienen deuda vencida**, ordenada por prioridad descendente. La prioridad la calcula el sistema (riesgo × monto expuesto): el usuario no tiene que decidir el orden, ese es el valor central del producto.

Columnas por fila:

| Columna | Ejemplo |
|---|---|
| Cliente | Acme Corp |
| Segmento (badge de color) | 🔴 Crítico / zombi |
| Score de riesgo | 87 / 100 |
| Monto vencido | USD 12.400 |
| Días de mora (factura más vieja) | 96 |
| Última gestión | "Llamada — hace 12 días" |
| Acción sugerida | "Escalar: sin respuesta hace 90+ días" |

**Qué puede hacer el usuario:**
- **Clickear una fila** → abre el Detalle de ese cliente (ahí se registran las acciones; en la cola no se registra nada).
- **Filtrar** por segmento y por bucket de antigüedad.
- **Buscar** un cliente por nombre.

**Comportamientos clave:**
- La acción sugerida depende del segmento (§6): el sistema no sugiere lo mismo para un cliente grande de pago lento que para un zombi.
- Si un cliente tiene una **promesa de pago vigente** (aún no vencida), la fila lo indica y su prioridad baja: ya fue gestionado, corresponde esperar.
- Si la promesa **venció sin pago**, el sistema la marca incumplida automáticamente y el cliente **sube** de prioridad con la señal visible ("promesa incumplida").

---

## 5. Pantalla 3 — Detalle de cliente

**Pregunta que responde:** "¿Qué pasa con este cliente y qué hago ahora?"

**Qué muestra:**

- **Cabecera**: nombre, tamaño, MRR, segmento y score — con el **desglose del score explicado** ("87 puntos: 96 días de mora (40), debe 2.5× su MRR (25), 1 promesa incumplida (20), tendencia estable (2)"). El usuario siempre puede ver *por qué* el sistema priorizó así.
- **Facturas**: tabla con monto, fecha de emisión, vencimiento, días de atraso, estado (abierta / pago parcial / pagada) y saldo pendiente.
- **Historial de gestiones**: timeline con todas las acciones registradas (quién no aplica en MVP — no hay multiusuario —, qué, cuándo, notas), incluidas las promesas con su estado (pendiente / cumplida / incumplida).

**Qué puede hacer el usuario (las escrituras del sistema):**

1. **Registrar una gestión** — tipo (llamada / email / nota) + texto libre.
   *Efecto:* aparece en el historial; la cola muestra "última gestión" actualizada.
2. **Registrar una promesa de pago** — fecha comprometida + nota opcional.
   *Efecto:* la promesa queda "pendiente"; el cliente baja de prioridad en la cola mientras la promesa esté vigente. Si llega la fecha y no se registró el pago, pasa a "incumplida" y el cliente sube de prioridad.
3. **Registrar un pago** — sobre una factura específica: monto + fecha.
   *Efecto:* si cubre el saldo, la factura pasa a "pagada"; si es menor, a "pago parcial" con saldo actualizado. Si el cliente queda sin deuda vencida, desaparece de la cola y el dashboard actualiza sus números. Si había una promesa pendiente y el pago llega a tiempo, se marca "cumplida".

**Validaciones visibles para el usuario:**
- Montos: positivos, y un pago no puede superar el saldo pendiente de la factura.
- Fechas de promesa: no pueden ser pasadas.
- Errores de formulario se muestran junto al campo, sin perder lo tipeado.

---

## 6. Reglas de negocio visibles: segmentos y acciones sugeridas

Cada cliente pertenece a un segmento, recalculado en todo momento a partir de sus datos:

| Segmento | Cuándo | Acción sugerida por el sistema |
|---|---|---|
| 🟢 **Al día** | Sin facturas vencidas | No aparece en la cola |
| 🔵 **Mora administrativa** | Paga tarde pero de forma consistente y predecible | "Recordatorio suave / esperar su ciclo de pago" |
| 🟡 **En riesgo** | Mora creciente, comportamiento que empeora o promesa incumplida | "Llamar: entender la situación" |
| 🔴 **Crítico / zombi** | +90 días vencido, sin pagos ni respuesta | "Escalar: evaluar suspensión o plan de pago" |

El segmento y el score se muestran siempre juntos y siempre con explicación disponible: el sistema no pide confianza ciega.

---

## 7. Comportamiento transversal (toda la aplicación)

- **Carga:** mientras se piden datos, se muestra un indicador (skeleton/spinner). Nunca pantalla en blanco.
- **Error:** si una petición falla, se muestra un mensaje claro con botón "Reintentar". Los datos ya cargados no se pierden.
- **Vacío:** si no hay datos (ej: ningún cliente en mora), se muestra un estado vacío con explicación ("🎉 No hay clientes en mora"), no una tabla en blanco.
- **Persistencia:** toda acción registrada sobrevive reinicios de la aplicación (persistida en PostgreSQL en el momento de confirmarse).
- **Feedback de escritura:** al registrar una acción/pago, el formulario confirma visualmente el éxito y la pantalla refleja el cambio sin recargar manualmente.
- **Moneda:** todos los montos en USD (supuesto documentado en DECISIONS.md).

---

## 8. Recorrido típico (el flujo end-to-end de la demo)

1. La analista entra un lunes → **Dashboard**: mora 14%, USD 53.000 vencidos, el gráfico muestra que la mitad está en +90 días.
2. Clickea el bucket +90 → **Cola** filtrada: 8 clientes, el primero es "Acme Corp", zombi, score 87, USD 12.400.
3. Clickea Acme → **Detalle**: 3 facturas vencidas, una promesa incumplida hace 2 semanas, última llamada hace 12 días.
4. Lo llama. Acme se compromete a pagar el viernes → registra una **promesa de pago** para el viernes.
5. Vuelve a la cola: Acme bajó de prioridad ("promesa vigente"). Sigue con el segundo cliente.
6. El viernes Acme transfiere USD 12.400 → la analista registra el **pago** → las facturas pasan a "pagadas", la promesa a "cumplida", Acme sale de la cola y el lunes siguiente el dashboard muestra la mora en 10.7%.

Ese recorrido completo — ver, priorizar, actuar, registrar, y que los números se muevan — es el producto.
