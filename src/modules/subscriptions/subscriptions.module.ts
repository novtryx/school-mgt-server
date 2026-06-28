import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Plan } from './entities/plan.entity';
import { Subscription } from './entities/subscription.entity';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { PaystackService } from './paystack.service';
import { SchoolsModule } from '../schools/schools.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Plan, Subscription]),
    ConfigModule,
    SchoolsModule,
  ],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, PaystackService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}