import React, { useState } from 'react';

export default function Historial({ apiUrl, inspections }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState('');

  const openReport = async (id) => {
    setLoading(id);
    try {
      const res = await fetch(`${apiUrl}/inspections/${id}/report`);
      setReport(await res.json());
    } catch {
      setReport(null);
    } finally {
      setLoading('');
    }
  };

  return (
    <div className="page">
      <header className="pageHeader">
        <h1>Historial de inspecciones</h1>
        <p className="pageSub">Reportes y resultados de inspecciones realizadas</p>
      </header>

      {inspections.length === 0 ? (
        <p className="empty">No hay inspecciones registradas</p>
      ) : (
        <div className="historyGrid">
          {inspections.map((ins) => (
            <article className="historyItem" key={ins.id}>
              <strong>{ins.assetName}</strong>
              <span>{new Date(ins.finishedAt).toLocaleString()}</span>
              <span>Responsable: {ins.responsible}</span>
              <span>
                {ins.counters.pass} cumple, {ins.counters.fail} no cumple, {ins.counters.review} revision
              </span>
              <span className={`badge${ins.alertCount > 0 ? ' badge-alert' : ' badge-ok'}`}>
                {ins.alertCount > 0 ? `${ins.alertCount} alerta(s)` : 'Sin alertas'}
              </span>
              <button className="btnSecondary" onClick={() => openReport(ins.id)} disabled={loading === ins.id}>
                {loading === ins.id ? 'Cargando...' : 'Ver reporte'}
              </button>
            </article>
          ))}
        </div>
      )}

      {report && (
        <div className="report">
          <div className="reportHeader">
            <h2>Reporte</h2>
            <button className="btnSecondary" onClick={() => setReport(null)}>Cerrar</button>
          </div>
          <p>{report.summary}</p>
          <div className="reportResults">
            {report.results?.map((r) => (
              <div key={r.itemId} className="reportRow">
                <span className={`badge badge-${r.status}`}>{statusBadge(r.status)}</span>
                <span>{r.visualCondition || 'Item'}</span>
                {r.comment && <span className="reportComment">{r.comment}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function statusBadge(s) {
  const map = { pass: 'Cumple', fail: 'No cumple', review: 'Revision', pending: 'Pendiente' };
  return map[s] || s;
}
