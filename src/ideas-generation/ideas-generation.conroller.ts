import { Controller, Post, Get, Body, UseGuards, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { IdeasService } from './ideas-generation.services';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { GetCurrentUser } from 'src/auth/decorator/current-user.decorator';
import { FavoriteIdeaDto } from './dto/favorite-idea.dto';

@ApiTags('Ideas')
@Controller('ideas')
export class IdeasController {
  constructor(private readonly ideasService: IdeasService) {}

  // POST /ideas/generate
  @UseGuards(JwtAuthGuard)
  @Post('generate')
  @ApiOperation({
    summary: 'Generate AI content ideas',
  })
  @ApiResponse({ status: 200, description: 'Ideas generated successfully' })
  async generateIdeas(@GetCurrentUser() user: any) {
    return await this.ideasService.generateIdeas(user);
  }

  // GET /ideas/trending
  @UseGuards(JwtAuthGuard)
  @Get('trending')
  @ApiOperation({
    summary: 'Get trending ideas from Reddit/Instagram',
  })
  async getTrendingIdeas(@GetCurrentUser() user: any) {
    return await this.ideasService.getTrendingIdeas(user);
  }

  // GET /ideas/favorites
  @UseGuards(JwtAuthGuard)
  @Get('favorites')
  @ApiOperation({
    summary: 'Get favourite ideas',
  })
  async getFavorites(@GetCurrentUser() user: any) {
    return await this.ideasService.getFavorites(user);
  }

  // POST /ideas/favorite
  @UseGuards(JwtAuthGuard)
  @Post('favorite')
  @ApiOperation({
    summary: 'Add idea to favourites',
  })
  async addFavorite(@Body() dto: FavoriteIdeaDto, @GetCurrentUser() user: any) {
    return await this.ideasService.toggleFavorite(user, dto.ideaId);
  }
}
