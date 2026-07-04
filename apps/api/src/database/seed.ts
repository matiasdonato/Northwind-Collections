/**
 * Seed de datos sintéticos.
 * Genera una cartera que reproduce los arquetipos del negocio (FUNCTIONAL.md §6):
 * clientes sanos, enterprises de pago lento pero consistente, startups en
 * deterioro (algunas con promesas incumplidas) y zombis de +90 días.
 *
 * Es determinístico (sin aleatoriedad): la demo y las capturas son reproducibles.
 * Las fechas se generan relativas a HOY para que los días de mora sean estables.
 */
import 'dotenv/config';
import { CollectionActionEntity } from '../modules/collections/infrastructure/entities/collection-action.entity';
import { CustomerEntity } from '../modules/collections/infrastructure/entities/customer.entity';
import { InvoiceEntity } from '../modules/collections/infrastructure/entities/invoice.entity';
import { PaymentEntity } from '../modules/collections/infrastructure/entities/payment.entity';
import dataSource from './data-source';

const TODAY = new Date();

/** Fecha a `days` días de hoy (negativo = pasado), normalizada a medianoche UTC */
const daysFromToday = (days: number): Date => {
  const base = Date.UTC(TODAY.getUTCFullYear(), TODAY.getUTCMonth(), TODAY.getUTCDate());
  return new Date(base + days * 86_400_000);
};

interface SeedInvoice {
  amount: number;
  issuedDaysAgo: number;
  dueDaysAgo: number; // negativo = vence en el futuro
  /** Si está presente, la factura se pagó ese día (días atrás) */
  paidDaysAgo?: number;
  /** Pago parcial pendiente: monto ya pagado */
  partialPaid?: number;
}

interface SeedAction {
  type: 'call' | 'email' | 'note' | 'payment_promise';
  daysAgo: number;
  notes?: string;
  /** Para promesas: fecha comprometida en días desde hoy (negativo = ya venció) */
  promisedInDays?: number;
}

interface SeedCustomer {
  name: string;
  size: 'small' | 'mid' | 'enterprise';
  mrr: number;
  invoices: SeedInvoice[];
  actions?: SeedAction[];
}

/** Historial de un pagador puntual: n facturas mensuales pagadas en término */
const punctualHistory = (mrr: number, months: number): SeedInvoice[] =>
  Array.from({ length: months }, (_, i) => ({
    amount: mrr,
    issuedDaysAgo: 40 + i * 30,
    dueDaysAgo: 10 + i * 30,
    paidDaysAgo: 12 + i * 30, // paga ~2 días antes del vencimiento
  }));

/** Historial del enterprise lento: paga consistentemente a ~70-75 días del vencimiento */
const slowConsistentHistory = (mrr: number, lateness: number[]): SeedInvoice[] =>
  lateness.map((late, i) => ({
    amount: mrr,
    issuedDaysAgo: 210 + i * 30,
    dueDaysAgo: 180 + i * 30,
    paidDaysAgo: 180 + i * 30 - late,
  }));

