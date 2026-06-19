const state = {
  view: "dashboard",
  dashboard: null,
  members: [],
  categories: [],
  transactions: [],
  birthdays: [],
  requests: [],
  strategies: null,
  excel: null,
  incomeBasis: null,
  recurring: [],
  debts: [],
  goals: [],
  emergencies: [],
  distribution: null,
};

const money = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

const titles = {
  dashboard: "Dashboard familiar",
  admin: "Panel administrador",
  members: "Integrantes",
  transactions: "Movimientos",
  recurring: "Gastos fijos y suscripciones",
  debts: "Creditos y deudas",
  split: "Reparto proporcional",
  strategies: "Estrategias economicas",
  excel: "Analisis del Excel",
  birthdays: "Cumpleanos",
  security: "Seguridad e imprevistos",
};

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

async function loadAll() {
  const [dashboard, members, categories, transactions, birthdays, requests, strategies, incomeBasis, recurring, debts, goals, emergencies, distribution] = await Promise.all([
    api("/api/dashboard"),
    api("/api/members"),
    api("/api/categories"),
    api("/api/transactions"),
    api("/api/birthdays"),
    api("/api/payment-requests"),
    api("/api/strategies"),
    api("/api/income-basis"),
    api("/api/recurring"),
    api("/api/debts"),
    api("/api/goals"),
    api("/api/emergencies"),
    api("/api/expense-distribution"),
  ]);
  Object.assign(state, { dashboard, members, categories, transactions, birthdays, requests, strategies, incomeBasis, recurring, debts, goals, emergencies, distribution });
  document.querySelector("#period-pill").textContent = dashboard.period;
  fillSelects();
  render();
}

function fillSelects() {
  document.querySelector("#member-select").innerHTML = state.members
    .map((member) => `<option value="${member.id}">${member.name}</option>`)
    .join("");
  document.querySelector("#category-select").innerHTML = state.categories
    .map((category) => `<option value="${category.id}">${category.name}</option>`)
    .join("");
  document.querySelector("#recurring-member-select").innerHTML = `<option value="">Sin integrante</option>` + state.members
    .map((member) => `<option value="${member.id}">${member.name}</option>`)
    .join("");
  document.querySelector("#recurring-category-select").innerHTML = `<option value="">Sin categoria</option>` + state.categories
    .map((category) => `<option value="${category.id}">${category.name}</option>`)
    .join("");
  document.querySelector("#debt-member-select").innerHTML = `<option value="">Sin integrante</option>` + state.members
    .map((member) => `<option value="${member.id}">${member.name}</option>`)
    .join("");
  document.querySelector("#emergency-member-select").innerHTML = `<option value="">Sin integrante</option>` + state.members
    .map((member) => `<option value="${member.id}">${member.name}</option>`)
    .join("");
  document.querySelector("[name='date']").valueAsDate = new Date();
}

function setView(view) {
  state.view = view;
  document.querySelector("#view-title").textContent = titles[view];
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });
  render();
}

function render() {
  const view = document.querySelector("#view");
  if (!state.dashboard) {
    view.innerHTML = `<div class="card">Cargando...</div>`;
    return;
  }
  view.innerHTML = {
    dashboard: renderDashboard,
    admin: renderAdmin,
    members: renderMembers,
    transactions: renderTransactions,
    recurring: renderRecurring,
    debts: renderDebts,
    split: renderSplit,
    strategies: renderStrategies,
    excel: renderExcel,
    birthdays: renderBirthdays,
    security: renderSecurity,
  }[state.view]();
  bindDynamicActions();
}

function renderDashboard() {
  const { kpis } = state.dashboard;
  return `
    <div class="grid kpi-grid">
      ${kpi("Ingresos del mes", kpis.income, "+ ingresos declarados")}
      ${kpi("Gastos del mes", kpis.expenses, "incluye deudas y urgencias")}
      ${kpi("Ahorro real", kpis.realSaving, kpis.realSaving >= 0 ? "balance positivo" : "revisar gastos")}
      ${kpi("Capacidad real", kpis.savingCapacity, "despues de ahorro programado")}
      ${kpi("Fijos + subs.", kpis.committedMonthly ?? 0, `${money.format(kpis.fixedExpenses ?? 0)} fijos`)}
    </div>

    <div class="grid content-grid">
      <section class="card">
        <h3>Evolucion mensual</h3>
        <div class="chart">${["Ene", "Feb", "Mar", "Abr", "May", "Jun"].map((month, index) => bars(month, index)).join("")}</div>
      </section>
      <section class="card">
        <h3>Gastos por categoria</h3>
        <div class="donut"></div>
        <div class="legend">
          ${state.dashboard.byCategory.map((item) => legend(item.name, item.total, item.color)).join("")}
        </div>
      </section>
    </div>

    <div class="grid three-grid" style="margin-top: 16px">
      <section class="card">
        <h3>Solicitudes por integrante</h3>
        <div class="grid">${state.dashboard.requests.map(requestRow).join("")}</div>
      </section>
      <section class="card">
        <h3>Proximos cumpleanos</h3>
        <div class="grid">${state.dashboard.birthdays.map(birthdayRow).join("")}</div>
      </section>
      <section class="card">
        <h3>Alertas financieras</h3>
        <div class="grid">${state.dashboard.alerts.map(alertRow).join("")}</div>
      </section>
    </div>
  `;
}

