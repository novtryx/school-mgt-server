import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeeInvoice } from './entities/fee-invoice.entity';
import { Payment } from './entities/payment.entity';
import { DunningConfig } from './entities/dunning-config.entity';
import { FeesService } from './fees.service';
import { FeesController } from './fees.controller';
import { ReceiptService } from './receipt.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { SchoolsModule } from '../schools/schools.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([FeeInvoice, Payment, DunningConfig]),
    NotificationsModule,
    SchoolsModule,
  ],
  controllers: [FeesController],
  providers: [FeesService, ReceiptService],
  exports: [FeesService],
})
export class FeesModule {}