import { ApiProperty } from '@nestjs/swagger';

export class FavoriteIdeaDto {
  @ApiProperty()
  ideaId: string;
}