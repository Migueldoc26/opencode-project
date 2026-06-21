import React, { useState } from 'react';

export default function Listas({ apiUrl, assets, checklists, setChecklists }) {
  const [showForm, setShowForm] = useState(false);
  const [assetId, setAssetId] = useState(assets[0]?.id || '');
  const [name, setName] = useState('');
  const [itemsText, setItemsText] = useState('');
  const [selectedList, setSelectedList] = useState(null);
  const [message, setMessage] = useState('');

  const createChecklist = async () => {
    const items = itemsText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const [title, visualCondition = '', labels = ''] = l.split('|').map((p) => p.trim());
        return { title, visualCondition, expectedLabels: labels.split(',').map((lb) => lb.trim()).filter(Boolean) };
      });

    if (!name.trim() || items.length === 0 || !assetId) {
      setMessage('Nombre, items y equipo requeridos');
      return;
    }

    const res = await fetch(`${apiUrl}/checklists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assetId, name: name.trim(), items }),
    });
    const created = await res.json();
    if (!res.ok) {
      setMessage(created.error || 'Error al crear lista');
      return;
    }
    setChecklists((prev) => [...prev, created]);
    setShowForm(false);
    setName('');
    setItemsText('');
    setMessage('Lista creada');
  };

  return (
    <div className="page">
      <header className="pageHeader">
        <h1>Listas de Chequeo</h1>
        <button className="btnPrimary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : '+ Nueva lista'}
        </button>
      </header>

      {showForm && (
        <div className="formCard">
          <div className="formGrid">
            <label>
              Equipo
              <select value={assetId} onChange={(e) => setAssetId(e.target.value)}>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                ))}
              </select>
            </label>
            <label>
              Nombre
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Inspeccion diaria" />
            </label>
            <label className="full">
              Items (formato: Titulo | condicion visual | etiqueta1, etiqueta2)
              <textarea
                value={itemsText}
                onChange={(e) => setItemsText(e.target.value)}
                placeholder="Proteccion instalada | Debe observarse guarda | guard, cover&#10;Sin fuga | No deben observarse manchas | dry-seal, no-leak"
                rows={6}
              />
            </label>
          </div>
          <button className="btnPrimary" onClick={createChecklist}>Guardar lista</button>
          {message && <p className="msg">{message}</p>}
        </div>
      )}

      {checklists.length === 0 ? (
        <p className="empty">No hay listas de chequeo</p>
      ) : (
        <div className="listGrid">
          {checklists.map((cl) => (
            <div key={cl.id} className="listCard" onClick={() => setSelectedList(selectedList?.id === cl.id ? null : cl)}>
              <div className="listCardHeader">
                <strong>{cl.name}</strong>
                <span className="badge">{cl.items?.length || 0} items</span>
              </div>
              <p className="listCardAsset">{assets.find((a) => a.id === cl.assetId)?.name || cl.assetId}</p>
              {selectedList?.id === cl.id && (
                <div className="listCardDetail">
                  {cl.items.map((item) => (
                    <div key={item.id} className="listItemRow">
                      <span className={`severityDot ${item.severity?.toLowerCase()}`} />
                      <span>{item.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
