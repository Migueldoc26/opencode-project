import { useEffect, useMemo, useRef, useState } from 'react';
import './styles.css';

const apiUrl = import.meta.env.VITE_API_URL || '/api';
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

export default function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [assets, setAssets] = useState([]);
  const [assetId, setAssetId] = useState('');
  const [checklists, setChecklists] = useState([]);
  const [checklistId, setChecklistId] = useState('');
  const [checklist, setChecklist] = useState(null);
  const [results, setResults] = useState({});
  const [responsible, setResponsible] = useState('');
  const [inspections, setInspections] = useState([]);
  const [cameraActive, setCameraActive] = useState(false);
  const [busyItem, setBusyItem] = useState('');
  const [message, setMessage] = useState('');
  const [newChecklistName, setNewChecklistName] = useState('');
  const [newChecklistItems, setNewChecklistItems] = useState('');
  const [report, setReport] = useState(null);

  useEffect(() => {
    fetch(`${apiUrl}/assets`)
      .then((response) => response.json())
      .then((data) => {
        setAssets(data);
        setAssetId(data[0]?.id || '');
      });

    fetch(`${apiUrl}/inspections`)
      .then((response) => response.json())
      .then(setInspections);
  }, []);

  useEffect(() => {
    if (!assetId) return;

    fetch(`${apiUrl}/assets/${assetId}/checklists`)
      .then((response) => response.json())
      .then((data) => {
        setChecklists(data);
        setChecklistId(data[0]?.id || '');
      });
  }, [assetId]);

  useEffect(() => {
    if (!checklistId) return;

    fetch(`${apiUrl}/checklists/${checklistId}`)
      .then((response) => response.json())
      .then((data) => {
        setChecklist(data);
        setResults(
          Object.fromEntries(
            data.items.map((item) => [
              item.id,
              { itemId: item.id, status: 'pending', comment: '', evidence: null, ai: null },
            ]),
          ),
        );
      });
  }, [checklistId]);

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.id === assetId),
    [assets, assetId],
  );

  const counters = useMemo(() => {
    return Object.values(results).reduce(
      (acc, result) => {
        acc[result.status] = (acc[result.status] || 0) + 1;
        return acc;
      },
      { pass: 0, fail: 0, review: 0, pending: 0 },
    );
  }, [results]);

  const updateResult = (itemId, patch) => {
    setResults((current) => ({
      ...current,
      [itemId]: { ...current[itemId], ...patch },
    }));
  };

  const startCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
      audio: false,
    });

    videoRef.current.srcObject = stream;
    setCameraActive(true);
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject;
    stream?.getTracks().forEach((track) => track.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  };

  const captureFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth || 960;
    canvas.height = video.videoHeight || 540;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

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
      const response = await fetch(`${apiUrl}/ai/inspect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item, image: evidence }),
      });
      const ai = await response.json();

      if (!response.ok) throw new Error(ai.detail || ai.error || 'AI request failed');

      updateResult(item.id, {
        evidence,
        status: ai.status,
        ai,
        comment: ai.alert || results[item.id]?.comment || '',
      });
    } catch (error) {
      setMessage(`No se pudo analizar con IA: ${error.message}`);
    } finally {
      setBusyItem('');
    }
  };

  const submitInspection = async () => {
    if (!responsible.trim()) {
      setMessage('Ingresa el responsable antes de guardar la inspeccion.');
      return;
    }

    const response = await fetch(`${apiUrl}/inspections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assetId,
        checklistId,
        responsible,
        results: Object.values(results),
      }),
    });
    const inspection = await response.json();

    if (!response.ok) {
      setMessage(inspection.error || 'No se pudo guardar la inspeccion.');
      return;
    }

    setInspections((current) => [inspection, ...current]);
    setMessage(`Inspeccion guardada: ${inspection.id}`);
  };

  const createChecklist = async () => {
    const items = newChecklistItems
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [title, visualCondition = '', labels = ''] = line.split('|').map((part) => part.trim());

        return {
          title,
          visualCondition,
          expectedLabels: labels
            .split(',')
            .map((label) => label.trim())
            .filter(Boolean),
        };
      });

    if (!newChecklistName.trim() || items.length === 0) {
      setMessage('Ingresa nombre y al menos un item para crear la lista.');
      return;
    }

    const response = await fetch(`${apiUrl}/checklists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assetId, name: newChecklistName, items }),
    });
    const created = await response.json();

    if (!response.ok) {
      setMessage(created.error || 'No se pudo crear la lista.');
      return;
    }

    setChecklists((current) => [...current, created]);
    setChecklistId(created.id);
    setNewChecklistName('');
    setNewChecklistItems('');
    setMessage('Lista de chequeo creada.');
  };

  const openReport = async (inspectionId) => {
    const response = await fetch(`${apiUrl}/inspections/${inspectionId}/report`);
    setReport(await response.json());
  };

  return (
    <main className="app">
      <header className="topbar">
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

      <section className="workspace">
        <aside className="sidebar">
          <label>
            Equipo
            <select value={assetId} onChange={(event) => setAssetId(event.target.value)}>
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.code} - {asset.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Lista de chequeo
            <select value={checklistId} onChange={(event) => setChecklistId(event.target.value)}>
              {checklists.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Responsable
            <input
              value={responsible}
              onChange={(event) => setResponsible(event.target.value)}
              placeholder="Nombre inspector"
            />
          </label>

          {selectedAsset ? (
            <dl className="assetFacts">
              <div>
                <dt>Area</dt>
                <dd>{selectedAsset.area}</dd>
              </div>
              <div>
                <dt>Criticidad</dt>
                <dd>{selectedAsset.criticality}</dd>
              </div>
            </dl>
          ) : null}

          <button className="primary" onClick={submitInspection}>
            Guardar inspeccion
          </button>
          {message ? <p className="message">{message}</p> : null}

          <details className="creator">
            <summary>Crear lista de chequeo</summary>
            <label>
              Nombre
              <input
                value={newChecklistName}
                onChange={(event) => setNewChecklistName(event.target.value)}
                placeholder="Inspeccion mensual"
              />
            </label>
            <label>
              Items
              <textarea
                value={newChecklistItems}
                onChange={(event) => setNewChecklistItems(event.target.value)}
                placeholder="Item | condicion visual esperada | etiqueta1, etiqueta2"
              />
            </label>
            <button onClick={createChecklist}>Crear lista</button>
          </details>
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
                      {statusOptions.map((option) => (
                        <button
                          key={option.value}
                          className={result.status === option.value ? 'active' : ''}
                          onClick={() => updateResult(item.id, { status: option.value })}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                    <button onClick={() => inspectWithAi(item)} disabled={busyItem === item.id}>
                      {busyItem === item.id ? 'Analizando...' : 'Analizar IA'}
                    </button>
                  </div>

                  <textarea
                    value={result.comment || ''}
                    onChange={(event) => updateResult(item.id, { comment: event.target.value })}
                    placeholder="Observaciones del inspector"
                  />

                  {result.ai ? (
                    <div className="aiBox">
                      <strong>IA: {statusLabel[result.ai.status]}</strong>
                      <span>Confianza {(result.ai.confidence * 100).toFixed(0)}%</span>
                      <span>
                        Detectado:{' '}
                        {result.ai.detections.map((detection) => detection.label).join(', ') ||
                          'sin etiquetas'}
                      </span>
                    </div>
                  ) : null}

                  {result.evidence ? (
                    <img className="evidence" src={result.evidence} alt="Evidencia capturada" />
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      </section>

      <section className="history">
        <h2>Historial de inspecciones</h2>
        <div className="historyGrid">
          {inspections.map((inspection) => (
            <article className="historyItem" key={inspection.id}>
              <strong>{inspection.assetName}</strong>
              <span>{new Date(inspection.finishedAt).toLocaleString()}</span>
              <span>Responsable: {inspection.responsible}</span>
              <span>
                {inspection.counters.pass} cumple, {inspection.counters.fail} no cumple,{' '}
                {inspection.counters.review} revision
              </span>
              <button onClick={() => openReport(inspection.id)}>Ver reporte</button>
            </article>
          ))}
        </div>
        {report ? (
          <div className="report">
            <div className="reportHeader">
              <h2>Reporte</h2>
              <button onClick={() => setReport(null)}>Cerrar</button>
            </div>
            <p>{report.summary}</p>
            <pre>{JSON.stringify(report, null, 2)}</pre>
          </div>
        ) : null}
      </section>
    </main>
  );
}
