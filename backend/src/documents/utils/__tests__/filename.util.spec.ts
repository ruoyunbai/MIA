import { normalizeUploadedFilename } from '../filename.util';

describe('normalizeUploadedFilename', () => {
  it('returns sanitized filename when already readable', () => {
    const result = normalizeUploadedFilename('示例文档.pdf');
    expect(result).toBe('示例文档');
  });

  it('decodes latin1 mojibake to utf8', () => {
    const corrupted = Buffer.from(
      '基于深度学习的视频插帧研究进展.pdf',
      'utf8',
    ).toString('latin1');
    const result = normalizeUploadedFilename(corrupted);
    expect(result).toBe('基于深度学习的视频插帧研究进展');
  });

  it('decodes percent-encoded filenames', () => {
    const encoded =
      '%E5%9F%BA%E4%BA%8E%E6%B7%B1%E5%BA%A6%E5%AD%A6%E4%B9%A0.pdf';
    const result = normalizeUploadedFilename(encoded);
    expect(result).toBe('基于深度学习');
  });

  it('decodes MIME encoded-word filenames', () => {
    const encoded = '=?UTF-8?B?5Y+R5biD5pel5pys5Zyw?=.pdf';
    const result = normalizeUploadedFilename(encoded);
    expect(result).toBe('发布日本地');
  });

  it('returns empty string for invalid values', () => {
    expect(normalizeUploadedFilename('')).toBe('');
    expect(normalizeUploadedFilename('blob')).toBe('');
  });
});
