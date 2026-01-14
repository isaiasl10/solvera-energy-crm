import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';
import { loadGoogleMaps } from './lib/loadGoogleMaps';

loadGoogleMaps().catch((err) => {
  console.error('Failed to load Google Maps:', err);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
);
