import './styles.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './src/App';
import { getTextSize, applyTextSize } from './src/utils/textSize.js';
import { getTheme, applyTheme } from './src/utils/theme.js';

applyTextSize(getTextSize());
applyTheme(getTheme());

const root = createRoot(document.getElementById('root'));
root.render(<App />);
