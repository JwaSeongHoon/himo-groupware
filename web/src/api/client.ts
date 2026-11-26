import type { ApiErrorBody } from './types'

/**
 * HTTP 클라이언트. 화면은 이 파일 뒤가 mock(MSW)인지 실제 서버인지 알지 못한다 (PRD 3.1-2).
 * 실제 서버 전환은 .env 의 VITE_USE_MOCK=false, VITE_API_BASE=<주소> 로만 한다 (MK-08).
 */
const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? ''

export class ApiError extends Error {
  status: number
  body: ApiErrorBody | null
  constructor(status: number, body: ApiErrorBody | null) {
    super(body?.message ?? `요청 실패 (${status})`)
    this.status = status
    this.body = body
  }
}

type Query = Record<string, string | number | undefined | null>

function buildUrl(path: string, query?: Query) {
  const url = new URL(BASE + path, window.location.origin)
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v))
    }
  }
  return url.toString()
}

async function request<T>(method: string, path: string, opts: { query?: Query; body?: unknown } = {}): Promise<T> {
  const isForm = opts.body instanceof FormData
  const res = await fetch(buildUrl(path, opts.query), {
    method,
    credentials: 'include',
    headers: opts.body && !isForm ? { 'Content-Type': 'application/json' } : undefined,
    body: opts.body === undefined ? undefined : isForm ? (opts.body as FormData) : JSON.stringify(opts.body),
  })
  if (!res.ok) {
    let body: ApiErrorBody | null = null
    try {
      body = (await res.json()) as ApiErrorBody
    } catch {
      /* 본문 없음 */
    }
    throw new ApiError(res.status, body)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const api = {
  get: <T>(path: string, query?: Query) => request<T>('GET', path, { query }),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, { body }),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, { body }),
  del: <T>(path: string) => request<T>('DELETE', path),
}

/** 첨부 내려받기: 권한 검사는 서버가 한다 */
export async function downloadFile(id: string, name: string) {
  const res = await fetch(buildUrl(`/api/files/${id}`), { credentials: 'include' })
  if (!res.ok) throw new ApiError(res.status, null)
  const blob = await res.blob()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}

export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'
