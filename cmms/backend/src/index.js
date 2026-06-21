import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { randomUUID } from 'crypto';

const app = express();
const port = Number(process.env.PORT || 3000);
const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://ai-service:8000';

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(compression());
app.use(cors({ origin: process.env.FRONTEND_URL || true, credentials: true }));
app.use(express.json({ limit: '25mb' }));
app.use(morgan('combined'));
app.use('/api', (_req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

const nowIso = () => new Date().toISOString();

const assets = [
  {
    id: 'pump-01',
    code: 'BOM-01',
    name: 'Bomba centrifuga linea 2',
    area: 'Sala de bombas',
    criticality: 'Alta',
  },
  {
    id: 'compressor-03',
    code: 'CMP-03',
    name: 'Compresor de aire principal',
    area: 'Utilidades',
    criticality: 'Media',
  },
];

const checklistTemplates = [
  {
    id: 'chk-pump-01',
    assetId: 'pump-01',
    name: 'Inspeccion diaria bomba centrifuga',
    items: [
      {
        id: 'pump-guard',
        title: 'Proteccion de acoplamiento instalada',
        visualCondition: 'Debe observarse guarda mecanica instalada y cerrada.',
        expectedLabels: ['guard', 'coupling-cover'],
        severity: 'Critica',
      },
      {
        id: 'pump-leak',
        title: 'Sin fuga visible en sello mecanico',
        visualCondition: 'No deben observarse manchas, goteo ni acumulacion de fluido.',
        expectedLabels: ['dry-seal', 'no-leak'],
        anomalyLabels: ['leak', 'spill'],
        severity: 'Alta',
      },
      {
        id: 'pump-gauge',
        title: 'Manometro visible y en rango operacional',
        visualCondition: 'Debe observarse manometro legible dentro del rango seguro.',
        expectedLabels: ['pressure-gauge', 'safe-range'],
        severity: 'Media',
      },
    ],
  },
  {
    id: 'chk-compressor-03',
    assetId: 'compressor-03',
    name: 'Inspeccion semanal compresor',
    items: [
      {
        id: 'compressor-panel',
        title: 'Panel electrico cerrado',
        visualCondition: 'La puerta del tablero debe estar cerrada y sin danos visibles.',
        expectedLabels: ['closed-panel'],
        anomalyLabels: ['open-panel'],
        severity: 'Alta',
      },
      {
        id: 'compressor-filter',
        title: 'Filtro de aire sin saturacion visible',
        visualCondition: 'El filtro debe verse limpio, instalado y sin obstruccion evidente.',
        expectedLabels: ['clean-filter'],
        anomalyLabels: ['dirty-filter'],
        severity: 'Media',
      },
    ],
  },
];

const inspections = [];

const findChecklist = (id) => checklistTemplates.find((checklist) => checklist.id === id);

const normalizeItemResult = (item, incoming = {}) => ({
  itemId: item.id,
  status: incoming.status || 'pending',
  comment: incoming.comment || '',
  evidence: incoming.evidence || null,
  visualCondition: item.visualCondition,
  expectedLabels: item.expectedLabels || [],
  anomalyLabels: item.anomalyLabels || [],
  ai: incoming.ai || null,
});

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'cmms-backend',
    databaseUrlConfigured: Boolean(process.env.DATABASE_URL),
    mqttBrokerConfigured: Boolean(process.env.MQTT_BROKER_URL),
    minioConfigured: Boolean(process.env.MINIO_ENDPOINT),
    aiServiceUrl,
  });
});

app.get('/api/assets', (_req, res) => {
  res.json(assets);
});

app.get('/api/assets/:assetId/checklists', (req, res) => {
  res.json(checklistTemplates.filter((checklist) => checklist.assetId === req.params.assetId));
});

app.get('/api/checklists/:checklistId', (req, res) => {
  const checklist = findChecklist(req.params.checklistId);

  if (!checklist) {
    res.status(404).json({ error: 'Checklist not found' });
    return;
  }

  res.json(checklist);
});

app.post('/api/checklists', (req, res) => {
  const { assetId, name, items = [] } = req.body;

  if (!assetId || !name || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'assetId, name and at least one item are required' });
    return;
  }

  const checklist = {
    id: randomUUID(),
    assetId,
    name,
    items: items.map((item) => ({
      id: randomUUID(),
      title: item.title,
      visualCondition: item.visualCondition || '',
      expectedLabels: item.expectedLabels || [],
      anomalyLabels: item.anomalyLabels || [],
      severity: item.severity || 'Media',
    })),
  };

  checklistTemplates.push(checklist);
  res.status(201).json(checklist);
});

app.post('/api/ai/inspect', async (req, res) => {
  const { item, image } = req.body;

  if (!item || !image) {
    res.status(400).json({ error: 'item and image are required' });
    return;
  }

  try {
    const response = await fetch(`${aiServiceUrl}/inspect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item, image }),
    });

    if (!response.ok) {
      throw new Error(`AI service responded ${response.status}`);
    }

    res.json(await response.json());
  } catch (error) {
    res.status(502).json({
      error: 'AI inspection failed',
      detail: error.message,
    });
  }
});

app.post('/api/inspections', (req, res) => {
  const { assetId, checklistId, responsible, results = [] } = req.body;
  const asset = assets.find((candidate) => candidate.id === assetId);
  const checklist = findChecklist(checklistId);

  if (!asset || !checklist || !responsible) {
    res.status(400).json({ error: 'assetId, checklistId and responsible are required' });
    return;
  }

  const normalizedResults = checklist.items.map((item) => {
    const incoming = results.find((result) => result.itemId === item.id);
    return normalizeItemResult(item, incoming);
  });

  const counters = normalizedResults.reduce(
    (acc, result) => {
      acc[result.status] = (acc[result.status] || 0) + 1;
      return acc;
    },
    { pass: 0, fail: 0, review: 0, pending: 0 },
  );

  const inspection = {
    id: randomUUID(),
    assetId,
    assetName: asset.name,
    checklistId,
    checklistName: checklist.name,
    responsible,
    startedAt: req.body.startedAt || nowIso(),
    finishedAt: nowIso(),
    counters,
    alertCount: counters.fail + counters.review,
    results: normalizedResults,
  };

  inspections.unshift(inspection);
  res.status(201).json(inspection);
});

app.get('/api/inspections', (_req, res) => {
  res.json(inspections);
});

app.get('/api/inspections/:inspectionId/report', (req, res) => {
  const inspection = inspections.find((candidate) => candidate.id === req.params.inspectionId);

  if (!inspection) {
    res.status(404).json({ error: 'Inspection not found' });
    return;
  }

  res.json({
    ...inspection,
    generatedAt: nowIso(),
    summary: `${inspection.counters.pass} cumple, ${inspection.counters.fail} no cumple, ${inspection.counters.review} requiere revision.`,
  });
});

app.get('/api', (_req, res) => {
  res.json({
    name: 'CMMS API',
    status: 'running',
    endpoints: ['/api/assets', '/api/checklists/:id', '/api/ai/inspect', '/api/inspections'],
  });
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`CMMS backend listening on ${port}`);
});