function renderRecurring() {
  const fixed = state.recurring.filter((item) => item.kind === "fixed" && item.active);
  const subscriptions = state.recurring.filter((item) => item.kind === "subscription" && item.active);
  const fixedTotal = fixed.reduce((sum, item) => sum + item.amount, 0);
  const subscriptionTotal = subscriptions.reduce((sum, item) => sum + item.amount, 0);
  return `
    <div class="section-hero">
      <div>
        <p class="eyebrow">Compromisos mensuales</p>
        <h2>Gastos fijos y suscripciones dentro del presupuesto</h2>
        <p class="muted">Arriendo, internet, seguros, creditos recurrentes y servicios digitales se consideran parte de tus gastos antes de calcular ahorro real.</p>
      </div>
      <div class="hero-metrics">
        <span>Fijos ${money.format(fixedTotal)}</span>
        <span>Subs ${money.format(subscriptionTotal)}</span>
      </div>
    </div>
    <div class="grid kpi-grid">
      ${kpi("Gastos fijos", fixedTotal, `${fixed.length} activos`)}
      ${kpi("Suscripciones", subscriptionTotal, `${subscriptions.length} activas`)}
      ${kpi("Compromiso mensual", fixedTotal + subscriptionTotal, "antes del ahorro")}
      ${kpi("Bajo uso", state.recurring.filter((item) => item.usage_level === "Bajo" && item.active).length, "revisar cancelacion", false)}
      <section class="card kpi action-kpi">
        <span class="label">Nuevo compromiso</span>
        <button class="primary-button" data-action="new-recurring">Agregar</button>
      </section>
    </div>
    <section class="card" style="margin-top:16px">
      <div class="section-title-row">
        <h3>Listado editable</h3>
        <button class="secondary-button" data-action="new-recurring">Nuevo fijo o suscripcion</button>
      </div>
      <table>
        <thead><tr><th>Nombre</th><th>Tipo</th><th>Vence</th><th>Integrante</th><th>Uso</th><th>Estado</th><th class="money">Monto</th><th></th></tr></thead>
        <tbody>
          ${state.recurring.map((item) => `
            <tr>
              <td><strong>${item.name}</strong><br><span class="muted">${item.category_name ?? "-"} · ${item.payment_method ?? ""}</span></td>
              <td>${item.kind === "fixed" ? "Fijo" : "Suscripcion"}</td>
              <td>Dia ${item.due_day}</td>
              <td>${item.member_name ?? "-"}</td>
              <td>${item.usage_level || "-"}</td>
              <td><span class="status ${item.active ? "paid" : "pending"}">${item.active ? "Activo" : "Inactivo"}</span></td>
              <td class="money">${money.format(item.amount)}</td>
              <td class="row-actions">
                <button class="table-button" data-action="edit-recurring" data-id="${item.id}">Editar</button>
                <button class="table-button danger" data-action="delete-recurring" data-id="${item.id}">Eliminar</button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </section>
  `;
}

function renderDebts() {
  const active = state.debts.filter((item) => item.active);
  const balance = active.reduce((sum, item) => sum + item.balance, 0);
  const monthly = active.reduce((sum, item) => sum + item.monthly_payment, 0);
  const highRate = active.filter((item) => item.interest_rate >= 2).length;
  return `
    <div class="section-hero compact-hero">
      <div>
        <p class="eyebrow">Creditos, hipotecas y tiendas</p>
        <h2>Mapa editable de compromisos financieros</h2>
        <p class="muted">Incluye consumo, hipotecario, cajas de compensacion, tarjetas y casas comerciales. Las cuotas activas entran en el reparto mensual.</p>
      </div>
      <button class="primary-button" data-action="new-debt">Agregar credito</button>
    </div>
    <div class="grid kpi-grid">
      ${kpi("Saldo activo", balance, `${active.length} compromisos`)}
      ${kpi("Cuota mensual", monthly, "se suma a gastos del mes")}
      ${kpi("Tasa >= 2%", highRate, "prioridad de renegociacion", false)}
      ${kpi("Hipotecas", active.filter((item) => item.kind === "mortgage").length, "largo plazo", false)}
      <section class="card kpi action-kpi">
        <span class="label">Plan sugerido</span>
        <span class="trend">Pagar primero mayor tasa y menor saldo.</span>
      </section>
    </div>
    <section class="card" style="margin-top:16px">
      <div class="section-title-row">
        <h3>Listado editable</h3>
        <button class="secondary-button" data-action="new-debt">Nuevo credito</button>
      </div>
      <table>
        <thead><tr><th>Credito</th><th>Tipo</th><th>Responsable</th><th>Vence</th><th class="money">Saldo</th><th class="money">Cuota</th><th>Tasa</th><th></th></tr></thead>
        <tbody>
          ${state.debts.map((item) => `
            <tr>
              <td><strong>${item.name}</strong><br><span class="muted">${item.institution} · ${item.notes ?? ""}</span></td>
              <td>${debtLabel(item.kind)}</td>
              <td>${item.member_name ?? "-"}</td>
              <td>Dia ${item.due_day}</td>
              <td class="money">${money.format(item.balance)}</td>
              <td class="money">${money.format(item.monthly_payment)}</td>
              <td>${item.interest_rate}%</td>
              <td class="row-actions">
                <button class="table-button" data-action="edit-debt" data-id="${item.id}">Editar</button>
                <button class="table-button danger" data-action="delete-debt" data-id="${item.id}">Eliminar</button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </section>
  `;
}

function renderAdmin() {
  const totalIncome = state.members.reduce((sum, member) => sum + member.monthly_income, 0);
  return `
    <div class="section-hero">
      <div>
        <p class="eyebrow">Control familiar</p>
        <h2>Reglas, aportes y solicitudes</h2>
        <p class="muted">Gestiona integrantes, crea gastos comunes y genera cuotas proporcionales con transparencia.</p>
      </div>
      <button class="secondary-button" data-action="new-member">Nuevo integrante</button>
    </div>
    <div class="grid content-grid">
      <section class="card">
        <h3>Integrantes y aportes</h3>
        ${membersTable(totalIncome, 0, true)}
      </section>
      <section class="card">
        <h3>Crear gasto comun</h3>
        <form id="shared-expense-form" class="grid">
          <label>Titulo<input name="title" required value="Gastos comunes del hogar"></label>
          <label>Descripcion<input name="description" value="Vivienda, servicios, alimentacion base"></label>
          <label>Monto total<input name="totalAmount" required type="number" value="620000"></label>
          <label>Periodo<input name="period" required type="month" value="${state.dashboard.period}"></label>
          <button class="primary-button">Generar solicitudes proporcionales</button>
        </form>
      </section>
    </div>
  `;
}

function renderMembers() {
  const totalIncome = state.members.reduce((sum, member) => sum + member.monthly_income, 0);
  const active = state.members.filter((member) => member.active).length;
  return `
    <div class="grid kpi-grid member-summary">
      ${kpi("Integrantes activos", active, "familia habilitada", false)}
      ${kpi("Ingreso familiar", totalIncome, "base de reparto")}
      ${kpi("Mayor aporte", Math.max(...state.members.map((m) => m.monthly_income)), "ingreso declarado")}
      ${kpi("Solicitudes", state.requests.length, "cuotas generadas", false)}
      <section class="card kpi action-kpi">
        <span class="label">Gestion familiar</span>
        <button class="primary-button" data-action="new-member">Agregar integrante</button>
      </section>
    </div>
    <section class="card">
      <h3>Familia registrada</h3>
      ${membersTable(totalIncome, 0, true)}
    </section>
  `;
}

function renderTransactions() {
  return `
    <div class="section-hero">
      <div>
        <p class="eyebrow">Ingresos multiples</p>
        <h2>Registra cada entrada de dinero por separado</h2>
        <p class="muted">Sueldo, honorarios, proyectos, bonos, devoluciones o aportes familiares pueden convivir en el mismo mes y afectar el reparto proporcional.</p>
      </div>
      <button class="primary-button" data-action="new-transaction">Registrar ingreso o gasto</button>
    </div>
    <section class="card">
      <div class="section-title-row">
        <h3>Ultimos movimientos</h3>
        <button class="secondary-button" data-action="new-transaction">Nuevo movimiento</button>
      </div>
      <table>
        <thead><tr><th>Fecha</th><th>Tipo</th><th>Descripcion</th><th>Integrante</th><th>Categoria</th><th class="money">Monto</th><th></th></tr></thead>
        <tbody>
          ${state.transactions.map((tx) => `
            <tr>
              <td>${tx.date}</td>
              <td>${labelType(tx.type)}</td>
              <td>${tx.description}</td>
              <td>${tx.member_name ?? "-"}</td>
              <td><span class="dot" style="display:inline-block;background:${tx.category_color}"></span> ${tx.category_name ?? "-"}</td>
              <td class="money">${money.format(tx.amount)}</td>
              <td class="row-actions">
                <button class="table-button" data-action="edit-transaction" data-id="${tx.id}">Editar</button>
                <button class="table-button danger" data-action="delete-transaction" data-id="${tx.id}">Eliminar</button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </section>
  `;
}

function renderSplit() {
  const distribution = state.distribution?.base ?? {};
  const totalCommon = distribution.total || state.requests.reduce((sum, item) => sum + item.amount, 0) || 0;
  const periodRequests = state.distribution?.requests?.length ? state.distribution.requests : state.requests;
  const basisMembers = state.incomeBasis?.members ?? [];
  const totalBasis = basisMembers.reduce((sum, member) => sum + member.incomeBasis, 0);
  const period = state.incomeBasis?.period ?? state.dashboard.period;
  return `
    <div class="section-hero compact-hero">
      <div>
        <p class="eyebrow">Distribucion mensual</p>
        <h2>Cuotas proporcionales al ingreso real de cada integrante</h2>
        <p class="muted">El total combina gastos registrados, pagos de deuda, urgencias, fijos, suscripciones y cuotas activas de creditos. La cuota se calcula contra los ingresos del periodo.</p>
      </div>
      <div class="hero-metrics">
        <span>Ingresos ${money.format(totalBasis)}</span>
        <span>${period}</span>
      </div>
    </div>
    <div class="grid kpi-grid">
      ${kpi("Total a repartir", totalCommon, "base familiar del periodo")}
      ${kpi("Gastos registrados", distribution.transactionExpenses ?? 0, "movimientos del mes")}
      ${kpi("Fijos + subs.", (distribution.fixedExpenses ?? 0) + (distribution.subscriptions ?? 0), "compromisos activos")}
      ${kpi("Creditos activos", distribution.debtCommitments ?? 0, "cuotas mensuales")}
      <section class="card kpi action-kpi">
        <span class="label">Generar mensajes</span>
        <button class="primary-button" data-action="generate-monthly-distribution">Recalcular reparto</button>
      </section>
    </div>
    <div class="grid content-grid">
      <section class="card">
        <h3>Base de ingresos del periodo</h3>
        <p class="muted">Formula: cuota = total de gastos familiares x ingreso del integrante / ingresos familiares.</p>
        ${incomeBasisTable(totalCommon)}
      </section>
      <section class="card">
        <h3>Mensajes para enviar</h3>
        <div class="grid">${requestMessageCards()}
        ${periodRequests.length ? "" : "<p class='muted'>Aun no hay solicitudes. Usa Recalcular reparto para generar los mensajes del mes.</p>"}
        ${false ? state.requests.map((request) => `
          <div class="request-row">
            <div>
              <strong>${request.member_name}</strong>
              <p class="muted">${request.shared_expense_title} · vence ${request.due_date} · ${request.status}</p>
            </div>
            <div class="request-actions">
              <strong>${money.format(request.amount)}</strong>
              <button class="table-button" data-action="mark-request-paid" data-id="${request.id}">Pagada</button>
              <button class="table-button" data-action="mark-request-pending" data-id="${request.id}">Pendiente</button>
            </div>
          </div>
        `).join("") : ""}</div>
      </section>
    </div>
  `;
}

function incomeBasisTable(simulatedTotal = 0) {
  const members = state.incomeBasis?.members ?? [];
  const total = members.reduce((sum, member) => sum + member.incomeBasis, 0);
  return `<table>
    <thead><tr><th>Integrante</th><th>Fuente</th><th class="money">Ingreso periodo</th><th class="money">Declarado</th><th class="money">Proporcion</th>${simulatedTotal ? "<th class='money'>Cuota</th>" : ""}</tr></thead>
    <tbody>
      ${members.map((member) => {
        const share = total ? member.incomeBasis / total : 0;
        return `<tr>
          <td><strong>${member.name}</strong></td>
          <td><span class="status ${member.basisSource === "period" ? "paid" : "pending"}">${member.basisSource === "period" ? "Ingresos del mes" : "Ingreso declarado"}</span></td>
          <td class="money">${money.format(member.periodIncome)}</td>
          <td class="money">${money.format(member.declaredIncome)}</td>
          <td class="money">${Math.round(share * 1000) / 10}%</td>
          ${simulatedTotal ? `<td class="money">${money.format(Math.round(simulatedTotal * share))}</td>` : ""}
        </tr>`;
      }).join("")}
    </tbody>
  </table>`;
}

function requestMessageCards() {
  const requests = state.distribution?.requests?.length ? state.distribution.requests : state.requests;
  return requests.map((request) => `
    <article class="message-card">
      <div class="request-row">
        <div>
          <strong>${request.member_name}</strong>
          <p class="muted">${request.shared_expense_title} · vence ${request.due_date} · ${request.status}</p>
        </div>
        <strong>${money.format(request.amount)}</strong>
      </div>
      <p class="message-box">${request.message ?? ""}</p>
      <div class="row-actions">
        <button class="table-button" data-action="copy-request-message" data-id="${request.id}">Copiar mensaje</button>
        <button class="table-button" data-action="mark-request-sent" data-id="${request.id}">Enviado</button>
        <button class="table-button" data-action="mark-request-paid" data-id="${request.id}">Pagada</button>
        <button class="table-button" data-action="mark-request-pending" data-id="${request.id}">Pendiente</button>
      </div>
    </article>
  `).join("");
}

function renderStrategies() {
  const strategy = state.strategies;
  const expenseRatio = Math.round((strategy?.ratios.expenseRatio ?? 0) * 100);
  const savingRatio = Math.round((strategy?.ratios.savingRatio ?? 0) * 100);
  return `
    <div class="section-hero">
      <div>
        <p class="eyebrow">Decision economica</p>
        <h2>Plan mensual para mejorar caja, ahorro y urgencias</h2>
        <p class="muted">Estas recomendaciones se calculan desde tus ingresos, gastos, ahorros, solicitudes y metas.</p>
      </div>
      <div class="hero-metrics">
        <span>Gasto ${expenseRatio}%</span>
        <span>Ahorro ${savingRatio}%</span>
      </div>
    </div>
    <div class="strategy-grid">
      ${(strategy?.strategies ?? []).map((item) => `
        <article class="card strategy-card">
          <span class="priority">${item.priority}</span>
          <h3>${item.title}</h3>
          <p>${item.action}</p>
          <strong>${item.impact}</strong>
        </article>
      `).join("")}
    </div>
  `;
}

function renderExcel() {
  return `
    <div class="section-hero">
      <div>
        <p class="eyebrow">Excel historico</p>
        <h2>Comprender archivo de gastos 2019-2026</h2>
        <p class="muted">La app lee el XLSX, detecta hojas anuales y resume secciones como ingresos, egresos, ahorro, deudas y vivienda.</p>
      </div>
    </div>
    <section class="card">
      <div class="excel-controls">
        <label>Ruta del Excel
          <input id="excel-path" value="G:\\Mi unidad\\PC-ONLINE\\Gastos.xlsx" />
        </label>
        <button class="primary-button" data-action="analyze-excel">Analizar Excel</button>
      </div>
    </section>
    <div id="excel-results">${state.excel ? renderExcelResults(state.excel) : ""}</div>
  `;
}

function renderExcelResults(excel) {
  if (excel.error) {
    return `<section class="card"><h3>No se pudo leer el Excel</h3><p class="muted">${excel.error}</p></section>`;
  }
  return `
    <div class="grid content-grid" style="margin-top: 16px">
      <section class="card">
        <h3>Totales detectados</h3>
        <div class="grid">
          ${Object.entries(excel.globalTotals).map(([name, total]) => `
            <div class="legend-row"><strong>${name}</strong><span>${money.format(total)}</span></div>
          `).join("") || "<p class='muted'>No se detectaron totales aun.</p>"}
        </div>
      </section>
      <section class="card">
        <h3>Lectura del archivo</h3>
        <div class="grid">${excel.insights.map((item) => `<div class="alert info"><strong>${item}</strong></div>`).join("")}</div>
      </section>
    </div>
    <section class="card" style="margin-top:16px">
      <h3>Hojas analizadas</h3>
      <table>
        <thead><tr><th>Hoja</th><th>Filas leidas</th><th>Coincidencias</th><th>Totales</th></tr></thead>
        <tbody>
          ${excel.sheets.map((sheet) => `
            <tr>
              <td><strong>${sheet.sheet}</strong></td>
              <td>${sheet.rowsRead}</td>
              <td>${Object.entries(sheet.matches).map(([k, v]) => `${k}: ${v}`).join(", ") || "-"}</td>
              <td>${Object.entries(sheet.totals).map(([k, v]) => `${k}: ${money.format(v)}`).join(" · ") || "-"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </section>
  `;
}

function renderBirthdays() {
  return `
    <section class="card">
      <div class="section-title-row">
        <h3>Calendario familiar</h3>
        <button class="secondary-button" data-action="new-birthday">Nuevo cumpleanos</button>
      </div>
      <table>
        <thead><tr><th>Nombre</th><th>Fecha</th><th>Edad</th><th>Faltan</th><th class="money">Presupuesto</th><th></th></tr></thead>
        <tbody>
          ${state.birthdays.map((item) => `
            <tr>
              <td>${item.name}</td>
              <td>${item.nextDate}</td>
              <td>${item.nextAge}</td>
              <td>${item.daysLeft} dias</td>
              <td class="money">${money.format(item.gift_budget)}</td>
              <td class="row-actions">
                <button class="table-button" data-action="edit-birthday" data-id="${item.id}">Editar</button>
                <button class="table-button danger" data-action="delete-birthday" data-id="${item.id}">Eliminar</button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </section>
  `;
}

function renderSecurity() {
  const goalTarget = state.goals.reduce((sum, item) => sum + item.target_amount, 0);
  const goalCurrent = state.goals.reduce((sum, item) => sum + item.current_amount, 0);
  const emergencyTotal = state.emergencies.filter((item) => item.status !== "cubierto").reduce((sum, item) => sum + item.amount, 0);
  return `
    <div class="section-hero compact-hero">
      <div>
        <p class="eyebrow">Seguridad financiera</p>
        <h2>Metas e imprevistos gestionables</h2>
        <p class="muted">Planifica fondos de emergencia, salud, hogar, vehiculo o cualquier riesgo familiar. Cada meta tiene avance, fecha y monto objetivo.</p>
      </div>
      <div class="hero-metrics">
        <span>Metas ${state.goals.length}</span>
        <span>Imprevistos ${state.emergencies.length}</span>
      </div>
    </div>
    <div class="grid kpi-grid">
      ${kpi("Objetivo seguridad", goalTarget, "metas familiares")}
      ${kpi("Fondo acumulado", goalCurrent, goalTarget ? `${Math.round((goalCurrent / goalTarget) * 100)}% cubierto` : "sin objetivo")}
      ${kpi("Imprevistos abiertos", emergencyTotal, "monto estimado")}
      ${kpi("Prioridad alta", state.emergencies.filter((item) => item.priority === "alta" && item.status !== "cubierto").length, "resolver primero", false)}
      <section class="card kpi action-kpi">
        <span class="label">Accion</span>
        <button class="primary-button" data-action="new-goal">Nueva meta</button>
      </section>
    </div>
    <div class="grid content-grid">
      <section class="card">
        <div class="section-title-row">
          <h3>Metas editables</h3>
          <button class="secondary-button" data-action="new-goal">Agregar meta</button>
        </div>
        <table>
          <thead><tr><th>Meta</th><th>Tipo</th><th>Fecha</th><th>Avance</th><th class="money">Objetivo</th><th></th></tr></thead>
          <tbody>
            ${state.goals.map((item) => {
              const progress = item.target_amount ? Math.min(100, Math.round((item.current_amount / item.target_amount) * 100)) : 0;
              return `<tr>
                <td><strong>${item.name}</strong></td>
                <td>${item.type}</td>
                <td>${item.target_date ?? "-"}</td>
                <td><div class="mini-progress"><span style="width:${progress}%"></span></div>${progress}%</td>
                <td class="money">${money.format(item.target_amount)}</td>
                <td class="row-actions">
                  <button class="table-button" data-action="edit-goal" data-id="${item.id}">Editar</button>
                  <button class="table-button danger" data-action="delete-goal" data-id="${item.id}">Eliminar</button>
                </td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>
      </section>
      <section class="card">
        <div class="section-title-row">
          <h3>Imprevistos</h3>
          <button class="secondary-button" data-action="new-emergency">Agregar</button>
        </div>
        <div class="grid">
          ${state.emergencies.map((item) => `
            <article class="message-card">
              <div class="request-row">
                <div>
                  <strong>${item.title}</strong>
                  <p class="muted">${item.area} · ${item.member_name ?? "familia"} · ${item.target_date ?? "sin fecha"}</p>
                </div>
                <span class="status ${item.priority === "alta" ? "overdue" : "pending"}">${item.priority}</span>
              </div>
              <p class="muted">${item.notes ?? ""}</p>
              <div class="request-row">
                <strong>${money.format(item.amount)}</strong>
                <span>${item.status}</span>
              </div>
              <div class="row-actions">
                <button class="table-button" data-action="edit-emergency" data-id="${item.id}">Editar</button>
                <button class="table-button danger" data-action="delete-emergency" data-id="${item.id}">Eliminar</button>
              </div>
            </article>
          `).join("")}
        </div>
      </section>
    </div>
  `;
}

function kpi(label, value, trend, currency = true) {
  return `<section class="card kpi"><span class="label">${label}</span><span class="value">${currency ? money.format(value) : value}</span><span class="trend">${trend}</span></section>`;
}

function bars(month, index) {
  const income = [80, 88, 82, 91, 94, 100][index];
  const expense = [52, 58, 61, 55, 64, 48][index];
  const saving = [24, 28, 20, 32, 26, 40][index];
  return `<div class="bar-group" title="${month}">
    <div class="bar income" style="height:${income}%"></div>
    <div class="bar expense" style="height:${expense}%"></div>
    <div class="bar saving" style="height:${saving}%"></div>
  </div>`;
}

function legend(name, total, color) {
  return `<div class="legend-row"><span><span class="dot" style="display:inline-block;background:${color}"></span> ${name}</span><strong>${money.format(total)}</strong></div>`;
}

function requestRow(request) {
  return `<div class="request-row"><div><strong>${request.name}</strong><p class="muted">${Math.round(request.income_share * 100)}% proporcional</p></div><span class="status ${request.status}">${money.format(request.amount)}</span></div>`;
}

function birthdayRow(item) {
  return `<div class="list-row"><div><strong>${item.name}</strong><p class="muted">${item.nextDate} · cumple ${item.nextAge}</p></div><strong>${item.daysLeft}d</strong></div>`;
}

function alertRow(item) {
  return `<div class="alert ${item.level}"><strong>${item.title}</strong><span class="muted">${item.detail}</span></div>`;
}

function membersTable(totalIncome, simulatedTotal = 0, editable = false) {
  return `<table>
    <thead><tr><th>Integrante</th><th>Rol</th><th>Estado</th><th class="money">Ingreso</th><th class="money">Proporcion</th>${simulatedTotal ? "<th class='money'>Cuota</th>" : ""}${editable ? "<th></th>" : ""}</tr></thead>
    <tbody>
      ${state.members.map((member) => {
        const share = totalIncome ? member.monthly_income / totalIncome : 0;
        return `<tr>
          <td><strong>${member.name}</strong><br><span class="muted">${member.relationship ?? ""}</span></td>
          <td>${member.role}</td>
          <td><span class="status ${member.active ? "paid" : "pending"}">${member.active ? "Activo" : "Inactivo"}</span></td>
          <td class="money">${money.format(member.monthly_income)}</td>
          <td class="money">${Math.round(share * 1000) / 10}%</td>
          ${simulatedTotal ? `<td class="money">${money.format(Math.round(simulatedTotal * share))}</td>` : ""}
          ${editable ? `<td class="row-actions">
            <button class="table-button" data-action="edit-member" data-id="${member.id}">Editar</button>
            <button class="table-button danger" data-action="disable-member" data-id="${member.id}">Eliminar</button>
          </td>` : ""}
        </tr>`;
      }).join("")}
    </tbody>
  </table>`;
}

function labelType(type) {
  return {
    income: "Ingreso",
    expense: "Gasto",
    saving: "Ahorro",
    debt_payment: "Deuda",
    emergency: "Urgencia",
  }[type] ?? type;
}

function debtLabel(kind) {
  return {
    consumer_credit: "Consumo",
    mortgage: "Hipoteca",
    compensation_fund: "Caja compensacion",
    commercial_store: "Tienda comercial",
    credit_card: "Tarjeta credito",
    other: "Otro",
  }[kind] ?? kind;
}

function bindDynamicActions() {
  const sharedForm = document.querySelector("#shared-expense-form");
  if (sharedForm) {
    sharedForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(sharedForm).entries());
      await api("/api/shared-expenses", { method: "POST", body: JSON.stringify(data) });
      await loadAll();
      setView("split");
    });
  }
  document.querySelectorAll("[data-action='new-member']").forEach((button) => {
    button.addEventListener("click", () => openMemberModal());
  });
  document.querySelectorAll("[data-action='new-transaction']").forEach((button) => {
    button.addEventListener("click", () => openTransactionModal());
  });
  document.querySelectorAll("[data-action='new-recurring']").forEach((button) => {
    button.addEventListener("click", () => openRecurringModal());
  });
  document.querySelectorAll("[data-action='new-debt']").forEach((button) => {
    button.addEventListener("click", () => openDebtModal());
  });
  document.querySelectorAll("[data-action='edit-debt']").forEach((button) => {
    button.addEventListener("click", () => openDebtModal(state.debts.find((item) => item.id === button.dataset.id)));
  });
  document.querySelectorAll("[data-action='delete-debt']").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!confirm("Eliminar este credito o deuda?")) return;
      await api(`/api/debts/${button.dataset.id}`, { method: "DELETE" });
      await loadAll();
    });
  });
  document.querySelectorAll("[data-action='new-goal']").forEach((button) => {
    button.addEventListener("click", () => openGoalModal());
  });
  document.querySelectorAll("[data-action='edit-goal']").forEach((button) => {
    button.addEventListener("click", () => openGoalModal(state.goals.find((item) => item.id === button.dataset.id)));
  });
  document.querySelectorAll("[data-action='delete-goal']").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!confirm("Eliminar esta meta?")) return;
      await api(`/api/goals/${button.dataset.id}`, { method: "DELETE" });
      await loadAll();
    });
  });
  document.querySelectorAll("[data-action='new-emergency']").forEach((button) => {
    button.addEventListener("click", () => openEmergencyModal());
  });
  document.querySelectorAll("[data-action='edit-emergency']").forEach((button) => {
    button.addEventListener("click", () => openEmergencyModal(state.emergencies.find((item) => item.id === button.dataset.id)));
  });
  document.querySelectorAll("[data-action='delete-emergency']").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!confirm("Eliminar este imprevisto?")) return;
      await api(`/api/emergencies/${button.dataset.id}`, { method: "DELETE" });
      await loadAll();
    });
  });
  document.querySelectorAll("[data-action='edit-recurring']").forEach((button) => {
    button.addEventListener("click", () => openRecurringModal(state.recurring.find((item) => item.id === button.dataset.id)));
  });
  document.querySelectorAll("[data-action='delete-recurring']").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!confirm("Eliminar este gasto fijo o suscripcion?")) return;
      await api(`/api/recurring/${button.dataset.id}`, { method: "DELETE" });
      await loadAll();
    });
  });
  document.querySelectorAll("[data-action='edit-transaction']").forEach((button) => {
    button.addEventListener("click", () => openTransactionModal(state.transactions.find((tx) => tx.id === button.dataset.id)));
  });
  document.querySelectorAll("[data-action='delete-transaction']").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!confirm("Eliminar este movimiento? Esta accion quitara el registro financiero.")) return;
      await api(`/api/transactions/${button.dataset.id}`, { method: "DELETE" });
      await loadAll();
    });
  });
  document.querySelectorAll("[data-action='new-birthday']").forEach((button) => {
    button.addEventListener("click", () => openBirthdayModal());
  });
  document.querySelectorAll("[data-action='edit-birthday']").forEach((button) => {
    button.addEventListener("click", () => openBirthdayModal(state.birthdays.find((item) => item.id === button.dataset.id)));
  });
  document.querySelectorAll("[data-action='delete-birthday']").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!confirm("Eliminar este cumpleanos del calendario?")) return;
      await api(`/api/birthdays/${button.dataset.id}`, { method: "DELETE" });
      await loadAll();
    });
  });
  document.querySelectorAll("[data-action='mark-request-paid']").forEach((button) => {
    button.addEventListener("click", async () => {
      await api(`/api/payment-requests/${button.dataset.id}`, { method: "PATCH", body: JSON.stringify({ status: "paid" }) });
      await loadAll();
    });
  });
  document.querySelectorAll("[data-action='mark-request-sent']").forEach((button) => {
    button.addEventListener("click", async () => {
      await api(`/api/payment-requests/${button.dataset.id}`, { method: "PATCH", body: JSON.stringify({ status: "sent" }) });
      await loadAll();
    });
  });
  document.querySelectorAll("[data-action='mark-request-pending']").forEach((button) => {
    button.addEventListener("click", async () => {
      await api(`/api/payment-requests/${button.dataset.id}`, { method: "PATCH", body: JSON.stringify({ status: "pending" }) });
      await loadAll();
    });
  });
  document.querySelectorAll("[data-action='copy-request-message']").forEach((button) => {
    button.addEventListener("click", async () => {
      const request = state.requests.find((item) => item.id === button.dataset.id);
      if (!request?.message) return;
      await navigator.clipboard.writeText(request.message);
      button.textContent = "Copiado";
      setTimeout(() => { button.textContent = "Copiar mensaje"; }, 1200);
    });
  });
  document.querySelectorAll("[data-action='generate-monthly-distribution']").forEach((button) => {
    button.addEventListener("click", async () => {
      button.disabled = true;
      button.textContent = "Calculando...";
      await api("/api/shared-expenses/monthly-distribution", {
        method: "POST",
        body: JSON.stringify({ period: state.dashboard.period, title: `Distribucion familiar ${state.dashboard.period}` }),
      });
      await loadAll();
      setView("split");
    });
  });
  document.querySelectorAll("[data-action='edit-member']").forEach((button) => {
    button.addEventListener("click", () => openMemberModal(state.members.find((member) => member.id === button.dataset.id)));
  });
  document.querySelectorAll("[data-action='disable-member']").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!confirm("Eliminar este integrante? Sus movimientos historicos quedaran sin integrante asignado.")) return;
      await api(`/api/members/${button.dataset.id}`, { method: "DELETE" });
      await loadAll();
    });
  });
  document.querySelectorAll("[data-action='analyze-excel']").forEach((button) => {
    button.addEventListener("click", async () => {
      const path = document.querySelector("#excel-path").value;
      button.textContent = "Analizando...";
      button.disabled = true;
      try {
        state.excel = await api(`/api/excel-summary?path=${encodeURIComponent(path)}`);
      } catch (error) {
        state.excel = { error: error.message };
      }
      render();
    });
  });
}

