import { useRef, useState } from 'react'
import { downloadFile } from '../api/client'
import { uploadFiles } from '../api/services'
import type { Attachment } from '../api/types'
import { fmtSize } from '../lib/date'

/** FILE 버튼 (BD-05) */
export function FileButton({ files }: { files: Attachment[] }) {
  if (!files.length) return null
  const onClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    files.forEach((f) => downloadFile(f.id, f.name).catch((err: Error) => alert(err.message)))
  }
  return (
    <button type="button" className="btn btn-sm py-0 text-brand" onClick={onClick} title={files.map((f) => f.name).join(', ')}>
      💾 FILE{files.length > 1 ? ` ${files.length}` : ''}
    </button>
  )
}

export function AttachmentList({ files }: { files: Attachment[] }) {
  if (!files.length) return <span className="text-gray-400">없음</span>
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1">
      {files.map((f) => (
        <li key={f.id}>
          <button type="button" className="text-brand underline-offset-2 hover:underline" onClick={() => downloadFile(f.id, f.name).catch((err: Error) => alert(err.message))}>
            📎 {f.name}
          </button>
          <span className="ml-1 text-xs text-gray-500">({fmtSize(f.size)})</span>
        </li>
      ))}
    </ul>
  )
}

/** 첨부 선택·업로드 (F 단계: 가짜 업로드 — 파일명·크기만 저장) */
export function AttachmentPicker({ value, onChange }: { value: Attachment[]; onChange: (v: Attachment[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  const onPick = async (list: FileList | null) => {
    if (!list?.length) return
    setBusy(true)
    try {
      const uploaded = await uploadFiles(Array.from(list))
      onChange([...value, ...uploaded])
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div>
      <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => onPick(e.target.files)} aria-label="첨부파일 선택" />
      <button type="button" className="btn btn-sm" disabled={busy} onClick={() => inputRef.current?.click()}>
        {busy ? '올리는 중…' : '파일 첨부'}
      </button>
      {value.length > 0 && (
        <ul className="mt-1.5 space-y-0.5">
          {value.map((f) => (
            <li key={f.id} className="flex items-center gap-2">
              <span>📎 {f.name}</span>
              <span className="text-xs text-gray-500">({fmtSize(f.size)})</span>
              <button type="button" className="text-xs text-red-600 hover:underline" onClick={() => onChange(value.filter((x) => x.id !== f.id))} aria-label={`${f.name} 첨부 삭제`}>
                삭제
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
