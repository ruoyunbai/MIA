import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import axios from 'axios';
import { parseDocument, DomUtils, ElementType } from 'htmlparser2';
import type { Document, Element, ParentNode } from 'domhandler';
import { Text } from 'domhandler';
import { decode } from 'entities';
import { randomUUID } from 'crypto';
import type { Browser, Page } from 'playwright';
import TurndownService from 'turndown';
import type { DocumentParser } from '../interfaces/document-parser.interface';
import type {
  DocumentOutlineItem,
  ParsedDocument,
} from '../interfaces/parsed-document.interface';

@Injectable()
export class WebArticleParserService implements DocumentParser<string> {
  readonly type = 'web-article';
  private readonly logger = new Logger(WebArticleParserService.name);
  private readonly allowedHosts = new Set(['school.jinritemai.com']);
  private readonly articleSelectors = [
    'article',
    '.article-content',
    '.article__detail',
    '.articleDetail',
    '.article-detail',
    '.article-detail__richtext',
    '.rich-content',
    '.rich-text',
    '#article-content',
    '.content',
  ];
  private readonly turndown: TurndownService;
  private readonly placeholderImageMarkers = [
    'lf3-static.bytednsdoc.com/obj/eden-cn/upinulojnuvpe/eschool',
    'place.jpeg',
    'place.jpg',
    'placeholder',
  ];

  constructor() {
    this.turndown = new TurndownService({
      headingStyle: 'atx',
      bulletListMarker: '-',
      codeBlockStyle: 'fenced',
    });
    this.registerTurndownRules();
  }

  canHandle(input: string) {
    try {
      const url = new URL(input);
      return this.allowedHosts.has(url.hostname);
    } catch {
      return false;
    }
  }

  async parse(url: string): Promise<ParsedDocument> {
    const normalizedUrl = this.validateUrl(url);
    const html = await this.fetchHtml(normalizedUrl);
    try {
      const initialResult = this.transformHtml(html, normalizedUrl);
      if (this.shouldRetryWithHeadless(initialResult)) {
        const renderedHtml = await this.renderWithHeadlessBrowser(normalizedUrl);
        return this.transformHtml(renderedHtml, normalizedUrl);
      }
      return initialResult;
    } catch (error) {
      if (this.shouldFallbackToHeadless(error)) {
        const renderedHtml = await this.renderWithHeadlessBrowser(normalizedUrl);
        return this.transformHtml(renderedHtml, normalizedUrl);
      }
      throw error;
    }
  }

  private validateUrl(rawUrl: string) {
    if (!rawUrl) {
      throw new BadRequestException('请提供文章链接');
    }
    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      throw new BadRequestException('文章链接格式无效');
    }

