import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { z } from 'zod'
import { ApiError } from '../../api/client'
import { getPostForEdit, useMe, useSavePost } from '../../api/services'
import type { Attachment, BoardType } from '../../api/types'
import { AttachmentPicker } from '../../components/attachments'
import { FieldError, Forbidden, PageHeader, QueryError, StatusBox } from '../../components/ui'
import { fmtDate, today } from '../../lib/date'

const schema = z.object({
  title: z.string().trim().min(1, '제목을 입력하세요.').max(200, '제목은 200자 이내로 입력하세요.'),
  content: z.string().refine((v) => v.trim().length > 0, '본문을 입력하세요.'),
  attachments: z.array(z.custom<Attachment>()),
})
type Values = z.infer<typeof schema>

/** S-04 글쓰기 / 답글쓰기 / 수정 (BD-04, BD-06, BD-09) */
export function PostWritePage() {
  const { type } = useParams() as { type: BoardType }
  const [params] = useSearchParams()
  const parentId = params.get('parent')
  const editId = params.get('edit')
  const { data: me } = useMe()

  // 원글(답글 작성 시) 또는 수정 대상 글
  const refId = editId ?? parentId
  const ref = useQuery({
    queryKey: ['post-ref', type, refId],
    queryFn: () => getPostForEdit(type, refId!),
    enabled: !!refId,
    gcTime: 0,
  })

  if (!me) return null
  const boardTitle = me.boardTitles[type]
  if (!boardTitle) return <Forbidden message="지점 소속이 없어 지점게시판에 글을 쓸 수 없습니다." />
  if (type === 'company' && parentId) return <Forbidden message="사내게시판은 답글을 쓸 수 없습니다." />
  if (refId && ref.isLoading) return <StatusBox kind="loading" />
  if (refId && ref.error) return <QueryError error={ref.error} />
  if (editId && ref.data && ref.data.authorId !== me.user.id) return <Forbidden message="본인 글만 수정할 수 있습니다." />

  return (
    <WriteForm
      type={type}
      boardTitle={boardTitle}
      author={`${me.user.name} ${me.user.position}`}
      dept={me.branch ? `${me.department.name}(${me.branch.name})` : me.department.name}
      parent={parentId ? ref.data : undefined}
      edit={editId ? ref.data : undefined}
    />
  )
}

function WriteForm({
  type,
  boardTitle,
  author,
  dept,
  parent,
  edit,
}: {
  type: BoardType
  boardTitle: string
  author: string
  dept: string
  parent?: { id: string; title: string }
  edit?: { id: string; title: string; content: string; attachments: Attachment[] }
}) {
  const navigate = useNavigate()
  const save = useSavePost(type)
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    control,
    setError,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: edit?.title ?? (parent ? `RE: ${parent.title}` : ''),
      content: edit?.content ?? '',
      attachments: edit?.attachments ?? [],
    },
  })

  useEffect(() => setFocus(parent ? 'content' : 'title'), [setFocus, parent])

  const onSubmit = async (v: Values) => {
    setServerError(null)
    try {
      const saved = await save.mutateAsync({
        id: edit?.id,
        input: { title: v.title, content: v.content, parentId: parent?.id ?? null, attachmentIds: v.attachments.map((a) => a.id) },
      })
      navigate(`/board/${type}?post=${saved.id}`)
    } catch (e) {
      if (e instanceof ApiError && e.body?.fieldErrors) {
        for (const [k, msg] of Object.entries(e.body.fieldErrors)) setError(k as keyof Values, { message: msg })
      } else setServerError((e as Error).message)
    }
  }

  const heading = edit ? '글 수정' : parent ? '답글쓰기' : '글쓰기'

  return (
    <div className="max-w-5xl">
      <PageHeader title={`${boardTitle} · ${heading}`} />
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <table className="info-table">
          <tbody>
            {parent && (
              <tr>
                <th>원글</th>
                <td className="text-gray-600">{parent.title}</td>
              </tr>
            )}
            <tr>
              <th>작성부서 / 작성자</th>
              <td>
                {dept} / {author} <span className="ml-3 text-gray-500">작성일 {fmtDate(today())}</span>
              </td>
            </tr>
            <tr>
              <th>
                <label htmlFor="title">
                  제목 <span className="text-red-600">*</span>
                </label>
              </th>
              <td>
                <input id="title" className={`input w-full ${errors.title ? 'input-invalid' : ''}`} aria-invalid={!!errors.title} {...register('title')} />
                <FieldError message={errors.title?.message} />
              </td>
            </tr>
            <tr>
              <th>
                <label htmlFor="content">
                  본문 <span className="text-red-600">*</span>
                </label>
              </th>
              <td>
                <textarea id="content" rows={16} className={`input w-full leading-6 ${errors.content ? 'input-invalid' : ''}`} aria-invalid={!!errors.content} {...register('content')} />
                <FieldError message={errors.content?.message} />
              </td>
            </tr>
            <tr>
              <th>첨부파일</th>
              <td>
                <Controller control={control} name="attachments" render={({ field }) => <AttachmentPicker value={field.value} onChange={field.onChange} />} />
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
            {edit ? '수정' : '등록'}
          </button>
        </div>
      </form>
    </div>
  )
}
