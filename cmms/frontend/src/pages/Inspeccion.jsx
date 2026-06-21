import React, { useEffect, useMemo, useRef, useState } from 'react';

const statusOptions = [
  { value: 'pass', label: 'Cumple' },
  { value: 'fail', label: 'No cumple' },
  { value: 'review', label: 'Requiere revision' },
];

const statusLabel = {
  pass: 'Cumple',
  fail: 'No cumple',
  review: 'Requiere revision',
  pending: 'Pendiente',
};

async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    cache: 'no-store',
    ...options,
    headers: { 'Cache-Control': 'no-cache', ...(options.headers || {}) },
  });
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}

export default function Inspeccion({ apiUrl, assets, inspections, setInspections }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [assetId, setAssetId] = useState('');
  const [checklists, setChecklists] = useState([]);
  const [checklistId, setChecklistId] = useState('');
  const [checklist, setChecklist] = useState(null);
  const [results, setResults] = useState({});
  const [responsible, setResponsible] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [busyItem, setBusyItem] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (assets.length > 0 && !assetId) {
      setAssetId(assets[0].id);
    }
  }, [assets]);

  useEffect(() => {
    if (!assetId) return;
    fetchJson(`${apiUrl}/assets/${assetId}/checklists`)
      .then((data) => {
        setChecklists(data);
        setChecklistId(data[0]?.id || '');
      })
      .catch((err) => setMessage(`Error cargando listas: ${err.message}`));
  }, [assetId]);

  useEffect(() => {
    if (!checklistId) return;
    fetchJson(`${apiUrl}/checklists/${checklistId}`)
      .then((data) => {
        setChecklist(data);
        setResults(
          Object.fromEntries(
            data.items.map((item) => [item.id, { itemId: item.id, status: 'pending', comment: '', evidence: null, ai: null }]),
          ),
        );
      })
      .catch((err) => setMessage(`Error cargando checklist: ${err.message}`));
  }, [checklistId]);

  const selectedAsset = useMemo(() => assets.find((a) => a.id === assetId), [assets, assetId]);

  const counters = useMemo(() =>
    Object.values(results).reduce(
      (acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; },
      { pass: 0, fail: 0, review: 0, pending: 0 },
    ), [results]);

  const updateResult = (itemId, patch) =>
    setResults((cur) => ({ ...cur, [itemId]: { ...cur[itemId], ...patch } }));

  const startCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
    videoRef.current.srcObject = stream;
    setCameraActive(true);
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject;
    stream?.getTracks().forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  };

  const captureFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth || 960;
    canvas.height = video.videoHeight || 540;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.82);
  };

  const inspectWithAi = async (item) => {
    if (!cameraActive) {
      await startCamera();
      setMessage('Camara activada. Vuelve a presionar Analizar IA cuando veas el equipo.');
      return;
    }
    setBusyItem(item.id);
    setMessage('');
    const evidence = captureFrame();
    try {
      const res = await fetch(`${apiUrl}/ai/inspect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item, image: evidence }),
      });
      const ai = await res.json();
      if (!res.ok) throw new Error(ai.detail || ai.error || 'AI fallo');
      updateResult(item.id, { evidence, status: ai.status, ai, comment: ai.alert || results[item.id]?.comment || '' });
    } catch (err) {
      setMessage(`Error AI: ${err.message}`);
    } finally {
      setBusyItem('');
    }
  };

  const submitInspection = async () => {
    if (!responsible.trim()) { setMessage('Ingresa el responsable'); return; }
    const res = await fetch(`${apiUrl}/inspections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assetId, checklistId, responsible, results: Object.values(results) }),
    });
    const inspection = await res.json();
    if (!res.ok) { setMessage(inspection.error || 'Error al guardar'); return; }
    setInspections((cur) => [inspection, ...cur]);
    setMessage(`Inspeccion guardada: ${inspection.id}`);
  };

  return (
    <div className="page">
      <header className="pageHeader">
        <div>
          <p className="eyebrow">CMMS Vision</p>
          <h1>Inspeccion hibrida</h1>
        </div>
        <div className="summaryStrip">
          <span>{counters.pass} cumple</span>
          <span>{counters.fail} no cumple</span>
          <span>{counters.review} revision</span>
        </div>
      </header>

      <div className="workspace">
        <aside className="sidebar">
          <label>
            Equipo
            <select value={assetId} onChange={(e) => setAssetId(e.target.value)}>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
              ))}
            </select>
          </label>
          <label>
            Lista de chequeo
            <select value={checklistId} onChange={(e) => setChecklistId(e.target.value)}>
              {checklists.map((cl) => (
                <option key={cl.id} value={cl.id}>{cl.name}</option>
              ))}
            </select>
          </label>
          <label>
            Responsable
            <input value={responsible} onChange={(e) => setResponsible(e.target.value)} placeholder="Nombre inspector" />
          </label>
          {selectedAsset && (
            <dl className="assetFacts">
              <div><dt>Area</dt><dd>{selectedAsset.area}</dd></div>
              <div><dt>Criticidad</dt><dd>{selectedAsset.criticality}</dd></div>
            </dl>
          )}
          <button className="btnPrimary" onClick={submitInspection}>Guardar inspeccion</button>
          {message && <p className="msg">{message}</p>}
        </aside>

        <section className="inspection">
          <div className="cameraPane">
            <video ref={videoRef} autoPlay playsInline muted />
            <canvas ref={canvasRef} hidden />
            <div className="cameraActions">
              <button onClick={cameraActive ? stopCamera : startCamera}>
                {cameraActive ? 'Detener camara' : 'Activar camara'}
              </button>
            </div>
          </div>

          <div className="checklist">
            {checklist?.items.map((item) => {
              const result = results[item.id] || {};
              return (
                <article className="item" key={item.id}>
                  <div className="itemHeader">
                    <div>
                      <p className="severity">{item.severity}</p>
                      <h2>{item.title}</h2>
                      <p>{item.visualCondition}</p>
                    </div>
                    <span className={`pill ${result.status || 'pending'}`}>
                      {statusLabel[result.status] || 'Pendiente'}
                    </span>
                  </div>
                  <div className="controls">
                    <div className="segmented">
                      {statusOptions.map((opt) => (
                        <button key={opt.value} className={result.status === opt.value ? 'active' : ''}
                          onClick={() => updateResult(item.id, { status: opt.value })}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    <button onClick={() => inspectWithAi(item)} disabled={busyItem === item.id}>
                      {busyItem === item.id ? 'Analizando...' : 'Analizar IA'}
                    </button>
                  </div>
                  <textarea value={result.comment || ''} onChange={(e) => updateResult(item.id, { comment: e.target.value })}
                    placeholder="Observaciones del inspector" />
                  {result.ai && (
                    <div className="aiBox">
                      <strong>IA: {statusLabel[result.ai.status]}</strong>
                      <span>Confianza {(result.ai.confidence * 100).toFixed(0)}%</span>
                      <span>Detectado: {result.ai.detections.map((d) => d.label).join(', ') || 'sin etiquetas'}</span>
                    </div>
                  )}
                  {result.evidence && <img className="evidence" src={result.evidence} alt="Evidencia" />}
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
