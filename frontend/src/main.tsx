import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { setCreateRoot } from '@arco-design/web-react/es/_util/react-dom'
import '@arco-design/web-react/dist/css/arco.css'
import './index.css'
import App from './App.tsx'
import { configureGlobalMessage } from './utils/message'

setCreateRoot(createRoot)
configureGlobalMessage({
  maxCount: 3,
  duration: 3000,
  closable: true,
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
