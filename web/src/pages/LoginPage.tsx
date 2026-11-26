import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { login, useLoginUsers } from '../api/services'
import { StatusBox } from '../components/ui'

/** S-00 mock 로그인 (AU-01): 사용자를 골라 들어간다. 비밀번호 없음 */
export function LoginPage() {
  const { data: users, isLoading, error } = useLoginUsers()
  const [selected, setSelected] = useState('')
  const [busy, setBusy] = useState(false)
  const qc = useQueryClient()
  const navigate = useNavigate()

  const enter = async (id: string) => {
    if (!id) return
    setBusy(true)
    try {
      await login(id)
      qc.clear()
      navigate('/board/company')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-brand p-6">
      <div className="w-[520px] rounded-lg bg-white shadow-xl">
        <div className="border-b border-gray-200 px-6 py-5">
          <h1 className="text-xl font-bold text-brand">HIMO 그룹웨어</h1>
          <p className="mt-1 text-xs text-amber-700">
            <span className="mr-1 rounded bg-amber-400 px-1.5 py-0.5 font-bold text-white">개발용</span>
            mock 로그인 — 가상 사용자 중 하나를 골라 들어갑니다. 실제 인증 연결 시 교체됩니다.
          </p>
        </div>
        <div className="max-h-[420px] overflow-y-auto px-2 py-2">
          {isLoading && <StatusBox kind="loading" />}
          {!!error && <StatusBox kind="error" message={(error as Error).message} />}
          <ul role="listbox" aria-label="로그인할 사용자">
            {users?.map((u) => (
              <li
                key={u.id}
                role="option"
                tabIndex={0}
                aria-selected={selected === u.id}
                onClick={() => setSelected(u.id)}
                onDoubleClick={() => enter(u.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') enter(u.id)
                  if (e.key === ' ') {
                    e.preventDefault()
                    setSelected(u.id)
                  }
                }}
                className={`flex cursor-pointer items-center justify-between rounded px-4 py-2 outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                  selected === u.id ? 'bg-sel' : 'hover:bg-gray-50'
                }`}
              >
                <span>
                  <b>{u.name}</b> <span className="text-gray-600">{u.position}</span>
                </span>
                <span className="text-gray-500">
                  {u.departmentName}
                  {u.branchName ? ` · ${u.branchName}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex justify-end border-t border-gray-200 px-6 py-3">
          <button type="button" className="btn btn-primary" disabled={!selected || busy} onClick={() => enter(selected)}>
            로그인
          </button>
        </div>
      </div>
    </div>
  )
}
