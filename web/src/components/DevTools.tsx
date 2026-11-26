import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { useLoginUsers, useSwitchUser } from '../api/services'

interface MockSettings {
  delay: boolean
  error: boolean
}

/**
 * 개발용 도구 (AU-02, AU-04, MK-05, MK-06).
 * VITE_USE_MOCK=true 일 때만 표시되며, 실제 인증 연결 시 제거한다.
 */
export function DevTools({ currentUserId }: { currentUserId: string }) {
  const qc = useQueryClient()
  const { data: users } = useLoginUsers()
  const switchUser = useSwitchUser()
  const { data: settings } = useQuery({
    queryKey: ['dev', 'settings'],
    queryFn: () => api.get<MockSettings>('/api/__dev/settings'),
  })

  const updateSettings = async (s: MockSettings) => {
    await api.put('/api/__dev/settings', s)
    qc.setQueryData(['dev', 'settings'], s)
    await qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'dev' })
  }

  const reset = async () => {
    if (!confirm('mock 데이터를 처음 상태로 되돌립니다. 작성·승인한 내용이 모두 사라집니다.')) return
    await api.post('/api/__dev/reset')
    await qc.invalidateQueries()
  }

  return (
    <div className="flex items-center gap-2 rounded border border-dashed border-amber-400 bg-amber-50 px-2 py-1 text-xs text-amber-900" role="group" aria-label="개발용 도구">
      <span className="rounded bg-amber-400 px-1.5 py-0.5 font-bold text-white">개발용</span>
      <label className="flex items-center gap-1">
        사용자 전환
        <select
          className="input h-6 py-0 text-xs"
          value={currentUserId}
          disabled={switchUser.isPending}
          onChange={(e) => switchUser.mutate(e.target.value)}
        >
          {users?.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} {u.position} · {u.departmentName}
              {u.branchName ? ` ${u.branchName}` : ''}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-1" title="응답 지연 0.3~0.8초">
        <input type="checkbox" checked={!!settings?.delay} onChange={(e) => settings && updateSettings({ ...settings, delay: e.target.checked })} />
        지연
      </label>
      <label className="flex items-center gap-1" title="조회 요청에 500 오류 응답">
        <input type="checkbox" checked={!!settings?.error} onChange={(e) => settings && updateSettings({ ...settings, error: e.target.checked })} />
        오류
      </label>
      <button type="button" className="btn btn-sm border-amber-400" onClick={reset}>
        초기화
      </button>
    </div>
  )
}
