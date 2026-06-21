import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed...');

  const hashedPassword = await bcryptjs.hash('admin123', 12);
  const supervisorPassword = await bcryptjs.hash('supervisor123', 12);
  const tecnicoPassword = await bcryptjs.hash('tecnico123', 12);

  const company = await prisma.company.upsert({
    where: { id: 'company-01' },
    update: {},
    create: {
      id: 'company-01',
      name: 'CMMS Industrial S.A.',
      address: 'Av. Industrial 1234, Santiago',
      phone: '+56 2 2555 1234',
      email: 'contacto@cmmsindustrial.cl',
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@cmms.cl' },
    update: {},
    create: {
      name: 'Admin Sistema',
      email: 'admin@cmms.cl',
      password: hashedPassword,
      role: 'ADMIN',
      companyId: company.id,
    },
  });

  const supervisor = await prisma.user.upsert({
    where: { email: 'supervisor@cmms.cl' },
    update: {},
    create: {
      name: 'Carlos Supervisor',
      email: 'supervisor@cmms.cl',
      password: supervisorPassword,
      role: 'SUPERVISOR',
      companyId: company.id,
    },
  });

  const tecnico = await prisma.user.upsert({
    where: { email: 'tecnico@cmms.cl' },
    update: {},
    create: {
      name: 'Pedro Técnico',
      email: 'tecnico@cmms.cl',
      password: tecnicoPassword,
      role: 'TECNICO',
      companyId: company.id,
    },
  });

  console.log('Usuarios creados');

  const plant1 = await prisma.plant.upsert({
    where: { code: 'PLT-001' },
    update: {},
    create: {
      id: 'plant-001',
      name: 'Planta Principal Santiago',
      code: 'PLT-001',
      location: 'Santiago, Chile',
      timezone: 'America/Santiago',
      companyId: company.id,
    },
  });

  const plant2 = await prisma.plant.upsert({
    where: { code: 'PLT-002' },
    update: {},
    create: {
      id: 'plant-002',
      name: 'Planta Valparaíso',
      code: 'PLT-002',
      location: 'Valparaíso, Chile',
      timezone: 'America/Santiago',
      companyId: company.id,
    },
  });

  console.log('Plantas creadas');

  const area1 = await prisma.area.create({
    data: {
      id: 'area-001',
      name: 'Sala de Bombas',
      code: 'AREA-BOM',
      description: 'Área de bombas centrífugas y dosificadoras',
      plantId: plant1.id,
    },
  });

  const area2 = await prisma.area.create({
    data: {
      id: 'area-002',
      name: 'Utilidades',
      code: 'AREA-UTL',
      description: 'Compresores, calderas y sistemas auxiliares',
      plantId: plant1.id,
    },
  });

  const area3 = await prisma.area.create({
    data: {
      id: 'area-003',
      name: 'Línea de Producción 1',
      code: 'AREA-LP1',
      description: 'Línea de producción principal',
      plantId: plant2.id,
    },
  });

  console.log('Áreas creadas');

  const assetsData = [
    { id: 'asset-001', name: 'Bomba Centrífuga Linea 2', code: 'BOM-001', category: 'BOMBA', brand: 'Grundfos', model: 'CR 32-3', serialNumber: 'GR-2024-001', areaId: area1.id, plantId: plant1.id, status: 'OPERATIONAL', installDate: new Date('2023-06-15'), usefulLife: 120 },
    { id: 'asset-002', name: 'Bomba Dosificadora Ácido', code: 'BOM-002', category: 'BOMBA', model: 'Milton Roy XR-5', serialNumber: 'MR-2024-002', areaId: area1.id, plantId: plant1.id, status: 'OPERATIONAL', installDate: new Date('2023-08-20'), usefulLife: 96 },
    { id: 'asset-003', name: 'Compresor Aire Principal', code: 'CMP-001', category: 'COMPRESOR', brand: 'Atlas Copco', model: 'GA 75 VSD', serialNumber: 'AC-2023-015', areaId: area2.id, plantId: plant1.id, status: 'OPERATIONAL', installDate: new Date('2023-03-10'), usefulLife: 180 },
    { id: 'asset-004', name: 'Compresor Aire Secundario', code: 'CMP-002', category: 'COMPRESOR', brand: 'Sullair', model: 'LS-25', serialNumber: 'SL-2024-008', areaId: area2.id, plantId: plant1.id, status: 'UNDER_MAINTENANCE', installDate: new Date('2024-01-05'), usefulLife: 180 },
    { id: 'asset-005', name: 'Motor Eléctrico Principal 500HP', code: 'MTR-001', category: 'MOTOR', brand: 'WEG', model: 'W22 500HP', serialNumber: 'WEG-2023-042', areaId: area3.id, plantId: plant2.id, status: 'OPERATIONAL', installDate: new Date('2022-11-20'), usefulLife: 240 },
    { id: 'asset-006', name: 'Motor Eléctrico Auxiliar 100HP', code: 'MTR-002', category: 'MOTOR', brand: 'Siemens', model: '1LE1003', serialNumber: 'SIE-2024-011', areaId: area3.id, plantId: plant2.id, status: 'OPERATIONAL', installDate: new Date('2024-04-15'), usefulLife: 240 },
    { id: 'asset-007', name: 'Transformador Principal 15MVA', code: 'TRF-001', category: 'TRANSFORMADOR', brand: 'ABB', model: '15MVA 23/6.9kV', serialNumber: 'ABB-2022-001', areaId: area2.id, plantId: plant1.id, status: 'OPERATIONAL', installDate: new Date('2022-06-01'), usefulLife: 360 },
    { id: 'asset-008', name: 'Caldera Vapor 1000kg/h', code: 'CLD-001', category: 'CALDERA', brand: 'Cleaver-Brooks', model: 'CB-1000', serialNumber: 'CB-2023-007', areaId: area2.id, plantId: plant1.id, status: 'OUT_OF_SERVICE', installDate: new Date('2023-01-20'), usefulLife: 180 },
  ];

  for (const asset of assetsData) {
    await prisma.asset.upsert({
      where: { code: asset.code },
      update: {},
      create: asset,
    });
  }

  console.log('Activos creados');

  const sensorsData = [
    { id: 'sensor-001', name: 'Temp Descarga Bomba 1', code: 'TEMP-BOM-001', type: 'TEMPERATURE', unit: '°C', mqttTopic: 'cmms/sensors/TEMP-BOM-001', assetId: 'asset-001', isActive: true, lastValue: 72.5, lastValueAt: new Date() },
    { id: 'sensor-002', name: 'Presión Salida Bomba 1', code: 'PRES-BOM-001', type: 'PRESSURE', unit: 'bar', mqttTopic: 'cmms/sensors/PRES-BOM-001', assetId: 'asset-001', isActive: true, lastValue: 6.2, lastValueAt: new Date() },
    { id: 'sensor-003', name: 'Vibración Bomba 1', code: 'VIB-BOM-001', type: 'VIBRATION', unit: 'mm/s', mqttTopic: 'cmms/sensors/VIB-BOM-001', assetId: 'asset-001', isActive: true, lastValue: 4.8, lastValueAt: new Date() },
    { id: 'sensor-004', name: 'Caudal Bomba 1', code: 'FLOW-BOM-001', type: 'FLOW', unit: 'm³/h', mqttTopic: 'cmms/sensors/FLOW-BOM-001', assetId: 'asset-001', isActive: true, lastValue: 45.2, lastValueAt: new Date() },
    { id: 'sensor-005', name: 'Temp Descarga Compresor', code: 'TEMP-CMP-001', type: 'TEMPERATURE', unit: '°C', mqttTopic: 'cmms/sensors/TEMP-CMP-001', assetId: 'asset-003', isActive: true, lastValue: 95.8, lastValueAt: new Date() },
    { id: 'sensor-006', name: 'Presión Aire Compresor', code: 'PRES-CMP-001', type: 'PRESSURE', unit: 'bar', mqttTopic: 'cmms/sensors/PRES-CMP-001', assetId: 'asset-003', isActive: true, lastValue: 7.5, lastValueAt: new Date() },
    { id: 'sensor-007', name: 'Corriente Motor Principal', code: 'CURR-MTR-001', type: 'CURRENT', unit: 'A', mqttTopic: 'cmms/sensors/CURR-MTR-001', assetId: 'asset-005', isActive: true, lastValue: 580, lastValueAt: new Date() },
    { id: 'sensor-008', name: 'Temp Motor Principal', code: 'TEMP-MTR-001', type: 'TEMPERATURE', unit: '°C', mqttTopic: 'cmms/sensors/TEMP-MTR-001', assetId: 'asset-005', isActive: true, lastValue: 65.3, lastValueAt: new Date() },
    { id: 'sensor-009', name: 'Nivel Estanque Agua', code: 'LVL-TNK-001', type: 'LEVEL', unit: '%', mqttTopic: 'cmms/sensors/LVL-TNK-001', isActive: true, lastValue: 78, lastValueAt: new Date() },
  ];

  for (const sensor of sensorsData) {
    await prisma.sensor.upsert({
      where: { code: sensor.code },
      update: {},
      create: sensor,
    });
  }

  console.log('Sensores creados');

  const now = new Date();
  const readingsData = [];
  for (const sensor of sensorsData) {
    for (let i = 0; i < 20; i++) {
      const timestamp = new Date(now.getTime() - i * 3600000);
      let value;
      switch (sensor.type) {
        case 'TEMPERATURE': value = 60 + Math.random() * 40; break;
        case 'PRESSURE': value = 4 + Math.random() * 5; break;
        case 'VIBRATION': value = 1 + Math.random() * 6; break;
        case 'FLOW': value = 30 + Math.random() * 25; break;
        case 'CURRENT': value = 400 + Math.random() * 250; break;
        case 'LEVEL': value = 40 + Math.random() * 55; break;
        default: value = Math.random() * 100;
      }
      readingsData.push({
        id: `reading-${sensor.id}-${i}`,
        value: parseFloat(value.toFixed(1)),
        timestamp,
        sensorId: sensor.id,
      });
    }
  }

  for (const reading of readingsData) {
    await prisma.sensorReading.upsert({
      where: { id: reading.id },
      update: {},
      create: reading,
    });
  }

  console.log('Lecturas históricas creadas');

  const alertConfigs = [
    { id: 'ac-001', name: 'Alta Temperatura Bomba', sensorId: 'sensor-001', severity: 'HIGH', condition: 'GT', threshold: 85, cooldownMin: 30, notifyApp: true, notifyEmail: true },
    { id: 'ac-002', name: 'Alta Presión Bomba', sensorId: 'sensor-002', severity: 'HIGH', condition: 'GT', threshold: 8, cooldownMin: 30, notifyApp: true },
    { id: 'ac-003', name: 'Vibración Excesiva', sensorId: 'sensor-003', severity: 'MEDIUM', condition: 'GT', threshold: 7, cooldownMin: 60, notifyApp: true, notifyWhatsApp: true },
    { id: 'ac-004', name: 'Bajo Caudal', sensorId: 'sensor-004', severity: 'MEDIUM', condition: 'LT', threshold: 20, cooldownMin: 60, notifyApp: true },
    { id: 'ac-005', name: 'Alta Temperatura Compresor', sensorId: 'sensor-005', severity: 'CRITICAL', condition: 'GT', threshold: 100, cooldownMin: 15, notifyApp: true, notifyEmail: true, notifyTelegram: true },
    { id: 'ac-006', name: 'Sobrecorriente Motor', sensorId: 'sensor-007', severity: 'CRITICAL', condition: 'GT', threshold: 650, cooldownMin: 10, notifyApp: true, notifyWhatsApp: true, notifyTelegram: true },
  ];

  for (const config of alertConfigs) {
    await prisma.alertConfig.upsert({
      where: { id: config.id },
      update: {},
      create: config,
    });
  }

  console.log('Configuraciones de alerta creadas');

  const checklist = await prisma.checklist.create({
    data: {
      id: 'cl-001',
      name: 'Inspección Diaria Bomba Centrífuga',
      description: 'Lista de verificación para inspección diaria de bombas centrífugas',
      category: 'DIARIA',
      items: {
        create: [
          { id: 'cli-001', label: 'Protección de acoplamiento instalada', type: 'boolean', required: true, orderIndex: 0 },
          { id: 'cli-002', label: 'Sin fuga visible en sello mecánico', type: 'boolean', required: true, orderIndex: 1 },
          { id: 'cli-003', label: 'Manómetro visible y en rango operacional', type: 'boolean', required: true, orderIndex: 2 },
          { id: 'cli-004', label: 'Nivel de aceite correcto', type: 'boolean', required: true, orderIndex: 3 },
          { id: 'cli-005', label: 'Temperatura de rodamientos normal', type: 'text', required: false, orderIndex: 4 },
          { id: 'cli-006', label: 'Ruido anormal en operación', type: 'boolean', required: true, orderIndex: 5 },
          { id: 'cli-007', label: 'Conexiones eléctricas en buen estado', type: 'boolean', required: true, orderIndex: 6 },
        ],
      },
    },
  });

  console.log('Checklist creado');

  const workOrder = await prisma.workOrder.create({
    data: {
      id: 'wo-001',
      code: 'OT-2025-00001',
      title: 'Mantenimiento Preventivo Compresor Principal',
      description: 'Realizar cambio de aceite, filtros y revisión general del compresor de aire principal',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      scheduledDate: new Date('2025-06-20'),
      startDate: new Date(),
      estimatedHours: 8,
      costEstimate: 150000,
      assetId: 'asset-003',
      assignedToId: tecnico.id,
      createdById: supervisor.id,
    },
  });

  await prisma.workOrderActivity.createMany({
    data: [
      { id: 'woa-001', description: 'Detener compresor y bloquear energía', durationMin: 15, completed: true, orderIndex: 0, workOrderId: workOrder.id },
      { id: 'woa-002', description: 'Drenar aceite usado', durationMin: 20, completed: true, orderIndex: 1, workOrderId: workOrder.id },
      { id: 'woa-003', description: 'Cambiar filtro de aceite', durationMin: 15, completed: false, orderIndex: 2, workOrderId: workOrder.id },
      { id: 'woa-004', description: 'Cambiar filtro de aire', durationMin: 15, completed: false, orderIndex: 3, workOrderId: workOrder.id },
      { id: 'woa-005', description: 'Rellenar con aceite nuevo', durationMin: 20, completed: false, orderIndex: 4, workOrderId: workOrder.id },
      { id: 'woa-006', description: 'Verificar fugas y presión de operación', durationMin: 30, completed: false, orderIndex: 5, workOrderId: workOrder.id },
    ],
  });

  console.log('Orden de trabajo creada');

  await prisma.alert.createMany({
    data: [
      {
        id: 'alert-001',
        message: 'Alta Temperatura Bomba: Bomba Centrífuga registró 87.3°C (umbral: 85)',
        severity: 'HIGH',
        status: 'ACTIVE',
        value: 87.3,
        sensorId: 'sensor-001',
        assetId: 'asset-001',
        alertConfigId: 'ac-001',
      },
      {
        id: 'alert-002',
        message: 'Vibración Excesiva: Bomba Centrífuga registró 7.5 mm/s (umbral: 7)',
        severity: 'MEDIUM',
        status: 'ACTIVE',
        value: 7.5,
        sensorId: 'sensor-003',
        assetId: 'asset-001',
        alertConfigId: 'ac-003',
      },
      {
        id: 'alert-003',
        message: 'Alta Temperatura Compresor: Compresor Aire Principal registró 102.1°C (umbral: 100)',
        severity: 'CRITICAL',
        status: 'ACTIVE',
        value: 102.1,
        sensorId: 'sensor-005',
        assetId: 'asset-003',
        alertConfigId: 'ac-005',
      },
    ],
  });

  console.log('Alertas de muestra creadas');

  await prisma.kpiSnapshot.createMany({
    data: [
      { id: 'kpi-001', type: 'MTBF', value: 720, companyId: company.id, periodStart: new Date('2025-06-01'), periodEnd: new Date('2025-06-30') },
      { id: 'kpi-002', type: 'MTTR', value: 180, companyId: company.id, periodStart: new Date('2025-06-01'), periodEnd: new Date('2025-06-30') },
      { id: 'kpi-003', type: 'AVAILABILITY', value: 97.5, companyId: company.id, periodStart: new Date('2025-06-01'), periodEnd: new Date('2025-06-30') },
      { id: 'kpi-004', type: 'OEE', value: 83.2, companyId: company.id, periodStart: new Date('2025-06-01'), periodEnd: new Date('2025-06-30') },
      { id: 'kpi-005', type: 'MTBF', value: 680, companyId: company.id, periodStart: new Date('2025-05-01'), periodEnd: new Date('2025-05-31') },
      { id: 'kpi-006', type: 'AVAILABILITY', value: 96.8, companyId: company.id, periodStart: new Date('2025-05-01'), periodEnd: new Date('2025-05-31') },
    ],
  });

  console.log('Historial de KPIs creado');

  await prisma.maintenanceLog.createMany({
    data: [
      { id: 'ml-001', type: 'PREVENTIVE', description: 'Cambio de aceite programado', cost: 45000, durationMin: 120, performedAt: new Date('2025-06-01'), assetId: 'asset-001' },
      { id: 'ml-002', type: 'CORRECTIVE', description: 'Reemplazo sello mecánico por fuga', cost: 120000, durationMin: 240, performedAt: new Date('2025-05-15'), assetId: 'asset-001' },
      { id: 'ml-003', type: 'PREVENTIVE', description: 'Mantenimiento mensual compresor', cost: 85000, durationMin: 180, performedAt: new Date('2025-06-10'), assetId: 'asset-003' },
    ],
  });

  console.log('Registros de mantenimiento creados');

  console.log('Seed completado exitosamente!');
  console.log('Credenciales:');
  console.log('  admin@cmms.cl / admin123 (ADMIN)');
  console.log('  supervisor@cmms.cl / supervisor123 (SUPERVISOR)');
  console.log('  tecnico@cmms.cl / tecnico123 (TECNICO)');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Error durante seed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
