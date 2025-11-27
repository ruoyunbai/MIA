import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LlmService } from './llm.service';
import { LlmController } from './llm.controller';
import { LlmClientFactory } from './llm-client.factory';

@Module({
  imports: [ConfigModule],
  controllers: [LlmController],
  providers: [LlmService, LlmClientFactory],
  exports: [LlmService],
})
export class LlmModule {}
