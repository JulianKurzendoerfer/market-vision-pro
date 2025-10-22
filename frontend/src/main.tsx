import { createRoot } from 'react-dom/client'
import React from 'react'
import App from './App'
const el = document.getElementById('root')!
createRoot(el).render(<React.StrictMode><App/></React.StrictMode>)
