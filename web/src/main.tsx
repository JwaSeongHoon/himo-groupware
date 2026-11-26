import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import App from './App'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: false, staleTime: 10_000 },
  },
})

async function bootstrap() {
  // mock 서버는 동적 import 이므로 VITE_USE_MOCK=false 빌드에는 포함되지 않는다 (MK-08)
  if (import.meta.env.VITE_USE_MOCK === 'true') {
    const { startMock } = await import('./mocks/browser')
    await startMock()
  }
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </StrictMode>,
  )
}

bootstrap()
