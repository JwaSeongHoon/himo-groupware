import type { ApprovalForm, FormField } from '../../api/types'

/**
 * 양식 정의 (AP-01, AP-02a). 양식 추가는 화면 코드 수정 없이 이 정의만 추가한다.
 * enabled=true 인 양식만 작성 화면이 준비되어 있다 (AP-01b, 가정 A8).
 */

const LEAVE_FIELDS: FormField[] = [
  { key: 'leaveType', label: '종류', type: 'select', required: true, options: ['연차계', '오전반차계', '오후반차계', '오전반반차계', '오후반반차계'] },
  { key: 'period', label: '기간', type: 'dateRange', required: true },
  { key: 'reason', label: '사유', type: 'textarea', required: true, placeholder: '휴가 사유를 입력하세요' },
]

const REFUND_FIELDS: FormField[] = [
  { key: 'orderNo', label: '오더번호', type: 'text', required: true, mapsTo: 'orderNo', placeholder: '예: A2611-00123' },
  { key: 'customerName', label: '고객명', type: 'text', required: true, mapsTo: 'customerName' },
  { key: 'amount', label: '환불 금액(원)', type: 'number', required: true },
  { key: 'reason', label: '환불 사유', type: 'textarea', required: true },
]

const WEEKLY_FIELDS: FormField[] = [
  { key: 'week', label: '대상 주', type: 'dateRange', required: true },
  { key: 'thisWeek', label: '금주 실적', type: 'textarea', required: true },
  { key: 'nextWeek', label: '차주 계획', type: 'textarea', required: true },
]

type Def = [id: string, name: string, opts?: Partial<ApprovalForm>]

const doc = (id: string, name: string, sortOrder: number, category: ApprovalForm['category'], opts: Partial<ApprovalForm> = {}): ApprovalForm => ({
  id,
  category,
  name,
  parentFormId: null,
  kind: 'document',
  enabled: false,
  sortOrder,
  fields: [],
  ...opts,
})

/** 기획서 6.1 원본 순서. 아이콘 없는 부속 화면은 parentFormId 로 묶는다. kind:'screen' = 업무 화면 6종 (가정 A7) */
const PROPOSAL: (Def | [Def, Def[]])[] = [
  ['leave', '휴가계 (연차계·반차계·반반차계)', { enabled: true, fields: LEAVE_FIELDS, titleTemplate: '[{period.from}]-[{period.to}] {drafter.name} {drafter.position} {leaveType}' }],
  ['remake', '재생산 품의서'],
  ['refund', '환불 품의서', { enabled: true, fields: REFUND_FIELDS }],
  ['sample', '샘플 품의서'],
  ['overtime', '시간외근로신청서'],
  [['overtime-status', '시간외근로신청서현황/수정', { kind: 'screen' }], [['commute-edit', '출퇴근시간 수정(지점)', { kind: 'screen' }]]],
  ['repair', '수선 품의서(공장 발송전)'],
  ['commute-confirm', '출퇴근시간 신청확인처리', { kind: 'screen' }],
  ['public-leave-reg', '공가계 신청 등록', { kind: 'screen' }],
  ['public-leave', '공가 사유서'],
  [['cert-edu', '인증시험 및 교육신청서'], [['edu-schedule', '교육 일정 등록', { kind: 'screen' }]]],
  ['condolence', '경조금 지급 신청서'],
  [['flex-commute', '시차출근변경'], [['flex-commute-status', '시차출근변경 신청현황', { kind: 'screen' }]]],
  ['inmo100', '인모100 신청서'],
  [['worktime-pledge', '근로시간 준수서약서'], [['pregnant-short', '임신근로자 단축근무 신청']]],
  ['repair-grade', '수선 등급 변경 품의서'],
  ['fitting', '가피팅 제품 인수/반납 확인서'],
  ['deleted-order', '삭제(취소)오더 제작품의서'],
  [['unused', '오더/서비스/하이패스 미사용 품의서'], [['service-use', '서비스/하이패스 사용 품의서']]],
]

/** 기획서 6.2 */
const ETC: Def[] = [
  ['car-log', '업무용 승용차 운행기록부'],
  ['weekly', '주간 업무 보고', { enabled: true, fields: WEEKLY_FIELDS }],
  ['medical', '의료지원 내역'],
  ['car-reserve', '업무용 승용차 사용예약'],
  ['outside-work', '외근 업무등록'],
]

export const forms: ApprovalForm[] = (() => {
  const out: ApprovalForm[] = []
  let n = 0
  for (const item of PROPOSAL) {
    const isGroup = Array.isArray(item[0])
    const [main, subs] = isGroup ? (item as [Def, Def[]]) : [item as Def, []]
    out.push(doc(main[0], main[1], ++n, 'proposal', main[2]))
    for (const s of subs) out.push(doc(s[0], s[1], ++n, 'proposal', { parentFormId: main[0], ...s[2] }))
  }
  for (const e of ETC) out.push(doc(e[0], e[1], ++n, 'etc', e[2]))
  return out
})()
