import { http } from 'msw'
import type { ApprovalDoc, ApprovalForm, DocCreateInput, FormValue, User } from '../../api/types'
import { db, nextId, save, type DbDoc } from '../db'
import { summaryOf, userById, workplaceOf } from '../org-helpers'
import { forms } from '../seed/forms'
import { authed, fail, json } from './common'

type P = { id: string }

const IN_PROGRESS = ['결재대기', '결재중'] as const

/** 현재 결재 차례의 결재선 (순차 결재, 가정 A10) */
function currentLine(d: DbDoc) {
  if (!(IN_PROGRESS as readonly string[]).includes(d.status)) return null
  return d.lines.find((l) => l.status === 'waiting') ?? null
}

const isMyTurn = (d: DbDoc, u: User) => currentLine(d)?.approverId === u.id
const canView = (d: DbDoc, u: User) => d.drafterId === u.id || d.lines.some((l) => l.approverId === u.id)

function toDoc(d: DbDoc, me: User): ApprovalDoc {
  const form = forms.find((f) => f.id === d.formId)
  const last = d.lines[d.lines.length - 1]
  const lastUser = userById(last.approverId)!
  const str = (v: FormValue | undefined) => (typeof v === 'string' && v ? v : null)
  return {
    id: d.id,
    docNo: d.docNo,
    formId: d.formId,
    docType: form?.name ?? d.formId,
    title: d.title,
    drafter: summaryOf(userById(d.drafterId)!),
    branchCode: d.branchCode,
    branchName: d.branchName,
    draftedAt: d.draftedAt,
    orderNo: str(d.data.orderNo),
    customerName: str(d.data.customerName),
    data: d.data,
    status: d.status,
    lines: d.lines.map((l) => ({
      order: l.order,
      approver: summaryOf(userById(l.approverId)!),
      status: l.status,
      actedAt: l.actedAt,
      comment: l.comment,
    })),
    finalApprover: d.status === '최종결재완료' || (d.status === '취소요청' && last.status === 'approved') ? `${lastUser.name} ${lastUser.position}` : null,
    check: d.check,
    hqConfirm: d.hqConfirm,
    financeConfirm: d.financeConfirm,
    cancelReason: d.cancelReason,
    attachments: db.files.filter((f) => d.attachmentIds.includes(f.id)),
    myTurn: isMyTurn(d, me),
  }
}

/** 품의번호: 사업장코드 + G + YYMM + - + 일련번호 5자리, 사업장·월별 채번 (AP-03a) */
function nextDocNo(code: string, ymd: string) {
  const prefix = `${code}G${ymd.slice(2, 4)}${ymd.slice(5, 7)}-`
  const max = db.docs.filter((d) => d.docNo.startsWith(prefix)).reduce((m, d) => Math.max(m, Number(d.docNo.slice(prefix.length))), 0)
  return `${prefix}${String(max + 1).padStart(5, '0')}`
}

