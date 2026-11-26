import { useQueryClient } from '@tanstack/react-query'
import { Link, NavLink, Navigate, Outlet, useNavigate } from 'react-router'
import { ApiError, USE_MOCK } from '../api/client'
import { logout, useMe, usePendingCount } from '../api/services'
import type { Me } from '../api/types'
import { DevTools } from './DevTools'
import { StatusBox } from './ui'

/** 로그인 확인 후 공통 레이아웃 (CM-01) */
export function Layout() {
  const { data: me, error, isLoading, refetch } = useMe()
  if (isLoading) return <StatusBox kind="loading" />
  if (error instanceof ApiError && error.status === 401) return <Navigate to="/login" replace />
  if (error || !me) return <StatusBox kind="error" message={(error as Error)?.message} onRetry={() => refetch()} />

  return (
    <div className="flex h-full flex-col">
      <TopBar me={me} />
      <div className="flex min-h-0 flex-1">
        <Sidebar me={me} />
        <main className="min-w-0 flex-1 overflow-auto p-4">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function TopBar({ me }: { me: Me }) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { data: pending } = usePendingCount()

  const onLogout = async () => {
    await logout()
    qc.clear()
    navigate('/login')
  }

  return (
    <header className="flex h-12 shrink-0 items-center gap-4 bg-brand px-4 text-white shadow">
      <Link to="/board/company" className="text-base font-bold tracking-wide">
        HIMO 그룹웨어
      </Link>

      <div className="flex flex-1 justify-center">
        {/* 미결재 알림 (CM-02): 0건이면 숨김 */}
        {!!pending && (
          <Link to="/approval/box/pending" className="rounded-full bg-white px-5 py-1 font-bold text-alert underline underline-offset-4 shadow-sm hover:bg-orange-50">
            미 결재 : {pending}건이 존재 합니다!!
          </Link>
        )}
      </div>

      {USE_MOCK && <DevTools currentUserId={me.user.id} />}

      <div className="text-right leading-tight">
        <div className="font-semibold">
          {me.user.name} {me.user.position}
        </div>
        <div className="text-xs text-blue-100">
          {me.department.name}
          {me.branch ? ` · ${me.branch.name}` : ''}
        </div>
      </div>
      <button type="button" className="rounded border border-white/40 px-2 py-0.5 text-xs hover:bg-white/10" onClick={onLogout}>
        로그아웃
      </button>
    </header>
  )
}

interface MenuItem {
  label: string
  to?: string
  children?: MenuItem[]
}

function Sidebar({ me }: { me: Me }) {
  const menu: MenuItem[] = [
    {
      label: '게시판',
      children: [
        { label: '사내게시판', to: '/board/company' },
        { label: '팀게시판', to: '/board/team' },
        // 지점 소속이 없으면 지점게시판 메뉴를 숨긴다 [가정]
        ...(me.branch ? [{ label: '지점게시판', to: '/board/branch' }] : []),
      ],
    },
    {
      label: '전자결재',
      children: [
        {
          label: '결재문서작성',
          children: [
            { label: '품의서 작성', to: '/approval/forms/proposal' },
            { label: '기타 문서작성', to: '/approval/forms/etc' },
          ],
        },
        {
          label: '결재함 관리',
          children: [
            { label: '상신함', to: '/approval/box/sent' },
            { label: '미결함', to: '/approval/box/pending' },
            { label: '기결함', to: '/approval/box/done' },
          ],
        },
      ],
    },
  ]

  return (
    <nav aria-label="주 메뉴" className="w-52 shrink-0 overflow-y-auto border-r border-line bg-white py-2">
      <MenuTree items={menu} level={0} />
    </nav>
  )
}

function MenuTree({ items, level }: { items: MenuItem[]; level: number }) {
  return (
    <ul>
      {items.map((it) => (
        <li key={it.label}>
          {it.to ? (
            <NavLink
              to={it.to}
              style={{ paddingLeft: 12 + level * 14 }}
              className={({ isActive }) =>
                `block py-1.5 pr-3 hover:bg-brand-light ${isActive ? 'border-r-4 border-brand bg-brand-light font-bold text-brand' : 'text-gray-700'}`
              }
            >
              {it.label}
            </NavLink>
          ) : (
            <div style={{ paddingLeft: 12 + level * 14 }} className={`py-1.5 pr-3 ${level === 0 ? 'mt-1 font-bold text-gray-900' : 'font-semibold text-gray-600'}`}>
              {level === 0 ? '■ ' : '▸ '}
              {it.label}
            </div>
          )}
          {it.children && <MenuTree items={it.children} level={level + 1} />}
        </li>
      ))}
    </ul>
  )
}
