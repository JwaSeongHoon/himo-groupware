import type { BoardType, Branch, Department, User, UserSummary, Workplace } from '../api/types'
import { HQ_WORKPLACE_CODE, branches, departments } from './seed/org'
import { users } from './seed/users'

export const userById = (id: string): User | undefined => users.find((u) => u.id === id)
export const deptById = (id: string): Department => departments.find((d) => d.id === id)!
export const branchById = (id: string | null): Branch | null => (id ? (branches.find((b) => b.id === id) ?? null) : null)

/** 결재 문서의 사업장: 지점 소속이면 지점, 아니면 본사 부서 [가정] */
export function workplaceOf(u: User): Workplace {
  const b = branchById(u.branchId)
  if (b) return { code: b.code, name: b.name }
  return { code: HQ_WORKPLACE_CODE, name: `${deptById(u.departmentId).name}(본사)` }
}

/** 게시글 작성부서 표기 */
export function authorDeptOf(u: User): string {
  const b = branchById(u.branchId)
  const d = deptById(u.departmentId)
  return b ? `${d.name}(${b.name})` : d.name
}

export function summaryOf(u: User): UserSummary {
  return {
    id: u.id,
    name: u.name,
    position: u.position,
    departmentName: deptById(u.departmentId).name,
    branchName: branchById(u.branchId)?.name ?? null,
  }
}

/** 사용자가 접근할 수 있는 게시판 키. 없으면 null (BD-07) */
export function boardKeyOf(u: User, type: BoardType): string | null {
  if (type === 'company') return 'company'
  if (type === 'team') return `team:${u.departmentId}`
  return u.branchId ? `branch:${u.branchId}` : null
}

/** 화면 제목 (BD-11): '전산팀 게시판', '영업 1팀 서초지점 게시판' */
export function boardTitles(u: User) {
  const d = deptById(u.departmentId)
  const b = branchById(u.branchId)
  const deptLabel = d.name.replace(/^영업(\d)팀$/, '영업 $1팀')
  const branchLabel = b ? (b.name.endsWith('지점') ? b.name : b.name.endsWith('점') ? `${b.name.slice(0, -1)}지점` : b.name) : ''
  return {
    company: '사내게시판',
    team: `${d.name} 게시판`,
    branch: b ? `${deptLabel} ${branchLabel} 게시판` : null,
  }
}
