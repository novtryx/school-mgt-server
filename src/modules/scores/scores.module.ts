import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Score } from './entities/score.entity';
import { Subject } from '../subjects/entities/subject.entity';
import { ScoresService } from './scores.service';
import { ScoresController } from './scores.controller';
import { GradingModule } from '../grading/grading.module';

@Module({
  imports: [TypeOrmModule.forFeature([Score, Subject]), GradingModule],
  controllers: [ScoresController],
  providers: [ScoresService],
  exports: [ScoresService],
})
export class ScoresModule {}