function openMemberModal(member = null) {
  const modal = document.querySelector("#member-modal");
  const form = document.querySelector("#member-form");
  form.reset();
  document.querySelector("#member-modal-title").textContent = member ? "Editar integrante" : "Nuevo integrante";
  form.elements.id.value = member?.id ?? "";
  form.elements.name.value = member?.name ?? "";
  form.elements.role.value = member?.role ?? "member";
  form.elements.relationship.value = member?.relationship ?? "";
  form.elements.monthlyIncome.value = member?.monthly_income ?? 0;
  form.elements.birthDate.value = member?.birth_date ?? "";
  form.elements.active.value = member?.active ? "1" : "0";
  if (!member) form.elements.active.value = "1";
  modal.showModal();
}

function openTransactionModal(tx = null) {
  const modal = document.querySelector("#transaction-modal");
  const form = document.querySelector("#transaction-form");
  form.reset();
  document.querySelector("#transaction-modal-title").textContent = tx ? "Editar movimiento" : "Nuevo movimiento";
  form.elements.id.value = tx?.id ?? "";
  form.elements.type.value = tx?.type ?? "expense";
  form.elements.date.value = tx?.date ?? new Date().toISOString().slice(0, 10);
  form.elements.memberId.value = tx?.member_id ?? state.members[0]?.id ?? "";
  form.elements.categoryId.value = tx?.category_id ?? state.categories[0]?.id ?? "";
  form.elements.description.value = tx?.description ?? "";
  form.elements.amount.value = tx?.amount ?? "";
  form.elements.paymentMethod.value = tx?.payment_method ?? "Transferencia";
  modal.showModal();
}

