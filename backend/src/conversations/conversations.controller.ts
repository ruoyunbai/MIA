import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  MessageEvent,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
  Sse,
  RequestMethod,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { ConversationsService } from './conversations.service';
import {
  CreateConversationDto,
  ListConversationsDto,
  ListMessagesDto,
  SendMessageDto,
  RagStrategy,
} from './dto';
import { OptionalJwtOrDebugGuard } from '../auth/guards/optional-jwt-or-debug.guard';
import { METHOD_METADATA } from '@nestjs/common/constants';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

const DEFAULT_SEND_BODY = {
  query: '最近的618活动策略有哪些亮点？',
  ragStrategy: RagStrategy.CHUNK_WITH_NEIGHBORS,
  topK: 4,
  neighborSize: 1,
  rerank: true,
  rerankModel: '',
  maxContextLength: 2500,
};

@ApiTags('Conversations')
@ApiBearerAuth()
@ApiQuery({
  name: 'debugKey',
  required: false,
  description:
    '调试密钥，匹配环境变量 MIA_DEBUG_BYPASS_KEY 后可跳过 JWT 校验（仅限内部 Swagger 调试）',
})
@ApiQuery({
  name: 'debugUserId',
  required: false,
  description: '调试模式下可指定模拟用户 ID，默认读取 MIA_DEBUG_USER_ID',
})
@UseGuards(OptionalJwtOrDebugGuard)
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  @ApiOperation({ summary: '获取会话列表' })
  listConversations(
    @CurrentUser('id') userId: number,
    @Query() query: ListConversationsDto,
  ) {
    return this.conversationsService.listConversations(userId, query);
  }

  @Post()
  @ApiOperation({ summary: '创建新会话' })
  createConversation(
    @CurrentUser('id') userId: number,
    @Body() payload: CreateConversationDto,
  ) {
    return this.conversationsService.createConversation(userId, payload);
  }

  @Delete(':conversationId')
  @ApiOperation({ summary: '删除会话（软删除）' })
  deleteConversation(
    @CurrentUser('id') userId: number,
    @Param('conversationId', ParseIntPipe) conversationId: number,
  ) {
    return this.conversationsService.deleteConversation(conversationId, userId);
  }

  @Get(':conversationId/messages')
  @ApiOperation({ summary: '查询会话消息记录' })
  listMessages(
    @CurrentUser('id') userId: number,
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @Query() query: ListMessagesDto,
  ) {
    return this.conversationsService.listMessages(
      conversationId,
      userId,
      query,
    );
  }

  @Post(':conversationId/messages')
  @ApiOperation({ summary: '发送消息（非流式）' })
  @ApiBody({
    schema: {
      example: DEFAULT_SEND_BODY,
    },
  })
  sendMessage(
    @CurrentUser('id') userId: number,
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @Body() payload: SendMessageDto,
  ) {
    return this.conversationsService.sendMessage(
      conversationId,
      userId,
      payload,
    );
  }

  @Sse(':conversationId/messages/stream', {
    [METHOD_METADATA]: RequestMethod.POST,
  })
  @ApiOperation({ summary: '发送消息（SSE 流式响应）' })
  @Header('Content-Type', 'text/event-stream')
  @Header('Cache-Control', 'no-cache')
  @Header('Connection', 'keep-alive')
  @ApiBody({
    schema: {
      example: DEFAULT_SEND_BODY,
    },
  })
  streamMessage(
    @CurrentUser('id') userId: number,
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @Body() payload: SendMessageDto,
  ): Observable<MessageEvent> {
    return this.conversationsService.streamMessage(
      conversationId,
      userId,
      payload,
    );
  }
}
