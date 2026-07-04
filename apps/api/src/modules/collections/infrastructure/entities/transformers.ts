import type { ValueTransformer } from 'typeorm';

/** numeric de Postgres llega como string por el driver: se convierte a number */
export const decimalTransformer: ValueTransformer = {
  to: (value?: number) => value,
  from: (value?: string | null) => (value == null ? value : parseFloat(value)),
};

/** columnas `date` llegan como 'YYYY-MM-DD': se normalizan a medianoche UTC */
export const dateOnlyTransformer: ValueTransformer = {
  to: (value?: Date) => value,
  from: (value?: string | Date | null) => {
    if (value == null) return value;
    if (value instanceof Date) return value;
    return new Date(`${value}T00:00:00Z`);
  },
};
