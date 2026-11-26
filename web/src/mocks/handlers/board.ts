import { http } from 'msw'
import type { BoardType, Post, PostInput, PostListItem, PostSearchField, User } from '../../api/types'
import { db, nextId, save, type DbPost } from '../db'
import { authorDeptOf, boardKeyOf } from '../org-helpers'
import { authed, fail, json } from './common'

const PAGE_SIZE = 50 // BD-10 [가정]
const BOARD_TYPES: BoardType[] = ['company', 'team', 'branch']

type P = { type: string; id?: string }

/** 대상 게시판은 경로가 아니라 사용자 소속으로 결정한다 (BD-07, MK-07) */
function resolveBoard(user: User, type: string): string | Response {
  if (!BOARD_TYPES.includes(type as BoardType)) return fail(404, '없는 게시판입니다.')
  const key = boardKeyOf(user, type as BoardType)
  return key ?? fail(403, '이 게시판을 열람할 권한이 없습니다.')
}

function findPost(boardKey: string, id: string): DbPost | Response {
  const post = db.posts.find((p) => p.id === id)
  if (!post) return fail(404, '게시글이 없습니다.')
  if (post.boardKey !== boardKey) return fail(403, '이 게시글을 열람할 권한이 없습니다.')
  return post
}

function toItem(p: DbPost, depth: number, replyCount: number): PostListItem {
  const { attachmentIds, boardKey: _k, content: _c, ...rest } = p
  return {
    ...rest,
    title: p.deleted ? '삭제된 글입니다' : p.title,
    depth,
    replyCount,
    attachments: p.deleted ? [] : db.files.filter((f) => attachmentIds.includes(f.id)),
  }
}

function toPost(p: DbPost): Post {
  const children = db.posts.filter((c) => c.parentId === p.id).length
  return { ...toItem(p, depthOf(p), children), content: p.deleted ? '' : p.content }
}

function depthOf(p: DbPost): number {
  let d = 0
  let cur = p
  while (cur.parentId) {
    const parent = db.posts.find((x) => x.id === cur.parentId)
    if (!parent) break
    cur = parent
    d += 1
  }
  return d
}

/** 스레드 정렬 (BD-06a): 원글 번호 내림차순, 스레드 안에서는 깊이 우선·작성 순 */
function threaded(posts: DbPost[]): PostListItem[] {
  const byParent = new Map<string | null, DbPost[]>()
  for (const p of posts) {
    const k = p.parentId
    if (!byParent.has(k)) byParent.set(k, [])
    byParent.get(k)!.push(p)
  }
  const out: PostListItem[] = []
  const walk = (p: DbPost, depth: number) => {
    const kids = (byParent.get(p.id) ?? []).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    out.push(toItem(p, depth, kids.length))
    kids.forEach((k) => walk(k, depth + 1))
  }
  ;(byParent.get(null) ?? []).sort((a, b) => b.no.localeCompare(a.no)).forEach((r) => walk(r, 0))
  return out
}

function matches(p: PostListItem, field: PostSearchField, q: string): boolean {
  if (p.deleted) return false
  if (field === 'author') return p.authorName.includes(q)
  if (field === 'content') return (db.posts.find((x) => x.id === p.id)?.content ?? '').includes(q)
  return p.title.includes(q)
}

/** 게시판·연도별 채번 (BD-01a) */
function nextPostNo(boardKey: string): string {
  const year = String(new Date().getFullYear())
  const max = db.posts
    .filter((p) => p.boardKey === boardKey && p.no.startsWith(year))
    .reduce((m, p) => Math.max(m, Number(p.no.slice(4))), 0)
  return `${year}${String(max + 1).padStart(5, '0')}`
}

function validate(input: PostInput): Record<string, string> | null {
  const errors: Record<string, string> = {}
  if (!input.title?.trim()) errors.title = '제목을 입력하세요.'
  if (!input.content?.trim()) errors.content = '본문을 입력하세요.'
  return Object.keys(errors).length ? errors : null
}

