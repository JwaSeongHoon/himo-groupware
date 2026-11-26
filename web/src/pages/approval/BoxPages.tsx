import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { ApiError } from '../../api/client'
import { useBranches, useCancelRequest, useDocs, useForms, useMe } from '../../api/services'
import { DOC_STATUSES, type ApprovalBox, type ApprovalDoc, type DocListQuery } from '../../api/types'
import { DateRangeInput, FieldError, Modal, PageHeader, QueryError, StatusBadge, StatusBox } from '../../components/ui'
import { fmtDate, monthStart, today } from '../../lib/date'

type Filters = Required<Omit<DocListQuery, 'box'>>
const FILTER_KEYS: (keyof Filters)[] = ['from', 'to', 'branchCode', 'formId', 'status', 'hqConfirm', 'docNo']

/** 조회 조건을 쿼리 문자열에 보관해 새로고침·뒤로 가기에 견딘다 */
function useBoxFilters(defaults: Partial<Filters>) {
  const [params, setParams] = useSearchParams()
  const applied = Object.fromEntries(FILTER_KEYS.map((k) => [k, params.has(k) ? params.get(k)! : (defaults[k] ?? '')])) as Filters
  const [draft, setDraft] = useState<Filters>(applied)
  const selected = params.get('selected')

  const apply = () => {
    const next = new URLSearchParams()
    for (const k of FILTER_KEYS) next.set(k, draft[k])
    setParams(next)
  }
  const select = (id: string) => {
    const next = new URLSearchParams(params)
    next.set('selected', id)
    setParams(next, { replace: true })
  }
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setDraft((d) => ({ ...d, [k]: v }))
  return { applied, draft, set, apply, selected, select }
}

function FilterBar({ children, onApply, actions }: { children: ReactNode; onApply: () => void; actions?: ReactNode }) {
  return (
    <form
      className="filter-bar mb-2"
      onSubmit={(e) => {
        e.preventDefault()
        onApply()
      }}
    >
      {children}
      <button type="submit" className="btn btn-primary">
        🔍 조회
      </button>
      {actions && <div className="ml-auto flex gap-2">{actions}</div>}
    </form>
  )
}