function openBirthdayModal(item = null) {
  const modal = document.querySelector("#birthday-modal");
  const form = document.querySelector("#birthday-form");
  form.reset();
  document.querySelector("#birthday-modal-title").textContent = item ? "Editar cumpleanos" : "Nuevo cumpleanos";
  form.elements.id.value = item?.id ?? "";
  form.elements.name.value = item?.name ?? "";
  form.elements.birthDate.value = item?.birth_date ?? "";
  form.elements.relationship.value = item?.relationship ?? "";
  form.elements.giftBudget.value = item?.gift_budget ?? 35000;
  form.elements.reminderDays.value = item?.reminder_days ?? 7;
  modal.showModal();
}

function openRecurringModal(item = null) {
  const modal = document.querySelector("#recurring-modal");
  const form = document.querySelector("#recurring-form");
  form.reset();
  document.querySelector("#recurring-modal-title").textContent = item ? "Editar compromiso" : "Nuevo fijo o suscripcion";
  form.elements.id.value = item?.id ?? "";
  form.elements.kind.value = item?.kind ?? "fixed";
  form.elements.name.value = item?.name ?? "";
  form.elements.amount.value = item?.amount ?? "";
  form.elements.dueDay.value = item?.due_day ?? 1;
  form.elements.memberId.value = item?.member_id ?? "";
  form.elements.categoryId.value = item?.category_id ?? "";
  form.elements.paymentMethod.value = item?.payment_method ?? "";
  form.elements.usageLevel.value = item?.usage_level ?? "";
  form.elements.active.value = item?.active ? "1" : "0";
  if (!item) form.elements.active.value = "1";
  form.elements.notes.value = item?.notes ?? "";
  modal.showModal();
}

