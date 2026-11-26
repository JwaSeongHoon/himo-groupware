/** 표본 데이터 (MK-03, MK-04). 모든 인물·고객은 가상이다. */
import type { Attachment, DocStatus, FormValue } from '../../api/types'
import { addDays, today } from '../../lib/date'
import type { DbDoc, DbLine, DbPost } from '../db'
import { authorDeptOf, userById, workplaceOf } from '../org-helpers'

// ───────────── 첨부 ─────────────

const FILES: Attachment[] = [
  { id: 'f-erp-guide', name: 'ERP_입력오류_조치방법.pdf', size: 482_113 },
  { id: 'f-meeting', name: '12월_지점장회의_자료.xlsx', size: 58_220 },
  { id: 'f-holiday', name: '해외공장_휴무일정.png', size: 213_400 },
  { id: 'f-it-pc', name: 'PC교체대상_목록.xlsx', size: 31_908 },
  { id: 'f-seocho', name: '서초점_12월_근무표.xlsx', size: 22_050 },
  { id: 'f-refund', name: '환불_영수증.jpg', size: 154_002 },
]

export const seedFiles = () => FILES.map((f) => ({ ...f }))

// ───────────── 게시글 ─────────────

let postSeq = 0
function mkPost(
  boardKey: string,
  no: string,
  authorId: string,
  title: string,
  content: string,
  createdAt: string,
  opts: Partial<DbPost> = {},
): DbPost {
  const u = userById(authorId)!
  postSeq += 1
  return {
    id: `p${String(postSeq).padStart(3, '0')}`,
    boardKey,
    boardType: boardKey.split(':')[0] as DbPost['boardType'],
    no,
    title,
    content,
    authorId,
    authorName: u.name,
    authorDept: authorDeptOf(u),
    createdAt: new Date(createdAt).toISOString(),
    viewCount: 0,
    parentId: null,
    attachmentIds: [],
    deleted: false,
    ...opts,
  }
}

const COMPANY: [author: string, title: string, date: string, files?: string[]][] = [
  ['u03', '[영업기획] 2026년 상반기 지점장 회의 일정 안내', '2026-01-08T09:10'],
  ['u12', '[오더관리] 설 연휴 해외공장 휴무일 안내', '2026-01-20T10:00', ['f-holiday']],
  ['u10', '[전산] 그룹웨어 비밀번호 변경 주기 안내', '2026-02-03T14:20'],
  ['u03', '[영업기획] 2월 부지점장 회의 안내', '2026-02-16T09:30'],
  ['u12', '[오더관리] 봄 시즌 오더 마감일 안내', '2026-03-04T11:00'],
  ['u03', '[영업기획] 3월 지점장 회의 안내', '2026-03-18T09:00'],
  ['u10', 'ERP 입력값의 마지막 글자가 이동·삭제되는 현상 발생 시 조치', '2026-04-02T16:40', ['f-erp-guide']],
  ['u03', '[영업기획] 4월 부지점장 회의 안내', '2026-04-15T09:20'],
  ['u12', '[오더관리] 5월 해외공장 축제기간 휴무 안내', '2026-04-28T10:30'],
  ['u08', '2026년 하반기 경영 방침 공유', '2026-05-11T08:50'],
  ['u03', '[영업기획] 6월 지점장 회의 안내', '2026-05-27T09:00'],
  ['u10', '[전산] 노후 PC 교체 대상 안내', '2026-06-10T13:00', ['f-it-pc']],
  ['u03', '[영업기획] 7월 부지점장 회의 안내', '2026-06-24T09:15'],
  ['u12', '[오더관리] 여름 휴가 기간 오더 처리 일정', '2026-07-09T10:10'],
  ['u03', '[영업기획] 8월 지점장 회의 안내', '2026-07-22T09:00'],
  ['u12', '[오더관리] 9/10월 해외공장 휴무일 안내', '2026-08-26T11:20'],
  ['u03', '[영업기획] 10월 지점장 회의 안내', '2026-09-16T09:00'],
  ['u12', '[오더관리] 추석 연휴 오더 마감 안내', '2026-09-21T10:00'],
  ['u03', '[영업기획] 11월 부지점장 회의 안내', '2026-10-14T09:10'],
  ['u10', '[전산] 결재함 조회 속도 개선 작업 공지', '2026-10-29T17:30'],
  ['u03', '[영업기획] 2027년 영업 타운미팅 개최 안내', '2026-11-04T09:00'],
  ['u03', '[영업기획] 12월 지점장 회의 미진행 안내', '2026-11-13T09:05', ['f-meeting']],
]

