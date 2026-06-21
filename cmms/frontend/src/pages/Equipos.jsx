import React, { useState } from 'react';

export default function Equipos({ apiUrl, assets, setAssets }) {
  const [showForm, setShowForm] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [area, setArea] = useState('');
  const [criticality, setCriticality] = useState('Media');
  const [message, setMessage] = useState('');

  const addAsset = async () => {
    if (!code.trim() || !name.trim()) {
      setMessage('Codigo y nombre requeridos');
      return;
    }
    const res = await fetch(`${apiUrl}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code.trim(), name: name.trim(), area: area.trim(), criticality }),
    });
    const created = await res.json();
    if (!res.ok) {
      setMessage(created.error || 'Error al crear equipo');
      return;
    }
    setAssets((prev) => [...prev, created]);
    setCode('');
    setName('');
    setArea('');
    setCriticality('Media');
    setShowForm(false);
    setMessage('Equipo creado');
  };

  return (
    <div className="page">
      <header className="pageHeader">
        <h1>Equipos</h1>
        <button className="btnPrimary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : '+ Nuevo equipo'}
        </button>
      </header>

      {showForm && (
        <div className="formCard">
          <div className="formGrid">
            <label>
              Codigo
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="BOM-01" />
            </label>
            <label>
              Nombre
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Bomba centrifuga" />
            </label>
            <label>
              Area
              <input value={area} onChange={(e) => setArea(e.target.value)} placeholder="Sala de bombas" />
            </label>
            <label>
              Criticidad
              <select value={criticality} onChange={(e) => setCriticality(e.target.value)}>
                <option value="Alta">Alta</option>
                <option value="Media">Media</option>
                <option value="Baja">Baja</option>
              </select>
            </label>
          </div>
          <button className="btnPrimary" onClick={addAsset}>Guardar equipo</button>
          {message && <p className="msg">{message}</p>}
        </div>
      )}

      {assets.length === 0 ? (
        <p className="empty">No hay equipos registrados</p>
      ) : (
        <table className="dataTable">
          <thead>
            <tr>
              <th>Codigo</th>
              <th>Nombre</th>
              <th>Area</th>
              <th>Criticidad</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((a) => (
              <tr key={a.id}>
                <td className="code">{a.code}</td>
                <td>{a.name}</td>
                <td>{a.area}</td>
                <td><span className={`badge badge-${a.criticality?.toLowerCase()}`}>{a.criticality}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
