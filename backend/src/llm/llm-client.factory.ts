import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import OpenAI from 'openai';

interface LlmRuntimeConfig {
  apiKey?: string;
  baseUrl?: string;
  modelName?: string;
}

@Injectable()
export class LlmClientFactory {
  private readonly logger = new Logger(LlmClientFactory.name);

  constructor(private readonly configService: ConfigService) {}

  createChatModel() {
    const config = this.resolveRuntimeConfig();
    this.logConfiguration('ChatOpenAI', config);
    return new ChatOpenAI({
      openAIApiKey: config.apiKey,
      configuration: {
        baseURL: config.baseUrl,
        timeout: 60000,
        defaultHeaders: this.buildHeaders(config.apiKey),
      },
      modelName: config.modelName ?? 'gpt-3.5-turbo',
      temperature: 0.7,
    });
  }

  createOpenAIClient() {
    const config = this.resolveRuntimeConfig();
    this.logConfiguration('OpenAI SDK', config);
    return new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
      timeout: 60000,
      defaultHeaders: this.buildHeaders(config.apiKey),
    });
  }

  createEmbeddings(modelOverride?: string) {
    const config = this.resolveRuntimeConfig();
    const modelName =
      modelOverride ??
      this.configService.get<string>('MIA_OPENAI_EMBEDDING_MODEL') ??
      'text-embedding-ada-002';

    this.logger.log(`Using embedding model: ${modelName}`);
    return new OpenAIEmbeddings({
      openAIApiKey: config.apiKey,
      modelName,
      configuration: {
        baseURL: config.baseUrl,
        defaultHeaders: this.buildHeaders(config.apiKey),
      },
    });
  }

  private resolveRuntimeConfig(): LlmRuntimeConfig {
    const miaApiKey = this.configService.get<string>('MIA_OPENAI_API_KEY');
    const fallbackKey = this.configService.get<string>('OPENAI_API_KEY');
    const apiKey = (miaApiKey || fallbackKey)?.trim();

    const miaBaseUrl = this.configService.get<string>(
      'MIA_OPENAI_API_BASE_URL',
    );
    const fallbackBaseUrl = this.configService.get<string>(
      'OPENAI_API_BASE_URL',
    );
    const baseUrl = (miaBaseUrl || fallbackBaseUrl)?.trim();

    const miaModelName = this.configService.get<string>(
      'MIA_OPENAI_MODEL_NAME',
    );
    const fallbackModel = this.configService.get<string>('OPENAI_MODEL_NAME');
    const modelName = (miaModelName || fallbackModel)?.trim();

    return {
      apiKey,
      baseUrl,
      modelName,
    };
  }

  private buildHeaders(apiKey?: string) {
    return apiKey
      ? {
          Authorization: `Bearer ${apiKey}`,
        }
      : undefined;
  }

  private logConfiguration(clientName: string, config: LlmRuntimeConfig) {
    const maskedKey = config.apiKey
      ? `${config.apiKey.slice(0, 4)}****${config.apiKey.slice(-4)}`
      : 'undefined';
    this.logger.log(
      `[${clientName}] base URL: ${config.baseUrl ?? 'default OpenAI endpoint'}`,
    );
    this.logger.log(`[${clientName}] model: ${config.modelName ?? 'gpt-3.5-turbo'}`);
    this.logger.log(`[${clientName}] apiKey: ${maskedKey}`);
  }
}
