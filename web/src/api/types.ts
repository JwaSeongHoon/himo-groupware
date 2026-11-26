/**
 * API 계약 (PRD 6장).
 * mock 서버와 실제 서버는 모두 이 형태로 응답한다. F5에서 이 파일을 API 명세로 승격한다.
 * 날짜는 'YYYY-MM-DD', 일시는 ISO 8601 문자열.
 */

export type Role = 'user' | 'admin'

export interface User {
  id: string
  name: string
  /** 직급 */
  position: string
  departmentId: string
  /** 지점 소속이 없으면 null (본사 팀원) */
  branchId: string | null
  role: Role
}

export interface Department {
  id: string
  name: string
  /** 조직도상 묶음 */
  group: string
  sortOrder: number
}

export type BranchKind = 'general' | 'lady' | 'lotte'

export interface Branch {
  id: string
  /** 사업장코드 */
  code: string
  name: string
  departmentId: string
  kind: BranchKind
}

/** 결재 문서의 사업장(지점 또는 본사 부서) */
export interface Workplace {
  code: string
  name: string
}

/** GET /api/me */
export interface Me {
  user: User
  department: Department
  branch: Branch | null
  workplace: Workplace
  /** 게시판 화면 제목 (BD-11). 지점 소속이 없으면 branch는 null */
  boardTitles: { company: string; team: string; branch: string | null }
}

/** 결재자 검색 결과 등 화면 표시용 사용자 요약 */
export interface UserSummary {
  id: string
  name: string
  position: string
  departmentName: string
  branchName: string | null
}

// ───────────── 첨부 ─────────────

export interface Attachment {
  id: string
  name: string
  size: number
}

// ───────────── 게시판 ─────────────

export type BoardType = 'company' | 'team' | 'branch'
export type PostSearchField = 'title' | 'author' | 'content'

export interface Post {
  id: string
  boardType: BoardType
  /** 게시글 번호: 연도 4자리 + 일련번호 5자리 (BD-01a) */
  no: string
  title: string
  content: string
  authorId: string
  authorName: string
  authorDept: string
  createdAt: string
  viewCount: number
  parentId: string | null
  /** 0 = 원글 */
  depth: number
  attachments: Attachment[]
  deleted: boolean
  /** 답글 수 (삭제 시 스레드 유지 판단용) */
  replyCount: number
}

/** 목록 행: 본문을 뺀 요약 */
export type PostListItem = Omit<Post, 'content'>

export interface PostListResponse {
  items: PostListItem[]
  nextCursor: string | null
  total: number
}

export interface PostInput {
  title: string
  content: string
  parentId?: string | null
  attachmentIds: string[]
}

// ───────────── 전자결재 ─────────────

export type FormCategory = 'proposal' | 'etc'
export type FieldType = 'text' | 'textarea' | 'date' | 'dateRange' | 'number' | 'select'

export interface FormField {
  key: string
  label: string
  type: FieldType
  required: boolean
  options?: string[]
  placeholder?: string
  /** 이 값을 문서 공통 컬럼(오더번호·고객명)으로 올린다 */
  mapsTo?: 'orderNo' | 'customerName'
}

/**
 * kind: 'document' = 결재 양식, 'screen' = 결재 양식이 아닌 업무 화면(현황/수정/확인처리, v1.0 범위 밖)
 */
export interface ApprovalForm {
  id: string
  category: FormCategory
  name: string
  /** 부속 화면이면 상위 양식 id */
  parentFormId: string | null
  kind: 'document' | 'screen'
  enabled: boolean
  sortOrder: number
  /** 제목 자동 생성 템플릿. 예: "[{period.from}]-[{period.to}] {drafter.name} {drafter.position} {leaveType}" */
  titleTemplate?: string
  fields: FormField[]
}

export type DocStatus = '결재대기' | '결재중' | '최종결재완료' | '반려' | '취소요청'
export const DOC_STATUSES: DocStatus[] = ['결재대기', '결재중', '최종결재완료', '반려', '취소요청']

export type LineStatus = 'waiting' | 'approved' | 'rejected'

export interface ApprovalLine {
  order: number
  approver: UserSummary
  status: LineStatus
  actedAt: string | null
  comment: string | null
}

export type ConfirmFlag = 'Y' | 'N'

export type FormValue = string | number | { from: string; to: string } | null

export interface ApprovalDoc {
  id: string
  /** 품의번호: 사업장코드 + G + YYMM + - + 일련번호 5자리 */
  docNo: string
  formId: string
  /** 문서종류 (양식명) */
  docType: string
  title: string
  drafter: UserSummary
  branchCode: string
  branchName: string
  draftedAt: string
  orderNo: string | null
  customerName: string | null
  data: Record<string, FormValue>
  status: DocStatus
  lines: ApprovalLine[]
  /** 최종결재자 표시명 (최종결재완료 시) */
  finalApprover: string | null
  check: ConfirmFlag
  hqConfirm: ConfirmFlag
  financeConfirm: ConfirmFlag
  cancelReason: string | null
  attachments: Attachment[]
  /** 현재 사용자 기준 정보 (서버가 계산) */
  myTurn: boolean
}

export type ApprovalBox = 'sent' | 'pending' | 'done'

export interface DocListQuery {
  box: ApprovalBox
  from?: string
  to?: string
  branchCode?: string
  formId?: string
  status?: DocStatus | ''
  hqConfirm?: ConfirmFlag | ''
  docNo?: string
}

export interface DocCreateInput {
  formId: string
  title: string
  data: Record<string, FormValue>
  approverIds: string[]
  attachmentIds: string[]
}

export interface ApiErrorBody {
  message: string
  /** 입력 오류 시 필드별 메시지 */
  fieldErrors?: Record<string, string>
}
