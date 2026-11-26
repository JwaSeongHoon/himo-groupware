import { Link, useParams } from 'react-router'
import { useForms } from '../../api/services'
import type { ApprovalForm, FormCategory } from '../../api/types'
import { Forbidden, PageHeader, QueryError, StatusBox } from '../../components/ui'

const TITLES: Record<FormCategory, string> = { proposal: '전자결재 품의서 작성', etc: '기타 문서작성' }

/** S-10 품의서 작성 / S-11 기타 문서작성 (AP-01) */
export function FormListPage() {
  const { category } = useParams() as { category: FormCategory }
  const { data, isLoading, error, refetch } = useForms(category)
  if (!(category in TITLES)) return <Forbidden message="없는 메뉴입니다." />

  return (
    <div className="max-w-3xl">
      <PageHeader title={TITLES[category]} />
      <p className="mb-2 text-gray-600">작성할 문서를 선택하세요. 작성 화면이 준비된 양식만 선택할 수 있습니다.</p>
      <div className="border border-line bg-white">
        {isLoading && <StatusBox kind="loading" />}
        {error && <QueryError error={error} onRetry={() => refetch()} />}
        <ul>
          {category === 'etc' && <li className="border-b border-gray-200 bg-gray-50 px-4 py-2 font-bold text-gray-700">📁 기타문서</li>}
          {data?.map((f) => (
            <FormItem key={f.id} form={f} indent={category === 'etc' || !!f.parentFormId} />
          ))}
        </ul>
      </div>
      <p className="mt-2 text-xs text-gray-500">
        ※ 「준비 중」 양식은 입력 항목 정의 자료를 받은 뒤 추가됩니다. 「업무 화면」은 결재 양식이 아닌 현황·수정·확인처리 화면으로 v1.0 범위 밖입니다.
      </p>
    </div>
  )
}

function FormItem({ form, indent }: { form: ApprovalForm; indent: boolean }) {
  const pad = { paddingLeft: indent ? 40 : 16 }
  const icon = form.parentFormId ? '└' : '📝'
  const cls = 'flex items-center gap-2 border-b border-gray-100 py-2 pr-4'

  if (form.kind === 'screen') {
    return (
      <li>
        <Link to={`/approval/screen/${form.id}`} style={pad} className={`${cls} text-gray-600 hover:bg-gray-50`}>
          <span aria-hidden>{form.parentFormId ? '└' : '🗂'}</span>
          {form.name}
          <span className="ml-auto rounded bg-gray-100 px-1.5 text-xs text-gray-500">업무 화면</span>
        </Link>
      </li>
    )
  }
  if (!form.enabled) {
    return (
      <li style={pad} className={`${cls} cursor-not-allowed text-gray-400`} aria-disabled>
        <span aria-hidden>{icon}</span>
        {form.name}
        <span className="ml-auto rounded bg-gray-100 px-1.5 text-xs">준비 중</span>
      </li>
    )
  }
  return (
    <li>
      <Link to={`/approval/write/${form.id}`} style={pad} className={`${cls} font-semibold text-brand hover:bg-brand-light`}>
        <span aria-hidden>{icon}</span>
        {form.name}
        <span className="ml-auto text-xs font-normal text-gray-500">작성 ›</span>
      </Link>
    </li>
  )
}

/** 업무 화면 6종: 메뉴와 빈 화면만 제공 (가정 A7) */
export function ScreenPlaceholderPage() {
  const { formId } = useParams()
  const { data } = useForms()
  const form = data?.find((f) => f.id === formId)
  return (
    <div className="max-w-3xl">
      <PageHeader title={form?.name ?? '업무 화면'} />
      <div className="border border-dashed border-gray-400 bg-white p-10 text-center text-gray-500">
        이 화면은 결재 양식이 아닌 업무 화면(현황·수정·확인처리)으로, v1.0 범위에서 제외되었습니다.
        <div className="mt-4">
          <Link to="/approval/forms/proposal" className="btn">
            품의서 목록으로
          </Link>
        </div>
      </div>
    </div>
  )
}