const CUSTOMERS: SeedCustomer[] = [
  // ─── Sanos: pagan en término, sin mora ────────────────────────────────
  { name: 'Aurora Analytics', size: 'mid', mrr: 1800, invoices: [...punctualHistory(1800, 4), { amount: 1800, issuedDaysAgo: 10, dueDaysAgo: -20 }] },
  { name: 'Bosque Digital', size: 'small', mrr: 450, invoices: [...punctualHistory(450, 4), { amount: 450, issuedDaysAgo: 5, dueDaysAgo: -25 }] },
  { name: 'Cumbre Logística', size: 'mid', mrr: 2400, invoices: [...punctualHistory(2400, 3), { amount: 2400, issuedDaysAgo: 8, dueDaysAgo: -22 }] },
  { name: 'Delta Seguros', size: 'enterprise', mrr: 9500, invoices: [...punctualHistory(9500, 4), { amount: 9500, issuedDaysAgo: 12, dueDaysAgo: -18 }] },
  { name: 'Estación Retail', size: 'small', mrr: 700, invoices: [...punctualHistory(700, 3), { amount: 700, issuedDaysAgo: 6, dueDaysAgo: -24 }] },
  { name: 'Faro Educación', size: 'mid', mrr: 1200, invoices: [...punctualHistory(1200, 4), { amount: 1200, issuedDaysAgo: 9, dueDaysAgo: -21 }] },

  // ─── Mora administrativa: enterprises de proceso lento pero predecible ─
  {
    name: 'Gran Minera Andina',
    size: 'enterprise',
    mrr: 15000,
    invoices: [
      ...slowConsistentHistory(15000, [70, 75, 72]),
      { amount: 15000, issuedDaysAgo: 105, dueDaysAgo: 74 }, // su ciclo normal: ~74 días
    ],
    actions: [{ type: 'email', daysAgo: 20, notes: 'Recordatorio mensual; confirman que está en su circuito de aprobaciones' }],
  },
  {
    name: 'Holding Pacífico',
    size: 'enterprise',
    mrr: 12000,
    invoices: [
      ...slowConsistentHistory(12000, [65, 70, 68]),
      { amount: 12000, issuedDaysAgo: 95, dueDaysAgo: 66 },
    ],
  },
  {
    name: 'Ígnea Construcciones',
    size: 'mid',
    mrr: 3200,
    invoices: [
      // mora temprana: primera factura vencida hace pocos días, sin señales de alarma
      ...punctualHistory(3200, 3),
      { amount: 3200, issuedDaysAgo: 40, dueDaysAgo: 8 },
    ],
  },

  // ─── En riesgo: deterioro, promesas rotas, startups sin caja ──────────
  {
    name: 'Júpiter Fintech',
    size: 'small',
    mrr: 950,
    invoices: [
      // tendencia que empeora: 5, 8, 22, 35 días tarde
      { amount: 950, issuedDaysAgo: 160, dueDaysAgo: 130, paidDaysAgo: 125 },
      { amount: 950, issuedDaysAgo: 130, dueDaysAgo: 100, paidDaysAgo: 92 },
      { amount: 950, issuedDaysAgo: 100, dueDaysAgo: 70, paidDaysAgo: 48 },
      { amount: 950, issuedDaysAgo: 70, dueDaysAgo: 40, paidDaysAgo: 5 },
      { amount: 950, issuedDaysAgo: 40, dueDaysAgo: 10 }, // impaga
    ],
    actions: [{ type: 'call', daysAgo: 3, notes: 'Dicen estar cerrando una ronda; pidieron unos días más' }],
  },
  {
    name: 'Kraken Delivery',
    size: 'small',
    mrr: 1100,
    invoices: [
      { amount: 1100, issuedDaysAgo: 90, dueDaysAgo: 60 },
      { amount: 1100, issuedDaysAgo: 60, dueDaysAgo: 30 },
    ],
    actions: [
      { type: 'call', daysAgo: 25, notes: 'Se comprometieron a regularizar' },
      { type: 'payment_promise', daysAgo: 20, promisedInDays: -10, notes: 'Prometieron saldar la factura más vieja' }, // incumplida
    ],
  },
  {
    name: 'Lumen Media',
    size: 'mid',
    mrr: 2100,
    invoices: [
      { amount: 2100, issuedDaysAgo: 75, dueDaysAgo: 45, partialPaid: 800 },
      { amount: 2100, issuedDaysAgo: 45, dueDaysAgo: 15 },
    ],
    actions: [{ type: 'email', daysAgo: 10, notes: 'Enviado detalle de saldo pendiente' }],
  },
  {
    name: 'Metrópolis Salud',
    size: 'enterprise',
    mrr: 8000,
    invoices: [
      { amount: 8000, issuedDaysAgo: 80, dueDaysAgo: 50 },
      { amount: 8000, issuedDaysAgo: 50, dueDaysAgo: 20 },
    ],
    actions: [
      // promesa vigente: debe amortiguar su prioridad en la cola
      { type: 'payment_promise', daysAgo: 2, promisedInDays: 5, notes: 'Tesorería confirmó transferencia para la próxima semana' },
    ],
  },
  {
    name: 'Nimbus Software',
    size: 'small',
    mrr: 600,
    invoices: [
      { amount: 600, issuedDaysAgo: 95, dueDaysAgo: 65 },
      { amount: 600, issuedDaysAgo: 65, dueDaysAgo: 35 },
    ],
    actions: [
      { type: 'payment_promise', daysAgo: 30, promisedInDays: -22, notes: 'Primera promesa' }, // rota
      { type: 'payment_promise', daysAgo: 15, promisedInDays: -7, notes: 'Segunda promesa' }, // rota
      { type: 'note', daysAgo: 5, notes: 'Evaluar si pasa a gestión crítica' },
    ],
  },

  // ─── Críticos / zombis: +90 días, sin señales de vida ─────────────────
  {
    name: 'Ómega Turismo',
    size: 'small',
    mrr: 800,
    invoices: [
      { amount: 800, issuedDaysAgo: 155, dueDaysAgo: 125 },
      { amount: 800, issuedDaysAgo: 125, dueDaysAgo: 95 },
    ],
    actions: [
      { type: 'email', daysAgo: 60, notes: 'Sin respuesta' },
      { type: 'call', daysAgo: 40, notes: 'No atienden' },
    ],
  },
  {
    name: 'Polar Gimnasios',
    size: 'mid',
    mrr: 1500,
    invoices: [
      { amount: 1500, issuedDaysAgo: 170, dueDaysAgo: 140 },
      { amount: 1500, issuedDaysAgo: 140, dueDaysAgo: 110 },
      { amount: 1500, issuedDaysAgo: 110, dueDaysAgo: 80 },
    ],
    actions: [{ type: 'call', daysAgo: 50, notes: 'Atendió administración, quedaron en llamar. Nunca llamaron' }],
  },
  {
    name: 'Quantum Imprenta',
    size: 'small',
    mrr: 350,
    invoices: [{ amount: 350, issuedDaysAgo: 130, dueDaysAgo: 100 }],
  },
];

