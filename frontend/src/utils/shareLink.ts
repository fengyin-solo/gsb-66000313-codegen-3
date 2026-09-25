import type { SharePayload, ShareError } from '../types'

// 分享链接格式版本。结构变更时递增，旧版本链接会收到"版本不兼容"说明。
export const SHARE_VERSION = 1

// 正则 + 测试文本的字符数上限，避免生成过长链接
export const MAX_SHARE_TEXT_LENGTH = 4000
// 编码后数据段的长度上限（约 6KB URL，主流浏览器/网关均可接受）
export const MAX_SHARE_DATA_LENGTH = 8000

export const SHARE_HASH_PREFIX = '#/share/'

export type DecodeResult =
  | { ok: true; payload: SharePayload }
  | { ok: false; error: ShareError }

export type EncodeResult =
  | { ok: true; data: string }
  | { ok: false; error: ShareError }

function err(code: ShareError['code'], message: string): { ok: false; error: ShareError } {
  return { ok: false, error: { code, message } }
}

// UTF-8 安全的 base64url 编码（URL 中无需转义，保证同一内容多次编码结果一致）
function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(data: string): string {
  const b64 = data.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64)
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

/**
 * 将当前正则与测试文本编码为只读用例数据段。
 * 内容超长时拒绝生成并返回可理解的说明。
 */
export function encodeShareCase(pattern: string, testString: string): EncodeResult {
  const total = pattern.length + testString.length
  if (total > MAX_SHARE_TEXT_LENGTH) {
    return err('too-large', `分享内容超长：正则与测试文本共 ${total} 字符，超过上限 ${MAX_SHARE_TEXT_LENGTH} 字符，请精简后再分享`)
  }
  const payload: SharePayload = { v: SHARE_VERSION, pattern, testString }
  const data = toBase64Url(JSON.stringify(payload))
  if (data.length > MAX_SHARE_DATA_LENGTH) {
    return err('too-large', `分享内容超长：编码后 ${data.length} 字符，超过链接上限 ${MAX_SHARE_DATA_LENGTH} 字符，请精简后再分享`)
  }
  return { ok: true, data }
}

/** 生成完整分享链接（确定性：同一用例多次生成结果一致） */
export function buildShareUrl(pattern: string, testString: string, baseUrl: string): { ok: true; url: string } | { ok: false; error: ShareError } {
  const encoded = encodeShareCase(pattern, testString)
  if (!encoded.ok) return { ok: false, error: encoded.error }
  return { ok: true, url: `${baseUrl}${SHARE_HASH_PREFIX}${encoded.data}` }
}

/**
 * 从链接数据段还原只读用例。
 * 链接损坏、内容超长、版本不兼容时返回可理解的错误说明，不抛异常。
 */
export function decodeShareCase(data: string): DecodeResult {
  if (!data) {
    return err('invalid', '分享链接缺少用例数据，无法还原。请确认链接是否完整')
  }
  if (data.length > MAX_SHARE_DATA_LENGTH) {
    return err('too-large', `分享内容超长：链接数据 ${data.length} 字符，超过上限 ${MAX_SHARE_DATA_LENGTH} 字符，无法安全还原`)
  }
  if (!/^[A-Za-z0-9_-]+$/.test(data)) {
    return err('invalid', '分享链接已损坏：包含非法字符，无法还原用例。请向分享者索取完整链接')
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(fromBase64Url(data))
  } catch {
    return err('invalid', '分享链接已损坏：用例数据无法解析。请向分享者索取完整链接')
  }
  if (typeof parsed !== 'object' || parsed === null) {
    return err('invalid', '分享链接已损坏：用例数据结构不完整')
  }
  const p = parsed as Record<string, unknown>
  if (typeof p.v !== 'number') {
    return err('invalid', '分享链接已损坏：缺少版本信息，无法确认识别方式')
  }
  if (p.v !== SHARE_VERSION) {
    return err('unsupported-version', `分享链接版本不兼容：链接由 v${p.v} 版本生成，当前仅支持 v${SHARE_VERSION}。请使用对应版本打开，或让分享者重新生成`)
  }
  if (typeof p.pattern !== 'string' || typeof p.testString !== 'string') {
    return err('invalid', '分享链接已损坏：用例缺少正则或测试文本')
  }
  if (p.pattern.length + p.testString.length > MAX_SHARE_TEXT_LENGTH) {
    return err('too-large', `分享内容超长：用例共 ${p.pattern.length + p.testString.length} 字符，超过上限 ${MAX_SHARE_TEXT_LENGTH} 字符`)
  }
  return { ok: true, payload: { v: p.v, pattern: p.pattern, testString: p.testString } }
}

/** 从 location.hash 中提取分享数据段；非分享链接返回 null */
export function parseShareHash(hash: string): string | null {
  const match = /^#\/share\/(.*)$/.exec(hash)
  return match ? match[1] : null
}
