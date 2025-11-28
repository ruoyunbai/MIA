import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LlmModule } from './llm/llm.module';
import {
  Category,
  Document,
  DocumentChunk,
  VectorIndex,
  User,
  Conversation,
  Message,
  SearchLog,
} from './entities';
import { EmailVerification } from './email/entities/email-verification.entity';
import { CategoriesModule } from './categories/categories.module';
import { DocumentsModule } from './documents/documents.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { EmailModule } from './email/email.module';
import { ConversationsModule } from './conversations/conversations.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        entities: [
          Category,
          Document,
          DocumentChunk,
          VectorIndex,
          User,
          Conversation,
          Message,
          SearchLog,
          EmailVerification,
        ],
        synchronize: true, // Set to false in production
      }),
      inject: [ConfigService],
    }),
    LlmModule,
    CategoriesModule,
    DocumentsModule,
    UsersModule,
    AuthModule,
    EmailModule,
    ConversationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