function openDebtModal(item = null) {
  const modal = document.querySelector("#debt-modal");
  const form = document.querySelector("#debt-form");
  form.reset();
  document.querySelector("#debt-modal-title").textContent = item ? "Editar credito" : "Nuevo credito";
  form.elements.id.value = item?.id ?? "";
  form.elements.kind.value = item?.kind ?? "consumer_credit";
  form.elements.institution.value = item?.institution ?? "";
  form.elements.name.value = item?.name ?? "";
  form.elements.memberId.value = item?.member_id ?? "";
  form.elements.originalAmount.value = item?.original_amount ?? 0;
  form.elements.balance.value = item?.balance ?? "";
  form.elements.monthlyPayment.value = item?.monthly_payment ?? "";
  form.elements.interestRate.value = item?.interest_rate ?? 0;
  form.elements.dueDay.value = item?.due_day ?? 1;
  form.elements.endDate.value = item?.end_date ?? "";
  form.elements.active.value = item?.active ? "1" : "0";
  if (!item) form.elements.active.value = "1";
  form.elements.notes.value = item?.notes ?? "";
  modal.showModal();
}

function openGoalModal(item = null) {
  const modal = document.querySelector("#goal-modal");
  const form = document.querySelector("#goal-form");
  form.reset();
  document.querySelector("#goal-modal-title").textContent = item ? "Editar meta" : "Nueva meta";
  form.elements.id.value = item?.id ?? "";
  form.elements.name.value = item?.name ?? "";
  form.elements.type.value = item?.type ?? "emergencia";
  form.elements.targetAmount.value = item?.target_amount ?? "";
  form.elements.currentAmount.value = item?.current_amount ?? 0;
  form.elements.targetDate.value = item?.target_date ?? "";
  modal.showModal();
}

