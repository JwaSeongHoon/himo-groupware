import { useEffect, useRef, type ReactNode } from 'react'
import { Link } from 'react-router'
import { ApiError } from '../api/client'
import { weekday } from '../lib/date'

/** 화면 제목 줄 */
export function PageHeader({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3">
      <h1 className="flex items-center gap-2 text-lg font-bold text-gray-800">
        <span className="inline-block h-4 w-1.5 rounded-sm bg-brand" aria-hidden />
        {title}
      </h1>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  )
}

/** 로딩·빈 목록·오류 (CM-05) */
export function StatusBox({ kind, message, onRetry }: { kind: 'loading' | 'empty' | 'error'; message?: string; onRetry?: () => void }) {
  return (
    <div role={kind === 'error' ? 'alert' : 'status'} className="flex flex-col items-center justify-center gap-2 py-10 text-gray-500">
      {kind === 'loading' && <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-brand" aria-hidden />}
      <span className={kind === 'error' ? 'text-red-600' : ''}>
        {message ?? (kind === 'loading' ? '불러오는 중…' : kind === 'empty' ? '조회된 자료가 없습니다.' : '오류가 발생했습니다.')}
      </span>
      {onRetry && (
        <button type="button" className="btn btn-sm" onClick={onRetry}>
          다시 시도
        </button>
      )}
    </div>
  )
}

/** 권한 없음 안내 (CM-06) */
export function Forbidden({ message }: { message?: string }) {
  return (
    <div className="mx-auto mt-16 max-w-md rounded border border-line bg-white p-8 text-center shadow-sm">
      <div className="mb-2 text-3xl" aria-hidden>
        🔒
      </div>
      <h2 className="mb-2 text-base font-bold">열람 권한이 없습니다</h2>
      <p className="mb-5 text-gray-600">{message ?? '이 화면을 볼 수 있는 권한이 없습니다.'}</p>
      <Link to="/board/company" className="btn">
        사내게시판으로 이동
      </Link>
    </div>
  )
}

/** 조회 오류를 권한 없음 / 일반 오류로 나눠 표시 */
export function QueryError({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  if (error instanceof ApiError && error.status === 403) return <Forbidden message={error.message} />
  if (error instanceof ApiError && error.status === 404) return <StatusBox kind="error" message={error.message} />
  return <StatusBox kind="error" message={error instanceof Error ? error.message : undefined} onRetry={onRetry} />
}

/** 날짜 입력 + 요일 표시 (CM-03) */
export function DateInput({ value, onChange, label, invalid, id }: { value: string; onChange: (v: string) => void; label: string; invalid?: boolean; id?: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <input id={id} type="date" aria-label={label} className={`input w-34 ${invalid ? 'input-invalid' : ''}`} value={value} onChange={(e) => onChange(e.target.value)} />
      <span className="w-5 text-gray-500" aria-hidden>
        {value ? `(${weekday(value)})` : ''}
      </span>
    </span>
  )
}

export function DateRangeInput({
  from,
  to,
  onChange,
  label,
  invalid,
}: {
  from: string
  to: string
  onChange: (from: string, to: string) => void
  label: string
  invalid?: boolean
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <DateInput label={`${label} 시작`} value={from} invalid={invalid} onChange={(v) => onChange(v, to)} />
      <span aria-hidden>~</span>
      <DateInput label={`${label} 종료`} value={to} invalid={invalid} onChange={(v) => onChange(from, v)} />
    </span>
  )
}

/** 간단한 모달 대화상자 */
export function Modal({ title, children, onClose, footer }: { title: string; children: ReactNode; onClose: () => void; footer: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    d?.showModal()
    return () => d?.close()
  }, [])
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      className="m-auto w-[480px] rounded border border-gray-400 p-0 shadow-xl backdrop:bg-black/30"
    >
      <div className="bg-brand px-4 py-2 font-bold text-white">{title}</div>
      <div className="p-4">{children}</div>
      <div className="flex justify-end gap-2 border-t border-gray-200 bg-gray-50 px-4 py-2">{footer}</div>
    </dialog>
  )
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p role="alert" className="mt-1 text-xs text-red-600">
      {message}
    </p>
  )
}

/** 결재상태 배지 */
export function StatusBadge({ status }: { status: string }) {
  const color: Record<string, string> = {
    결재대기: 'bg-amber-100 text-amber-800',
    결재중: 'bg-blue-100 text-blue-800',
    최종결재완료: 'bg-green-100 text-green-800',
    반려: 'bg-red-100 text-red-700',
    취소요청: 'bg-gray-200 text-gray-700',
  }
  return <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${color[status] ?? 'bg-gray-100'}`}>{status}</span>
}
