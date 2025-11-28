import { Message } from '../../entities';

export class MessageResponseDto {
  id: number;
  conversationId: number;
  role: string;
  content: string;
  sources: Record<string, unknown>[] | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;

  static fromEntity(message: Message): MessageResponseDto {
    const dto = new MessageResponseDto();
    dto.id = message.id;
    dto.conversationId = message.conversationId;
    dto.role = message.role;
    dto.content = message.content;
    dto.sources = message.sources ?? null;
    dto.metadata = message.metadata ?? null;
    dto.createdAt = message.createdAt;
    return dto;
  }

  static fromEntities(messages: Message[]) {
    return messages.map((message) => MessageResponseDto.fromEntity(message));
  }
}
