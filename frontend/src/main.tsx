import React from 'react'
import {createRoot} from 'react-dom/client'
import ChartDashboard from './components/ChartDashboard'
const el = document.getElementById('root') as HTMLElement
createRoot(el).render(<React.StrictMode><ChartDashboard/></React.StrictMode>)
