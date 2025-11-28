import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation, Message, DocumentChunk, SearchLog } from '../entities';
import { ConversationsService } from './conversations.service';
import { ConversationsController } from './conversations.controller';
import { DocumentsModule } from '../documents/documents.module';
import { LlmModule } from '../llm/llm.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Conversation, Message, DocumentChunk, SearchLog]),
    DocumentsModule,
    AuthModule,
    LlmModule,
  ],
  controllers: [ConversationsController],
  providers: [ConversationsService],
})
export class ConversationsModule {}
