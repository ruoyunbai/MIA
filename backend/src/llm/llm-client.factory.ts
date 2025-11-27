import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { Embeddings } from '@langchain/core/embeddings';
import OpenAI from 'openai';
import axios from 'axios';

interface LlmRuntimeConfig {
  apiKey?: string;
  baseUrl?: string;
  modelName?: string;
}

class CustomOpenAIEmbeddings extends Embeddings {
  private readonly logger = new Logger(CustomOpenAIEmbeddings.name);

  constructor(
    private config: {
      apiKey?: string;
      baseUrl?: string;
      modelName: string;
    },
  ) {
    super({});
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    return this.performRequest(texts);
  }

  async embedQuery(text: string): Promise<number[]> {
    const result = await this.performRequest([text]);
    return result[0];
  }

  private async performRequest(input: string[]): Promise<number[][]> {
    const url = `${this.config.baseUrl}/embeddings`;
    try {
      const response = await axios.post(
        url,
        {
          input,
          model: this.config.modelName,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.config.apiKey}`,
          },
        },
      );

      const data = response.data;
      if (data && data.data && Array.isArray(data.data)) {
        return data.data.map((item: any) => item.embedding);
      }
      throw new Error('Invalid response format from embedding API');
    } catch (error) {
      this.logger.error('Embedding request failed', error);
      throw error;
    }
  }
}

@Injectable()
export class LlmClientFactory {
  private readonly logger = new Logger(LlmClientFactory.name);

  constructor(private readonly configService: ConfigService) { }

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

    // 优先使用专门的 Embedding Base URL，否则回退到通用的 Base URL
    const embeddingBaseUrl =
      this.configService.get<string>('MIA_EMBEDDING_API_BASE_URL') ||
      this.configService.get<string>('EMBEDDING_API_BASE_URL') ||
      config.baseUrl;

    const modelName =
      modelOverride ??
      this.configService.get<string>('MIA_OPENAI_EMBEDDING_MODEL') ??
      'text-embedding-ada-002';

    this.logger.log(`Using embedding model: ${modelName}`);
    this.logger.log(`Resolved Embedding Base URL: ${embeddingBaseUrl}`);
    this.logger.log(`Resolved API Key: ${config.apiKey ? '***' : 'undefined'}`);

    if (embeddingBaseUrl) {
      this.logger.log(`Using embedding base URL: ${embeddingBaseUrl}`);
      // 如果配置了自定义 URL，使用自定义实现以避免 LangChain 的潜在干扰
      return new CustomOpenAIEmbeddings({
        apiKey: config.apiKey,
        baseUrl: embeddingBaseUrl,
        modelName,
      });
    }

    return new OpenAIEmbeddings({
      openAIApiKey: config.apiKey,
      modelName,
      dimensions: 1024, // 显式指定维度，防止 LangChain 自动推断或截断
      configuration: {
        baseURL: embeddingBaseUrl,
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
    this.logger.log(
      `[${clientName}] model: ${config.modelName ?? 'gpt-3.5-turbo'}`,
    );
    this.logger.log(`[${clientName}] apiKey: ${maskedKey}`);
  }
}
