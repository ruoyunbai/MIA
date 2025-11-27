import { request as httpsRequest } from 'node:https';
import { request as httpRequest } from 'node:http';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { Chroma } from '@langchain/community/vectorstores/chroma';
import { Document, VectorStoreIndex } from 'llamaindex';
import { Document as LangChainDocument } from '@langchain/core/documents';
import OpenAI from 'openai';
import { LlmClientFactory } from './llm-client.factory';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly llm: ChatOpenAI;
  private readonly openaiClient: OpenAI;
  private vectorStore?: Chroma;

  constructor(
    private readonly configService: ConfigService,
    private readonly llmFactory: LlmClientFactory,
  ) {
    this.llm = this.llmFactory.createChatModel();
    this.openaiClient = this.llmFactory.createOpenAIClient();
  }

  private getVectorStore() {
    if (!this.vectorStore) {
      const chromaUrl = this.configService.get<string>('CHROMA_DB_URL');
      this.vectorStore = new Chroma(this.llmFactory.createEmbeddings(), {
        collectionName: 'mia_collection',
        url: chromaUrl,
      });
    }
    return this.vectorStore;
  }

  async testVectorStore() {
    try {
      const vectorStore = this.getVectorStore();
      const testContent = `Test document created at ${new Date().toISOString()}`;
      const doc = new LangChainDocument({
        pageContent: testContent,
        metadata: { source: 'test-endpoint' },
      });

      this.logger.log('Adding test document to Chroma...');
      await vectorStore.addDocuments([doc]);

      this.logger.log('Searching for test document...');
      const results = await vectorStore.similaritySearch('Test document', 1);

      return {
        status: 'success',
        message: 'ChromaDB read/write test passed',
        addedContent: testContent,
        searchResult: results,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('ChromaDB Test Error', error as Error);
      return {
        status: 'error',
        message: 'ChromaDB test failed',
        error: message,
        details: error,
      };
    }
  }

  getLlm() {
    return this.llm;
  }

  async chat(message: string) {
    const modelName =
      (
        this.configService.get<string>('MIA_OPENAI_MODEL_NAME') ||
        this.configService.get<string>('OPENAI_MODEL_NAME')
      )?.trim() || 'gpt-3.5-turbo';

    try {
      this.logger.log('Sending request to LangChain ChatOpenAI...');
      const response = await this.llm.invoke(message);
      this.logger.log('LangChain response received');
      return response.content;
    } catch (error: unknown) {
      this.logger.error('LangChain Error', error as Error);
    }

    try {
      this.logger.warn('Attempting direct OpenAI client fallback...');
      const completion = await this.openaiClient.chat.completions.create({
        messages: [{ role: 'user', content: message }],
        model: modelName,
      });
      this.logger.log('Direct OpenAI success');
      return (
        completion.choices[0].message.content + ' (Fallback from Direct OpenAI)'
      );
    } catch (directError: unknown) {
      this.logger.error('Direct OpenAI Error', directError as Error);
    }

    try {
      return await this.performRawFetch(message, modelName);
    } catch (fetchError: unknown) {
      this.logger.error('Raw Fetch Error', fetchError as Error);
      throw new Error(
        'All LLM connection methods failed. Please check your configuration.',
      );
    }
  }

  private async performRawFetch(message: string, modelName: string) {
    this.logger.warn('Attempting raw fetch fallback...');
    const apiKey = (
      this.configService.get<string>('MIA_OPENAI_API_KEY') ||
      this.configService.get<string>('OPENAI_API_KEY')
    )?.trim();
    let baseUrl = (
      this.configService.get<string>('MIA_OPENAI_API_BASE_URL') ||
      this.configService.get<string>('OPENAI_API_BASE_URL')
    )?.trim();

    if (!baseUrl) {
      throw new Error('OPENAI_API_BASE_URL is not defined');
    }
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }

    const url = `${baseUrl}/chat/completions`;
    this.logger.log(`Raw fetch URL: ${url}`);

    const requestBody = JSON.stringify({
      model: modelName,
      messages: [{ role: 'user', content: message }],
    });
    const parsedUrl = new URL(url);
    const isHttps = parsedUrl.protocol === 'https:';
    const requestFn = isHttps ? httpsRequest : httpRequest;

    const responsePayload = await new Promise<{
      statusCode: number;
      body: string;
    }>((resolve, reject) => {
      const req = requestFn(
        {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port ? Number(parsedUrl.port) : isHttps ? 443 : 80,
          path: `${parsedUrl.pathname}${parsedUrl.search}`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
            'Content-Length': Buffer.byteLength(requestBody),
          },
        },
        (res) => {
          let responseText = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => {
            responseText += chunk;
          });
          res.on('end', () => {
            resolve({
              statusCode: res.statusCode ?? 0,
              body: responseText,
            });
          });
          res.on('error', reject);
        },
      );

      req.on('error', reject);
      req.write(requestBody);
      req.end();
    });

    if (
      responsePayload.statusCode < 200 ||
      responsePayload.statusCode >= 300
    ) {
      throw new Error(
        `Fetch failed with status ${responsePayload.statusCode}: ${responsePayload.body}`,
      );
    }

    const data = JSON.parse(responsePayload.body) as {
      choices?: Array<{
        message?: {
          content?: unknown;
        };
      }>;
    };
    const fallbackContent = data.choices?.[0]?.message?.content;
    if (typeof fallbackContent !== 'string') {
      throw new Error('Raw fetch response missing message content');
    }

    this.logger.log('Raw Fetch success');
    return fallbackContent + ' (Fallback from Raw Fetch)';
  }

  async createLlamaIndexIndex(text: string) {
    const miaApiKey = this.configService.get<string>('MIA_OPENAI_API_KEY');
    process.env.OPENAI_API_KEY = (
      miaApiKey || this.configService.get<string>('OPENAI_API_KEY')
    )?.trim();

    const document = new Document({ text });
    const index = await VectorStoreIndex.fromDocuments([document]);
    return index;
  }
}