export const boardHandlers = [
  http.get(
    '/api/boards/:type/posts',
    authed<P>(({ request, params, user }) => {
      const key = resolveBoard(user, params.type)
      if (key instanceof Response) return key
      const sp = new URL(request.url).searchParams
      const field = (sp.get('field') ?? 'title') as PostSearchField
      const q = (sp.get('q') ?? '').trim()
      const cursor = Number(sp.get('cursor') || 0)
      let list = threaded(db.posts.filter((p) => p.boardKey === key))
      if (q) list = list.filter((p) => matches(p, field, q))
      const items = list.slice(cursor, cursor + PAGE_SIZE)
      const next = cursor + PAGE_SIZE < list.length ? String(cursor + PAGE_SIZE) : null
      return json({ items, nextCursor: next, total: list.length })
    }),
  ),

  http.get(
    '/api/boards/:type/posts/:id',
    authed<P>(({ request, params, user }) => {
      const key = resolveBoard(user, params.type)
      if (key instanceof Response) return key
      const post = findPost(key, params.id!)
      if (post instanceof Response) return post
      // 조회수 증가 (BD-03): 같은 사용자의 반복 열람도 증가 [가정]
      if (!new URL(request.url).searchParams.get('noCount') && !post.deleted) {
        post.viewCount += 1
        save()
      }
      return json(toPost(post))
    }),
  ),

  http.post(
    '/api/boards/:type/posts',
    authed<P>(async ({ request, params, user }) => {
      const key = resolveBoard(user, params.type)
      if (key instanceof Response) return key
      const input = (await request.json()) as PostInput
      const errors = validate(input)
      if (errors) return fail(422, '입력값을 확인하세요.', errors)
      if (input.parentId) {
        if (params.type === 'company') return fail(400, '사내게시판은 답글을 쓸 수 없습니다.') // BD-12 [가정]
        const parent = findPost(key, input.parentId)
        if (parent instanceof Response) return parent
        if (parent.deleted) return fail(400, '삭제된 글에는 답글을 쓸 수 없습니다.')
      }
      const post: DbPost = {
        id: nextId('p'),
        boardKey: key,
        boardType: params.type as BoardType,
        no: nextPostNo(key),
        title: input.title.trim(),
        content: input.content,
        authorId: user.id,
        authorName: user.name,
        authorDept: authorDeptOf(user),
        createdAt: new Date().toISOString(),
        viewCount: 0,
        parentId: input.parentId ?? null,
        attachmentIds: input.attachmentIds ?? [],
        deleted: false,
      }
      db.posts.push(post)
      save()
      return json(toPost(post), 201)
    }),
  ),

  http.put(
    '/api/boards/:type/posts/:id',
    authed<P>(async ({ request, params, user }) => {
      const key = resolveBoard(user, params.type)
      if (key instanceof Response) return key
      const post = findPost(key, params.id!)
      if (post instanceof Response) return post
      if (post.authorId !== user.id) return fail(403, '본인 글만 수정할 수 있습니다.')
      if (post.deleted) return fail(400, '삭제된 글입니다.')
      const input = (await request.json()) as PostInput
      const errors = validate(input)
      if (errors) return fail(422, '입력값을 확인하세요.', errors)
      post.title = input.title.trim()
      post.content = input.content
      post.attachmentIds = input.attachmentIds ?? []
      save()
      return json(toPost(post))
    }),
  ),

  http.delete(
    '/api/boards/:type/posts/:id',
    authed<P>(({ params, user }) => {
      const key = resolveBoard(user, params.type)
      if (key instanceof Response) return key
      const post = findPost(key, params.id!)
      if (post instanceof Response) return post
      if (post.authorId !== user.id) return fail(403, '본인 글만 삭제할 수 있습니다.')
      // 답글이 있으면 스레드를 유지하고 "삭제된 글입니다"로 표시 (BD-09 [가정])
      if (db.posts.some((p) => p.parentId === post.id)) {
        post.deleted = true
      } else {
        db.posts = db.posts.filter((p) => p.id !== post.id)
      }
      save()
      return new Response(null, { status: 204 })
    }),
  ),
]
