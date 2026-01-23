import {
  Controller,
  Get,
  UseGuards,
  Query,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { GetCurrentUser } from 'src/auth/decorator/current-user.decorator';
import { GeneratedPostsService } from './generated-posts.services';

@Controller({ path: 'users/generated-posts', version: '1' })
@ApiTags('Generated-Posts')
export class GeneratedPostsController {
  constructor(private generatedPostsService: GeneratedPostsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'Get all User Generated Posts with pagination' })
  @ApiResponse({ status: 200, description: 'Posts fetched successfully.' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'sort', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'orderBy', required: false, type: String, description: 'Field to sort by (e.g., createdAt, platform)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  async getPosts(
    @GetCurrentUser() user: any,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
    @Query('sort') sort: 'asc' | 'desc' = 'desc',
    @Query('orderBy') orderBy: string = 'createdAt',
  ) {
    return this.generatedPostsService.getPosts(user.id, {
      page: Number(page),
      limit: Number(limit),
      search,
      sort,
      orderBy,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Get a specific Generated Post by ID' })
  @ApiParam({ name: 'id', description: 'The UUID of the post', type: String })
  @ApiResponse({ status: 200, description: 'Post fetched successfully.' })
  @ApiResponse({ status: 404, description: 'Post not found.' })
  async getPostById(
    @GetCurrentUser() user: any,
    @Param('id') id: string,
  ) {
        return await this.generatedPostsService.getPostById(user.id, id);
  }
}