export function seedPosts(): DbPost[] {
  postSeq = 0
  const posts: DbPost[] = []

  COMPANY.forEach(([author, title, date, files], i) => {
    posts.push(
      mkPost('company', `2026${String(i + 1).padStart(5, '0')}`, author, title, `안녕하세요.\n\n${title.replace(/^\[[^\]]+\]\s*/, '')} 관련하여 알려드립니다.\n세부 사항은 첨부 또는 부서 공지를 참고하시기 바랍니다.\n\n감사합니다.`, date, {
        viewCount: 40 + ((i * 37) % 160),
        attachmentIds: files ?? [],
      }),
    )
  })

  // 전산팀 게시판: 3단계 답글 스레드 포함
  const it1 = mkPost('team:d-it', '202600001', 'u02', '12월 서버 점검 일정 공유', '12월 둘째 주 토요일 서버 점검이 있습니다.\n작업 담당자는 댓글로 가능 여부를 남겨 주세요.', '2026-11-02T10:00', { viewCount: 14 })
  const it1r1 = mkPost('team:d-it', '202600002', 'u01', '참석 가능합니다', '오전 작업 참석 가능합니다.', '2026-11-02T11:20', { parentId: it1.id, viewCount: 9 })
  const it1r2 = mkPost('team:d-it', '202600003', 'u10', '오후 교대 가능', '오후는 제가 교대하겠습니다.', '2026-11-02T13:05', { parentId: it1r1.id, viewCount: 7 })
  const it1r3 = mkPost('team:d-it', '202600004', 'u02', '확정합니다', '오전 김하늘, 오후 오지훈으로 확정합니다.', '2026-11-03T09:00', { parentId: it1r2.id, viewCount: 6 })
  const it2 = mkPost('team:d-it', '202600005', 'u10', 'PC 교체 대상 목록', '첨부 목록 확인 바랍니다.', '2026-11-10T15:30', { viewCount: 11, attachmentIds: ['f-it-pc'] })
  const it3 = mkPost('team:d-it', '202600006', 'u01', '프린터 토너 재고 확인 요청', '3층 프린터 토너 재고가 부족합니다.', '2026-11-18T09:40', { viewCount: 5 })
  posts.push(it1, it1r1, it1r2, it1r3, it2, it3)

  // 영업1팀 게시판
  const s1 = mkPost('team:d-sales1', '202600001', 'u07', '[영업1팀] 11월 실적 마감 안내', '11월 실적은 28일까지 마감 바랍니다.', '2026-11-05T09:00', { viewCount: 22 })
  const s1r1 = mkPost('team:d-sales1', '202600002', 'u05', '서초점 확인했습니다', '서초점 27일 마감 예정입니다.', '2026-11-05T10:30', { parentId: s1.id, viewCount: 10 })
  const s2 = mkPost('team:d-sales1', '202600003', 'u06', '잠실점 고객 응대 사례 공유', '최근 고객 응대 사례를 공유드립니다.', '2026-11-12T14:00', { viewCount: 8 })
  posts.push(s1, s1r1, s2)

  // 서초점 지점게시판
  const b1 = mkPost('branch:b-seocho', '202600001', 'u05', '12월 근무표', '12월 근무표 첨부합니다. 변경 요청은 답글로 남겨 주세요.', '2026-11-20T09:00', { viewCount: 6, attachmentIds: ['f-seocho'] })
  const b1r1 = mkPost('branch:b-seocho', '202600002', 'u04', '근무 변경 요청', '12월 9일 근무를 10일로 변경 요청드립니다.', '2026-11-20T11:00', { parentId: b1.id, viewCount: 3 })
  const b1r2 = mkPost('branch:b-seocho', '202600003', 'u05', '승인합니다', '변경 반영하겠습니다.', '2026-11-20T13:00', { parentId: b1r1.id, viewCount: 2 })
  const b2 = mkPost('branch:b-seocho', '202600004', 'u04', '매장 비품 주문 목록', '포장지, 쇼핑백 주문 필요합니다.', '2026-11-24T10:15', { viewCount: 4 })
  posts.push(b1, b1r1, b1r2, b2)

  // 잠실점·인천점 지점게시판
  posts.push(mkPost('branch:b-jamsil', '202600001', 'u06', '잠실점 연말 행사 준비', '연말 행사 준비물 목록입니다.', '2026-11-19T16:00', { viewCount: 3 }))
  posts.push(mkPost('branch:b-incheon', '202600001', 'u11', '인천점 주차 안내', '고객 주차 등록 방법 안내입니다.', '2026-11-15T10:00', { viewCount: 2 }))

  // 영업2팀 게시판
  posts.push(mkPost('team:d-sales2', '202600001', 'u11', '[영업2팀] 신규 직원 소개', '인천점에 신규 직원이 합류했습니다.', '2026-11-09T09:30', { viewCount: 12 }))

  return posts
}

// ───────────── 결재 문서 ─────────────

const docSeq = new Map<string, number>()
function docNoFor(code: string, ymd: string) {
  const key = `${code}G${ymd.slice(2, 4)}${ymd.slice(5, 7)}`
  const n = (docSeq.get(key) ?? 0) + 1
  docSeq.set(key, n)
  return `${key}-${String(n).padStart(5, '0')}`
}

function at(ymd: string, hm: string) {
  return new Date(`${ymd}T${hm}`).toISOString()
}

