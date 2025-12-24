import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  

  @IsOptional()
  @ApiProperty()
  @IsString()
  @MaxLength(100)
  name?: string;          // Display Name

  @IsOptional()
  @ApiProperty()
  @IsEmail()
  email?: string;         // Email Address

  @IsOptional()
  @ApiProperty()
  @IsString()
  @MaxLength(500)
  bio?: string;           // Bio
}
