import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm as useHookForm, useWatch, type Control, type FieldErrors } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router'
import { z } from 'zod'
import { ApiError } from '../../api/client'
import { useCreateDoc, useForm, useMe } from '../../api/services'
import type { ApprovalForm, Attachment, FormField, FormValue, Me, UserSummary } from '../../api/types'
import { AttachmentPicker } from '../../components/attachments'
import { DateInput, DateRangeInput, FieldError, Forbidden, PageHeader, QueryError, StatusBox } from '../../components/ui'
import { fmtDate, today } from '../../lib/date'
import { buildDataSchema, emptyValue, renderTitle } from '../../lib/form'
import { ApproverPicker } from './ApproverPicker'

/** S-12 문서 작성 (AP-02, AP-03, AP-09) */
export function DocWritePage() {
  const { formId } = useParams() as { formId: string }
  const { data: me } = useMe()
  const { data: form, isLoading, error } = useForm(formId)
  if (isLoading || !me) return <StatusBox kind="loading" />
  if (error) return <QueryError error={error} />
  if (!form) return null
  if (form.kind !== 'document' || !form.enabled) return <Forbidden message="작성 화면이 준비되지 않은 양식입니다." />
  return <DocForm key={form.id} form={form} me={me} />
}

interface Values {
  title: string
  data: Record<string, FormValue>
  approvers: UserSummary[]
  attachments: Attachment[]
}

function DocForm({ form, me }: { form: ApprovalForm; me: Me }) {
  const navigate = useNavigate()
  const create = useCreateDoc()
  const [serverError, setServerError] = useState<string | null>(null)

  const schema = useMemo(
    () =>
      z.object({
        title: z.string().trim().min(1, form.titleTemplate ? '제목을 만들 항목(종류·기간)을 입력하세요.' : '제목을 입력하세요.'),
        data: buildDataSchema(form.fields),
        approvers: z.array(z.custom<UserSummary>()).min(1, '결재자를 1명 이상 지정하세요.'),
        attachments: z.array(z.custom<Attachment>()),
      }),
    [form],
  )

  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useHookForm<Values>({
    resolver: zodResolver(schema) as never,
    defaultValues: {
      title: '',
      data: Object.fromEntries(form.fields.map((f) => [f.key, emptyValue(f)])),
      approvers: [],
      attachments: [],
    },
  })

  // 제목 자동 생성 (AP-02c)
  const data = useWatch({ control, name: 'data' })
  useEffect(() => {
    if (!form.titleTemplate) return
    const t = renderTitle(form.titleTemplate, { ...data, drafter: me.user })
    setValue('title', t, { shouldValidate: !!t })
  }, [data, form.titleTemplate, me.user, setValue])

  const onSubmit = async (v: Values) => {
    setServerError(null)
    if (!confirm(`${form.name}을(를) 결재요청 등록하시겠습니까?\n결재자: ${v.approvers.map((a) => a.name).join(' → ')}`)) return
    try {
      const doc = await create.mutateAsync({
        formId: form.id,
        title: v.title,
        data: v.data,
        approverIds: v.approvers.map((a) => a.id),
        attachmentIds: v.attachments.map((a) => a.id),
      })
      alert(`결재요청이 등록되었습니다.\n품의번호: ${doc.docNo}`)
      navigate(`/approval/box/sent?selected=${doc.id}`)
    } catch (e) {
      if (e instanceof ApiError && e.body?.fieldErrors) {
        for (const [k, msg] of Object.entries(e.body.fieldErrors)) {
          const name = k === 'title' || k === 'approvers' ? k : `data.${k}`
          setError(name as never, { message: msg })
        }
      }
      setServerError((e as Error).message)
    }
  }

  return (
    <div className="max-w-5xl">
      <PageHeader title={form.name} />
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <table className="info-table">
          <tbody>
            <tr>
              <th>문서종류</th>
              <td>{form.name}</td>
            </tr>
            <tr>
              <th>기안자 / 소속</th>
              <td>
                {me.user.name} {me.user.position} / {me.workplace.name} <span className="text-gray-500">({me.workplace.code})</span>
                <span className="ml-4 text-gray-500">기안일 {fmtDate(today())}</span>
              </td>
            </tr>
            <tr>
              <th>
                <label htmlFor="title">
                  제목 <span className="text-red-600">*</span>
                </label>
              </th>
              <td>
                <input
                  id="title"
                  className={`input w-full ${errors.title ? 'input-invalid' : ''} ${form.titleTemplate ? 'bg-gray-50' : ''}`}
                  readOnly={!!form.titleTemplate}
                  placeholder={form.titleTemplate ? '종류와 기간을 입력하면 자동으로 채워집니다' : ''}
                  aria-invalid={!!errors.title}
                  {...register('title')}
                />
                <FieldError message={errors.title?.message} />
              </td>
            </tr>
            {form.fields.map((f) => (
              <FieldRow key={f.key} field={f} control={control} errors={errors} register={register} />
            ))}
            <tr>
              <th>첨부</th>
              <td>
                <Controller control={control} name="attachments" render={({ field }) => <AttachmentPicker value={field.value} onChange={field.onChange} />} />
              </td>
            </tr>
            <tr>
              <th>
                결재라인 <span className="text-red-600">*</span>
              </th>
              <td>
                <Controller
                  control={control}
                  name="approvers"
                  render={({ field }) => <ApproverPicker value={field.value} onChange={field.onChange} excludeId={me.user.id} invalid={!!errors.approvers} />}
                />
                <FieldError message={errors.approvers?.message ?? (errors.approvers as { root?: { message?: string } } | undefined)?.root?.message} />
              </td>
            </tr>
          </tbody>
        </table>

        {serverError && <p className="mt-2 text-red-600">{serverError}</p>}
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" className="btn" onClick={() => navigate(-1)}>
            취소
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            결재요청 등록
          </button>
        </div>
      </form>
    </div>
  )
}

