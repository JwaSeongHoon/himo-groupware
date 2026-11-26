import { http } from 'msw'
import type { Me } from '../../api/types'
import { db, resetDb, save, session, settings, nextId, type MockSettings } from '../db'
import { boardTitles, branchById, deptById, summaryOf, userById, workplaceOf } from '../org-helpers'
import { branches, departments } from '../seed/org'
import { users } from '../seed/users'
import { authed, fail, json, simulate } from './common'

function meOf(id: string): Me {
  const user = userById(id)!
  return {
    user,
    department: deptById(user.departmentId),
    branch: branchById(user.branchId),
    workplace: workplaceOf(user),
    boardTitles: boardTitles(user),
  }
}

export const authOrgHandlers = [
  // ── mock 로그인 (AU-01). 실제 인증 연결 시 제거 ──
  http.get('/api/auth/users', () => json(users.map(summaryOf))),
  http.post('/api/auth/login', async ({ request }) => {
    const { userId } = (await request.json()) as { userId: string }
    if (!userById(userId)) return fail(400, '존재하지 않는 사용자입니다.')
    session.set(userId)
    return json(meOf(userId))
  }),
  http.post('/api/auth/logout', () => {
    session.clear()
    return new Response(null, { status: 204 })
  }),

  http.get('/api/me', async ({ request }) => {
    const sim = await simulate(request.method)
    if (sim && sim.status !== 500) return sim
    const id = session.get()
    if (!id || !userById(id)) return fail(401, '로그인이 필요합니다.')
    return json(meOf(id))
  }),

  http.get('/api/org/departments', authed(() => json(departments))),
  http.get('/api/org/branches', authed(() => json(branches))),

  /** 결재자 검색: 이름·직급·부서·지점 */
  http.get(
    '/api/users',
    authed(({ request }) => {
      const q = (new URL(request.url).searchParams.get('q') ?? '').trim()
      const list = users.map(summaryOf).filter((u) => !q || [u.name, u.position, u.departmentName, u.branchName ?? ''].some((v) => v.includes(q)))
      return json(list)
    }),
  ),

  // ── 첨부 (가짜 업로드: 파일명·크기만 저장, BD-05) ──
  http.post(
    '/api/files',
    authed(async ({ request }) => {
      const fd = await request.formData()
      const file = fd.get('file')
      if (!(file instanceof File)) return fail(400, '파일이 없습니다.')
      const att = { id: nextId('f'), name: file.name, size: file.size }
      db.files.push(att)
      save()
      return json(att, 201)
    }),
  ),
  http.get(
    '/api/files/:id',
    authed<{ id: string }>(({ params, user }) => {
      const file = db.files.find((f) => f.id === params.id)
      if (!file) return fail(404, '파일이 없습니다.')
      // 권한 검사: 파일이 붙은 게시글·문서를 볼 수 있어야 한다
      const post = db.posts.find((p) => p.attachmentIds.includes(file.id))
      const doc = db.docs.find((d) => d.attachmentIds.includes(file.id))
      const keys = ['company', `team:${user.departmentId}`, user.branchId ? `branch:${user.branchId}` : '']
      const ok =
        (post && keys.includes(post.boardKey)) ||
        (doc && (doc.drafterId === user.id || doc.lines.some((l) => l.approverId === user.id)))
      if (!ok) return fail(403, '첨부파일을 내려받을 권한이 없습니다.')
      return new Response(`[mock 첨부파일]\n파일명: ${file.name}\n실제 파일 저장소는 B2 단계에서 연결됩니다.\n`, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }),
  ),

  // ── 개발 도구 (MK-05, MK-06) ──
  http.post('/api/__dev/reset', () => {
    resetDb()
    return new Response(null, { status: 204 })
  }),
  http.get('/api/__dev/settings', () => json(settings.get())),
  http.put('/api/__dev/settings', async ({ request }) => {
    const s = (await request.json()) as MockSettings
    settings.set(s)
    return json(s)
  }),
]
