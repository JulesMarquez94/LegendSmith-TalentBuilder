import '@fontsource/lexend/300.css'
import '@fontsource/lexend/400.css'
import '@fontsource/lexend/900.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
