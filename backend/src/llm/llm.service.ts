import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { Chroma } from '@langchain/community/vectorstores/chroma';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Document, VectorStoreIndex } from 'llamaindex';
import OpenAI from 'openai';
import { Document as LangChainDocument } from '@langchain/core/documents';

@Injectable()
export class LlmService {
    private llm: ChatOpenAI;
    private vectorStore: Chroma;
    private openaiClient: OpenAI;

    constructor(private configService: ConfigService) {
        this.initLlm();
        // Vector store initialization might be async or require connection check
        // For now, we just prepare the configuration
    }

    private initLlm() {
        // Prefer MIA_ prefixed variables to avoid conflicts with global environment variables
        const miaApiKey = this.configService.get<string>('MIA_OPENAI_API_KEY');
        const apiKey = (miaApiKey || this.configService.get<string>('OPENAI_API_KEY'))?.trim();

        const miaBaseUrl = this.configService.get<string>('MIA_OPENAI_API_BASE_URL');
        const baseUrl = (miaBaseUrl || this.configService.get<string>('OPENAI_API_BASE_URL'))?.trim();

        const miaModelName = this.configService.get<string>('MIA_OPENAI_MODEL_NAME');
        const modelName = (miaModelName || this.configService.get<string>('OPENAI_MODEL_NAME'))?.trim();

        console.log('Initializing LLM with:');
        console.log('Base URL:', baseUrl, miaBaseUrl ? '(from MIA_OPENAI_API_BASE_URL)' : '(from OPENAI_API_BASE_URL)');
        console.log('Model:', modelName, miaModelName ? '(from MIA_OPENAI_MODEL_NAME)' : '(from OPENAI_MODEL_NAME)');
        console.log('API Key:', apiKey ? `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 5)}` : 'undefined', miaApiKey ? '(from MIA_OPENAI_API_KEY)' : '(from OPENAI_API_KEY)');

        this.llm = new ChatOpenAI({
            openAIApiKey: apiKey,
            configuration: {
                baseURL: baseUrl,
                timeout: 60000, // 60s timeout
                defaultHeaders: {
                    'Authorization': `Bearer ${apiKey}`
                }
            },
            modelName: modelName || 'gpt-3.5-turbo',
            temperature: 0.7,
        });

        this.openaiClient = new OpenAI({
            apiKey: apiKey,
            baseURL: baseUrl,
            timeout: 60000,
            defaultHeaders: {
                'Authorization': `Bearer ${apiKey}`
            }
        });
    }

    async getVectorStore() {
        if (!this.vectorStore) {
            const chromaUrl = this.configService.get<string>('CHROMA_DB_URL');
            const miaApiKey = this.configService.get<string>('MIA_OPENAI_API_KEY');
            const apiKey = (miaApiKey || this.configService.get<string>('OPENAI_API_KEY'))?.trim();

            const miaBaseUrl = this.configService.get<string>('MIA_OPENAI_API_BASE_URL');
            const baseUrl = (miaBaseUrl || this.configService.get<string>('OPENAI_API_BASE_URL'))?.trim();

            const miaEmbeddingModel = this.configService.get<string>('MIA_OPENAI_EMBEDDING_MODEL');
            const embeddingModel = (miaEmbeddingModel || 'text-embedding-ada-002')?.trim();

            this.vectorStore = new Chroma(
                new OpenAIEmbeddings({
                    openAIApiKey: apiKey,
                    modelName: embeddingModel,
                    configuration: {
                        baseURL: baseUrl,
                        defaultHeaders: {
                            'Authorization': `Bearer ${apiKey}`
                        }
                    }
                }),
                {
                    collectionName: 'mia_collection',
                    url: chromaUrl,
                }
            );
        }
        return this.vectorStore;
    }

    async testVectorStore() {
        try {
            const vectorStore = await this.getVectorStore();

            // 1. Add a test document
            const testContent = `Test document created at ${new Date().toISOString()}`;
            const doc = new LangChainDocument({ pageContent: testContent, metadata: { source: 'test-endpoint' } });

            console.log('Adding test document to Chroma...');
            await vectorStore.addDocuments([doc]);

            // 2. Search for it
            console.log('Searching for test document...');
            const results = await vectorStore.similaritySearch('Test document', 1);

            return {
                status: 'success',
                message: 'ChromaDB read/write test passed',
                addedContent: testContent,
                searchResult: results
            };
        } catch (error) {
            console.error('ChromaDB Test Error:', error);
            return {
                status: 'error',
                message: 'ChromaDB test failed',
                error: error.message,
                details: error
            };
        }
    }

    getLlm() {
        return this.llm;
    }

    async chat(message: string) {
        const modelName = (this.configService.get<string>('MIA_OPENAI_MODEL_NAME') || this.configService.get<string>('OPENAI_MODEL_NAME'))?.trim() || 'gpt-3.5-turbo';

        // 1. Try LangChain
        try {
            console.log('1. Sending request to LangChain ChatOpenAI...');
            const response = await this.llm.invoke(message);
            console.log('LangChain response received');
            return response.content;
        } catch (error) {
            console.error('LangChain Error:', error.message);
        }

        // 2. Try Direct OpenAI SDK
        try {
            console.log('2. Attempting direct OpenAI client fallback...');
            const completion = await this.openaiClient.chat.completions.create({
                messages: [{ role: 'user', content: message }],
                model: modelName,
            });
            console.log('Direct OpenAI success');
            return completion.choices[0].message.content + ' (Fallback from Direct OpenAI)';
        } catch (directError) {
            console.error('Direct OpenAI Error:', directError.message);
        }

        // 3. Try Raw Fetch (Ultimate Fallback)
        try {
            console.log('3. Attempting raw fetch fallback...');
            const apiKey = (this.configService.get<string>('MIA_OPENAI_API_KEY') || this.configService.get<string>('OPENAI_API_KEY'))?.trim();
            let baseUrl = (this.configService.get<string>('MIA_OPENAI_API_BASE_URL') || this.configService.get<string>('OPENAI_API_BASE_URL'))?.trim();

            if (!baseUrl) {
                throw new Error('OPENAI_API_BASE_URL is not defined');
            }

            // Ensure no trailing slash for consistency
            if (baseUrl.endsWith('/')) {
                baseUrl = baseUrl.slice(0, -1);
            }
            const url = `${baseUrl}/chat/completions`;
            console.log('Fetch URL:', url);
            console.log('Fetch API Key:', apiKey ? `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 5)}` : 'undefined');

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: modelName,
                    messages: [{ role: 'user', content: message }]
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Fetch failed with status ${response.status}: ${errorText}`);
            }

            const data = await response.json();
            console.log('Raw Fetch success');
            return data.choices[0].message.content + ' (Fallback from Raw Fetch)';

        } catch (fetchError) {
            console.error('Raw Fetch Error:', fetchError);
            throw new Error('All LLM connection methods failed. Please check your configuration.');
        }
    }

    async createLlamaIndexIndex(text: string) {
        // Basic example of LlamaIndex usage
        // Note: LlamaIndex will look for OPENAI_API_KEY in process.env by default
        // You might need to set it explicitly if it's only in ConfigService
        const miaApiKey = this.configService.get<string>('MIA_OPENAI_API_KEY');
        process.env.OPENAI_API_KEY = (miaApiKey || this.configService.get<string>('OPENAI_API_KEY'))?.trim();

        const document = new Document({ text });
        const index = await VectorStoreIndex.fromDocuments([document]);
        return index;
    }
}