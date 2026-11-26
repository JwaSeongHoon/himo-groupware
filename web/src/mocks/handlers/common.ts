import { HttpResponse, delay } from 'msw'
import type { User } from '../../api/types'
import { session, settings } from '../db'
import { userById } from '../org-helpers'

export const json = <T>(body: T, status = 200) => HttpResponse.json(body as never, { status })
export const fail = (status: number, message: string, fieldErrors?: Record<string, string>) =>
  HttpResponse.json({ message, fieldErrors }, { status })

/** MK-06: 지연·오류 모드 */
export async function simulate(method: string): Promise<Response | null> {
  const s = settings.get()
  if (s.delay) await delay(300 + Math.random() * 500)
  if (s.error && method === 'GET') return fail(500, '서버 오류가 발생했습니다. (mock 오류 모드)')
  return null
}

/** 세션의 사용자. 없으면 401 응답 */
export function currentUser(): User | Response {
  const id = session.get()
  const u = id ? userById(id) : undefined
  return u ?? fail(401, '로그인이 필요합니다.')
}

type Handler<P> = (ctx: { request: Request; params: P; user: User }) => Promise<Response> | Response

/** 인증·지연·오류 처리를 감싼 핸들러 */
export function authed<P = Record<string, string>>(fn: Handler<P>) {
  return async ({ request, params }: { request: Request; params: unknown }) => {
    const sim = await simulate(request.method)
    if (sim) return sim
    const user = currentUser()
    if (user instanceof Response) return user
    return fn({ request, params: params as P, user })
  }
}