function openEmergencyModal(item = null) {
  const modal = document.querySelector("#emergency-modal");
  const form = document.querySelector("#emergency-form");
  form.reset();
  document.querySelector("#emergency-modal-title").textContent = item ? "Editar imprevisto" : "Nuevo imprevisto";
  form.elements.id.value = item?.id ?? "";
  form.elements.title.value = item?.title ?? "";
  form.elements.area.value = item?.area ?? "seguridad";
  form.elements.amount.value = item?.amount ?? "";
  form.elements.memberId.value = item?.member_id ?? "";
  form.elements.priority.value = item?.priority ?? "media";
  form.elements.status.value = item?.status ?? "planificado";
  form.elements.targetDate.value = item?.target_date ?? "";
  form.elements.notes.value = item?.notes ?? "";
  modal.showModal();
}

document.querySelectorAll("[data-view]").forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.view));
});

document.querySelector("#open-transaction").addEventListener("click", () => {
  openTransactionModal();
});

document.querySelector("#close-transaction").addEventListener("click", () => document.querySelector("#transaction-modal").close());
document.querySelector("#cancel-transaction").addEventListener("click", () => document.querySelector("#transaction-modal").close());

document.querySelector("#transaction-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget).entries());
  data.amount = Number(data.amount);
  const method = data.id ? "PATCH" : "POST";
  const url = data.id ? `/api/transactions/${data.id}` : "/api/transactions";
  await api(url, { method, body: JSON.stringify(data) });
  document.querySelector("#transaction-modal").close();
  event.currentTarget.reset();
  await loadAll();
});

