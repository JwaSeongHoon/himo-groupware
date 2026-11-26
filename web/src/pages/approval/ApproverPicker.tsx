import { useEffect, useState } from 'react'
import { useUserSearch } from '../../api/services'
import type { UserSummary } from '../../api/types'

/** 결재라인 지정 (AP-09): 조직에서 검색해 추가, 순서 변경·삭제. 마지막 사람이 최종결재자 */
export function ApproverPicker({
  value,
  onChange,
  excludeId,
  invalid,
}: {
  value: UserSummary[]
  onChange: (v: UserSummary[]) => void
  excludeId: string
  invalid?: boolean
}) {
  const [q, setQ] = useState('')
  const [debounced, setDebounced] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 250)
    return () => clearTimeout(t)
  }, [q])
  const { data: found, isFetching } = useUserSearch(debounced)
  const candidates = (found ?? []).filter((u) => u.id !== excludeId && !value.some((v) => v.id === u.id))

  const move = (i: number, d: -1 | 1) => {
    const next = [...value]
    ;[next[i], next[i + d]] = [next[i + d], next[i]]
    onChange(next)
  }

  return (
    <div className={`grid grid-cols-2 gap-3 ${invalid ? 'rounded ring-1 ring-red-500' : ''}`}>
      <div className="border border-line">
        <div className="flex items-center gap-2 border-b border-line bg-[#eef1f6] px-2 py-1.5">
          <input className="input flex-1" placeholder="이름·직급·부서·지점 검색" value={q} onChange={(e) => setQ(e.target.value)} aria-label="결재자 검색" />
          {isFetching && <span className="text-xs text-gray-500">검색 중…</span>}
        </div>
        <ul className="h-48 overflow-y-auto" aria-label="검색 결과">
          {candidates.map((u) => (
            <li key={u.id} className="flex items-center justify-between border-b border-gray-100 px-2 py-1 hover:bg-gray-50">
              <span>
                <b>{u.name}</b> {u.position}
                <span className="ml-1.5 text-xs text-gray-500">
                  {u.departmentName}
                  {u.branchName ? ` · ${u.branchName}` : ''}
                </span>
              </span>
              <button type="button" className="btn btn-sm" onClick={() => onChange([...value, u])} aria-label={`${u.name} 결재자로 추가`}>
                추가 ›
              </button>
            </li>
          ))}
          {found && candidates.length === 0 && <li className="p-3 text-center text-gray-400">추가할 사용자가 없습니다.</li>}
        </ul>
      </div>

      <div className="border border-line">
        <div className="border-b border-line bg-[#eef1f6] px-2 py-1.5 font-semibold">결재 순서 ({value.length}명)</div>
        <ol className="h-48 overflow-y-auto" aria-label="결재라인">
          {value.map((u, i) => (
            <li key={u.id} className="flex items-center gap-2 border-b border-gray-100 px-2 py-1">
              <span className="w-5 text-center font-bold text-brand">{i + 1}</span>
              <span className="flex-1">
                <b>{u.name}</b> {u.position} <span className="text-xs text-gray-500">{u.departmentName}</span>
                {i === value.length - 1 && <span className="ml-1.5 rounded bg-brand px-1 text-[11px] text-white">최종결재</span>}
              </span>
              <button type="button" className="btn btn-sm px-1.5" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`${u.name} 위로`}>
                ▲
              </button>
              <button type="button" className="btn btn-sm px-1.5" disabled={i === value.length - 1} onClick={() => move(i, 1)} aria-label={`${u.name} 아래로`}>
                ▼
              </button>
              <button type="button" className="btn btn-sm px-1.5 text-red-600" onClick={() => onChange(value.filter((x) => x.id !== u.id))} aria-label={`${u.name} 삭제`}>
                ✕
              </button>
            </li>
          ))}
          {value.length === 0 && <li className="p-3 text-center text-gray-400">왼쪽에서 결재자를 추가하세요.</li>}
        </ol>
      </div>
    </div>
  )
}
