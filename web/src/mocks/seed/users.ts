import type { User } from '../../api/types'

/**
 * MK-02: 가상 인물. 실제 직원 이름은 쓰지 않는다.
 * 본사 팀원 / 지점 직원 / 팀장 / 지점장 / 임원 / 관리자를 모두 포함한다.
 */
export const users: User[] = [
  { id: 'u01', name: '김하늘', position: '사원', departmentId: 'd-it', branchId: null, role: 'user' },
  { id: 'u02', name: '박준호', position: '팀장', departmentId: 'd-it', branchId: null, role: 'user' },
  { id: 'u10', name: '오지훈', position: '대리', departmentId: 'd-it', branchId: null, role: 'admin' },
  { id: 'u03', name: '이서연', position: '과장', departmentId: 'd-salesplan', branchId: null, role: 'user' },
  { id: 'u08', name: '강태현', position: '관리이사', departmentId: 'd-plan', branchId: null, role: 'user' },
  { id: 'u09', name: '조유진', position: '과장', departmentId: 'd-finance', branchId: null, role: 'user' },
  { id: 'u12', name: '임도윤', position: '대리', departmentId: 'd-order', branchId: null, role: 'user' },
  { id: 'u07', name: '윤성민', position: '팀장', departmentId: 'd-sales1', branchId: null, role: 'user' },
  { id: 'u05', name: '정다은', position: '지점장', departmentId: 'd-sales1', branchId: 'b-seocho', role: 'user' },
  { id: 'u04', name: '최민준', position: '사원', departmentId: 'd-sales1', branchId: 'b-seocho', role: 'user' },
  { id: 'u06', name: '한지우', position: '계장', departmentId: 'd-sales1', branchId: 'b-jamsil', role: 'user' },
  { id: 'u11', name: '서예린', position: '사원', departmentId: 'd-sales2', branchId: 'b-incheon', role: 'user' },
]
