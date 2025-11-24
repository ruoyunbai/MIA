import { Controller, Get, Query } from '@nestjs/common';
import { LlmService } from './llm.service';

@Controller('llm')
export class LlmController {
    constructor(private readonly llmService: LlmService) { }

    @Get('test')
    async testLlm(@Query('message') message: string) {
        const response = await this.llmService.chat(message || 'Hello, are you working?');
        return { response };
    }

    @Get('test-vector')
    async testVector() {
        return await this.llmService.testVectorStore();
    }
}
