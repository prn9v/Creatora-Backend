import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { IdeasController } from './ideas-generation.conroller';
import { IdeasService } from './ideas-generation.services';


@Module({
  imports: [PrismaModule],
  controllers: [IdeasController],
  providers: [IdeasService],
  exports: [IdeasService],
})
export class IdeasModule {}