    if (!this.allowedHosts.has(parsed.hostname)) {
      throw new BadRequestException('暂不支持解析该域名的文章');
    }
    parsed.hash = '';
    return parsed.toString();
  }

  private async fetchHtml(url: string) {
    try {
      const response = await axios.get<string>(url, {
        headers: {
          'user-agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36',
          accept: 'text/html,application/xhtml+xml',
        },
        responseType: 'text',
        timeout: 10000,
      });
      if (!response.data) {
        throw new InternalServerErrorException('文章内容为空');
      }
      return response.data;
    } catch (error) {
      this.logger.error('抓取文章失败', error);
      throw new InternalServerErrorException('文章抓取失败，请稍后再试');
    }
  }

  private transformHtml(html: string, sourceUrl: string): ParsedDocument {
    const document = parseDocument(html, {
      lowerCaseAttributeNames: true,
      lowerCaseTags: true,
      recognizeSelfClosing: true,
    });
    this.removeNodes(document, new Set(['script', 'style', 'noscript', 'iframe']));

    const title = this.extractTitle(document);
    const articleRoot = this.pickArticleRoot(document);
    if (!articleRoot) {
      throw new InternalServerErrorException('未能识别文章主体');
    }

    this.normalizeArticleTree(articleRoot);
    const outline = this.buildOutline(articleRoot);
    const sanitizedHtml = DomUtils.getOuterHTML(articleRoot) ?? '';
    let markdown = this.turndown.turndown(sanitizedHtml);
    markdown = markdown.replace(/^(#{1,6})\s*\n+/gm, '$1 ');
    const plainText = this.normalizeWhitespace(
      DomUtils.textContent(articleRoot),
    );

    return {
      markdown,
      plainText,
      outline,
      metadata: {
        title,
        sourceUrl,
        parser: this.type,
        extractedAt: new Date().toISOString(),
        wordCount: plainText.length,
      },
    };
  }

  private removeNodes(root: Document | ParentNode, tags: Set<string>) {
    const queue: ParentNode[] = [root];
    while (queue.length) {
      const current = queue.shift();
      if (!current?.children?.length) {
        continue;
      }
      const children = [...current.children];
      for (const child of children) {
        if (this.isElement(child) && tags.has(child.name)) {
          DomUtils.removeElement(child);
          continue;
        }
        if (this.hasChildren(child)) {
          queue.push(child as ParentNode);
        }
      }
    }
  }

  private extractTitle(document: Document) {
    const headings = DomUtils.findAll(
      (node) => this.isElement(node) && node.name === 'h1',
      document.children,
    );
    const heavyHeading = headings
      .map((node) => this.normalizeWhitespace(DomUtils.textContent(node)))
      .find((text) => text.length > 4);
    if (heavyHeading) {
      return heavyHeading;
    }
    const titleNode = DomUtils.findOne(
      (node) => this.isElement(node) && node.name === 'title',
      document.children,
      true,
    );
    if (titleNode) {
      return this.normalizeWhitespace(DomUtils.textContent(titleNode));
    }
    return '未命名文章';
  }

  private pickArticleRoot(document: Document) {
    const docSdkRoot = this.pickDocSdkSection(document);
    if (docSdkRoot) {
      return docSdkRoot;
    }

    const selectors = [
      (node: Element) => node.name === 'article',
      ...this.articleSelectors.map(
        (selector) => (node: Element) => this.matchesSelector(node, selector),
      ),
    ];

    for (const matcher of selectors) {
      const candidate = DomUtils.findOne(
        (node) => this.isElement(node) && matcher(node),
        document.children,
        true,
      );
      if (candidate && this.nodeTextLength(candidate) > 200) {
        return candidate;
      }
    }

    let bestNode: Element | null = null;
    let bestScore = 0;
    const candidates = DomUtils.findAll(
      (node) =>
        this.isElement(node) &&
        ['div', 'section'].includes(node.name) &&
        (node.attribs?.class?.includes('article') ||
          node.attribs?.class?.includes('content') ||
          node.attribs?.class?.includes('rich')),
      document.children,
    );

    for (const node of candidates) {
      const textLength = this.nodeTextLength(node);
      if (textLength < 200) {
        continue;
      }
      const paragraphCount = DomUtils.findAll(
        (child) => this.isElement(child) && child.name === 'p',
        node.children,
      ).length;
      const score = textLength + paragraphCount * 50;
      if (score > bestScore) {
        bestScore = score;
        bestNode = node;
      }
    }

    if (!bestNode) {
      const fallback = DomUtils.findAll(
        (node) => this.isElement(node) && ['div', 'section'].includes(node.name),
        document.children,
      ).sort((a, b) => this.nodeTextLength(b) - this.nodeTextLength(a));
      bestNode = fallback[0] ?? null;
    }

    return bestNode;
  }

  private pickDocSdkSection(document: Document) {
    const docSdk = DomUtils.findOne(
      (node) => this.isElement(node) && node.attribs?.id === 'doc-sdk',
      document.children,
      true,
    );
    if (!docSdk) {
      return null;
    }
    const firstContent = (docSdk.children || []).find(
      (child): child is Element => this.isElement(child) && child.name === 'div',
    );
    if (firstContent && this.nodeTextLength(firstContent) > 100) {
      return firstContent;
    }
    return null;
  }

  private buildOutline(root: Element): DocumentOutlineItem[] {
    const outline: DocumentOutlineItem[] = [];
    const slugCount = new Map<string, number>();
    const collectHeadings = (element: Element) => {
      if (/^h[1-6]$/.test(element.name)) {
        const level = Number(element.name.slice(1)) || 2;
        const title = this.normalizeWhitespace(DomUtils.textContent(element));
        if (title) {
          const baseSlug = this.slugify(title);
          const index = slugCount.get(baseSlug) ?? 0;
          slugCount.set(baseSlug, index + 1);
          const anchor = index === 0 ? baseSlug : `${baseSlug}-${index}`;
          element.attribs = element.attribs ?? {};
          element.attribs.id = anchor;
          outline.push({ title, level, anchor });
        }
      }
      element.children?.forEach((child) => {
        if (this.isElement(child)) {
          collectHeadings(child);
        }
      });
    };
    collectHeadings(root);
    return outline;
  }

  private normalizeArticleTree(node: Element) {
    const classList = this.getClassList(node);
    if (
      this.shouldRemoveNode(classList) ||
      this.isInFullscreenWidget(node) ||
      this.shouldRemoveFullscreenText(node, classList)
    ) {
      DomUtils.removeElement(node);
      return;
    }
    this.applyHeadingClass(node, classList);
    this.applyBlockquoteClass(node, classList);
    this.applyAceLineClass(node, classList);
    this.applyLinkAttributes(node, classList);
    this.applyImageSource(node);
    node.children?.forEach((child) => {
      if (this.isElement(child)) {
        this.normalizeArticleTree(child);
      }
    });
    this.removeFullscreenTextChildren(node);

    if (node.name === 'table') {
      const markdown = this.buildTableMarkdown(node);
      node.name = 'md-table';
      node.attribs = { 'data-md-content': markdown };
      const textNode = new Text(markdown);
      textNode.parent = node;
      node.children = [textNode];
      return;
    }
  }

  private applyHeadingClass(node: Element, classList: string[]) {
    const headingClass = classList.find((cls) => /^heading-h\d$/i.test(cls));
    if (!headingClass) {
      return;
    }
    const numeric = Number(headingClass.replace(/[^0-9]/g, ''));
    if (!numeric) {
      return;
    }
    node.name = `h${Math.min(6, numeric + 1)}`;
    this.unwrapLineWrapper(node);
    this.collapseTextContent(node);
  }

  private applyBlockquoteClass(node: Element, classList: string[]) {
    if (classList.includes('blockquote')) {
      node.name = 'blockquote';
    }
  }

  private applyAceLineClass(node: Element, classList: string[]) {
    if (classList.includes('ace-line') && !/^h[1-6]$/.test(node.name)) {
      node.name = 'p';
      this.unwrapLineWrapper(node);
    }
  }

  private applyLinkAttributes(node: Element, classList: string[]) {
    if (node.name === 'a') {
      return;
    }
    if (
      node.children &&
      DomUtils.findOne(
        (child) => this.isElement(child) && child.name === 'a',
        node.children,
      )
    ) {
      return;
    }
    const href =
      node.attribs?.['data-href'] ?? this.extractHrefFromClass(classList.join(' '));
    if (!href) {
      return;
    }
    node.attribs = node.attribs ?? {};
    node.attribs.href = this.normalizeUrl(href) ?? href;
    delete node.attribs['data-href'];
    node.name = 'a';
  }

  private applyImageSource(node: Element) {
    if (node.name !== 'img') {
      return;
    }
    const candidates = this.collectImageSources(node);
    if (!candidates.length) {
      return;
    }
    const chosen =
      candidates.find((src) => !this.isPlaceholderImage(src)) ?? candidates[0];
    const normalized = this.normalizeUrl(chosen) ?? chosen;
    node.attribs = node.attribs ?? {};
    node.attribs.src = normalized;
    this.removeImageDataAttrs(node);
  }

  private registerTurndownRules() {
    this.turndown.addRule('preBuiltTables', {
      filter: (node) =>
        node.nodeName === 'MD-TABLE' &&
        typeof node.getAttribute === 'function' &&
        Boolean(node.getAttribute('data-md-content')),
      replacement: (_content, node) => node.getAttribute('data-md-content') ?? '',
    });
  }

  private buildTableMarkdown(table: Element) {
    const rows = DomUtils.findAll(
      (node) => this.isElement(node) && node.name === 'tr',
      table.children ?? [],
    );
    if (!rows.length) {
      return '';
    }
    const matrix = rows
      .map((row) =>
        DomUtils.findAll(
          (cell) =>
            this.isElement(cell) && (cell.name === 'th' || cell.name === 'td'),
          row.children ?? [],
        ).map((cell) => this.convertTableCell(cell)),
      )
      .filter((cells) => cells.length);
    if (!matrix.length) {
      return '';
    }
    const header = matrix[0];
    const headerLine = `| ${header.join(' | ')} |`;
    const divider = `| ${header.map(() => '---').join(' | ')} |`;
    const body = matrix
      .slice(1)
      .map((row) => `| ${row.join(' | ')} |`)
      .join('\n');
    return [headerLine, divider, body].filter(Boolean).join('\n');
  }

  private convertTableCell(cell: Element) {
    const html = (cell.children ?? [])
      .map((child) =>
        this.isElement(child)
          ? DomUtils.getOuterHTML(child) ?? ''
          : this.normalizeWhitespace('data' in child ? child.data ?? '' : ''),
      )
      .join('');
    const content = html
      ? this.turndown.turndown(html).trim()
      : this.normalizeWhitespace(DomUtils.textContent(cell));
    return this.normalizeTableCellContent(content);
  }

  private normalizeTableCellContent(content: string) {
    if (!content) {
      return ' ';
    }
    return content
      .replace(/\r/g, '')
      .replace(/\n{2,}/g, '\n\n')
      .replace(/\n/g, '<br>')
      .replace(/\|/g, '\\|')
      .trim() || ' ';
  }

  private normalizeWhitespace(text: string) {
    return decode(text).replace(/\u200b+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private slugify(text: string) {
    const base = text
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
    return base || randomUUID();
  }

  private nodeTextLength(node: Element) {
    return this.normalizeWhitespace(DomUtils.textContent(node)).length;
  }

  private normalizeUrl(href: string) {
    try {
      if (/^https?:\/\//i.test(href)) {
        return href;
      }
      const base = 'https://school.jinritemai.com';
      return new URL(href, base).toString();
    } catch {
      return undefined;
    }
  }

  private shouldRetryWithHeadless(result: ParsedDocument) {
    const isMeaningless =
      !result.plainText || result.plainText.replace(/\s+/g, '').length < 50;
    const missingTitle =
      !result.metadata.title || result.metadata.title === '未命名文章';
    const hasPlaceholderImage = /lf3-static\.bytednsdoc\.com\/obj\/eden-cn\/upinulojnuvpe\/eschool|place\.jpe?g/i.test(
      result.markdown,
    );
    return (isMeaningless && missingTitle) || hasPlaceholderImage;
  }

  private shouldFallbackToHeadless(error: unknown) {
    return (
      error instanceof InternalServerErrorException &&
      typeof error.message === 'string' &&
      error.message.includes('未能识别文章主体')
    );
  }

  private async renderWithHeadlessBrowser(url: string) {
    let browser: Browser | null = null;
    try {
      const playwright = (await import('playwright')) as typeof import('playwright');
      browser = await playwright.chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      const page = await browser.newPage({
        viewport: { width: 1280, height: 720 },
      });
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });
      await page.waitForTimeout(1500);
      await this.waitForArticleSelectors(page);
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() =>
        undefined,
      );
      await this.ensureDocImagesLoaded(page);
      const content = await page.content();
      return content;
    } catch (error) {
      this.logger.error('Playwright 渲染失败', error);
      throw new InternalServerErrorException(
        '文章渲染失败，请稍后再试或检查 Playwright 安装',
      );
    } finally {
      await browser?.close().catch(() => undefined);
    }
  }

  private async waitForArticleSelectors(page: Page) {
    for (const selector of this.articleSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 2000 });
        return;
      } catch {
        continue;
      }
    }
  }

  private async ensureDocImagesLoaded(page: Page) {
    try {
      const height = await page.evaluate(
        () => document.body?.scrollHeight ?? 0,
      );
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(500);
      await page.evaluate((h) => window.scrollTo(0, h * 0.3), height);
      await page.waitForTimeout(600);
      await page.evaluate((h) => window.scrollTo(0, h * 0.65), height);
      await page.waitForTimeout(800);
      await page.evaluate((h) => window.scrollTo(0, h), height);
      await page.waitForTimeout(1500);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(600);
      const hasPlaceholder = await page.evaluate((markers: string[]) => {
        const container = document.querySelector('#doc-sdk') ?? document.body;
        if (!container) {
          return false;
        }
        const images = Array.from(container.querySelectorAll('img'));
        return images.some((img) => {
          const src = img.getAttribute('src') ?? '';
          return markers.some((marker) => src.includes(marker));
        });
      }, this.placeholderImageMarkers);
      if (hasPlaceholder) {
        await page.waitForFunction(
          (markers: string[]) => {
            const container = document.querySelector('#doc-sdk') ?? document.body;
            if (!container) {
              return false;
            }
            const images = Array.from(container.querySelectorAll('img'));
            if (!images.length) {
              return false;
            }
            return images.some((img) => {
              const candidates = [
                img.getAttribute('src'),
                img.getAttribute('data-src'),
                img.getAttribute('data-original-src'),
                img.getAttribute('data-preview-url'),
                img.getAttribute('data-url'),
                img.getAttribute('data-image-src'),
              ].filter(Boolean) as string[];
              if (!candidates.length) {
                return false;
              }
              return candidates.some(
                (value) => !markers.some((marker) => value.includes(marker)),
              );
            });
          },
          this.placeholderImageMarkers,
          { timeout: 5000 },
        );
      }
    } catch (error) {
      this.logger.warn(`等待文档图片加载完成失败: ${error}`);
    }
  }

  private matchesSelector(node: Element, selector: string) {
    if (!node.attribs) {
      return false;
    }
    if (selector.startsWith('.')) {
      const className = selector.slice(1);
      return node.attribs.class
        ?.split(/\s+/)
        .some((value) => value === className);
    }
    if (selector.startsWith('#')) {
      return node.attribs.id === selector.slice(1);
    }
    return node.name === selector;
  }

  private isElement(node: unknown): node is Element {
    return Boolean(node) && (node as Element).type === ElementType.Tag;
  }

  private isText(node: unknown): node is Text {
    return Boolean(node) && (node as Text).type === ElementType.Text;
  }

  private hasChildren(node: unknown): node is ParentNode {
    return (
      Boolean(node) &&
      ((node as ParentNode).type === ElementType.Tag ||
        (node as ParentNode).type === ElementType.Script ||
        (node as ParentNode).type === ElementType.Style) &&
      Array.isArray((node as ParentNode).children)
    );
  }

  private extractHrefFromClass(classAttr?: string) {
    if (!classAttr) {
      return undefined;
    }
    const match = classAttr.match(/hyperlink-href:([^\s]+)/);
    return match ? match[1] : undefined;
  }

  private isPlaceholderImage(src: string) {
    return (
      /place\.jpe?g/i.test(src) ||
      src.includes('lf3-static.bytednsdoc.com/obj/eden-cn/upinulojnuvpe/eschool')
    );
  }

  private getClassList(node: Element) {
    return (node.attribs?.class ?? '')
      .split(/\s+/)
      .map((cls) => cls.trim())
      .filter(Boolean);
  }

  private collectImageSources(node: Element) {
    const sources = new Set<string>();
    const lazyAttrPattern =
      /^data[-_\w]*(src|source|original|url|image|preview)[-\w]*$/i;
    const styleUrlPattern = /url\((['"]?)(.+?)\1\)/gi;
    const addSource = (raw?: string) => {
      const normalized = this.normalizeSourceCandidate(raw);
      if (normalized) {
        sources.add(normalized);
      }
    };
    const collectFrom = (element?: Element) => {
      if (!element?.attribs) {
        return;
      }
      for (const [key, value] of Object.entries(element.attribs)) {
        if (!value) {
          continue;
        }
        if (key === 'src') {
          addSource(value);
          continue;
        }
        if (key === 'srcset') {
          const first = value.split(',')[0]?.trim().split(/\s+/)[0];
          addSource(first);
          continue;
        }
        if (key === 'style') {
          styleUrlPattern.lastIndex = 0;
          let match: RegExpExecArray | null;
          while ((match = styleUrlPattern.exec(value))) {
            addSource(match[2]);
          }
          continue;
        }
        if (lazyAttrPattern.test(key)) {
          addSource(value);
        }
      }
    };
    collectFrom(node);
    let parent = this.getParentElement(node);
    for (let depth = 0; depth < 2 && parent; depth += 1) {
      collectFrom(parent);
      parent = this.getParentElement(parent);
    }
    return Array.from(sources);
  }

  private normalizeSourceCandidate(value?: string) {
    if (!value) {
      return undefined;
    }
    const trimmed = decode(value).trim();
    if (!trimmed) {
      return undefined;
    }
    return trimmed.replace(/^url\((['"]?)(.+)\1\)$/i, '$2');
  }

  private shouldRemoveNode(classList: string[]) {
    return (
      classList.some((cls) => cls.includes('ace-table-fullscreen')) ||
      classList.some((cls) => cls.startsWith('tb-scrollable-shadow')) ||
      classList.includes('tb-scrollable-stunt') ||
      classList.includes('ignore-dom')
    );
  }

  private removeImageDataAttrs(node: Element) {
    if (!node.attribs) {
      return;
    }
    for (const key of Object.keys(node.attribs)) {
      if (key.startsWith('data-')) {
        delete node.attribs[key];
      }
    }
  }

  private getParentElement(node?: Element | ParentNode | null): Element | undefined {
    if (!node || typeof node !== 'object') {
      return undefined;
    }
    const parent = (node as ParentNode).parent;
    return parent && this.isElement(parent as unknown as Element)
      ? (parent as unknown as Element)
      : undefined;
  }

  private unwrapLineWrapper(node: Element) {
    if (!node.children?.length) {
      return;
    }
    if (
      node.children.length === 1 &&
      this.isElement(node.children[0]) &&
      node.children[0].attribs?.['data-line-wrapper'] !== undefined
    ) {
      const wrapper = node.children[0];
      node.children = wrapper.children ?? [];
      this.resetChildParents(node);
    }
  }

  private collapseTextContent(node: Element) {
    const text = this.normalizeWhitespace(DomUtils.textContent(node));
    if (!text) {
      node.children = [];
      return;
    }
    const textNode = new Text(text);
    textNode.parent = node;
    node.children = [textNode];
  }

  private isInFullscreenWidget(node: Element) {
    let current: Element | undefined = node;
    while (current) {
      if (this.getClassList(current).some((cls) => cls.includes('ace-table-fullscreen'))) {
        return true;
      }
      current = this.getParentElement(current);
    }
    return false;
  }

  private shouldRemoveFullscreenText(node: Element, classList: string[]) {
    if (node.name !== 'span') {
      return false;
    }
    const text = this.normalizeWhitespace(DomUtils.textContent(node));
    if (text !== '退出' && text !== '全屏展示') {
      return false;
    }
    return (
      classList.some((cls) => cls.includes('ace-table-fullscreen')) ||
      this.isInFullscreenWidget(node)
    );
  }

  private removeFullscreenTextChildren(node: Element) {
    if (!node.children?.length) {
      return;
    }
    if (!this.isInFullscreenWidget(node)) {
      return;
    }
    node.children = node.children.filter((child) => {
      if (this.isText(child)) {
        const text = this.normalizeWhitespace(child.data ?? '');
        if (text && this.isFullscreenControlLabel(text)) {
          return false;
        }
      }
      return true;
    });
  }

  private isFullscreenControlLabel(text: string) {
    return text === '退出' || text === '全屏展示';
  }

  private resetChildParents(node: Element) {
    if (!node.children) {
      return;
    }
    node.children.forEach((child) => {
      if (this.isElement(child) || this.isText(child)) {
        (child as Element | Text).parent = node;
      }
    });
  }
}
