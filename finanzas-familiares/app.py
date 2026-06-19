from __future__ import annotations

import json
import os
import re
import sqlite3
import uuid
import zipfile
from datetime import date, datetime, timedelta
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse
from xml.etree import ElementTree as ET


ROOT = Path(__file__).parent.resolve()
DATA_DIR = ROOT / "data"
DB_PATH = DATA_DIR / "finanzas.db"
STATIC_DIR = ROOT / "static"
HOST = os.environ.get("HOST", "127.0.0.1")
PORT = int(os.environ.get("PORT", "8765"))
DEFAULT_EXCEL_PATH = r"G:\Mi unidad\PC-ONLINE\Gastos.xlsx"


def now_iso() -> str:
    return datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


def new_id() -> str:
    return str(uuid.uuid4())


def connect() -> sqlite3.Connection:
    DATA_DIR.mkdir(exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def setup_database() -> None:
    with connect() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS families (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              currency TEXT NOT NULL DEFAULT 'CLP',
              created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS members (
              id TEXT PRIMARY KEY,
              family_id TEXT NOT NULL REFERENCES families(id),
              name TEXT NOT NULL,
              role TEXT NOT NULL CHECK(role IN ('admin', 'member', 'guest')),
              relationship TEXT,
              monthly_income REAL NOT NULL DEFAULT 0,
              birth_date TEXT,
              active INTEGER NOT NULL DEFAULT 1,
              created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS categories (
              id TEXT PRIMARY KEY,
              family_id TEXT NOT NULL REFERENCES families(id),
              name TEXT NOT NULL,
              type TEXT NOT NULL CHECK(type IN ('income', 'expense', 'saving', 'debt', 'emergency')),
              color TEXT NOT NULL DEFAULT '#0B5CAD'
            );

            CREATE TABLE IF NOT EXISTS transactions (
              id TEXT PRIMARY KEY,
              family_id TEXT NOT NULL REFERENCES families(id),
              member_id TEXT REFERENCES members(id),
              category_id TEXT REFERENCES categories(id),
              type TEXT NOT NULL CHECK(type IN ('income', 'expense', 'saving', 'debt_payment', 'emergency')),
              date TEXT NOT NULL,
              description TEXT NOT NULL,
              amount REAL NOT NULL CHECK(amount >= 0),
              payment_method TEXT,
              recurring INTEGER NOT NULL DEFAULT 0,
              created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS birthdays (
              id TEXT PRIMARY KEY,
              family_id TEXT NOT NULL REFERENCES families(id),
              member_id TEXT REFERENCES members(id),
              name TEXT NOT NULL,
              birth_date TEXT NOT NULL,
              relationship TEXT,
              gift_budget REAL NOT NULL DEFAULT 0,
              reminder_days INTEGER NOT NULL DEFAULT 7
            );

            CREATE TABLE IF NOT EXISTS shared_expenses (
              id TEXT PRIMARY KEY,
              family_id TEXT NOT NULL REFERENCES families(id),
              title TEXT NOT NULL,
              description TEXT,
              total_amount REAL NOT NULL CHECK(total_amount >= 0),
              period TEXT NOT NULL,
              status TEXT NOT NULL DEFAULT 'draft',
              created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS payment_requests (
              id TEXT PRIMARY KEY,
              shared_expense_id TEXT NOT NULL REFERENCES shared_expenses(id),
              member_id TEXT NOT NULL REFERENCES members(id),
              income_snapshot REAL NOT NULL,
              income_share REAL NOT NULL,
              amount REAL NOT NULL,
              status TEXT NOT NULL DEFAULT 'pending',
              due_date TEXT NOT NULL,
              created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS savings_goals (
              id TEXT PRIMARY KEY,
              family_id TEXT NOT NULL REFERENCES families(id),
              name TEXT NOT NULL,
              type TEXT NOT NULL,
              target_amount REAL NOT NULL,
              current_amount REAL NOT NULL DEFAULT 0,
              target_date TEXT
            );

            CREATE TABLE IF NOT EXISTS recurring_items (
              id TEXT PRIMARY KEY,
              family_id TEXT NOT NULL REFERENCES families(id),
              member_id TEXT REFERENCES members(id),
              category_id TEXT REFERENCES categories(id),
              kind TEXT NOT NULL CHECK(kind IN ('fixed', 'subscription')),
              name TEXT NOT NULL,
              amount REAL NOT NULL CHECK(amount >= 0),
              due_day INTEGER NOT NULL CHECK(due_day >= 1 AND due_day <= 31),
              payment_method TEXT,
              usage_level TEXT,
              active INTEGER NOT NULL DEFAULT 1,
              notes TEXT,
              created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS debts (
              id TEXT PRIMARY KEY,
              family_id TEXT NOT NULL REFERENCES families(id),
              member_id TEXT REFERENCES members(id),
              kind TEXT NOT NULL CHECK(kind IN ('consumer_credit', 'mortgage', 'compensation_fund', 'commercial_store', 'credit_card', 'other')),
              institution TEXT NOT NULL,
              name TEXT NOT NULL,
              original_amount REAL NOT NULL DEFAULT 0,
              balance REAL NOT NULL DEFAULT 0,
              monthly_payment REAL NOT NULL DEFAULT 0,
              interest_rate REAL NOT NULL DEFAULT 0,
              due_day INTEGER NOT NULL DEFAULT 1,
              end_date TEXT,
              active INTEGER NOT NULL DEFAULT 1,
              notes TEXT,
              created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS emergency_events (
              id TEXT PRIMARY KEY,
              family_id TEXT NOT NULL REFERENCES families(id),
              member_id TEXT REFERENCES members(id),
              title TEXT NOT NULL,
              area TEXT NOT NULL,
              amount REAL NOT NULL DEFAULT 0,
              priority TEXT NOT NULL DEFAULT 'media',
              status TEXT NOT NULL DEFAULT 'planificado',
              target_date TEXT,
              notes TEXT,
              created_at TEXT NOT NULL
            );
            """
        )
        seed(conn)
        ensure_recurring_seed(conn)
        ensure_debt_seed(conn)
        ensure_emergency_seed(conn)


def seed(conn: sqlite3.Connection) -> None:
    existing = conn.execute("SELECT COUNT(*) AS total FROM families").fetchone()["total"]
    if existing:
        return

    family_id = new_id()
    conn.execute(
        "INSERT INTO families(id, name, currency, created_at) VALUES (?, ?, ?, ?)",
        (family_id, "Familia Contreras Obreque", "CLP", now_iso()),
    )

    members = [
        ("Miguel", "admin", "Titular", 1650000, "1988-08-16"),
        ("Daniel", "member", "Integrante", 750000, "1996-03-28"),
        ("Papa", "member", "Padre", 520000, "1962-11-12"),
        ("Mama", "member", "Madre", 430000, "1965-06-04"),
    ]
    member_ids = {}
    for name, role, relationship, income, birth_date in members:
        member_id = new_id()
        member_ids[name] = member_id
        conn.execute(
            """
            INSERT INTO members(id, family_id, name, role, relationship, monthly_income, birth_date, active, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
            """,
            (member_id, family_id, name, role, relationship, income, birth_date, now_iso()),
        )

    categories = [
        ("Sueldo", "income", "#10B981"),
        ("Honorarios", "income", "#14B8A6"),
        ("Vivienda", "expense", "#0B5CAD"),
        ("Alimentacion", "expense", "#F59E0B"),
        ("Transporte", "expense", "#6366F1"),
        ("Salud", "emergency", "#DC2626"),
        ("Deudas", "debt", "#7C3AED"),
        ("Suscripciones", "expense", "#0284C7"),
        ("Ahorro", "saving", "#059669"),
    ]
    category_ids = {}
    for name, kind, color in categories:
        category_id = new_id()
        category_ids[name] = category_id
        conn.execute(
            "INSERT INTO categories(id, family_id, name, type, color) VALUES (?, ?, ?, ?, ?)",
            (category_id, family_id, name, kind, color),
        )

    today = date.today()
    first = today.replace(day=1)
    txs = [
        ("Miguel", "Sueldo", "income", first.isoformat(), "Sueldo INACAP", 1650000),
        ("Daniel", "Sueldo", "income", first.isoformat(), "Ingreso mensual", 750000),
        ("Papa", "Sueldo", "income", first.isoformat(), "Pension / aporte", 520000),
        ("Mama", "Sueldo", "income", first.isoformat(), "Ingreso familiar", 430000),
        ("Miguel", "Vivienda", "expense", today.isoformat(), "Gasto casa y servicios", 310000),
        ("Miguel", "Alimentacion", "expense", today.isoformat(), "Supermercado", 185000),
        ("Daniel", "Transporte", "expense", today.isoformat(), "Combustible y traslado", 92000),
        ("Miguel", "Deudas", "debt_payment", today.isoformat(), "Pago credito consumo", 145000),
        ("Miguel", "Suscripciones", "expense", today.isoformat(), "Servicios digitales", 43900),
        ("Mama", "Salud", "emergency", today.isoformat(), "Medicamentos y control", 54000),
        ("Miguel", "Ahorro", "saving", today.isoformat(), "Estudio seguro", 105000),
    ]
    for member, category, kind, tx_date, description, amount in txs:
        conn.execute(
            """
            INSERT INTO transactions(id, family_id, member_id, category_id, type, date, description, amount, payment_method, recurring, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                new_id(),
                family_id,
                member_ids[member],
                category_ids[category],
                kind,
                tx_date,
                description,
                amount,
                "Transferencia",
                0,
                now_iso(),
            ),
        )

    for name, _, relationship, _, birth_date in members:
        conn.execute(
            """
            INSERT INTO birthdays(id, family_id, member_id, name, birth_date, relationship, gift_budget, reminder_days)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (new_id(), family_id, member_ids[name], name, birth_date, relationship, 35000, 7),
        )

    goals = [
        ("Fondo emergencia", "emergency", 7200000, 1250000, "2026-12-31"),
        ("Fondo salud", "health", 1200000, 280000, "2026-10-30"),
        ("Mantencion casa", "home", 1800000, 410000, "2026-11-30"),
        ("Vehiculo", "vehicle", 950000, 190000, "2026-09-30"),
    ]
    for name, goal_type, target, current, target_date in goals:
        conn.execute(
            """
            INSERT INTO savings_goals(id, family_id, name, type, target_amount, current_amount, target_date)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (new_id(), family_id, name, goal_type, target, current, target_date),
        )

    recurring = [
        ("fixed", "Arriendo / vivienda", "Vivienda", "Miguel", 310000, 5, "Transferencia", "", "Gasto base del hogar"),
        ("fixed", "Internet hogar", "Vivienda", "Miguel", 29990, 10, "Debito", "", "Servicio mensual"),
        ("subscription", "ChatGPT", "Suscripciones", "Miguel", 19900, 20, "Tarjeta", "Alto", "Herramienta de trabajo"),
        ("subscription", "Google One", "Suscripciones", "Miguel", 6900, 18, "Tarjeta", "Medio", "Almacenamiento"),
        ("subscription", "Spotify", "Suscripciones", "Daniel", 4990, 12, "Tarjeta", "Alto", "Entretenimiento"),
    ]
    for kind, name, category, member, amount, due_day, method, usage, notes in recurring:
        conn.execute(
            """
            INSERT INTO recurring_items(id, family_id, member_id, category_id, kind, name, amount, due_day, payment_method, usage_level, active, notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
            """,
            (
                new_id(),
                family_id,
                member_ids.get(member),
                category_ids.get(category),
                kind,
                name,
                amount,
                due_day,
                method,
                usage,
                notes,
                now_iso(),
            ),
        )

    shared_id = new_id()
    conn.execute(
        """
        INSERT INTO shared_expenses(id, family_id, title, description, total_amount, period, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (shared_id, family_id, "Gastos comunes del hogar", "Vivienda, servicios y alimentacion base", 620000, today.strftime("%Y-%m"), "sent", now_iso()),
    )
    create_payment_requests(conn, family_id, shared_id, 620000)


def ensure_recurring_seed(conn: sqlite3.Connection) -> None:
    existing = conn.execute("SELECT COUNT(*) AS total FROM recurring_items").fetchone()["total"]
    if existing:
        return
    family_id = first_family_id(conn)
    members = {row["name"]: row["id"] for row in conn.execute("SELECT id, name FROM members WHERE family_id = ?", (family_id,))}
    categories = {row["name"]: row["id"] for row in conn.execute("SELECT id, name FROM categories WHERE family_id = ?", (family_id,))}
    recurring = [
        ("fixed", "Arriendo / vivienda", "Vivienda", "Miguel", 310000, 5, "Transferencia", "", "Gasto base del hogar"),
        ("fixed", "Internet hogar", "Vivienda", "Miguel", 29990, 10, "Debito", "", "Servicio mensual"),
        ("subscription", "ChatGPT", "Suscripciones", "Miguel", 19900, 20, "Tarjeta", "Alto", "Herramienta de trabajo"),
        ("subscription", "Google One", "Suscripciones", "Miguel", 6900, 18, "Tarjeta", "Medio", "Almacenamiento"),
        ("subscription", "Spotify", "Suscripciones", "Daniel", 4990, 12, "Tarjeta", "Alto", "Entretenimiento"),
    ]
    for kind, name, category, member, amount, due_day, method, usage, notes in recurring:
        conn.execute(
            """
            INSERT INTO recurring_items(id, family_id, member_id, category_id, kind, name, amount, due_day, payment_method, usage_level, active, notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
            """,
            (
                new_id(),
                family_id,
                members.get(member),
                categories.get(category),
                kind,
                name,
                amount,
                due_day,
                method,
                usage,
                notes,
                now_iso(),
            ),
        )


def ensure_debt_seed(conn: sqlite3.Connection) -> None:
    existing = conn.execute("SELECT COUNT(*) AS total FROM debts").fetchone()["total"]
    if existing:
        return
    family_id = first_family_id(conn)
    members = {row["name"]: row["id"] for row in conn.execute("SELECT id, name FROM members WHERE family_id = ?", (family_id,))}
    debts = [
        ("consumer_credit", "Banco Estado", "Credito de consumo", "Miguel", 2800000, 1620000, 145000, 2.1, 8, "2027-11-08", "Consolidar si baja la tasa"),
        ("mortgage", "Banco Santander", "Hipoteca vivienda", "Miguel", 54000000, 49300000, 382000, 4.3, 5, "2042-05-05", "Prioridad alta por plazo largo"),
        ("compensation_fund", "Caja Los Andes", "Caja de compensacion", "Papa", 850000, 420000, 68000, 1.6, 15, "2027-01-15", "Revisar prepago trimestral"),
        ("commercial_store", "Falabella", "Tienda comercial", "Mama", 380000, 210000, 42000, 2.8, 20, "2026-12-20", "Evitar nuevas compras en cuotas"),
    ]
    for kind, institution, name, member, original, balance, payment, rate, due_day, end_date, notes in debts:
        conn.execute(
            """
            INSERT INTO debts(id, family_id, member_id, kind, institution, name, original_amount, balance, monthly_payment,
                              interest_rate, due_day, end_date, active, notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
            """,
            (new_id(), family_id, members.get(member), kind, institution, name, original, balance, payment, rate, due_day, end_date, notes, now_iso()),
        )


def ensure_emergency_seed(conn: sqlite3.Connection) -> None:
    existing = conn.execute("SELECT COUNT(*) AS total FROM emergency_events").fetchone()["total"]
    if existing:
        return
    family_id = first_family_id(conn)
    conn.execute(
        """
        INSERT INTO emergency_events(id, family_id, member_id, title, area, amount, priority, status, target_date, notes, created_at)
        VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            new_id(),
            family_id,
            "Fondo minimo para salud y reparaciones",
            "seguridad",
            450000,
            "alta",
            "planificado",
            date.today().replace(day=28).isoformat(),
            "Reservar caja antes de gastos variables",
            now_iso(),
        ),
    )


def first_family_id(conn: sqlite3.Connection) -> str:
    row = conn.execute("SELECT id FROM families ORDER BY created_at LIMIT 1").fetchone()
    if not row:
        raise RuntimeError("No family found")
    return row["id"]


def row_dicts(rows: list[sqlite3.Row]) -> list[dict]:
    return [dict(row) for row in rows]


def month_bounds(period: str | None = None) -> tuple[str, str]:
    if period:
        year, month = [int(x) for x in period.split("-")]
        start = date(year, month, 1)
    else:
        today = date.today()
        start = today.replace(day=1)
    end = date(start.year + (start.month // 12), (start.month % 12) + 1, 1)
    return start.isoformat(), end.isoformat()


def member_income_basis(conn: sqlite3.Connection, family_id: str, period: str) -> list[dict]:
    start, end = month_bounds(period)
    rows = conn.execute(
        """
        SELECT
          m.id,
          m.name,
          m.monthly_income,
          COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) AS period_income
        FROM members m
        LEFT JOIN transactions t
          ON t.member_id = m.id
         AND t.family_id = m.family_id
         AND t.date >= ?
         AND t.date < ?
         AND t.type = 'income'
        WHERE m.family_id = ? AND m.active = 1
        GROUP BY m.id, m.name, m.monthly_income
        ORDER BY m.name
        """,
        (start, end, family_id),
    ).fetchall()
    members = []
    has_period_income = any(float(row["period_income"] or 0) > 0 for row in rows)
    for row in rows:
        period_income = float(row["period_income"] or 0)
        declared_income = float(row["monthly_income"] or 0)
        members.append(
            {
                "id": row["id"],
                "name": row["name"],
                "declaredIncome": declared_income,
                "periodIncome": period_income,
                "incomeBasis": period_income if has_period_income else declared_income,
                "basisSource": "period" if has_period_income else "declared",
            }
        )
    return members


def monthly_distribution_base(conn: sqlite3.Connection, family_id: str, period: str) -> dict:
    start, end = month_bounds(period)
    tx_total = conn.execute(
        """
        SELECT COALESCE(SUM(amount), 0) AS total
        FROM transactions
        WHERE family_id = ? AND date >= ? AND date < ? AND type IN ('expense', 'debt_payment', 'emergency')
        """,
        (family_id, start, end),
    ).fetchone()["total"]
    recurring = conn.execute(
        """
        SELECT
          COALESCE(SUM(CASE WHEN kind = 'fixed' THEN amount ELSE 0 END), 0) AS fixed_total,
          COALESCE(SUM(CASE WHEN kind = 'subscription' THEN amount ELSE 0 END), 0) AS subscription_total
        FROM recurring_items
        WHERE family_id = ? AND active = 1
        """,
        (family_id,),
    ).fetchone()
    debt_commitments = conn.execute(
        """
        SELECT COALESCE(SUM(monthly_payment), 0) AS total
        FROM debts
        WHERE family_id = ? AND active = 1
        """,
        (family_id,),
    ).fetchone()["total"]
    fixed_total = float(recurring["fixed_total"] or 0)
    subscription_total = float(recurring["subscription_total"] or 0)
    transaction_total = float(tx_total or 0)
    debt_total = float(debt_commitments or 0)
    return {
        "period": period,
        "transactionExpenses": transaction_total,
        "fixedExpenses": fixed_total,
        "subscriptions": subscription_total,
        "debtCommitments": debt_total,
        "total": transaction_total + fixed_total + subscription_total + debt_total,
    }


def clp_text(value: float) -> str:
    return f"{int(round(value)):,}".replace(",", ".")


def request_message(member_name: str, amount: float, income_share: float, total_amount: float, period: str, title: str) -> str:
    percent = round(income_share * 100, 1)
    return (
        f"Hola {member_name}, para {title} del periodo {period}, el total familiar a cubrir es "
        f"{clp_text(total_amount)} CLP. Segun tu proporcion de ingresos ({percent}%), "
        f"tu aporte corresponde a {clp_text(amount)} CLP. Puedes pagarlo a la familia por transferencia."
    )


def latest_distribution(conn: sqlite3.Connection, family_id: str, period: str) -> dict:
    base = monthly_distribution_base(conn, family_id, period)
    requests = row_dicts(
        conn.execute(
            """
            SELECT pr.*, m.name AS member_name, se.title AS shared_expense_title, se.total_amount, se.period
            FROM payment_requests pr
            JOIN members m ON m.id = pr.member_id
            JOIN shared_expenses se ON se.id = pr.shared_expense_id
            WHERE se.family_id = ? AND se.period = ?
            ORDER BY pr.created_at DESC, pr.amount DESC
            """,
            (family_id, period),
        ).fetchall()
    )
    for item in requests:
        item["message"] = request_message(
            item["member_name"],
            float(item["amount"]),
            float(item["income_share"]),
            float(item["total_amount"]),
            item["period"],
            item["shared_expense_title"],
        )
    return {"base": base, "requests": requests}


def create_payment_requests(conn: sqlite3.Connection, family_id: str, shared_expense_id: str, total_amount: float, period: str | None = None) -> None:
    if period is None:
        row = conn.execute("SELECT period FROM shared_expenses WHERE id = ?", (shared_expense_id,)).fetchone()
        period = row["period"] if row else date.today().strftime("%Y-%m")
    members = member_income_basis(conn, family_id, period)
    total_income = sum(float(m["incomeBasis"]) for m in members)
    if total_income <= 0:
        return

    conn.execute("DELETE FROM payment_requests WHERE shared_expense_id = ?", (shared_expense_id,))
    allocated = 0
    due_date = (date.today() + timedelta(days=7)).isoformat()
    for index, member in enumerate(members):
        share = float(member["incomeBasis"]) / total_income
        amount = round(total_amount * share)
        if index == len(members) - 1:
            amount = round(total_amount - allocated)
        allocated += amount
        conn.execute(
            """
            INSERT INTO payment_requests(id, shared_expense_id, member_id, income_snapshot, income_share, amount, status, due_date, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
            """,
            (new_id(), shared_expense_id, member["id"], member["incomeBasis"], share, amount, due_date, now_iso()),
        )


def dashboard(conn: sqlite3.Connection) -> dict:
    family_id = first_family_id(conn)
    start, end = month_bounds()
    totals = conn.execute(
        """
        SELECT
          SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income,
          SUM(CASE WHEN type IN ('expense', 'debt_payment', 'emergency') THEN amount ELSE 0 END) AS expenses,
          SUM(CASE WHEN type = 'saving' THEN amount ELSE 0 END) AS savings
        FROM transactions
        WHERE family_id = ? AND date >= ? AND date < ?
        """,
        (family_id, start, end),
    ).fetchone()
    income = float(totals["income"] or 0)
    expenses = float(totals["expenses"] or 0)
    savings = float(totals["savings"] or 0)
    real_saving = income - expenses
    saving_capacity = income - expenses - savings

    by_category = row_dicts(
        conn.execute(
            """
            SELECT c.name, c.color, SUM(t.amount) AS total
            FROM transactions t
            JOIN categories c ON c.id = t.category_id
            WHERE t.family_id = ? AND t.type IN ('expense', 'debt_payment', 'emergency') AND t.date >= ? AND t.date < ?
            GROUP BY c.name, c.color
            ORDER BY total DESC
            """,
            (family_id, start, end),
        ).fetchall()
    )
    requests = row_dicts(
        conn.execute(
            """
            SELECT pr.id, m.name, pr.income_snapshot, pr.income_share, pr.amount, pr.status, pr.due_date
            FROM payment_requests pr
            JOIN members m ON m.id = pr.member_id
            ORDER BY pr.amount DESC
            LIMIT 8
            """
        ).fetchall()
    )
    upcoming_birthdays = birthdays(conn, family_id)[:5]
    goals = row_dicts(conn.execute("SELECT * FROM savings_goals WHERE family_id = ?", (family_id,)).fetchall())
    recurring = row_dicts(
        conn.execute(
            """
            SELECT ri.*, m.name AS member_name, c.name AS category_name, c.color AS category_color
            FROM recurring_items ri
            LEFT JOIN members m ON m.id = ri.member_id
            LEFT JOIN categories c ON c.id = ri.category_id
            WHERE ri.family_id = ? AND ri.active = 1
            ORDER BY ri.due_day, ri.name
            """,
            (family_id,),
        ).fetchall()
    )
    recurring_fixed = sum(float(item["amount"]) for item in recurring if item["kind"] == "fixed")
    recurring_subscriptions = sum(float(item["amount"]) for item in recurring if item["kind"] == "subscription")

    return {
        "familyId": family_id,
        "period": start[:7],
        "kpis": {
            "income": income,
            "expenses": expenses,
            "realSaving": real_saving,
            "savingCapacity": saving_capacity - recurring_fixed - recurring_subscriptions,
            "pendingRequests": sum(1 for request in requests if request["status"] == "pending"),
            "fixedExpenses": recurring_fixed,
            "subscriptions": recurring_subscriptions,
            "committedMonthly": recurring_fixed + recurring_subscriptions,
        },
        "byCategory": by_category,
        "requests": requests,
        "birthdays": upcoming_birthdays,
        "goals": goals,
        "recurring": recurring,
        "alerts": [
            {"level": "warning", "title": "Fondo de emergencia bajo", "detail": "Meta recomendada: 6 meses de gastos."},
            {"level": "info", "title": "Suscripciones", "detail": "Revisar servicios con bajo uso antes del proximo cobro."},
            {"level": "danger", "title": "Vencimiento cercano", "detail": "Hay solicitudes con fecha limite esta semana."},
        ],
    }


def economic_strategies(conn: sqlite3.Connection) -> dict:
    data = dashboard(conn)
    kpis = data["kpis"]
    income = kpis["income"] or 1
    expenses = kpis["expenses"]
    real_saving = kpis["realSaving"]
    savings = kpis["realSaving"] if kpis["realSaving"] > 0 else 0
    expense_ratio = expenses / income
    saving_ratio = savings / income
    top_categories = data["byCategory"][:3]
    recurring = data.get("recurring", [])
    subscription_total = sum(float(item["amount"]) for item in recurring if item["kind"] == "subscription")
    fixed_total = sum(float(item["amount"]) for item in recurring if item["kind"] == "fixed")
    goals = data["goals"]
    emergency = next((goal for goal in goals if goal["type"] == "emergency"), None)
    emergency_progress = (emergency["current_amount"] / emergency["target_amount"]) if emergency and emergency["target_amount"] else 0

    strategies = []
    if saving_ratio < 0.2:
        strategies.append(
            {
                "priority": "Alta",
                "title": "Subir ahorro real al 20%",
                "action": "Separar automaticamente el ahorro al inicio del mes y no al final.",
                "impact": f"Meta sugerida: {round(income * 0.2):,.0f} CLP mensuales.",
            }
        )
    else:
        strategies.append(
            {
                "priority": "Media",
                "title": "Blindar el ahorro actual",
                "action": "Mantener el ahorro en una cuenta separada y revisar desvíos semanalmente.",
                "impact": f"Ahorro real estimado: {round(real_saving):,.0f} CLP.",
            }
        )

    if expense_ratio > 0.55:
        strategies.append(
            {
                "priority": "Alta",
                "title": "Bajar gasto operativo familiar",
                "action": "Congelar gastos variables por 14 dias y renegociar servicios recurrentes.",
                "impact": f"El gasto consume {round(expense_ratio * 100)}% de los ingresos.",
            }
        )

    if emergency_progress < 0.5:
        strategies.append(
            {
                "priority": "Alta",
                "title": "Completar fondo de emergencia",
                "action": "Crear aportes separados para salud, casa y vehiculo antes de gastos no esenciales.",
                "impact": f"Avance actual del fondo: {round(emergency_progress * 100)}%.",
            }
        )

    if subscription_total > income * 0.05:
        strategies.append(
            {
                "priority": "Alta",
                "title": "Revisar suscripciones",
                "action": "Cancelar, pausar o bajar plan en servicios de bajo uso.",
                "impact": f"Suscripciones detectadas: {round(subscription_total):,.0f} CLP mensuales.",
            }
        )

    if fixed_total > income * 0.35:
        strategies.append(
            {
                "priority": "Alta",
                "title": "Renegociar gastos fijos",
                "action": "Comparar proveedores de internet, seguros, telefonia y vivienda antes de asumir nuevos compromisos.",
                "impact": f"Gastos fijos comprometidos: {round(fixed_total):,.0f} CLP.",
            }
        )

    for item in top_categories:
        strategies.append(
            {
                "priority": "Media",
                "title": f"Auditar {item['name']}",
                "action": "Revisar boletas, separar gasto fijo/variable y definir techo mensual.",
                "impact": f"Gasto detectado: {round(item['total']):,.0f} CLP.",
            }
        )

    strategies.append(
        {
            "priority": "Base",
            "title": "Regla de reparto proporcional",
            "action": "Mantener gastos comunes proporcionales al ingreso declarado para evitar cargas injustas.",
            "impact": "Cada integrante aporta segun capacidad economica.",
        }
    )
    return {"period": data["period"], "ratios": {"expenseRatio": expense_ratio, "savingRatio": saving_ratio}, "strategies": strategies[:7]}


def clean_text(value: object) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip())


def col_to_index(ref: str) -> int:
    letters = re.sub(r"[^A-Z]", "", ref.upper())
    total = 0
    for char in letters:
        total = total * 26 + ord(char) - 64
    return total - 1


def parse_xlsx(path: str, max_rows: int = 1200) -> dict:
    file_path = Path(path)
    if not file_path.exists():
        raise FileNotFoundError(path)

    ns = {
        "main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
        "rel": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
        "pkgrel": "http://schemas.openxmlformats.org/package/2006/relationships",
    }
    with zipfile.ZipFile(file_path) as zf:
        shared = []
        if "xl/sharedStrings.xml" in zf.namelist():
            root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
            for item in root.findall("main:si", ns):
                shared.append("".join(t.text or "" for t in item.findall(".//main:t", ns)))

        workbook = ET.fromstring(zf.read("xl/workbook.xml"))
        rels = ET.fromstring(zf.read("xl/_rels/workbook.xml.rels"))
        rel_map = {rel.attrib["Id"]: rel.attrib["Target"] for rel in rels}
        sheets = []
        for sheet in workbook.findall("main:sheets/main:sheet", ns):
            rel_id = sheet.attrib[f"{{{ns['rel']}}}id"]
            target = rel_map[rel_id].lstrip("/")
            sheet_path = "xl/" + target if not target.startswith("xl/") else target
            sheets.append((sheet.attrib["name"], sheet_path))

        parsed = {}
        for name, sheet_path in sheets:
            root = ET.fromstring(zf.read(sheet_path))
            rows = []
            for row_node in root.findall(".//main:sheetData/main:row", ns)[:max_rows]:
                row_values = {}
                for cell in row_node.findall("main:c", ns):
                    ref = cell.attrib.get("r", "A1")
                    idx = col_to_index(ref)
                    cell_type = cell.attrib.get("t")
                    value_node = cell.find("main:v", ns)
                    inline_node = cell.find("main:is/main:t", ns)
                    value = None
                    if cell_type == "s" and value_node is not None:
                        value = shared[int(value_node.text or 0)]
                    elif inline_node is not None:
                        value = inline_node.text
                    elif value_node is not None:
                        raw = value_node.text or ""
                        try:
                            value = float(raw)
                            if value.is_integer():
                                value = int(value)
                        except ValueError:
                            value = raw
                    if value not in (None, ""):
                        row_values[idx] = value
                if row_values:
                    max_col = max(row_values)
                    rows.append([row_values.get(i) for i in range(max_col + 1)])
            parsed[name] = rows
    return parsed


def excel_summary(path: str) -> dict:
    workbook = parse_xlsx(path)
    headings = {
        "ingresos": "Ingresos",
        "egresos": "Egresos",
        "ahorro": "Ahorro",
        "deudas": "Deudas",
        "gasto casa": "Gasto Casa",
        "vivienda": "Vivienda",
        "deposito a plazo": "Deposito a plazo",
        "estudio seguro": "Estudio seguro",
        "ahorro voluntario": "Ahorro voluntario",
    }
    sheet_summaries = []
    global_totals = {label: 0 for label in headings.values()}
    for sheet_name, rows in workbook.items():
        totals = {label: 0 for label in headings.values()}
        hits = {label: 0 for label in headings.values()}
        for r_index, row in enumerate(rows):
            for c_index, value in enumerate(row):
                text = clean_text(value).lower()
                if not text:
                    continue
                for needle, label in headings.items():
                    if needle in text:
                        hits[label] += 1
                        value_col = c_index + 1
                        for scan_row in rows[r_index + 1 : min(len(rows), r_index + 55)]:
                            if value_col < len(scan_row) and isinstance(scan_row[value_col], (int, float)):
                                totals[label] += float(scan_row[value_col])
        for label, amount in totals.items():
            global_totals[label] += amount
        sheet_summaries.append(
            {
                "sheet": sheet_name,
                "rowsRead": len(rows),
                "totals": {key: round(value) for key, value in totals.items() if value},
                "matches": {key: value for key, value in hits.items() if value},
            }
        )
    insights = [
        "El Excel esta organizado por anos y bloques mensuales, no como tabla transaccional.",
        "La app lo interpreta buscando secciones de ingresos, egresos, ahorro, deudas y vivienda.",
        "Para reportes confiables conviene migrar cada fila historica a movimientos normalizados.",
    ]
    return {
        "path": path,
        "sheets": sheet_summaries,
        "globalTotals": {key: round(value) for key, value in global_totals.items() if value},
        "insights": insights,
    }


def birthdays(conn: sqlite3.Connection, family_id: str) -> list[dict]:
    today = date.today()
    rows = conn.execute("SELECT * FROM birthdays WHERE family_id = ?", (family_id,)).fetchall()
    result = []
    for row in rows:
        born = date.fromisoformat(row["birth_date"])
        next_date = date(today.year, born.month, born.day)
        if next_date < today:
            next_date = date(today.year + 1, born.month, born.day)
        result.append(
            {
                **dict(row),
                "nextDate": next_date.isoformat(),
                "daysLeft": (next_date - today).days,
                "nextAge": next_date.year - born.year,
            }
        )
    return sorted(result, key=lambda item: item["daysLeft"])


class Handler(SimpleHTTPRequestHandler):
    def end_headers(self) -> None:
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "same-origin")
        self.send_header("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api/"):
            self.handle_api_get(parsed.path, parse_qs(parsed.query))
            return
        if parsed.path == "/":
            self.serve_file(STATIC_DIR / "index.html", "text/html; charset=utf-8")
            return
        target = (STATIC_DIR / parsed.path.lstrip("/")).resolve()
        if STATIC_DIR in target.parents and target.exists() and target.is_file():
            content_type = "text/plain"
            if target.suffix == ".css":
                content_type = "text/css; charset=utf-8"
            elif target.suffix == ".js":
                content_type = "application/javascript; charset=utf-8"
            elif target.suffix == ".svg":
                content_type = "image/svg+xml"
            self.serve_file(target, content_type)
            return
        self.send_error(404)

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        if not parsed.path.startswith("/api/"):
            self.send_error(404)
            return
        length = int(self.headers.get("Content-Length", "0"))
        payload = json.loads(self.rfile.read(length).decode("utf-8") or "{}")
        with connect() as conn:
            family_id = first_family_id(conn)
            if parsed.path == "/api/transactions":
                required = ["type", "date", "description", "amount", "categoryId", "memberId"]
                if any(key not in payload for key in required):
                    self.json_response({"error": "Campos incompletos"}, 400)
                    return
                conn.execute(
                    """
                    INSERT INTO transactions(id, family_id, member_id, category_id, type, date, description, amount, payment_method, recurring, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        new_id(),
                        family_id,
                        payload["memberId"],
                        payload["categoryId"],
                        payload["type"],
                        payload["date"],
                        payload["description"][:160],
                        float(payload["amount"]),
                        payload.get("paymentMethod", "Transferencia"),
                        1 if payload.get("recurring") else 0,
                        now_iso(),
                    ),
                )
                self.json_response({"ok": True})
                return
            if parsed.path == "/api/members":
                member_id = new_id()
                conn.execute(
                    """
                    INSERT INTO members(id, family_id, name, role, relationship, monthly_income, birth_date, active, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
                    """,
                    (
                        member_id,
                        family_id,
                        payload.get("name", "Nuevo integrante")[:80],
                        payload.get("role", "member"),
                        payload.get("relationship", ""),
                        float(payload.get("monthlyIncome", 0)),
                        payload.get("birthDate"),
                        now_iso(),
                    ),
                )
                self.json_response({"ok": True, "id": member_id})
                return
            if parsed.path == "/api/shared-expenses":
                total = float(payload.get("totalAmount", 0))
                shared_id = new_id()
                period = payload.get("period", date.today().strftime("%Y-%m"))
                conn.execute(
                    """
                    INSERT INTO shared_expenses(id, family_id, title, description, total_amount, period, status, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, 'sent', ?)
                    """,
                    (
                        shared_id,
                        family_id,
                        payload.get("title", "Gasto comun")[:120],
                        payload.get("description", ""),
                        total,
                        period,
                        now_iso(),
                    ),
                )
                create_payment_requests(conn, family_id, shared_id, total, period)
                self.json_response({"ok": True, "id": shared_id})
                return
            if parsed.path == "/api/shared-expenses/monthly-distribution":
                period = payload.get("period", date.today().strftime("%Y-%m"))
                base = monthly_distribution_base(conn, family_id, period)
                total = float(base["total"])
                if total <= 0:
                    self.json_response({"error": "No hay gastos del periodo para repartir"}, 400)
                    return
                shared_id = new_id()
                conn.execute(
                    """
                    INSERT INTO shared_expenses(id, family_id, title, description, total_amount, period, status, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, 'sent', ?)
                    """,
                    (
                        shared_id,
                        family_id,
                        payload.get("title", f"Distribucion familiar {period}")[:120],
                        "Gastos reales del mes, fijos, suscripciones y compromisos de deuda activos",
                        total,
                        period,
                        now_iso(),
                    ),
                )
                create_payment_requests(conn, family_id, shared_id, total, period)
                self.json_response({"ok": True, "id": shared_id, "base": base})
                return
            if parsed.path == "/api/birthdays":
                birthday_id = new_id()
                conn.execute(
                    """
                    INSERT INTO birthdays(id, family_id, member_id, name, birth_date, relationship, gift_budget, reminder_days)
                    VALUES (?, ?, NULL, ?, ?, ?, ?, ?)
                    """,
                    (
                        birthday_id,
                        family_id,
                        payload.get("name", "")[:80],
                        payload.get("birthDate"),
                        payload.get("relationship", "")[:80],
                        float(payload.get("giftBudget", 0)),
                        int(payload.get("reminderDays", 7)),
                    ),
                )
                self.json_response({"ok": True, "id": birthday_id})
                return
            if parsed.path == "/api/recurring":
                item_id = new_id()
                kind = payload.get("kind", "fixed")
                if kind not in {"fixed", "subscription"}:
                    self.json_response({"error": "Tipo recurrente invalido"}, 400)
                    return
                conn.execute(
                    """
                    INSERT INTO recurring_items(id, family_id, member_id, category_id, kind, name, amount, due_day, payment_method, usage_level, active, notes, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        item_id,
                        family_id,
                        payload.get("memberId") or None,
                        payload.get("categoryId") or None,
                        kind,
                        payload.get("name", "")[:120],
                        float(payload.get("amount", 0)),
                        int(payload.get("dueDay", 1)),
                        payload.get("paymentMethod", "")[:80],
                        payload.get("usageLevel", "")[:40],
                        1 if payload.get("active", True) else 0,
                        payload.get("notes", "")[:240],
                        now_iso(),
                    ),
                )
                self.json_response({"ok": True, "id": item_id})
                return
            if parsed.path == "/api/debts":
                debt_id = new_id()
                kind = payload.get("kind", "consumer_credit")
                if kind not in {"consumer_credit", "mortgage", "compensation_fund", "commercial_store", "credit_card", "other"}:
                    self.json_response({"error": "Tipo de deuda invalido"}, 400)
                    return
                conn.execute(
                    """
                    INSERT INTO debts(id, family_id, member_id, kind, institution, name, original_amount, balance, monthly_payment,
                                      interest_rate, due_day, end_date, active, notes, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        debt_id,
                        family_id,
                        payload.get("memberId") or None,
                        kind,
                        payload.get("institution", "")[:120],
                        payload.get("name", "")[:120],
                        float(payload.get("originalAmount", 0)),
                        float(payload.get("balance", 0)),
                        float(payload.get("monthlyPayment", 0)),
                        float(payload.get("interestRate", 0)),
                        int(payload.get("dueDay", 1)),
                        payload.get("endDate") or None,
                        1 if payload.get("active", True) else 0,
                        payload.get("notes", "")[:240],
                        now_iso(),
                    ),
                )
                self.json_response({"ok": True, "id": debt_id})
                return
            if parsed.path == "/api/goals":
                goal_id = new_id()
                conn.execute(
                    """
                    INSERT INTO savings_goals(id, family_id, name, type, target_amount, current_amount, target_date)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        goal_id,
                        family_id,
                        payload.get("name", "")[:120],
                        payload.get("type", "emergencia")[:80],
                        float(payload.get("targetAmount", 0)),
                        float(payload.get("currentAmount", 0)),
                        payload.get("targetDate") or None,
                    ),
                )
                self.json_response({"ok": True, "id": goal_id})
                return
            if parsed.path == "/api/emergencies":
                event_id = new_id()
                conn.execute(
                    """
                    INSERT INTO emergency_events(id, family_id, member_id, title, area, amount, priority, status, target_date, notes, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        event_id,
                        family_id,
                        payload.get("memberId") or None,
                        payload.get("title", "")[:120],
                        payload.get("area", "seguridad")[:80],
                        float(payload.get("amount", 0)),
                        payload.get("priority", "media")[:20],
                        payload.get("status", "planificado")[:30],
                        payload.get("targetDate") or None,
                        payload.get("notes", "")[:240],
                        now_iso(),
                    ),
                )
                self.json_response({"ok": True, "id": event_id})
                return
        self.send_error(404)

    def do_PATCH(self) -> None:
        parsed = urlparse(self.path)
        length = int(self.headers.get("Content-Length", "0"))
        payload = json.loads(self.rfile.read(length).decode("utf-8") or "{}")
        with connect() as conn:
            family_id = first_family_id(conn)
            if parsed.path.startswith("/api/members/"):
                member_id = parsed.path.rsplit("/", 1)[-1]
                role = payload.get("role", "member")
                if role not in {"admin", "member", "guest"}:
                    self.json_response({"error": "Rol invalido"}, 400)
                    return
                conn.execute(
                    """
                    UPDATE members
                    SET name = ?, role = ?, relationship = ?, monthly_income = ?, birth_date = ?, active = ?
                    WHERE id = ? AND family_id = ?
                    """,
                    (
                        payload.get("name", "")[:80],
                        role,
                        payload.get("relationship", "")[:80],
                        float(payload.get("monthlyIncome", 0)),
                        payload.get("birthDate") or None,
                        1 if payload.get("active", True) else 0,
                        member_id,
                        family_id,
                    ),
                )
                self.json_response({"ok": True})
                return
            if parsed.path.startswith("/api/transactions/"):
                tx_id = parsed.path.rsplit("/", 1)[-1]
                tx_type = payload.get("type", "expense")
                if tx_type not in {"income", "expense", "saving", "debt_payment", "emergency"}:
                    self.json_response({"error": "Tipo invalido"}, 400)
                    return
                conn.execute(
                    """
                    UPDATE transactions
                    SET member_id = ?, category_id = ?, type = ?, date = ?, description = ?, amount = ?, payment_method = ?, recurring = ?
                    WHERE id = ? AND family_id = ?
                    """,
                    (
                        payload.get("memberId"),
                        payload.get("categoryId"),
                        tx_type,
                        payload.get("date"),
                        payload.get("description", "")[:160],
                        float(payload.get("amount", 0)),
                        payload.get("paymentMethod", "Transferencia")[:80],
                        1 if payload.get("recurring") else 0,
                        tx_id,
                        family_id,
                    ),
                )
                self.json_response({"ok": True})
                return
            if parsed.path.startswith("/api/birthdays/"):
                birthday_id = parsed.path.rsplit("/", 1)[-1]
                conn.execute(
                    """
                    UPDATE birthdays
                    SET name = ?, birth_date = ?, relationship = ?, gift_budget = ?, reminder_days = ?
                    WHERE id = ? AND family_id = ?
                    """,
                    (
                        payload.get("name", "")[:80],
                        payload.get("birthDate"),
                        payload.get("relationship", "")[:80],
                        float(payload.get("giftBudget", 0)),
                        int(payload.get("reminderDays", 7)),
                        birthday_id,
                        family_id,
                    ),
                )
                self.json_response({"ok": True})
                return
            if parsed.path.startswith("/api/payment-requests/"):
                request_id = parsed.path.rsplit("/", 1)[-1]
                status = payload.get("status", "pending")
                if status not in {"pending", "sent", "paid", "overdue", "cancelled"}:
                    self.json_response({"error": "Estado invalido"}, 400)
                    return
                conn.execute(
                    """
                    UPDATE payment_requests
                    SET status = ?
                    WHERE id = ? AND member_id IN (SELECT id FROM members WHERE family_id = ?)
                    """,
                    (status, request_id, family_id),
                )
                self.json_response({"ok": True})
                return
            if parsed.path.startswith("/api/recurring/"):
                item_id = parsed.path.rsplit("/", 1)[-1]
                kind = payload.get("kind", "fixed")
                if kind not in {"fixed", "subscription"}:
                    self.json_response({"error": "Tipo recurrente invalido"}, 400)
                    return
                conn.execute(
                    """
                    UPDATE recurring_items
                    SET member_id = ?, category_id = ?, kind = ?, name = ?, amount = ?, due_day = ?,
                        payment_method = ?, usage_level = ?, active = ?, notes = ?
                    WHERE id = ? AND family_id = ?
                    """,
                    (
                        payload.get("memberId") or None,
                        payload.get("categoryId") or None,
                        kind,
                        payload.get("name", "")[:120],
                        float(payload.get("amount", 0)),
                        int(payload.get("dueDay", 1)),
                        payload.get("paymentMethod", "")[:80],
                        payload.get("usageLevel", "")[:40],
                        1 if payload.get("active", True) else 0,
                        payload.get("notes", "")[:240],
                        item_id,
                        family_id,
                    ),
                )
                self.json_response({"ok": True})
                return
            if parsed.path.startswith("/api/debts/"):
                debt_id = parsed.path.rsplit("/", 1)[-1]
                kind = payload.get("kind", "consumer_credit")
                if kind not in {"consumer_credit", "mortgage", "compensation_fund", "commercial_store", "credit_card", "other"}:
                    self.json_response({"error": "Tipo de deuda invalido"}, 400)
                    return
                conn.execute(
                    """
                    UPDATE debts
                    SET member_id = ?, kind = ?, institution = ?, name = ?, original_amount = ?, balance = ?,
                        monthly_payment = ?, interest_rate = ?, due_day = ?, end_date = ?, active = ?, notes = ?
                    WHERE id = ? AND family_id = ?
                    """,
                    (
                        payload.get("memberId") or None,
                        kind,
                        payload.get("institution", "")[:120],
                        payload.get("name", "")[:120],
                        float(payload.get("originalAmount", 0)),
                        float(payload.get("balance", 0)),
                        float(payload.get("monthlyPayment", 0)),
                        float(payload.get("interestRate", 0)),
                        int(payload.get("dueDay", 1)),
                        payload.get("endDate") or None,
                        1 if payload.get("active", True) else 0,
                        payload.get("notes", "")[:240],
                        debt_id,
                        family_id,
                    ),
                )
                self.json_response({"ok": True})
                return
            if parsed.path.startswith("/api/goals/"):
                goal_id = parsed.path.rsplit("/", 1)[-1]
                conn.execute(
                    """
                    UPDATE savings_goals
                    SET name = ?, type = ?, target_amount = ?, current_amount = ?, target_date = ?
                    WHERE id = ? AND family_id = ?
                    """,
                    (
                        payload.get("name", "")[:120],
                        payload.get("type", "emergencia")[:80],
                        float(payload.get("targetAmount", 0)),
                        float(payload.get("currentAmount", 0)),
                        payload.get("targetDate") or None,
                        goal_id,
                        family_id,
                    ),
                )
                self.json_response({"ok": True})
                return
            if parsed.path.startswith("/api/emergencies/"):
                event_id = parsed.path.rsplit("/", 1)[-1]
                conn.execute(
                    """
                    UPDATE emergency_events
                    SET member_id = ?, title = ?, area = ?, amount = ?, priority = ?, status = ?, target_date = ?, notes = ?
                    WHERE id = ? AND family_id = ?
                    """,
                    (
                        payload.get("memberId") or None,
                        payload.get("title", "")[:120],
                        payload.get("area", "seguridad")[:80],
                        float(payload.get("amount", 0)),
                        payload.get("priority", "media")[:20],
                        payload.get("status", "planificado")[:30],
                        payload.get("targetDate") or None,
                        payload.get("notes", "")[:240],
                        event_id,
                        family_id,
                    ),
                )
                self.json_response({"ok": True})
                return
        self.send_error(404)

    def do_DELETE(self) -> None:
        parsed = urlparse(self.path)
        with connect() as conn:
            family_id = first_family_id(conn)
            if parsed.path.startswith("/api/members/"):
                member_id = parsed.path.rsplit("/", 1)[-1]
                conn.execute("UPDATE transactions SET member_id = NULL WHERE member_id = ?", (member_id,))
                conn.execute("UPDATE birthdays SET member_id = NULL WHERE member_id = ?", (member_id,))
                conn.execute("DELETE FROM payment_requests WHERE member_id = ?", (member_id,))
                conn.execute("DELETE FROM members WHERE id = ? AND family_id = ?", (member_id, family_id))
                self.json_response({"ok": True})
                return
            if parsed.path.startswith("/api/transactions/"):
                tx_id = parsed.path.rsplit("/", 1)[-1]
                conn.execute("DELETE FROM transactions WHERE id = ? AND family_id = ?", (tx_id, family_id))
                self.json_response({"ok": True})
                return
            if parsed.path.startswith("/api/birthdays/"):
                birthday_id = parsed.path.rsplit("/", 1)[-1]
                conn.execute("DELETE FROM birthdays WHERE id = ? AND family_id = ?", (birthday_id, family_id))
                self.json_response({"ok": True})
                return
            if parsed.path.startswith("/api/recurring/"):
                item_id = parsed.path.rsplit("/", 1)[-1]
                conn.execute("DELETE FROM recurring_items WHERE id = ? AND family_id = ?", (item_id, family_id))
                self.json_response({"ok": True})
                return
            if parsed.path.startswith("/api/debts/"):
                debt_id = parsed.path.rsplit("/", 1)[-1]
                conn.execute("DELETE FROM debts WHERE id = ? AND family_id = ?", (debt_id, family_id))
                self.json_response({"ok": True})
                return
            if parsed.path.startswith("/api/goals/"):
                goal_id = parsed.path.rsplit("/", 1)[-1]
                conn.execute("DELETE FROM savings_goals WHERE id = ? AND family_id = ?", (goal_id, family_id))
                self.json_response({"ok": True})
                return
            if parsed.path.startswith("/api/emergencies/"):
                event_id = parsed.path.rsplit("/", 1)[-1]
                conn.execute("DELETE FROM emergency_events WHERE id = ? AND family_id = ?", (event_id, family_id))
                self.json_response({"ok": True})
                return
        self.send_error(404)

    def handle_api_get(self, path: str, query: dict) -> None:
        with connect() as conn:
            family_id = first_family_id(conn)
            if path == "/api/dashboard":
                self.json_response(dashboard(conn))
                return
            if path == "/api/strategies":
                self.json_response(economic_strategies(conn))
                return
            if path == "/api/excel-summary":
                requested = query.get("path", [DEFAULT_EXCEL_PATH])[0] or DEFAULT_EXCEL_PATH
                try:
                    self.json_response(excel_summary(requested))
                except Exception as exc:
                    self.json_response({"error": str(exc), "path": requested}, 400)
                return
            if path == "/api/members":
                self.json_response(row_dicts(conn.execute("SELECT * FROM members WHERE family_id = ? ORDER BY name", (family_id,)).fetchall()))
                return
            if path == "/api/categories":
                self.json_response(row_dicts(conn.execute("SELECT * FROM categories WHERE family_id = ? ORDER BY type, name", (family_id,)).fetchall()))
                return
            if path == "/api/transactions":
                self.json_response(
                    row_dicts(
                        conn.execute(
                            """
                            SELECT t.*, m.name AS member_name, c.name AS category_name, c.color AS category_color
                            FROM transactions t
                            LEFT JOIN members m ON m.id = t.member_id
                            LEFT JOIN categories c ON c.id = t.category_id
                            WHERE t.family_id = ?
                            ORDER BY t.date DESC, t.created_at DESC
                            LIMIT 80
                            """,
                            (family_id,),
                        ).fetchall()
                    )
                )
                return
            if path == "/api/birthdays":
                self.json_response(birthdays(conn, family_id))
                return
            if path == "/api/payment-requests":
                requests = row_dicts(
                    conn.execute(
                        """
                        SELECT pr.*, m.name AS member_name, se.title AS shared_expense_title, se.total_amount, se.period
                        FROM payment_requests pr
                        JOIN members m ON m.id = pr.member_id
                        JOIN shared_expenses se ON se.id = pr.shared_expense_id
                        ORDER BY pr.created_at DESC
                        """
                    ).fetchall()
                )
                for item in requests:
                    item["message"] = request_message(
                        item["member_name"],
                        float(item["amount"]),
                        float(item["income_share"]),
                        float(item["total_amount"]),
                        item["period"],
                        item["shared_expense_title"],
                    )
                self.json_response(requests)
                return
            if path == "/api/recurring":
                self.json_response(
                    row_dicts(
                        conn.execute(
                            """
                            SELECT ri.*, m.name AS member_name, c.name AS category_name, c.color AS category_color
                            FROM recurring_items ri
                            LEFT JOIN members m ON m.id = ri.member_id
                            LEFT JOIN categories c ON c.id = ri.category_id
                            WHERE ri.family_id = ?
                            ORDER BY ri.active DESC, ri.kind, ri.due_day, ri.name
                            """,
                            (family_id,),
                        ).fetchall()
                    )
                )
                return
            if path == "/api/income-basis":
                period = query.get("period", [date.today().strftime("%Y-%m")])[0]
                self.json_response({"period": period, "members": member_income_basis(conn, family_id, period)})
                return
            if path == "/api/expense-distribution":
                period = query.get("period", [date.today().strftime("%Y-%m")])[0]
                self.json_response(latest_distribution(conn, family_id, period))
                return
            if path == "/api/debts":
                self.json_response(
                    row_dicts(
                        conn.execute(
                            """
                            SELECT d.*, m.name AS member_name
                            FROM debts d
                            LEFT JOIN members m ON m.id = d.member_id
                            WHERE d.family_id = ?
                            ORDER BY d.active DESC, d.kind, d.due_day, d.institution
                            """,
                            (family_id,),
                        ).fetchall()
                    )
                )
                return
            if path == "/api/goals":
                self.json_response(
                    row_dicts(
                        conn.execute(
                            "SELECT * FROM savings_goals WHERE family_id = ? ORDER BY target_date IS NULL, target_date, name",
                            (family_id,),
                        ).fetchall()
                    )
                )
                return
            if path == "/api/emergencies":
                self.json_response(
                    row_dicts(
                        conn.execute(
                            """
                            SELECT e.*, m.name AS member_name
                            FROM emergency_events e
                            LEFT JOIN members m ON m.id = e.member_id
                            WHERE e.family_id = ?
                            ORDER BY CASE e.priority WHEN 'alta' THEN 0 WHEN 'media' THEN 1 ELSE 2 END, e.target_date IS NULL, e.target_date
                            """,
                            (family_id,),
                        ).fetchall()
                    )
                )
                return
        self.send_error(404)

    def serve_file(self, path: Path, content_type: str) -> None:
        data = path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def json_response(self, payload: object, status: int = 200) -> None:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)


if __name__ == "__main__":
    setup_database()
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"Finanzas Familiares Inteligentes: http://{HOST}:{PORT}")
    server.serve_forever()
