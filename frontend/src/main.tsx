import React from 'react';
import { createRoot } from 'react-dom/client';
import ChartDashboard from './components/ChartDashboard.tsx';

const el = document.getElementById('root');
if (el) {
  const root = createRoot(el);
  root.render(<React.StrictMode><ChartDashboard /></React.StrictMode>);
}
