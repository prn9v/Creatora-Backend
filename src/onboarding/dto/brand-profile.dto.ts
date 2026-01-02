import { ApiPropertyOptional } from '@nestjs/swagger';
import { Tone } from '@prisma/client';
import { IsOptional, IsString } from 'class-validator';

export class BrandProfileDto {
  @ApiPropertyOptional({
    description: 'The overall brand tone used in communication',
    example: 'PROFESSIONAL',
    enum: ['PROFESSIONAL', 'CASUAL', 'INSPIRING', 'EDUCATIONAL'],
  })
  @IsOptional()
  @IsString()
  tone?: Tone;

  @ApiPropertyOptional({
    description: 'The primary niche or industry the brand operates in',
    example: 'Tech startups',
  })
  @IsOptional()
  @IsString()
  niche?: string;

  @ApiPropertyOptional({
    description: 'The intended target audience for the brand',
    example: 'Early-stage founders and product managers',
  })
  @IsOptional()
  @IsString()
  audience?: string;
}