/** 양식 정의에 따라 입력 항목을 그린다 (AP-02a) */
function FieldRow({
  field: f,
  control,
  errors,
  register,
}: {
  field: FormField
  control: Control<Values>
  errors: FieldErrors<Values>
  register: ReturnType<typeof useHookForm<Values>>['register']
}) {
  const name = `data.${f.key}` as const
  const err = (errors.data as Record<string, { message?: string; root?: { message?: string } }> | undefined)?.[f.key]
  const message = err?.message ?? err?.root?.message
  const invalid = !!err
  const id = `f-${f.key}`

  let input: React.ReactNode
  switch (f.type) {
    case 'textarea':
      input = <textarea id={id} rows={5} className={`input w-full ${invalid ? 'input-invalid' : ''}`} placeholder={f.placeholder} {...register(name)} />
      break
    case 'number':
      input = (
        <input
          id={id}
          type="number"
          min={0}
          className={`input w-48 text-right ${invalid ? 'input-invalid' : ''}`}
          {...register(name, { setValueAs: (v) => (v === '' || v === null ? null : Number(v)) })}
        />
      )
      break
    case 'select':
      input = (
        <select id={id} className={`input w-48 ${invalid ? 'input-invalid' : ''}`} {...register(name)}>
          <option value="">선택</option>
          {f.options?.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      )
      break
    case 'date':
      input = <Controller control={control} name={name} render={({ field }) => <DateInput id={id} label={f.label} value={(field.value as string) ?? ''} invalid={invalid} onChange={field.onChange} />} />
      break
    case 'dateRange':
      input = (
        <Controller
          control={control}
          name={name}
          render={({ field }) => {
            const v = (field.value as { from: string; to: string }) ?? { from: '', to: '' }
            return <DateRangeInput label={f.label} from={v.from} to={v.to} invalid={invalid} onChange={(from, to) => field.onChange({ from, to })} />
          }}
        />
      )
      break
    default:
      input = <input id={id} className={`input w-80 ${invalid ? 'input-invalid' : ''}`} placeholder={f.placeholder} {...register(name)} />
  }

  return (
    <tr>
      <th>
        <label htmlFor={id}>
          {f.label} {f.required && <span className="text-red-600">*</span>}
        </label>
      </th>
      <td>
        {input}
        <FieldError message={message} />
      </td>
    </tr>
  )
}