interface DocSpec {
  drafter: string
  formId: string
  title: string
  daysAgo: number
  data: Record<string, FormValue>
  lines: [approver: string, status: DbLine['status'], comment?: string][]
  status: DocStatus
  check?: 'Y' | 'N'
  hqConfirm?: 'Y' | 'N'
  financeConfirm?: 'Y' | 'N'
  cancelReason?: string
  files?: string[]
}

export function seedDocs(): DbDoc[] {
  docSeq.clear()
  const t = today()
  const specs: DocSpec[] = [
    {
      drafter: 'u04', formId: 'repair', title: '수선 요청 - 고객 박○○ 제품 길이 조정', daysAgo: 15,
      data: { orderNo: 'A2611-00031', customerName: '박가온' },
      lines: [['u05', 'approved'], ['u07', 'approved']], status: '취소요청', cancelReason: '고객 요청 철회', hqConfirm: 'Y',
    },
    {
      drafter: 'u04', formId: 'remake', title: '재생산 요청 - 색상 불일치', daysAgo: 10,
      data: { orderNo: 'A2611-00045', customerName: '이누리' },
      lines: [['u05', 'approved', '확인'], ['u07', 'approved', '승인합니다']], status: '최종결재완료', check: 'Y', hqConfirm: 'Y', financeConfirm: 'N',
    },
    {
      drafter: 'u01', formId: 'weekly', title: '주간 업무 보고 (전산팀 김하늘)', daysAgo: 7,
      data: { week: { from: addDays(t, -11), to: addDays(t, -7) }, thisWeek: '결재함 조회 화면 오류 수정', nextWeek: 'PC 교체 일정 수립' },
      lines: [['u02', 'rejected', '차주 계획을 구체적으로 작성해 주세요.'], ['u08', 'waiting']], status: '반려',
    },
    {
      drafter: 'u01', formId: 'leave', title: '', daysAgo: 5,
      data: { leaveType: '연차계', period: { from: addDays(t, 2), to: addDays(t, 2) }, reason: '개인 사유' },
      lines: [['u02', 'approved', '잘 다녀오세요']], status: '최종결재완료',
    },
    {
      drafter: 'u06', formId: 'leave', title: '', daysAgo: 3,
      data: { leaveType: '오후반차계', period: { from: addDays(t, 1), to: addDays(t, 1) }, reason: '병원 진료' },
      lines: [['u07', 'approved', '승인'], ['u08', 'waiting']], status: '결재중',
    },
    {
      drafter: 'u11', formId: 'refund', title: '환불 요청 - 사이즈 불만족', daysAgo: 2,
      data: { orderNo: 'B2611-00102', customerName: '정하람', amount: 320000, reason: '고객 사이즈 불만족으로 전액 환불 요청' },
      lines: [['u08', 'waiting']], status: '결재대기', files: ['f-refund'],
    },
    {
      drafter: 'u04', formId: 'refund', title: '환불 요청 - 배송 지연', daysAgo: 1,
      data: { orderNo: 'A2611-00077', customerName: '김바다', amount: 150000, reason: '배송 지연에 따른 부분 환불' },
      lines: [['u05', 'waiting'], ['u07', 'waiting']], status: '결재대기',
    },
    {
      drafter: 'u10', formId: 'weekly', title: '주간 업무 보고 (전산팀 오지훈)', daysAgo: 1,
      data: { week: { from: addDays(t, -5), to: addDays(t, -1) }, thisWeek: '서버 점검 준비', nextWeek: '서버 점검 수행' },
      lines: [['u02', 'waiting']], status: '결재대기',
    },
    {
      drafter: 'u04', formId: 'leave', title: '', daysAgo: 0,
      data: { leaveType: '연차계', period: { from: addDays(t, 7), to: addDays(t, 8) }, reason: '가족 행사' },
      lines: [['u05', 'waiting']], status: '결재대기',
    },
  ]

  return specs.map((s, i) => {
    const drafter = userById(s.drafter)!
    const wp = workplaceOf(drafter)
    const draftedAt = addDays(t, -s.daysAgo)
    let title = s.title
    if (s.formId === 'leave') {
      const p = s.data.period as { from: string; to: string }
      title = `[${p.from.replaceAll('-', '')}]-[${p.to.replaceAll('-', '')}] ${drafter.name} ${drafter.position} ${s.data.leaveType}`
    }
    return {
      id: `doc${String(i + 1).padStart(3, '0')}`,
      docNo: docNoFor(wp.code, draftedAt),
      formId: s.formId,
      title,
      drafterId: drafter.id,
      branchCode: wp.code,
      branchName: wp.name,
      draftedAt,
      data: s.data,
      status: s.status,
      lines: s.lines.map(([approverId, status, comment], idx) => ({
        order: idx + 1,
        approverId,
        status,
        actedAt: status === 'waiting' ? null : at(addDays(draftedAt, Math.min(idx, s.daysAgo)), `1${idx}:30`),
        comment: comment ?? null,
      })),
      check: s.check ?? 'N',
      hqConfirm: s.hqConfirm ?? 'N',
      financeConfirm: s.financeConfirm ?? 'N',
      cancelReason: s.cancelReason ?? null,
      attachmentIds: s.files ?? [],
    }
  })
}
