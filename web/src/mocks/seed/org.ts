import type { Branch, BranchKind, Department } from '../../api/types'

/** 기획서 4.1 — 팀 37개 (영업은 사업부 3개 대신 영업1~5팀·레이디팀 6개, 가정 A1) */
const TEAM_GROUPS: [string, string[]][] = [
  ['그룹 A', ['화학팀', '기계팀', '씨웨프트스타트업', '대외지원팀']],
  ['그룹 B', ['기획실', '무역팀', '물류검수팀', '관리총무팀', '법무감사실', '검수팀', '건설사업본부', '자연건강사업부', '유고', '더베이직', '유구공장']],
  ['그룹 C', ['영업기획팀', '디자인팀', 'CRM', '신규사업팀', '글로벌세일즈팀']],
  ['그룹 D', ['영업총무팀', '재경팀', '교육팀', '전산팀']],
  ['영업', ['영업1팀', '영업2팀', '영업3팀', '영업4팀', '영업5팀', '레이디팀']],
  ['그룹 E', ['천안개발실', '미주', '넥스트', '위해', '맥도', 'HKN', '오더관리팀']],
]

/** 자주 참조하는 팀의 고정 id */
const FIXED_IDS: Record<string, string> = {
  전산팀: 'd-it',
  기획실: 'd-plan',
  영업기획팀: 'd-salesplan',
  재경팀: 'd-finance',
  오더관리팀: 'd-order',
  영업1팀: 'd-sales1',
  영업2팀: 'd-sales2',
  영업3팀: 'd-sales3',
  영업4팀: 'd-sales4',
  영업5팀: 'd-sales5',
  레이디팀: 'd-lady',
}

export const departments: Department[] = (() => {
  const out: Department[] = []
  let order = 0
  for (const [group, names] of TEAM_GROUPS) {
    for (const name of names) {
      order += 1
      out.push({ id: FIXED_IDS[name] ?? `d-${String(order).padStart(2, '0')}`, name, group, sortOrder: order })
    }
  }
  return out
})()

/** 기획서 4.2 — 지점 70개. 사업장코드는 가상 값(서초점 = 1015는 자료 예시) */
const BRANCH_GROUPS: { dept: string; codeStart: number; kind: BranchKind; names: string[] }[] = [
  { dept: 'd-sales1', codeStart: 1015, kind: 'general', names: ['서초점', '잠실점', '영등포점', '신림점', '청담점', '천호점', '강서점', '여의도점', '노원점', '상봉점', '시청점', '신촌점', '은평점', '일산점', '의정부점'] },
  { dept: 'd-sales2', codeStart: 2011, kind: 'general', names: ['인천점', '부평점', '부천점', '인천송도점', '수원점', '수원광교점', '안산점', '분당점', '안양점', '용인점', '평택점', '하남지점'] },
  { dept: 'd-sales3', codeStart: 3011, kind: 'general', names: ['대구점', '범어점', '대구달서점', '울산점', '울산동구점', '포항점', '구미점', '안동점', '원주점', '강릉점', '춘천점'] },
  { dept: 'd-sales4', codeStart: 4011, kind: 'general', names: ['부산점', '동래점', '해운대점', '사상점', '서면점', '창원점', '창원시청점', '진주점', '김해점', '거제점', '제주점'] },
  { dept: 'd-sales5', codeStart: 5011, kind: 'general', names: ['광주점', '광주광산점', '순천점', '목포점', '전주점', '군산점', '대전점', '천안점', '청주점', '세종점', '서산점'] },
  { dept: 'd-lady', codeStart: 6011, kind: 'lady', names: ['서초LADY', '시청LADY', '압구정LADY', '종로LADY', '대전유성LADY'] },
  { dept: 'd-lady', codeStart: 6511, kind: 'lotte', names: ['잠실롯데', '포항롯데', '해운대롯데', '부천롯데', '대구롯데'] },
]

const BRANCH_FIXED_IDS: Record<string, string> = { 서초점: 'b-seocho', 잠실점: 'b-jamsil', 인천점: 'b-incheon' }

export const branches: Branch[] = BRANCH_GROUPS.flatMap((g) =>
  g.names.map((name, i) => {
    const code = String(g.codeStart + i)
    return { id: BRANCH_FIXED_IDS[name] ?? `b-${code}`, code, name, departmentId: g.dept, kind: g.kind }
  }),
)

/** 본사 부서의 사업장코드 [가정] */
export const HQ_WORKPLACE_CODE = '1000'
