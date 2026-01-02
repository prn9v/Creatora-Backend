import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUrl } from 'class-validator';

export class ExtractPostDto {
  @ApiProperty({
    description: 'The URL of the social media post to analyze',
    example: 'https://www.linkedin.com/posts/username_activity-123456789',
    required: true,
  })
  @IsUrl({}, { message: 'Please provide a valid URL' })
  @IsNotEmpty()
  url: string;
}