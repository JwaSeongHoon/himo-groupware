/**
 * 데이터 접근 계층 (서비스 함수 + TanStack Query 훅).
 * 화면은 이 파일만 사용한다.
 */
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query'
import { api } from './client'
import type {
  ApprovalDoc,
  ApprovalForm,
  Attachment,
  BoardType,
  Branch,
  Department,
  DocCreateInput,
  DocListQuery,
  FormCategory,
  Me,
  Post,
  PostInput,
  PostListResponse,
  PostSearchField,
  UserSummary,
} from './types'

export const qk = {
  me: ['me'] as const,
  devUsers: ['dev', 'users'] as const,
  departments: ['org', 'departments'] as const,
  branches: ['org', 'branches'] as const,
  users: (q: string) => ['users', q] as const,
  posts: (type: BoardType, field: PostSearchField, q: string) => ['posts', type, field, q] as const,
  postsAll: ['posts'] as const,
  post: (type: BoardType, id: string) => ['post', type, id] as const,
  forms: (category?: FormCategory) => ['forms', category ?? 'all'] as const,
  form: (id: string) => ['form', id] as const,
  docs: (query: DocListQuery) => ['docs', query] as const,
  docsAll: ['docs'] as const,
  doc: (id: string) => ['doc', id] as const,
  pendingCount: ['pendingCount'] as const,
}

// ───────────── 인증 · 조직 ─────────────

export const useMe = () => useQuery({ queryKey: qk.me, queryFn: () => api.get<Me>('/api/me'), retry: false })

export const useDepartments = () =>
  useQuery({ queryKey: qk.departments, queryFn: () => api.get<Department[]>('/api/org/departments'), staleTime: Infinity })

export const useBranches = () =>
  useQuery({ queryKey: qk.branches, queryFn: () => api.get<Branch[]>('/api/org/branches'), staleTime: Infinity })

export const useUserSearch = (q: string) =>
  useQuery({ queryKey: qk.users(q), queryFn: () => api.get<UserSummary[]>('/api/users', { q }) })

/** mock 로그인 (AU-01). 실제 인증 연결 시 교체 */
export const login = (userId: string) => api.post<Me>('/api/auth/login', { userId })
export const logout = () => api.post<void>('/api/auth/logout')

/** 로그인 화면의 사용자 목록 (개발용) */
export const useLoginUsers = () =>
  useQuery({ queryKey: qk.devUsers, queryFn: () => api.get<UserSummary[]>('/api/auth/users') })

/** 사용자 전환 후 모든 화면 데이터를 새 사용자 권한으로 다시 받는다 (AU-03) */
export function useSwitchUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: login,
    onSuccess: async () => {
      await qc.resetQueries({ predicate: (q) => q.queryKey[0] !== 'org' && q.queryKey[0] !== 'dev' })
    },
  })
}

// ───────────── 첨부 ─────────────

export async function uploadFiles(files: File[]): Promise<Attachment[]> {
  const out: Attachment[] = []
  for (const f of files) {
    const fd = new FormData()
    fd.append('file', f)
    out.push(await api.post<Attachment>('/api/files', fd))
  }
  return out
}

// ───────────── 게시판 ─────────────

export function usePosts(type: BoardType, field: PostSearchField, q: string) {
  return useInfiniteQuery({
    queryKey: qk.posts(type, field, q),
    queryFn: ({ pageParam }) =>
      api.get<PostListResponse>(`/api/boards/${type}/posts`, { field, q, cursor: pageParam }),
    initialPageParam: '' as string,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  })
}

/** 본문 조회 + 조회수 증가 (BD-03). 결과의 조회수를 목록 캐시에도 반영한다 */
export function usePost(type: BoardType, id: string | null) {
  const qc = useQueryClient()
  return useQuery({
    queryKey: qk.post(type, id ?? ''),
    enabled: !!id,
    staleTime: 0,
    gcTime: 0,
    queryFn: async () => {
      const post = await api.get<Post>(`/api/boards/${type}/posts/${id}`)
      qc.setQueriesData<InfiniteData<PostListResponse>>({ queryKey: ['posts', type] }, (old) =>
        old
          ? {
              ...old,
              pages: old.pages.map((p) => ({
                ...p,
                items: p.items.map((it) => (it.id === post.id ? { ...it, viewCount: post.viewCount } : it)),
              })),
            }
          : old,
      )
      return post
    },
  })
}

/** 수정 화면용: 조회수를 올리지 않는 조회 */
export const getPostForEdit = (type: BoardType, id: string) =>
  api.get<Post>(`/api/boards/${type}/posts/${id}`, { noCount: 1 })

export function useSavePost(type: BoardType) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: PostInput }) =>
      id ? api.put<Post>(`/api/boards/${type}/posts/${id}`, input) : api.post<Post>(`/api/boards/${type}/posts`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.postsAll }),
  })
}

export function useDeletePost(type: BoardType) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.del<void>(`/api/boards/${type}/posts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.postsAll }),
  })
}

// ───────────── 전자결재 ─────────────

export const useForms = (category?: FormCategory) =>
  useQuery({
    queryKey: qk.forms(category),
    queryFn: () => api.get<ApprovalForm[]>('/api/approval/forms', { category }),
    staleTime: Infinity,
  })

export const useForm = (id: string) =>
  useQuery({ queryKey: qk.form(id), queryFn: () => api.get<ApprovalForm>(`/api/approval/forms/${id}`) })

export const useDocs = (query: DocListQuery) =>
  useQuery({
    queryKey: qk.docs(query),
    queryFn: () => api.get<ApprovalDoc[]>('/api/approval/docs', { ...query }),
  })

export const useDoc = (id: string) =>
  useQuery({ queryKey: qk.doc(id), queryFn: () => api.get<ApprovalDoc>(`/api/approval/docs/${id}`), retry: false })

export const usePendingCount = (enabled = true) =>
  useQuery({
    queryKey: qk.pendingCount,
    queryFn: () => api.get<{ count: number }>('/api/approval/pending-count'),
    enabled,
    refetchInterval: 60_000,
    select: (d) => d.count,
  })

/** 상신·승인·반려·취소요청 후 결재함과 미결재 건수를 갱신한다 (AP-11) */
function useApprovalMutation<V>(fn: (v: V) => Promise<ApprovalDoc>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (doc) => {
      qc.setQueryData(qk.doc(doc.id), doc)
      qc.invalidateQueries({ queryKey: qk.docsAll })
      qc.invalidateQueries({ queryKey: qk.pendingCount })
    },
  })
}

export const useCreateDoc = () => useApprovalMutation((input: DocCreateInput) => api.post<ApprovalDoc>('/api/approval/docs', input))

export const useApprove = () =>
  useApprovalMutation(({ id, comment }: { id: string; comment: string }) =>
    api.post<ApprovalDoc>(`/api/approval/docs/${id}/approve`, { comment }),
  )

export const useReject = () =>
  useApprovalMutation(({ id, comment }: { id: string; comment: string }) =>
    api.post<ApprovalDoc>(`/api/approval/docs/${id}/reject`, { comment }),
  )

export const useCancelRequest = () =>
  useApprovalMutation(({ id, reason }: { id: string; reason: string }) =>
    api.post<ApprovalDoc>(`/api/approval/docs/${id}/cancel-request`, { reason }),
  )
