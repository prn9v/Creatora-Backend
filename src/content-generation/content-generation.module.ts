// src/content-generation/content-generation.module.ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ContentGenerationController } from './content-generation.controller';
import { ContentGenerationService } from './content-generation.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    HttpModule.register({
      timeout: 30000, // 30 seconds timeout for FastAPI calls
      maxRedirects: 5,
    }),
  ],
  controllers: [ContentGenerationController],
  providers: [ContentGenerationService],
  exports: [ContentGenerationService],
})
export class ContentGenerationModule {}