function WorkplaceSelect({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const { data: branches } = useBranches()
  return (
    <label>
      {label}
      <select className="input w-40" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">전체</option>
        <option value="1000">본사</option>
        {branches?.map((b) => (
          <option key={b.id} value={b.code}>
            {b.name}
          </option>
        ))}
      </select>
    </label>
  )
}

interface Column {
  header: string
  className?: string
  cell: (d: ApprovalDoc) => ReactNode
}

function DocTable({ box, query, columns, selected, onSelect }: { box: ApprovalBox; query: DocListQuery; columns: Column[]; selected: string | null; onSelect: (id: string) => void }) {
  const navigate = useNavigate()
  const { data, isLoading, error, refetch } = useDocs(query)
  const open = (d: ApprovalDoc) => navigate(`/approval/doc/${d.id}?from=${box}`)

  return (
    <>
      <div className="mb-1 text-gray-500">{data && `총 ${data.length}건`}</div>
      <div className="grid-wrap max-h-[calc(100vh-15rem)]">
        <table className="data-grid">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.header} className={c.className}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data?.map((d) => (
              <tr
                key={d.id}
                tabIndex={0}
                aria-selected={d.id === selected}
                onClick={() => onSelect(d.id)}
                onDoubleClick={() => open(d)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') open(d)
                  if (e.key === ' ') {
                    e.preventDefault()
                    onSelect(d.id)
                  }
                  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                    e.preventDefault()
                    const sib = e.key === 'ArrowDown' ? e.currentTarget.nextElementSibling : e.currentTarget.previousElementSibling
                    ;(sib as HTMLElement | null)?.focus()
                  }
                }}
              >
                {columns.map((c) => (
                  <td key={c.header}>
                    <div className={c.className}>{c.cell(d)}</div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {isLoading && <StatusBox kind="loading" />}
        {error && <QueryError error={error} onRetry={() => refetch()} />}
        {data?.length === 0 && <StatusBox kind="empty" />}
      </div>
      <p className="mt-1 text-xs text-gray-500">행을 두 번 클릭하거나 Enter 키를 누르면 문서를 엽니다.</p>
    </>
  )
}

const titleCell = (box: ApprovalBox) => (d: ApprovalDoc) => (
  <Link to={`/approval/doc/${d.id}?from=${box}`} className="hover:text-brand hover:underline" onClick={(e) => e.stopPropagation()}>
    {d.title}
  </Link>
)

// ───────────── 상신함 (S-20) ─────────────

export function SentBoxPage() {
  const { data: me } = useMe()
  const { data: forms } = useForms()
  const navigate = useNavigate()
  const t = today()
  const f = useBoxFilters({ from: monthStart(t), to: t })
  const [cancelTarget, setCancelTarget] = useState<string | null>(null)
  if (!me) return null

  // 지점명은 본인 소속으로 고정 [가정] — AP-05b
  const query: DocListQuery = { box: 'sent', ...f.applied, branchCode: '' }

  const columns: Column[] = [
    { header: '지점명', cell: (d) => d.branchName },
    { header: '품의번호', cell: (d) => d.docNo },
    { header: '작성자', cell: (d) => d.drafter.name },
    { header: '문서종류', cell: (d) => d.docType },
    { header: '제목', className: 'max-w-80 truncate', cell: titleCell('sent') },
    { header: '오더번호', cell: (d) => d.orderNo },
    { header: '고객명', cell: (d) => d.customerName },
    { header: 'check', className: 'text-center', cell: (d) => d.check },
    { header: '등록일자', cell: (d) => fmtDate(d.draftedAt) },
    { header: '결재상태', cell: (d) => <StatusBadge status={d.status} /> },
    { header: '최종결재자', cell: (d) => d.finalApprover },
    { header: '재경/기획 확인', className: 'text-center', cell: (d) => d.financeConfirm },
    { header: '취소 사유', className: 'max-w-48 truncate', cell: (d) => d.cancelReason },
  ]

  return (
    <div>
      <PageHeader title="상신함" />
      <FilterBar
        onApply={f.apply}
        actions={
          <>
            <button type="button" className="btn" onClick={() => navigate('/approval/forms/proposal')}>
              결재요청 등록
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => (f.selected ? setCancelTarget(f.selected) : alert('취소요청할 문서를 목록에서 선택하세요.'))}
            >
              취소요청 등록
            </button>
          </>
        }
      >
        <label>
          지점명
          <select className="input w-44" disabled value={me.workplace.code} aria-describedby="branch-fixed">
            <option value={me.workplace.code}>{me.workplace.name}</option>
          </select>
        </label>
        <label>
          기안일자
          <DateRangeInput label="기안일자" from={f.draft.from} to={f.draft.to} onChange={(from, to) => (f.set('from', from), f.set('to', to))} />
        </label>
        <label>
          문서종류
          <select className="input w-44" value={f.draft.formId} onChange={(e) => f.set('formId', e.target.value)}>
            <option value="">전체</option>
            {forms
              ?.filter((x) => x.kind === 'document')
              .map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
          </select>
        </label>
        <label>
          결재상태
          <select className="input w-32" value={f.draft.status} onChange={(e) => f.set('status', e.target.value as Filters['status'])}>
            <option value="">전체</option>
            {DOC_STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          영업본부확인
          <select className="input w-20" value={f.draft.hqConfirm} onChange={(e) => f.set('hqConfirm', e.target.value as Filters['hqConfirm'])}>
            <option value="">전체</option>
            <option>Y</option>
            <option>N</option>
          </select>
        </label>
        <label>
          품의서번호
          <input className="input w-40" value={f.draft.docNo} onChange={(e) => f.set('docNo', e.target.value)} />
        </label>
      </FilterBar>

      <DocTable box="sent" query={query} columns={columns} selected={f.selected} onSelect={f.select} />

      {cancelTarget && <CancelRequestModal docId={cancelTarget} onClose={() => setCancelTarget(null)} />}
    </div>
  )
}

function CancelRequestModal({ docId, onClose }: { docId: string; onClose: () => void }) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const cancel = useCancelRequest()

  const submit = async () => {
    if (!reason.trim()) return setError('취소 사유를 입력하세요.')
    try {
      await cancel.mutateAsync({ id: docId, reason })
      onClose()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '요청에 실패했습니다.')
    }
  }

  return (
    <Modal
      title="취소요청 등록"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            닫기
          </button>
          <button type="button" className="btn btn-primary" onClick={submit} disabled={cancel.isPending}>
            취소요청 등록
          </button>
        </>
      }
    >
      <label htmlFor="cancel-reason" className="mb-1 block font-semibold">
        취소 사유 <span className="text-red-600">*</span>
      </label>
      <textarea id="cancel-reason" rows={4} className={`input w-full ${error ? 'input-invalid' : ''}`} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
      <FieldError message={error ?? undefined} />
      <p className="mt-2 text-xs text-gray-500">결재대기·결재중·최종결재완료 문서만 취소요청할 수 있습니다.</p>
    </Modal>
  )
}

// ───────────── 미결함 (S-21) / 기결함 (S-22) ─────────────

const inboxColumns = (box: ApprovalBox): Column[] => [
  { header: '품의번호', cell: (d) => d.docNo },
  { header: '기안일', cell: (d) => fmtDate(d.draftedAt) },
  { header: '사업장', cell: (d) => d.branchCode },
  { header: '사업장명', cell: (d) => d.branchName },
  { header: '제목', className: 'max-w-96 truncate', cell: titleCell(box) },
  { header: '기안자', cell: (d) => `${d.drafter.name} ${d.drafter.position}` },
  { header: '오더번호', cell: (d) => d.orderNo },
  { header: '고객명', cell: (d) => d.customerName },
  { header: '결재상태', cell: (d) => <StatusBadge status={d.status} /> },
]

function InboxPage({ box, title, branchLabel, defaults }: { box: 'pending' | 'done'; title: string; branchLabel: string; defaults: Partial<Filters> }) {
  const f = useBoxFilters(defaults)
  const query: DocListQuery = { box, from: f.applied.from, to: f.applied.to, branchCode: f.applied.branchCode }
  return (
    <div>
      <PageHeader title={title} />
      <FilterBar onApply={f.apply} actions={<span className="font-bold text-red-600">※결재라인에 있는 사람만 열람 가능!!</span>}>
        <WorkplaceSelect label={branchLabel} value={f.draft.branchCode} onChange={(v) => f.set('branchCode', v)} />
        <label>
          기안일자
          <DateRangeInput label="기안일자" from={f.draft.from} to={f.draft.to} onChange={(from, to) => (f.set('from', from), f.set('to', to))} />
        </label>
      </FilterBar>
      <DocTable box={box} query={query} columns={inboxColumns(box)} selected={f.selected} onSelect={f.select} />
    </div>
  )
}

/** 미결함: 기본 기간은 전체 [가정 A14] — 알림 건수와 목록이 어긋나지 않도록 */
export const PendingBoxPage = () => <InboxPage box="pending" title="미결함" branchLabel="지점명" defaults={{}} />

export function DoneBoxPage() {
  const t = today()
  return <InboxPage box="done" title="기결함" branchLabel="사업장" defaults={{ from: monthStart(t), to: t }} />
}
