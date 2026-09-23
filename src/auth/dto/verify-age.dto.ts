import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, Matches } from 'class-validator';
export class VerifyAgeDto {
  @ApiProperty({
    format: 'date',
    example: '2000-01-01',
    description: 'Birth date in YYYY-MM-DD format. Minimum age is 12.',
  })
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'birthDate must be an ISO calendar date (YYYY-MM-DD)',
  })
  birthDate!: string;
}
