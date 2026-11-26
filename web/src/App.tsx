import { Navigate, Route, Routes } from 'react-router'
import { Layout } from './components/Layout'
import { Forbidden } from './components/ui'
import { LoginPage } from './pages/LoginPage'
import { DoneBoxPage, PendingBoxPage, SentBoxPage } from './pages/approval/BoxPages'
import { DocDetailPage } from './pages/approval/DocDetailPage'
import { DocWritePage } from './pages/approval/DocWritePage'
import { FormListPage, ScreenPlaceholderPage } from './pages/approval/FormListPage'
import { BoardPage } from './pages/board/BoardPage'
import { PostWritePage } from './pages/board/PostWritePage'

/** 라우팅 (PRD 4장) */
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/board/company" replace />} />
        <Route path="/board/:type" element={<BoardPage />} />
        <Route path="/board/:type/write" element={<PostWritePage />} />
        <Route path="/approval/forms/:category" element={<FormListPage />} />
        <Route path="/approval/screen/:formId" element={<ScreenPlaceholderPage />} />
        <Route path="/approval/write/:formId" element={<DocWritePage />} />
        <Route path="/approval/box/sent" element={<SentBoxPage />} />
        <Route path="/approval/box/pending" element={<PendingBoxPage />} />
        <Route path="/approval/box/done" element={<DoneBoxPage />} />
        <Route path="/approval/doc/:docId" element={<DocDetailPage />} />
        <Route path="*" element={<Forbidden message="없는 화면입니다." />} />
      </Route>
    </Routes>
  )
}
