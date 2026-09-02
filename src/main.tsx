import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Router } from './Router';
import { ConsentBanner } from './ConsentBanner';
import { initializeSavedConsent } from './analytics';
import './styles.css';

initializeSavedConsent();
createRoot(document.getElementById('root')!).render(<StrictMode><Router /><ConsentBanner /></StrictMode>);
