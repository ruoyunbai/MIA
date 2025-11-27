import {
  Document,
  DocumentIngestionStatus,
  DocumentStatus,
} from '../../entities';

export class DocumentResponseDto {
  id: number;
  title: string;
  content: string | null;
  categoryId: number | null;
  userId: number | null;
  status: DocumentStatus;
  ingestionStatus: DocumentIngestionStatus;
  ingestionError: string | null;
  fileUrl: string | null;
  metaInfo: Record<string, unknown> | null;
  chunkedAt: Date | null;
  embeddedAt: Date | null;
  indexedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(document: Document): DocumentResponseDto {
    const dto = new DocumentResponseDto();
    dto.id = document.id;
    dto.title = document.title;
    dto.content = document.content ?? null;
    dto.categoryId = document.categoryId ?? null;
    dto.userId = document.userId ?? null;
    dto.status = document.status;
    dto.ingestionStatus = document.ingestionStatus;
    dto.ingestionError = document.ingestionError ?? null;
    dto.fileUrl = document.fileUrl ?? null;
    dto.metaInfo = document.metaInfo ?? null;
    dto.chunkedAt = document.chunkedAt ?? null;
    dto.embeddedAt = document.embeddedAt ?? null;
    dto.indexedAt = document.indexedAt ?? null;
    dto.createdAt = document.createdAt;
    dto.updatedAt = document.updatedAt;
    return dto;
  }

  static fromEntities(documents: Document[]): DocumentResponseDto[] {
    return documents.map((document) =>
      DocumentResponseDto.fromEntity(document),
    );
  }
}
