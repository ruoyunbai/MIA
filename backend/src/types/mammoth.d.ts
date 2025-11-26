declare module 'mammoth' {
  interface MammothInput {
    buffer?: Buffer;
    path?: string;
  }

  interface MammothMessage {
    type: string;
    message: string;
  }

  interface MammothResult {
    value: string;
    messages: MammothMessage[];
  }

  interface ConvertOptions {
    styleMap?: string | string[];
    includeDefaultStyleMap?: boolean;
    includeEmbeddedStyleMap?: boolean;
  }

  function convertToMarkdown(
    input: MammothInput,
    options?: ConvertOptions,
  ): Promise<MammothResult>;

  function convertToHtml(
    input: MammothInput,
    options?: ConvertOptions,
  ): Promise<MammothResult>;

  function extractRawText(input: MammothInput): Promise<MammothResult>;

  export { convertToMarkdown, convertToHtml, extractRawText };
}