async function seed() {
  await dataSource.initialize();

  try {
    // Limpieza total: el seed es idempotente
    await dataSource.query(
      'TRUNCATE TABLE "collection_actions", "payments", "invoices", "customers" CASCADE',
    );

    const customerRepo = dataSource.getRepository(CustomerEntity);
    const invoiceRepo = dataSource.getRepository(InvoiceEntity);
    const paymentRepo = dataSource.getRepository(PaymentEntity);
    const actionRepo = dataSource.getRepository(CollectionActionEntity);

    let invoiceCount = 0;
    let paymentCount = 0;
    let actionCount = 0;

    for (const seedCustomer of CUSTOMERS) {
      const customer = await customerRepo.save(
        customerRepo.create({
          name: seedCustomer.name,
          size: seedCustomer.size,
          mrr: seedCustomer.mrr,
        }),
      );

      for (const seedInvoice of seedCustomer.invoices) {
        const fullyPaid = seedInvoice.paidDaysAgo !== undefined;
        const invoice = await invoiceRepo.save(
          invoiceRepo.create({
            customerId: customer.id,
            amount: seedInvoice.amount,
            issuedDate: daysFromToday(-seedInvoice.issuedDaysAgo),
            dueDate: daysFromToday(-seedInvoice.dueDaysAgo),
            status: fullyPaid ? 'paid' : seedInvoice.partialPaid ? 'partially_paid' : 'open',
          }),
        );
        invoiceCount += 1;

        if (fullyPaid) {
          await paymentRepo.save(
            paymentRepo.create({
              invoiceId: invoice.id,
              amount: seedInvoice.amount,
              paidAt: daysFromToday(-seedInvoice.paidDaysAgo!),
            }),
          );
          paymentCount += 1;
        } else if (seedInvoice.partialPaid) {
          await paymentRepo.save(
            paymentRepo.create({
              invoiceId: invoice.id,
              amount: seedInvoice.partialPaid,
              paidAt: daysFromToday(-Math.max(seedInvoice.dueDaysAgo - 5, 1)),
            }),
          );
          paymentCount += 1;
        }
      }

      for (const seedAction of seedCustomer.actions ?? []) {
        const isPromise = seedAction.type === 'payment_promise';
        await actionRepo.save(
          actionRepo.create({
            customerId: customer.id,
            type: seedAction.type,
            notes: seedAction.notes ?? null,
            promisedDate: isPromise ? daysFromToday(seedAction.promisedInDays!) : null,
            promiseStatus: isPromise ? 'pending' : null,
            createdAt: daysFromToday(-seedAction.daysAgo),
          }),
        );
        actionCount += 1;
      }
    }

    console.log(
      `Seed OK: ${CUSTOMERS.length} clientes, ${invoiceCount} facturas, ${paymentCount} pagos, ${actionCount} gestiones.`,
    );
  } finally {
    await dataSource.destroy();
  }
}

seed().catch((error) => {
  console.error('Seed falló:', error);
  process.exit(1);
});
