import React from 'react';

export default function Dashboard({ assets, inspections }) {
  const totalAssets = assets.length;
  const totalInspections = inspections.length;
  const passCount = inspections.reduce((sum, i) => sum + (i.counters?.pass || 0), 0);
  const failCount = inspections.reduce((sum, i) => sum + (i.counters?.fail || 0), 0);
  const reviewCount = inspections.reduce((sum, i) => sum + (i.counters?.review || 0), 0);
  const alerts = inspections.filter((i) => (i.alertCount || 0) > 0).length;

  return (
    <div className="page">
      <header className="pageHeader">
        <h1>Dashboard</h1>
        <p className="pageSub">Resumen del sistema de mantenimiento</p>
      </header>

      <div className="statsGrid">
        <div className="statCard">
          <span className="statValue">{totalAssets}</span>
          <span className="statLabel">Equipos registrados</span>
        </div>
        <div className="statCard">
          <span className="statValue">{totalInspections}</span>
          <span className="statLabel">Inspecciones realizadas</span>
        </div>
        <div className="statCard">
          <span className="statValue">{passCount}</span>
          <span className="statLabel">Items cumplen</span>
        </div>
        <div className="statCard">
          <span className="statValue">{failCount + reviewCount}</span>
          <span className="statLabel">Items con observaciones</span>
        </div>
        <div className="statCard warn">
          <span className="statValue">{alerts}</span>
          <span className="statLabel">Inspecciones con alertas</span>
        </div>
      </div>

      <div className="dashSections">
        <div className="dashPanel">
          <h2>Equipos</h2>
          {assets.length === 0 ? (
            <p className="empty">Sin equipos registrados</p>
          ) : (
            <table className="dashTable">
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
                    <td>{a.code}</td>
                    <td>{a.name}</td>
                    <td>{a.area}</td>
                    <td><span className={`badge badge-${a.criticality?.toLowerCase()}`}>{a.criticality}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="dashPanel">
          <h2>Ultimas inspecciones</h2>
          {inspections.length === 0 ? (
            <p className="empty">Sin inspecciones registradas</p>
          ) : (
            <div className="dashList">
              {inspections.slice(0, 5).map((i) => (
                <div key={i.id} className="dashListItem">
                  <strong>{i.assetName}</strong>
                  <span>{new Date(i.finishedAt).toLocaleDateString()}</span>
                  <span>{i.responsible}</span>
                  <span className={`badge${i.alertCount > 0 ? ' badge-alert' : ' badge-ok'}`}>
                    {i.alertCount > 0 ? `${i.alertCount} alerta(s)` : 'OK'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
