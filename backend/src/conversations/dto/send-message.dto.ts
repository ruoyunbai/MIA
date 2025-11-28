import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export enum RagStrategy {
  RAW_CHUNK = 'chunk',
  CHUNK_WITH_NEIGHBORS = 'chunk_neighbors',
  FULL_DOCUMENT = 'full_document',
}

export class SendMessageDto {
  @IsString()
  @MaxLength(4000)
  query: string;

  @IsOptional()
  @IsEnum(RagStrategy)
  ragStrategy?: RagStrategy = RagStrategy.CHUNK_WITH_NEIGHBORS;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(10)
  topK?: number = 4;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(10)
  retrievalLimit?: number = 6;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(3)
  neighborSize?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(500)
  @Max(8000)
  maxContextLength?: number = 2500;

  @IsOptional()
  @IsBoolean()
  rerank?: boolean = true;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  rerankModel?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number = 0.2;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  model?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  systemPrompt?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(20)
  @Type(() => Number)
  documentFilter?: number[];
}
