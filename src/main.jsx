import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

const rootElement = document.getElementById('root');
const root = globalThis.__surrendaSoftRoot || createRoot(rootElement);
globalThis.__surrendaSoftRoot = root;
root.render(<React.StrictMode><App/></React.StrictMode>);
