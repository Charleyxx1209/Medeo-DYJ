import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log('[DEBUG] index.tsx loaded');

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('[DEBUG] root element not found');
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);