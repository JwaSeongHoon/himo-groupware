import { z } from 'zod'
import type { FormField, FormValue } from '../api/types'
import { compactDate } from './date'

const isDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)

/**
 * 제목 템플릿 렌더링 (AP-02c). {path.to.value} 를 값으로 치환하고 날짜는 YYYYMMDD 로 쓴다.
 * 값이 하나라도 비어 있으면 빈 문자열을 돌려준다.
 */
export function renderTitle(template: string, ctx: Record<string, unknown>): string {
  let missing = false
  const out = template.replace(/\{([\w.]+)\}/g, (_, path: string) => {
    const v = path.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), ctx)
    if (v === undefined || v === null || v === '') {
      missing = true
      return ''
    }
    return isDate(v) ? compactDate(v) : String(v)
  })
  return missing ? '' : out
}

/** 양식 정의로부터 검증 스키마를 만든다 (AP-02a) */
export function buildDataSchema(fields: FormField[]) {
  const shape: Record<string, z.ZodType> = {}
  for (const f of fields) {
    const msg = `${f.label}을(를) 입력하세요.`
    switch (f.type) {
      case 'number':
        shape[f.key] = f.required
          ? z.number({ error: msg }).nonnegative('0 이상의 숫자를 입력하세요.')
          : z.number().nonnegative('0 이상의 숫자를 입력하세요.').nullable().optional()
        break
      case 'dateRange': {
        const range = z
          .object({ from: z.string(), to: z.string() })
          .refine((r) => !f.required || (!!r.from && !!r.to), msg)
          .refine((r) => !r.from || !r.to || r.from <= r.to, '종료일이 시작일보다 빠릅니다.')
        shape[f.key] = range
        break
      }
      default:
        shape[f.key] = f.required ? z.string().trim().min(1, msg) : z.string().optional()
    }
  }
  return z.object(shape)
}

export function emptyValue(f: FormField): FormValue {
  if (f.type === 'number') return null
  if (f.type === 'dateRange') return { from: '', to: '' }
  return ''
}

/** 상세 화면 표시용 */
export function displayValue(f: FormField, v: FormValue | undefined): string {
  if (v === null || v === undefined || v === '') return ''
  if (typeof v === 'object') return `${v.from} ~ ${v.to}`.replaceAll('-', '.')
  if (f.type === 'number' && typeof v === 'number') return v.toLocaleString('ko-KR')
  if (f.type === 'date' && typeof v === 'string') return v.replaceAll('-', '.')
  return String(v)
}
