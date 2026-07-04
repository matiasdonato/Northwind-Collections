import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GetCustomerDetailUseCase } from './application/get-customer-detail.usecase';
import { GetDashboardUseCase } from './application/get-dashboard.usecase';
import { GetWorkQueueUseCase } from './application/get-work-queue.usecase';
import type { CollectionsRepository } from './application/ports/collections-repository.port';
import { COLLECTIONS_REPOSITORY } from './application/ports/collections-repository.port';
import { RegisterActionUseCase } from './application/register-action.usecase';
import { RegisterPaymentUseCase } from './application/register-payment.usecase';
import { CustomersController } from './infrastructure/customers.controller';
import { DashboardController } from './infrastructure/dashboard.controller';
import { CollectionActionEntity } from './infrastructure/entities/collection-action.entity';
import { CustomerEntity } from './infrastructure/entities/customer.entity';
import { InvoiceEntity } from './infrastructure/entities/invoice.entity';
import { PaymentEntity } from './infrastructure/entities/payment.entity';
import { InvoicesController } from './infrastructure/invoices.controller';
import { TypeOrmCollectionsRepository } from './infrastructure/typeorm-collections.repository';
import { WorkQueueController } from './infrastructure/work-queue.controller';

/**
 * Los casos de uso son clases puras (sin decoradores de Nest): se instancian
 * vía factory inyectando el puerto. La regla de dependencias queda intacta:
 * application no conoce a NestJS ni a TypeORM.
 */
const useCaseFactory = <T>(UseCase: new (repo: CollectionsRepository) => T) => ({
  provide: UseCase,
  useFactory: (repository: CollectionsRepository) => new UseCase(repository),
  inject: [COLLECTIONS_REPOSITORY],
});

@Module({
  imports: [
    TypeOrmModule.forFeature([CustomerEntity, InvoiceEntity, PaymentEntity, CollectionActionEntity]),
  ],
  controllers: [DashboardController, WorkQueueController, CustomersController, InvoicesController],
  providers: [
    { provide: COLLECTIONS_REPOSITORY, useClass: TypeOrmCollectionsRepository },
    useCaseFactory(GetDashboardUseCase),
    useCaseFactory(GetWorkQueueUseCase),
    useCaseFactory(GetCustomerDetailUseCase),
    useCaseFactory(RegisterActionUseCase),
    useCaseFactory(RegisterPaymentUseCase),
  ],
})
export class CollectionsModule {}