document.querySelector("#close-member").addEventListener("click", () => document.querySelector("#member-modal").close());
document.querySelector("#cancel-member").addEventListener("click", () => document.querySelector("#member-modal").close());

document.querySelector("#member-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form).entries());
  const payload = {
    name: data.name,
    role: data.role,
    relationship: data.relationship,
    monthlyIncome: Number(data.monthlyIncome),
    birthDate: data.birthDate || null,
    active: data.active === "1",
  };
  if (data.id) {
    await api(`/api/members/${data.id}`, { method: "PATCH", body: JSON.stringify(payload) });
  } else {
    await api("/api/members", { method: "POST", body: JSON.stringify(payload) });
  }
  document.querySelector("#member-modal").close();
  await loadAll();
});

document.querySelector("#close-birthday").addEventListener("click", () => document.querySelector("#birthday-modal").close());
document.querySelector("#cancel-birthday").addEventListener("click", () => document.querySelector("#birthday-modal").close());

document.querySelector("#birthday-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget).entries());
  const payload = {
    name: data.name,
    birthDate: data.birthDate,
    relationship: data.relationship,
    giftBudget: Number(data.giftBudget),
    reminderDays: Number(data.reminderDays),
  };
  const method = data.id ? "PATCH" : "POST";
  const url = data.id ? `/api/birthdays/${data.id}` : "/api/birthdays";
  await api(url, { method, body: JSON.stringify(payload) });
  document.querySelector("#birthday-modal").close();
  await loadAll();
});

