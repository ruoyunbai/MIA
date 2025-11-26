import { ParsedDocument } from './parsed-document.interface';

export interface DocumentParser<TInput = unknown> {
  canHandle(input: TInput): boolean;
  parse(input: TInput): Promise<ParsedDocument>;
  readonly type: string;
}
