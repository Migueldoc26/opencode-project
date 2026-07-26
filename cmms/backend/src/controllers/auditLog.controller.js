import * as auditLogService from '../services/auditLog.service.js'

export async function listLogs(req, res) {
  const { page, limit, search, entity, action, userId, startDate, endDate } = req.query
  const data = await auditLogService.listLogs({
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 50,
    search, entity, action, userId,
    startDate, endDate,
  })
  res.json(data)
}

export async function getLog(req, res) {
  const log = await auditLogService.getLog(req.params.id)
  res.json(log)
}
