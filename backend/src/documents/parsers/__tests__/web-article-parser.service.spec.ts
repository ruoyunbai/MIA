import { readFileSync } from 'fs';
import { join } from 'path';
import { WebArticleParserService } from '../web-article-parser.service';

describe('WebArticleParserService', () => {
  let service: WebArticleParserService;
  let html: string;
  let docSdkHtml: string;
  let fetchSpy: jest.SpyInstance;
  let complexTableHtml: string;

  beforeAll(() => {
    html = readFileSync(
      join(__dirname, 'fixtures', 'sample-article.html'),
      'utf8',
    );
    docSdkHtml = readFileSync(
      join(__dirname, 'fixtures', 'sample-article-docsdk.html'),
      'utf8',
    );
    complexTableHtml = readFileSync(
      join(__dirname, 'fixtures', 'sample-article-docsdk-table.html'),
      'utf8',
    );
  });

  beforeEach(() => {
    service = new WebArticleParserService();
    fetchSpy = jest
      .spyOn<any>(service as any, 'fetchHtml')
      .mockResolvedValue(Promise.resolve(html));
  });

  it('parses article into markdown/plainText/outline', async () => {
    const result = await service.parse(
      'https://school.jinritemai.com/doudian/web/article/sample',
    );
    expect(result.metadata.title).toBe('店铺命名规范实操指南');
    expect(result.metadata.parser).toBe('web-article');
    expect(result.outline.length).toBeGreaterThanOrEqual(3);
    expect(result.markdown).toContain('## 二、审核流程');
    expect(result.markdown).toContain('| 阶段 | 时长 |');
    expect(result.plainText).toContain('命名需体现品牌定位');
  });

  it('rejects unsupported hosts', async () => {
    await expect(service.parse('https://example.com/foo')).rejects.toThrow(
      /暂不支持/,
    );
  });

  it('falls back to Playwright when 静态 HTML 缺少正文', async () => {
    fetchSpy.mockResolvedValueOnce('<html><body></body></html>');
    const renderSpy = jest
      .spyOn<any>(service as any, 'renderWithHeadlessBrowser')
      .mockResolvedValue(html);
    const result = await service.parse(
      'https://school.jinritemai.com/doudian/web/article/sample',
    );
    expect(renderSpy).toHaveBeenCalledTimes(1);
    expect(result.metadata.title).toBe('店铺命名规范实操指南');
  });

  it('retries with Playwright when 解析结果内容为空', async () => {
    const originalTransform = (service as any).transformHtml.bind(
      service as any,
    );
    jest
      .spyOn<any>(service as any, 'transformHtml')
      .mockImplementationOnce(() => ({
        markdown: '# 未命名文章\n\n',
        plainText: '',
        outline: [],
        metadata: {
          title: '未命名文章',
          sourceUrl: 'https://school.jinritemai.com/doudian/web/article/sample',
          parser: 'web-article',
          extractedAt: new Date().toISOString(),
          wordCount: 0,
        },
      }))
      .mockImplementation((htmlInput: string, urlInput: string) =>
        originalTransform(htmlInput, urlInput),
      );
    const renderSpy = jest
      .spyOn<any>(service as any, 'renderWithHeadlessBrowser')
      .mockResolvedValue(html);
    const result = await service.parse(
      'https://school.jinritemai.com/doudian/web/article/sample',
    );
    expect(renderSpy).toHaveBeenCalledTimes(1);
    expect(result.plainText.length).toBeGreaterThan(50);
  });

  it('retries with Playwright when发现占位图链接', async () => {
    const originalTransform = (service as any).transformHtml.bind(
      service as any,
    );
    jest
      .spyOn<any>(service as any, 'transformHtml')
      .mockImplementationOnce(() => ({
        markdown:
          '![default.png](https://lf3-static.bytednsdoc.com/obj/eden-cn/upinulojnuvpe/eschool/20211124-place.jpeg)',
        plainText: '正文存在',
        outline: [],
        metadata: {
          title: '占位测试',
          sourceUrl: 'https://school.jinritemai.com/doudian/web/article/sample',
          parser: 'web-article',
          extractedAt: new Date().toISOString(),
          wordCount: 100,
        },
      }))
      .mockImplementation((htmlInput: string, urlInput: string) =>
        originalTransform(htmlInput, urlInput),
      );
    const renderSpy = jest
      .spyOn<any>(service as any, 'renderWithHeadlessBrowser')
      .mockResolvedValue(html);
    await service.parse(
      'https://school.jinritemai.com/doudian/web/article/sample',
    );
    expect(renderSpy).toHaveBeenCalledTimes(1);
  });

  it('only parses the first div under #doc-sdk and ignores recommendations', async () => {
    fetchSpy.mockResolvedValue(docSdkHtml);
    const result = await service.parse(
      'https://school.jinritemai.com/doudian/web/article/sample',
    );
    expect(result.plainText).toContain('第一章 概述');
    expect(result.plainText).not.toContain('猜你想看');
    expect(result.markdown).toContain('## 第一章 概述');
    expect(result.markdown).toContain('### 1.1 目的与依据');
    expect(result.markdown).toContain('> 名词解释：');
    expect(result.markdown).toContain('| 整改材料 | 材料示例 |');
  });

  it('converts complex doc-sdk tables with real image sources and strips fullscreen artifacts', async () => {
    fetchSpy.mockResolvedValueOnce(complexTableHtml);
    const result = await service.parse(
      'https://school.jinritemai.com/doudian/web/article/sample',
    );
    expect(result.markdown).toContain('| 整改材料 | 质检报告要求');
    expect(result.markdown).toContain(
      '质检报告要求：<br><br>1、具备 CMA 资质；<br><br>2、报告包含全部不合格项目；',
    );
    expect(result.markdown).toContain(
      '![default.png](https://p26-govern-regulation-upload-sign.byteimg.com/tos-cn-i-8o3mkpmn0b/7cfad956c7784776b6b307a1c4c9b671~tplv-8o3mkpmn0b-png.png?x-expires=2005285120&x-signature=KaFOw9Z4HQ0WpQKVmgen4%2FUs14I%3D)',
    );
    expect(result.markdown).not.toContain('lf3-static.bytednsdoc.com');
    expect(result.markdown).not.toContain('全屏展示');
    expect(result.markdown).not.toContain('退出');
  });
});
