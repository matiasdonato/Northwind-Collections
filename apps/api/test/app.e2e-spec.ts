import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module';
import { DomainExceptionFilter } from './../src/modules/collections/infrastructure/domain-exception.filter';
import { CustomerEntity } from './../src/modules/collections/infrastructure/entities/customer.entity';
import { InvoiceEntity } from './../src/modules/collections/infrastructure/entities/invoice.entity';

/**
 * E2E de los endpoints de escritura contra Postgres real (requiere la DB
 * del docker-compose levantada). Crea sus propios datos y los elimina al final.
 */
describe('Flujo de cobranza (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let customerId: string;
  let invoiceId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new DomainExceptionFilter());
    await app.init();

    dataSource = app.get(DataSource);
    const customer = await dataSource.getRepository(CustomerEntity).save({
      name: 'E2E Testing SA',
      size: 'mid',
      mrr: 1000,
    });
    customerId = customer.id;
    const invoice = await dataSource.getRepository(InvoiceEntity).save({
      customerId,
      amount: 1000,
      issuedDate: new Date('2026-05-01'),
      dueDate: new Date('2026-06-01'),
      status: 'open',
    });
    invoiceId = invoice.id;
  });

  afterAll(async () => {
    // el borrado del cliente cascadea a facturas, pagos y gestiones
    await dataSource.getRepository(CustomerEntity).delete(customerId);
    await app.close();
  });

  it('GET /api/health responde ok', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('ok');
      });
  });

  it('rechaza una gestión con tipo inválido (validación de input)', () => {
    return request(app.getHttpServer())
      .post(`/api/customers/${customerId}/actions`)
      .send({ type: 'sabotage' })
      .expect(400);
  });

  it('registra una promesa de pago y aparece en el detalle del cliente', async () => {
    await request(app.getHttpServer())
      .post(`/api/customers/${customerId}/actions`)
      .send({ type: 'payment_promise', promisedDate: '2030-01-15', notes: 'e2e' })
      .expect(201);

    const detail = await request(app.getHttpServer())
      .get(`/api/customers/${customerId}`)
      .expect(200);
    expect(detail.body.actions).toHaveLength(1);
    expect(detail.body.actions[0].promiseStatus).toBe('pending');
    expect(detail.body.evaluation.hasActivePromise).toBe(true);
  });

  it('rechaza un pago que supera el saldo (regla de dominio → 400)', () => {
    return request(app.getHttpServer())
      .post(`/api/invoices/${invoiceId}/payments`)
      .send({ amount: 5000 })
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toBe('DomainError');
      });
  });

  it('un pago total persiste, marca la factura pagada y cumple la promesa', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/invoices/${invoiceId}/payments`)
      .send({ amount: 1000 })
      .expect(201);

    expect(response.body.invoiceStatus).toBe('paid');
    expect(response.body.keptPromiseIds).toHaveLength(1);

    // los cambios persisten: el detalle refleja factura pagada y cliente al día
    const detail = await request(app.getHttpServer())
      .get(`/api/customers/${customerId}`)
      .expect(200);
    expect(detail.body.invoices[0].status).toBe('paid');
    expect(detail.body.evaluation.segment).toBe('al_dia');
    expect(detail.body.actions[0].promiseStatus).toBe('kept');
  });
});