document.querySelector("#close-recurring").addEventListener("click", () => document.querySelector("#recurring-modal").close());
document.querySelector("#cancel-recurring").addEventListener("click", () => document.querySelector("#recurring-modal").close());

document.querySelector("#recurring-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget).entries());
  const payload = {
    kind: data.kind,
    name: data.name,
    amount: Number(data.amount),
    dueDay: Number(data.dueDay),
    memberId: data.memberId || null,
    categoryId: data.categoryId || null,
    paymentMethod: data.paymentMethod,
    usageLevel: data.usageLevel,
    active: data.active === "1",
    notes: data.notes,
  };
  const method = data.id ? "PATCH" : "POST";
  const url = data.id ? `/api/recurring/${data.id}` : "/api/recurring";
  await api(url, { method, body: JSON.stringify(payload) });
  document.querySelector("#recurring-modal").close();
  await loadAll();
});

document.querySelector("#close-debt").addEventListener("click", () => document.querySelector("#debt-modal").close());
document.querySelector("#cancel-debt").addEventListener("click", () => document.querySelector("#debt-modal").close());

document.querySelector("#debt-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget).entries());
  const payload = {
    kind: data.kind,
    institution: data.institution,
    name: data.name,
    memberId: data.memberId || null,
    originalAmount: Number(data.originalAmount),
    balance: Number(data.balance),
    monthlyPayment: Number(data.monthlyPayment),
    interestRate: Number(data.interestRate),
    dueDay: Number(data.dueDay),
    endDate: data.endDate || null,
    active: data.active === "1",
    notes: data.notes,
  };
  const method = data.id ? "PATCH" : "POST";
  const url = data.id ? `/api/debts/${data.id}` : "/api/debts";
  await api(url, { method, body: JSON.stringify(payload) });
  document.querySelector("#debt-modal").close();
  await loadAll();
});

document.querySelector("#close-goal").addEventListener("click", () => document.querySelector("#goal-modal").close());
document.querySelector("#cancel-goal").addEventListener("click", () => document.querySelector("#goal-modal").close());

document.querySelector("#goal-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget).entries());
  const payload = {
    name: data.name,
    type: data.type,
    targetAmount: Number(data.targetAmount),
    currentAmount: Number(data.currentAmount),
    targetDate: data.targetDate || null,
  };
  const method = data.id ? "PATCH" : "POST";
  const url = data.id ? `/api/goals/${data.id}` : "/api/goals";
  await api(url, { method, body: JSON.stringify(payload) });
  document.querySelector("#goal-modal").close();
  await loadAll();
});

document.querySelector("#close-emergency").addEventListener("click", () => document.querySelector("#emergency-modal").close());
document.querySelector("#cancel-emergency").addEventListener("click", () => document.querySelector("#emergency-modal").close());

document.querySelector("#emergency-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget).entries());
  const payload = {
    title: data.title,
    area: data.area,
    amount: Number(data.amount),
    memberId: data.memberId || null,
    priority: data.priority,
    status: data.status,
    targetDate: data.targetDate || null,
    notes: data.notes,
  };
  const method = data.id ? "PATCH" : "POST";
  const url = data.id ? `/api/emergencies/${data.id}` : "/api/emergencies";
  await api(url, { method, body: JSON.stringify(payload) });
  document.querySelector("#emergency-modal").close();
  await loadAll();
});

loadAll().catch((error) => {
  document.querySelector("#view").innerHTML = `<div class="card">Error cargando la aplicacion: ${error.message}</div>`;
});
