import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GradingScheme } from './entities/grading-scheme.entity';
import { GradingService } from './grading.service';
import { GradingController } from './grading.controller';

@Module({
  imports: [TypeOrmModule.forFeature([GradingScheme])],
  controllers: [GradingController],
  providers: [GradingService],
  exports: [GradingService],
})
export class GradingModule {}