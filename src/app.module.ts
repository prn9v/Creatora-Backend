import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ExtractorModule } from './onboarding/onboarding.module';
import { ContentGenerationModule } from './content-generation/content-generation.module';
import { ProfileModule } from './profile/profile.module';
import { ImageModule } from './common/image/image.module';
import { GeneratedPostsModule } from './generated-posts/generated-posts.module';
import { IdeasModule } from './ideas-generation/ideas-generation.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    ExtractorModule,
    ContentGenerationModule,
    ProfileModule,
    ImageModule,
    GeneratedPostsModule,
    IdeasModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}