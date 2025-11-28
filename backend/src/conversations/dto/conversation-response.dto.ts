import { Conversation } from '../../entities';

export class ConversationResponseDto {
  id: number;
  title: string;
  userId: number;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(conversation: Conversation): ConversationResponseDto {
    const dto = new ConversationResponseDto();
    dto.id = conversation.id;
    dto.title = conversation.title;
    dto.userId = conversation.userId;
    dto.isDeleted = conversation.isDeleted;
    dto.createdAt = conversation.createdAt;
    dto.updatedAt = conversation.updatedAt;
    return dto;
  }

  static fromEntities(conversations: Conversation[]) {
    return conversations.map((conversation) =>
      ConversationResponseDto.fromEntity(conversation),
    );
  }
}
