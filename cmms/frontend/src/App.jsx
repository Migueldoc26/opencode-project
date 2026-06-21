import React, { useEffect, useState } from 'react';
import Dashboard from './pages/Dashboard.jsx';
import Equipos from './pages/Equipos.jsx';
import Listas from './pages/Listas.jsx';
import Inspeccion from './pages/Inspeccion.jsx';
import Historial from './pages/Historial.jsx';
import './styles.css';

const apiUrl = import.meta.env.VITE_API_URL || '/api';

const sections = [
  { id: 'dashboard', label: 'Dashboard', icon: '◈' },
  { id: 'equipos', label: 'Equipos', icon: '⚙' },
  { id: 'listas', label: 'Listas de Chequeo', icon: '☑' },
  { id: 'inspeccion', label: 'Inspeccion', icon: '◉' },
  { id: 'historial', label: 'Historial', icon: '▤' },
];

export default function App() {
  const [section, setSection] = useState('dashboard');
  const [assets, setAssets] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [checklists, setChecklists] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${apiUrl}/assets`).then((r) => r.json()),
      fetch(`${apiUrl}/inspections`).then((r) => r.json()),
    ])
      .then(([assetsData, inspectionsData]) => {
        setAssets(assetsData);
        setInspections(inspectionsData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const pageProps = { apiUrl, assets, setAssets, inspections, setInspections, checklists, setChecklists };

  return (
    <div className="app">
      <aside className="nav">
        <div className="navHeader">
          <span className="navLogo">◈</span>
          <span className="navTitle">CMMS Vision</span>
        </div>
        <nav className="navMenu">
          {sections.map((sec) => (
            <button
              key={sec.id}
              className={`navItem${section === sec.id ? ' active' : ''}`}
              onClick={() => setSection(sec.id)}
            >
              <span className="navIcon">{sec.icon}</span>
              <span>{sec.label}</span>
            </button>
          ))}
        </nav>
      </aside>
      <main className="content">
        {section === 'dashboard' && <Dashboard {...pageProps} />}
        {section === 'equipos' && <Equipos {...pageProps} />}
        {section === 'listas' && <Listas {...pageProps} />}
        {section === 'inspeccion' && <Inspeccion {...pageProps} />}
        {section === 'historial' && <Historial {...pageProps} />}
      </main>
    </div>
  );
}
