import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { ApiError } from '../../api/client'
import { useApprove, useDoc, useForm, useReject } from '../../api/services'
import type { ApprovalDoc, ApprovalLine } from '../../api/types'
import { AttachmentList } from '../../components/attachments'
import { FieldError, PageHeader, QueryError, StatusBadge, StatusBox } from '../../components/ui'
import { fmtDate, fmtDateTime } from '../../lib/date'
import { displayValue } from '../../lib/form'

const BACK: Record<string, [string, string]> = {
  sent: ['/approval/box/sent', '상신함'],
  pending: ['/approval/box/pending', '미결함'],
  done: ['/approval/box/done', '기결함'],
}

/** S-23 문서 상세 / 결재 처리 (AP-08) */
export function DocDetailPage() {
  const { docId } = useParams() as { docId: string }
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { data: doc, isLoading, error, refetch } = useDoc(docId)
  const back = BACK[params.get('from') ?? ''] ?? BACK.sent

  if (isLoading) return <StatusBox kind="loading" />
  // 열람 권한: 기안자와 결재라인에 있는 사람만 (AP-08d → CM-06)
  if (error) return <QueryError error={error} onRetry={() => refetch()} />
  if (!doc) return null

  return (
    <div className="max-w-5xl">
      <PageHeader title={doc.docType}>
        <button type="button" className="btn" onClick={() => navigate(back[0])}>
          ‹ {back[1]}
        </button>
      </PageHeader>

      <LineStamps lines={doc.lines} drafter={`${doc.drafter.name} ${doc.drafter.position}`} />

      <table className="info-table mt-3">
        <tbody>
          <tr>
            <th>품의번호</th>
            <td>{doc.docNo}</td>
            <th>결재상태</th>
            <td>
              <StatusBadge status={doc.status} />
            </td>
          </tr>
          <tr>
            <th>기안자</th>
            <td>
              {doc.drafter.name} {doc.drafter.position} ({doc.drafter.departmentName})
            </td>
            <th>사업장</th>
            <td>
              {doc.branchName} ({doc.branchCode})
            </td>
          </tr>
          <tr>
            <th>기안일</th>
            <td>{fmtDate(doc.draftedAt)}</td>
            <th>최종결재자</th>
            <td>{doc.finalApprover}</td>
          </tr>
          <tr>
            <th>제목</th>
            <td colSpan={3} className="font-semibold">
              {doc.title}
            </td>
          </tr>
          <FormData doc={doc} />
          <tr>
            <th>check / 영업본부 / 재경·기획</th>
            <td colSpan={3}>
              {doc.check} / {doc.hqConfirm} / {doc.financeConfirm} <span className="ml-2 text-xs text-gray-500">(후속 확인 — 값 표시만, 가정 A12)</span>
            </td>
          </tr>
          {doc.cancelReason && (
            <tr>
              <th>취소 사유</th>
              <td colSpan={3} className="text-red-700">
                {doc.cancelReason}
              </td>
            </tr>
          )}
          <tr>
            <th>첨부</th>
            <td colSpan={3}>
              <AttachmentList files={doc.attachments} />
            </td>
          </tr>
        </tbody>
      </table>

      <h2 className="mt-5 mb-1.5 font-bold">결재라인</h2>
      <div className="grid-wrap">
        <table className="data-grid">
          <thead>
            <tr>
              <th className="w-14">순서</th>
              <th>결재자</th>
              <th>소속</th>
              <th className="w-24">상태</th>
              <th className="w-36">처리일시</th>
              <th>의견</th>
            </tr>
          </thead>
          <tbody>
            {doc.lines.map((l) => (
              <tr key={l.order} className="cursor-default">
                <td className="text-center">
                  {l.order}
                  {l.order === doc.lines.length && <span className="ml-1 text-[11px] text-brand">최종</span>}
                </td>
                <td>
                  {l.approver.name} {l.approver.position}
                </td>
                <td>
                  {l.approver.departmentName}
                  {l.approver.branchName ? ` · ${l.approver.branchName}` : ''}
                </td>
                <td>
                  <LineStatus line={l} doc={doc} />
                </td>
                <td>{fmtDateTime(l.actedAt)}</td>
                <td className="whitespace-pre-wrap">{l.comment}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {doc.myTurn && <ActionPanel doc={doc} onDone={() => navigate('/approval/box/pending')} />}
    </div>
  )
}

function LineStatus({ line, doc }: { line: ApprovalLine; doc: ApprovalDoc }) {
  if (line.status === 'approved') return <span className="font-semibold text-green-700">승인</span>
  if (line.status === 'rejected') return <span className="font-semibold text-red-600">반려</span>
  const current = (doc.status === '결재대기' || doc.status === '결재중') && doc.lines.find((l) => l.status === 'waiting')?.order === line.order
  return current ? <span className="font-semibold text-amber-700">결재 차례</span> : <span className="text-gray-400">대기</span>
}

/** 결재 도장란 */
function LineStamps({ lines, drafter }: { lines: ApprovalLine[]; drafter: string }) {
  const cells = [{ title: '기안', name: drafter, mark: '기안', color: 'text-gray-700' }].concat(
    lines.map((l) => ({
      title: l.order === lines.length ? '최종결재' : `${l.order}차 결재`,
      name: `${l.approver.name} ${l.approver.position}`,
      mark: l.status === 'approved' ? '승인' : l.status === 'rejected' ? '반려' : '',
      color: l.status === 'approved' ? 'text-red-600' : 'text-red-800',
    })),
  )
  return (
    <div className="flex justify-end">
      <table className="border-collapse border border-gray-500 text-center text-xs">
        <tbody>
          <tr>
            {cells.map((c, i) => (
              <th key={i} className="w-24 border border-gray-500 bg-[#eef1f6] py-1 font-semibold">
                {c.title}
              </th>
            ))}
          </tr>
          <tr>
            {cells.map((c, i) => (
              <td key={i} className="h-12 border border-gray-500 bg-white">
                {c.mark && <span className={`inline-block rounded-full border-2 border-current px-1.5 py-0.5 font-bold ${c.color}`}>{c.mark}</span>}
              </td>
            ))}
          </tr>
          <tr>
            {cells.map((c, i) => (
              <td key={i} className="border border-gray-500 bg-white py-1">
                {c.name}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

/** 양식별 입력값 표시 */
function FormData({ doc }: { doc: ApprovalDoc }) {
  const { data: form } = useForm(doc.formId)
  if (!form) return null
  if (!form.fields.length) {
    return (
      <>
        {(doc.orderNo || doc.customerName) && (
          <tr>
            <th>오더번호 / 고객명</th>
            <td colSpan={3}>
              {doc.orderNo} / {doc.customerName}
            </td>
          </tr>
        )}
      </>
    )
  }
  return (
    <>
      {form.fields.map((f) => (
        <tr key={f.key}>
          <th>{f.label}</th>
          <td colSpan={3} className={f.type === 'textarea' ? 'whitespace-pre-wrap' : ''}>
            {displayValue(f, doc.data[f.key])}
          </td>
        </tr>
      ))}
    </>
  )
}

/** 승인 / 반려 (AP-08a): 반려 시 의견 필수 [가정] */
function ActionPanel({ doc, onDone }: { doc: ApprovalDoc; onDone: () => void }) {
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)
  const approve = useApprove()
  const reject = useReject()
  const busy = approve.isPending || reject.isPending
  const isLast = doc.lines.filter((l) => l.status === 'waiting').length === 1

  const run = async (kind: 'approve' | 'reject') => {
    setError(null)
    if (kind === 'reject' && !comment.trim()) return setError('반려 시 의견을 입력해야 합니다.')
    const msg = kind === 'approve' ? (isLast ? '최종 승인하시겠습니까?' : '승인하시겠습니까? 다음 결재자에게 넘어갑니다.') : '반려하시겠습니까? 문서는 반려 상태로 종료됩니다.'
    if (!confirm(msg)) return
    try {
      await (kind === 'approve' ? approve : reject).mutateAsync({ id: doc.id, comment })
      onDone()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '처리에 실패했습니다.')
    }
  }

  return (
    <section className="mt-5 border-2 border-brand bg-brand-light p-3" aria-label="결재 처리">
      <h2 className="mb-1.5 font-bold text-brand">결재 처리 — 내 결재 차례입니다</h2>
      <label htmlFor="comment" className="mb-1 block text-gray-700">
        의견 <span className="text-xs text-gray-500">(반려 시 필수)</span>
      </label>
      <textarea id="comment" rows={3} className={`input w-full ${error ? 'input-invalid' : ''}`} value={comment} onChange={(e) => setComment(e.target.value)} />
      <FieldError message={error ?? undefined} />
      <div className="mt-2 flex justify-end gap-2">
        <button type="button" className="btn btn-danger" disabled={busy} onClick={() => run('reject')}>
          반려
        </button>
        <button type="button" className="btn btn-primary" disabled={busy} onClick={() => run('approve')}>
          {isLast ? '최종 승인' : '승인'}
        </button>
      </div>
    </section>
  )
}
