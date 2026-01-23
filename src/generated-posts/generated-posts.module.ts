import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { GeneratedPostsController } from './generated-posts.controller';
import { GeneratedPostsService } from './generated-posts.services';


@Module({
  imports: [PrismaModule],
  controllers: [GeneratedPostsController],
  providers: [GeneratedPostsService],
  exports: [GeneratedPostsService],
})
export class GeneratedPostsModule {}