import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { useDeletePost, useMe, usePost, usePosts } from '../../api/services'
import type { BoardType, PostListItem, PostSearchField } from '../../api/types'
import { AttachmentList, FileButton } from '../../components/attachments'
import { Forbidden, PageHeader, QueryError, StatusBox } from '../../components/ui'
import { fmtDate, fmtDateTime } from '../../lib/date'

const BOARD_TYPES: BoardType[] = ['company', 'team', 'branch']
const FIELDS: { value: PostSearchField; label: string }[] = [
  { value: 'title', label: '제목' },
  { value: 'author', label: '작성자' },
  { value: 'content', label: '내용' },
]
const MAX_INDENT = 5 // BD-06b [가정]

/** S-01~03 게시판: 위 목록 + 아래 본문 (마스터-디테일) */
export function BoardPage() {
  const { type } = useParams()
  const { data: me } = useMe()
  if (!BOARD_TYPES.includes(type as BoardType)) return <Forbidden message="없는 게시판입니다." />
  const boardType = type as BoardType
  const title = me?.boardTitles[boardType]
  if (!title) return <Forbidden message="지점 소속이 없어 지점게시판을 볼 수 없습니다." />
  return <Board key={`${boardType}:${me!.user.id}`} type={boardType} title={title} />
}

function Board({ type, title }: { type: BoardType; title: string }) {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const field = (params.get('field') as PostSearchField) || 'title'
  const q = params.get('q') ?? ''
  const selectedId = params.get('post')

  const [draftQ, setDraftQ] = useState(q)
  const [draftField, setDraftField] = useState<PostSearchField>(field)

  const list = usePosts(type, field, q)
  const rows = list.data?.pages.flatMap((p) => p.items) ?? []
  const total = list.data?.pages[0]?.total ?? 0

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    setParams(next, { replace: 'post' in patch && Object.keys(patch).length === 1 })
  }

  const search = () => update({ field: draftField, q: draftQ.trim() || null, post: null })

  // 스크롤로 더 불러오기 (BD-10)
  const sentinel = useRef<HTMLTableRowElement>(null)
  useEffect(() => {
    const el = sentinel.current
    if (!el) return
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && list.hasNextPage && !list.isFetchingNextPage) list.fetchNextPage()
    })
    io.observe(el)
    return () => io.disconnect()
  }, [list])

  const select = (id: string) => update({ post: id })

  const onRowKey = (e: React.KeyboardEvent<HTMLTableRowElement>, idx: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      select(rows[idx].id)
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const next = (e.currentTarget.parentElement?.children[idx + (e.key === 'ArrowDown' ? 1 : -1)] as HTMLElement | undefined) ?? null
      if (next?.dataset.row) next.focus()
    }
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader title={title}>
        <Link to="/approval/box/sent" className="btn">
          🔍 상신함
        </Link>
      </PageHeader>

      <form
        className="mb-2 flex items-center gap-2"
        role="search"
        onSubmit={(e) => {
          e.preventDefault()
          search()
        }}
      >
        <input className="input w-80" value={draftQ} onChange={(e) => setDraftQ(e.target.value)} aria-label="검색어" placeholder="검색어" />
        <select className="input w-28" value={draftField} onChange={(e) => setDraftField(e.target.value as PostSearchField)} aria-label="검색 조건">
          {FIELDS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <button type="submit" className="btn">
          🔍 검색
        </button>
        {q && (
          <button
            type="button"
            className="btn"
            onClick={() => {
              setDraftQ('')
              update({ q: null, field: null, post: null })
            }}
          >
            전체 보기
          </button>
        )}
        <span className="ml-2 text-gray-500">{list.isSuccess && `총 ${total}건`}</span>
        <Link to={`/board/${type}/write`} className="btn ml-auto">
          ✏️ 글쓰기
        </Link>
      </form>

      <div className="grid-wrap h-[42vh] min-h-56 shrink-0">
        <table className="data-grid table-fixed" aria-label={`${title} 목록`}>
          <thead>
            <tr>
              <th className="w-24">번호</th>
              <th>제목</th>
              <th className="w-24">첨부파일</th>
              <th className="w-44">작성부서</th>
              <th className="w-24">작성자</th>
              <th className="w-24">작성일</th>
              <th className="w-14">조회</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p, i) => (
              <PostRow key={p.id} post={p} selected={p.id === selectedId} onSelect={() => select(p.id)} onKeyDown={(e) => onRowKey(e, i)} />
            ))}
            <tr ref={sentinel} aria-hidden className="pointer-events-none">
              <td colSpan={7} className="border-0 p-0">
                {list.isFetchingNextPage && <StatusBox kind="loading" />}
              </td>
            </tr>
          </tbody>
        </table>
        {list.isLoading && <StatusBox kind="loading" />}
        {list.isError && <QueryError error={list.error} onRetry={() => list.refetch()} />}
        {list.isSuccess && rows.length === 0 && <StatusBox kind="empty" message={q ? '검색 결과가 없습니다.' : '등록된 글이 없습니다.'} />}
      </div>

      <PostDetail
        type={type}
        id={selectedId}
        onReply={(id) => navigate(`/board/${type}/write?parent=${id}`)}
        onEdit={(id) => navigate(`/board/${type}/write?edit=${id}`)}
        onDeleted={() => update({ post: null })}
      />
    </div>
  )
}

