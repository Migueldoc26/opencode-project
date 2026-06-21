import React from 'react';
import Inspeccion from './pages/Inspeccion.jsx';
import './styles.css';

const apiUrl = import.meta.env.VITE_API_URL || '/api';

export default function App() {
  return <Inspeccion apiUrl={apiUrl} />;
}
