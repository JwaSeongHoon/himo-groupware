/**
 * mock 서버의 저장소. 브라우저 localStorage 에 보관해 새로고침 후에도 유지한다 (MK-05).
 * 화면 코드는 이 파일을 참조하지 않는다.
 */
import type { Attachment, BoardType, ConfirmFlag, DocStatus, FormValue, LineStatus } from '../api/types'
import { seedDocs, seedFiles, seedPosts } from './seed/data'

export interface DbPost {
  id: string
  /** 'company' | 'team:<deptId>' | 'branch:<branchId>' */
  boardKey: string
  boardType: BoardType
  no: string
  title: string
  content: string
  authorId: string
  authorName: string
  authorDept: string
  createdAt: string
  viewCount: number
  parentId: string | null
  attachmentIds: string[]
  deleted: boolean
}

export interface DbLine {
  order: number
  approverId: string
  status: LineStatus
  actedAt: string | null
  comment: string | null
}

export interface DbDoc {
  id: string
  docNo: string
  formId: string
  title: string
  drafterId: string
  branchCode: string
  branchName: string
  draftedAt: string
  data: Record<string, FormValue>
  status: DocStatus
  lines: DbLine[]
  check: ConfirmFlag
  hqConfirm: ConfirmFlag
  financeConfirm: ConfirmFlag
  cancelReason: string | null
  attachmentIds: string[]
}

export interface Db {
  version: number
  posts: DbPost[]
  docs: DbDoc[]
  files: Attachment[]
  seq: number
}

export interface MockSettings {
  /** 응답 지연 0.3~0.8초 (MK-06) */
  delay: boolean
  /** 모든 조회 요청에 500 오류 응답 (MK-06) */
  error: boolean
}

const DB_KEY = 'himo.mock.db'
const SESSION_KEY = 'himo.mock.session'
const SETTINGS_KEY = 'himo.mock.settings'
const DB_VERSION = 1

function createSeed(): Db {
  return { version: DB_VERSION, posts: seedPosts(), docs: seedDocs(), files: seedFiles(), seq: 1000 }
}

function load(): Db {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Db
      if (parsed.version === DB_VERSION) return parsed
    }
  } catch {
    /* 손상 시 초기화 */
  }
  const seed = createSeed()
  localStorage.setItem(DB_KEY, JSON.stringify(seed))
  return seed
}

export let db: Db = load()

export function save() {
  localStorage.setItem(DB_KEY, JSON.stringify(db))
}

export function resetDb() {
  db = createSeed()
  save()
}

export function nextId(prefix: string) {
  db.seq += 1
  return `${prefix}${db.seq.toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

// ───── 세션 (mock 로그인) ─────

export const session = {
  get: () => localStorage.getItem(SESSION_KEY),
  set: (userId: string) => localStorage.setItem(SESSION_KEY, userId),
  clear: () => localStorage.removeItem(SESSION_KEY),
}

// ───── 개발 설정 ─────

export const settings = {
  get(): MockSettings {
    try {
      return { delay: false, error: false, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') }
    } catch {
      return { delay: false, error: false }
    }
  },
  set(s: MockSettings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
  },
}
