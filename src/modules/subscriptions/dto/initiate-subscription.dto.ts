import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class InitiateSubscriptionDto {
  @ApiProperty({ description: 'Plan UUID to subscribe to' })
  @IsUUID()
  planId!: string;

  @ApiProperty({ description: 'School UUID' })
  @IsUUID()
  schoolId!: string;
}