function localYmd(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function validateDoc(form: ApprovalForm, input: DocCreateInput): Record<string, string> | null {
  const errors: Record<string, string> = {}
  if (!input.title?.trim()) errors.title = '제목을 입력하세요.'
  for (const f of form.fields) {
    const v = input.data?.[f.key]
    const empty = v === null || v === undefined || v === '' || (typeof v === 'object' && (!v.from || !v.to))
    if (f.required && empty) errors[f.key] = `${f.label}을(를) 입력하세요.`
    if (v && typeof v === 'object' && v.from && v.to && v.from > v.to) errors[f.key] = '종료일이 시작일보다 빠릅니다.'
  }
  if (!input.approverIds?.length) errors.approvers = '결재자를 1명 이상 지정하세요.'
  else if (input.approverIds.some((id) => !userById(id))) errors.approvers = '존재하지 않는 결재자가 있습니다.'
  else if (new Set(input.approverIds).size !== input.approverIds.length) errors.approvers = '같은 결재자가 중복되었습니다.'
  return Object.keys(errors).length ? errors : null
}

function loadDoc(id: string, user: User): DbDoc | Response {
  const d = db.docs.find((x) => x.id === id)
  if (!d) return fail(404, '문서가 없습니다.')
  if (!canView(d, user)) return fail(403, '결재라인에 있는 사람만 열람 가능합니다.') // AP-08d
  return d
}

export const approvalHandlers = [
  http.get(
    '/api/approval/forms',
    authed(({ request }) => {
      const category = new URL(request.url).searchParams.get('category')
      return json(forms.filter((f) => !category || f.category === category).sort((a, b) => a.sortOrder - b.sortOrder))
    }),
  ),
  http.get(
    '/api/approval/forms/:id',
    authed<P>(({ params }) => {
      const f = forms.find((x) => x.id === params.id)
      return f ? json(f) : fail(404, '없는 양식입니다.')
    }),
  ),

  http.get(
    '/api/approval/pending-count',
    authed(({ user }) => json({ count: db.docs.filter((d) => isMyTurn(d, user)).length })),
  ),

  /** 결재함 목록 (AP-05b, AP-06b, AP-07a — 가정 A13) */
  http.get(
    '/api/approval/docs',
    authed(({ request, user }) => {
      const sp = new URL(request.url).searchParams
      const box = sp.get('box')
      const from = sp.get('from')
      const to = sp.get('to')
      const branchCode = sp.get('branchCode')
      const formId = sp.get('formId')
      const status = sp.get('status')
      const hqConfirm = sp.get('hqConfirm')
      const docNo = (sp.get('docNo') ?? '').trim()

      let list = db.docs
      if (box === 'sent') list = list.filter((d) => d.drafterId === user.id)
      else if (box === 'pending') list = list.filter((d) => isMyTurn(d, user))
      else if (box === 'done') list = list.filter((d) => d.lines.some((l) => l.approverId === user.id && l.status !== 'waiting'))
      else return fail(400, 'box 값이 올바르지 않습니다.')

      if (from) list = list.filter((d) => d.draftedAt >= from)
      if (to) list = list.filter((d) => d.draftedAt <= to)
      if (branchCode) list = list.filter((d) => d.branchCode === branchCode)
      if (formId) list = list.filter((d) => d.formId === formId)
      if (status) list = list.filter((d) => d.status === status)
      if (hqConfirm) list = list.filter((d) => d.hqConfirm === hqConfirm)
      if (docNo) list = list.filter((d) => d.docNo.includes(docNo))

      const sorted = [...list].sort((a, b) => b.draftedAt.localeCompare(a.draftedAt) || b.docNo.localeCompare(a.docNo))
      return json(sorted.map((d) => toDoc(d, user)))
    }),
  ),

  http.get(
    '/api/approval/docs/:id',
    authed<P>(({ params, user }) => {
      const d = loadDoc(params.id, user)
      return d instanceof Response ? d : json(toDoc(d, user))
    }),
  ),

  /** 결재요청 등록 (AP-03) */
  http.post(
    '/api/approval/docs',
    authed(async ({ request, user }) => {
      const input = (await request.json()) as DocCreateInput
      const form = forms.find((f) => f.id === input.formId)
      if (!form || form.kind !== 'document' || !form.enabled) return fail(400, '작성할 수 없는 양식입니다.')
      const errors = validateDoc(form, input)
      if (errors) return fail(422, '입력값을 확인하세요.', errors)
      const wp = workplaceOf(user)
      const draftedAt = localYmd()
      const doc: DbDoc = {
        id: nextId('doc'),
        docNo: nextDocNo(wp.code, draftedAt),
        formId: form.id,
        title: input.title.trim(),
        drafterId: user.id,
        branchCode: wp.code,
        branchName: wp.name,
        draftedAt,
        data: input.data,
        status: '결재대기',
        lines: input.approverIds.map((id, i) => ({ order: i + 1, approverId: id, status: 'waiting', actedAt: null, comment: null })),
        check: 'N',
        hqConfirm: 'N',
        financeConfirm: 'N',
        cancelReason: null,
        attachmentIds: input.attachmentIds ?? [],
      }
      db.docs.push(doc)
      save()
      return json(toDoc(doc, user), 201)
    }),
  ),

  /** 승인 (AP-08b) */
  http.post(
    '/api/approval/docs/:id/approve',
    authed<P>(async ({ request, params, user }) => {
      const d = loadDoc(params.id, user)
      if (d instanceof Response) return d
      const line = currentLine(d)
      if (!line || line.approverId !== user.id) return fail(409, '현재 결재 차례가 아닙니다.')
      const { comment } = (await request.json()) as { comment?: string }
      line.status = 'approved'
      line.actedAt = new Date().toISOString()
      line.comment = comment?.trim() || null
      d.status = d.lines.every((l) => l.status === 'approved') ? '최종결재완료' : '결재중'
      save()
      return json(toDoc(d, user))
    }),
  ),

  /** 반려 (AP-08c): 의견 필수 [가정] */
  http.post(
    '/api/approval/docs/:id/reject',
    authed<P>(async ({ request, params, user }) => {
      const d = loadDoc(params.id, user)
      if (d instanceof Response) return d
      const line = currentLine(d)
      if (!line || line.approverId !== user.id) return fail(409, '현재 결재 차례가 아닙니다.')
      const { comment } = (await request.json()) as { comment?: string }
      if (!comment?.trim()) return fail(422, '반려 의견을 입력하세요.', { comment: '반려 의견을 입력하세요.' })
      line.status = 'rejected'
      line.actedAt = new Date().toISOString()
      line.comment = comment.trim()
      d.status = '반려'
      save()
      return json(toDoc(d, user))
    }),
  ),

  /** 취소요청 (AP-04): 기안자만, 결재 진행 중·완료 문서 대상 [가정] */
  http.post(
    '/api/approval/docs/:id/cancel-request',
    authed<P>(async ({ request, params, user }) => {
      const d = loadDoc(params.id, user)
      if (d instanceof Response) return d
      if (d.drafterId !== user.id) return fail(403, '기안자만 취소요청할 수 있습니다.')
      if (!['결재대기', '결재중', '최종결재완료'].includes(d.status)) return fail(409, `'${d.status}' 상태의 문서는 취소요청할 수 없습니다.`)
      const { reason } = (await request.json()) as { reason?: string }
      if (!reason?.trim()) return fail(422, '취소 사유를 입력하세요.', { reason: '취소 사유를 입력하세요.' })
      d.status = '취소요청'
      d.cancelReason = reason.trim()
      save()
      return json(toDoc(d, user))
    }),
  ),
]
