import "./boot";
import TrendPanel from './components/TrendPanel';
import { createRoot } from 'react-dom/client'
import React from 'react'
import App from './App'
const el = document.getElementById('root')!
createRoot(el).render(<React.StrictMode><App/></React.StrictMode>)

if (typeof document!=='undefined') {
  const id='mv-trendpanel-root';
  if (!document.getElementById(id)) {
    const el=document.createElement('div');
    el.id=id; el.style.margin='12px 16px';
    document.body.appendChild(el);
    createRoot(el).render(<TrendPanel />);
  }
}

import { mountTrendPanel } from './mountTrend';
mountTrendPanel();

import { hookHideHighLow } from './hideHighLow';
hookHideHighLow();
