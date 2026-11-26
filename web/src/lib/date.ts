/** 날짜 유틸. 날짜는 'YYYY-MM-DD'(로컬), 일시는 ISO 문자열로 다룬다. CM-03 */

const pad = (n: number) => String(n).padStart(2, '0')

export function toYmd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const today = () => toYmd(new Date())

export function addDays(ymd: string, n: number): string {
  const d = parseYmd(ymd)
  d.setDate(d.getDate() + n)
  return toYmd(d)
}

export const monthStart = (ymd: string) => `${ymd.slice(0, 7)}-01`

/** 'YYYY.MM.DD' */
export function fmtDate(value: string | null | undefined): string {
  if (!value) return ''
  const d = value.length <= 10 ? parseYmd(value) : new Date(value)
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`
}

/** 'YYYY.MM.DD HH:mm' */
export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  return `${fmtDate(iso)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
export const weekday = (ymd: string) => (ymd ? WEEKDAYS[parseYmd(ymd).getDay()] : '')

/** 'YYYYMMDD' */
export const compactDate = (ymd: string) => ymd.replaceAll('-', '')

/** ISO 일시 → 로컬 'YYYY-MM-DD' */
export const isoToYmd = (iso: string) => toYmd(new Date(iso))

export function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}