function PostRow({
  post,
  selected,
  onSelect,
  onKeyDown,
}: {
  post: PostListItem
  selected: boolean
  onSelect: () => void
  onKeyDown: (e: React.KeyboardEvent<HTMLTableRowElement>) => void
}) {
  const indent = Math.min(post.depth, MAX_INDENT) * 18
  return (
    <tr data-row tabIndex={0} aria-selected={selected} onClick={onSelect} onKeyDown={onKeyDown}>
      <td className="text-gray-600">{post.no}</td>
      <td className="truncate">
        <span style={{ paddingLeft: indent }} className={post.deleted ? 'text-gray-400 italic' : ''}>
          {post.depth > 0 ? (
            <span className="mr-1 rounded bg-gray-200 px-1 text-[11px] text-gray-700">└ 답글</span>
          ) : (
            <span className="mr-1" aria-hidden>
              📄
            </span>
          )}
          {post.title}
        </span>
      </td>
      <td className="text-center">
        <FileButton files={post.attachments} />
      </td>
      <td className="truncate">{post.authorDept}</td>
      <td>{post.authorName}</td>
      <td>{fmtDate(post.createdAt)}</td>
      <td className="text-right">{post.viewCount}</td>
    </tr>
  )
}

function PostDetail({
  type,
  id,
  onReply,
  onEdit,
  onDeleted,
}: {
  type: BoardType
  id: string | null
  onReply: (id: string) => void
  onEdit: (id: string) => void
  onDeleted: () => void
}) {
  const { data: me } = useMe()
  const { data: post, isLoading, error, refetch } = usePost(type, id)
  const del = useDeletePost(type)

  if (!id) return <div className="mt-3 flex flex-1 items-center justify-center border border-line bg-white text-gray-400">목록에서 글을 선택하세요.</div>
  if (isLoading) return <StatusBox kind="loading" />
  if (error) return <QueryError error={error} onRetry={() => refetch()} />
  if (!post) return null

  const mine = post.authorId === me?.user.id && !post.deleted
  const canReply = type !== 'company' && !post.deleted // BD-12 [가정]

  const onDelete = async () => {
    const msg = post.replyCount > 0 ? '답글이 있어 "삭제된 글입니다"로 표시됩니다. 삭제하시겠습니까?' : '삭제하시겠습니까?'
    if (!confirm(msg)) return
    await del.mutateAsync(post.id)
    onDeleted()
  }

  return (
    <section className="mt-3 flex min-h-48 flex-1 flex-col" aria-label="본문">
      <div className="mb-1 flex items-end justify-between gap-2">
        <h2 className={`text-[17px] font-bold ${post.deleted ? 'text-gray-400' : 'text-blue-700'}`}>{post.deleted ? '삭제된 글입니다' : post.title}</h2>
        <div className="flex shrink-0 gap-1.5">
          {canReply && (
            <button type="button" className="btn btn-sm" onClick={() => onReply(post.id)}>
              ↳ 답글
            </button>
          )}
          {mine && (
            <>
              <button type="button" className="btn btn-sm" onClick={() => onEdit(post.id)}>
                수정
              </button>
              <button type="button" className="btn btn-sm" onClick={onDelete} disabled={del.isPending}>
                삭제
              </button>
            </>
          )}
        </div>
      </div>
      <div className="mb-1 text-xs text-gray-500">
        {post.no} · {post.authorDept} {post.authorName} · {fmtDateTime(post.createdAt)} · 조회 {post.viewCount}
      </div>
      <div className="flex-1 overflow-auto border-2 border-gray-300 bg-white p-3 leading-7 whitespace-pre-wrap">{post.deleted ? '' : post.content}</div>
      {post.attachments.length > 0 && (
        <div className="mt-1 flex gap-2 border border-line bg-white px-3 py-1.5">
          <span className="font-semibold text-gray-600">첨부</span>
          <AttachmentList files={post.attachments} />
        </div>
      )}
    </section>
  )
}
