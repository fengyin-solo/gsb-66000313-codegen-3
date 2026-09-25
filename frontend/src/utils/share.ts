import type { ShareCase } from '../types'

/**
 * 分享链接编解码模块。
 *
 * 链接格式：`#/share/<base64url(JSON)>`，payload 为固定键序的 JSON：
 *   {"v":1,"p":"<pattern>","t":"<testString>"}
 * 编码过程不含时间戳/随机数，同一用例任何时候生成的链接完全一致，
 * 多次打开解码结果也一致（确定性）。
 */

/** 当前支持的分享格式版本 */
export const SHARE_VERSION = 1

/** 单字段与整体长度上限（字符数），超出即拒绝生成/恢复 */
export const MAX_PATTERN_LENGTH = 1000
export const MAX_TEST_STRING_LENGTH = 4000
// 需容纳字段上限的最坏情况：(1000+4000+JSON 开销) 的 base64 约 6700 字符
export const MAX_ENCODED_LENGTH = 7000

export type ShareErrorCode = 'invalid' | 'too-long' | 'version'

/** 带有用户可读说明的分享错误 */
export class ShareError extends Error {
  code: ShareErrorCode
  constructor(code: ShareErrorCode, message: string) {
    super(message)
    this.name = 'ShareError'
    this.code = code
  }
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(encoded: string): string {
  if (!/^[A-Za-z0-9_-]*$/.test(encoded)) {
    throw new ShareError('invalid', '链接已损坏：包含无法识别的字符，请确认链接完整复制。')
  }
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
  let binary: string
  try {
    binary = atob(base64)
  } catch {
    throw new ShareError('invalid', '链接已损坏：内容解码失败，请确认链接完整复制。')
  }
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0))
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    throw new ShareError('invalid', '链接已损坏：内容不是有效的文本编码。')
  }
}

function checkContentLimits(pattern: string, testString: string) {
  if (pattern.length > MAX_PATTERN_LENGTH) {
    throw new ShareError(
      'too-long',
      `内容超长：正则表达式 ${pattern.length} 字符，超过上限 ${MAX_PATTERN_LENGTH}，请缩短后再分享。`
    )
  }
  if (testString.length > MAX_TEST_STRING_LENGTH) {
    throw new ShareError(
      'too-long',
      `内容超长：测试文本 ${testString.length} 字符，超过上限 ${MAX_TEST_STRING_LENGTH}，请缩短后再分享。`
    )
  }
}

/** 将当前正则与测试文本编码为只读分享 payload（确定性：相同输入必得相同输出） */
export function encodeShareCase(pattern: string, testString: string): string {
  checkContentLimits(pattern, testString)
  // 固定键序，保证编码结果确定
  const json = JSON.stringify({ v: SHARE_VERSION, p: pattern, t: testString })
  const encoded = toBase64Url(json)
  if (encoded.length > MAX_ENCODED_LENGTH) {
    throw new ShareError(
      'too-long',
      `内容超长：编码后 ${encoded.length} 字符，超过链接上限 ${MAX_ENCODED_LENGTH}，请缩短正则或测试文本。`
    )
  }
  return encoded
}

/** 从 payload 恢复只读用例；失败时抛出带可理解说明的 ShareError */
export function decodeShareCase(encoded: string): ShareCase {
  const payload = (encoded || '').trim()
  if (!payload) {
    throw new ShareError('invalid', '链接无效：缺少分享内容，请确认链接完整。')
  }
  if (payload.length > MAX_ENCODED_LENGTH) {
    throw new ShareError(
      'too-long',
      `内容超长：链接内容 ${payload.length} 字符，超过上限 ${MAX_ENCODED_LENGTH}，无法恢复。`
    )
  }

  let raw: unknown
  try {
    raw = JSON.parse(fromBase64Url(payload))
  } catch (e) {
    if (e instanceof ShareError) throw e
    throw new ShareError('invalid', '链接已损坏：内容格式无法解析，请确认链接完整复制。')
  }

  if (typeof raw !== 'object' || raw === null) {
    throw new ShareError('invalid', '链接已损坏：分享内容结构不正确。')
  }
  const data = raw as Record<string, unknown>

  if (typeof data.v !== 'number') {
    throw new ShareError('invalid', '链接已损坏：缺少版本信息。')
  }
  if (data.v !== SHARE_VERSION) {
    throw new ShareError(
      'version',
      `版本不兼容：该链接由 v${data.v} 版本生成，当前仅支持 v${SHARE_VERSION}，请使用对应版本打开。`
    )
  }
  if (typeof data.p !== 'string' || typeof data.t !== 'string') {
    throw new ShareError('invalid', '链接已损坏：缺少正则或测试文本内容。')
  }
  checkContentLimits(data.p, data.t)

  return { version: data.v, pattern: data.p, testString: data.t }
}

/** 生成完整分享链接（基于当前页面地址，hash 路由无需服务端配置） */
export function buildShareUrl(pattern: string, testString: string): string {
  const encoded = encodeShareCase(pattern, testString)
  return `${window.location.origin}${window.location.pathname}#/share/${encoded}`
}

/** 从当前地址 hash 中解析分享 payload；非分享链接返回 null */
export function parseShareHash(hash: string): string | null {
  const match = /^#\/share\/(.+)$/.exec(hash)
  return match ? match[1] : null
}
