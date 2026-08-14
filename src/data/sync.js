import { cacheServerRecords, posDb } from './posDb'

let syncing = false
const api = import.meta.env.VITE_API_URL

const authHeaders = (token) => ({ Authorization: `Bearer ${token}` })

async function fetchJson(url, token) {
  const response = await fetch(`${api}${url}`, { headers: authHeaders(token) })
  if (!response.ok) throw new Error(`Request failed (${response.status})`)
  return response.json()
}

async function syncPendingSales(userId, token) {
  const queue = await posDb.syncQueue.where('[userId+status]').equals([userId, 'pending']).toArray()
  for (const job of queue.filter((item) => item.entity === 'sale' && item.operation === 'create')) {
    const sale = await posDb.sales.get(job.recordLocalId)
    if (!sale || sale.syncStatus === 'synced') {
      await posDb.syncQueue.delete(job.localId)
      continue
    }
    try {
      const response = await fetch(`${api}/api/sales`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
        body: JSON.stringify({ ...sale, clientRequestId: sale.clientRequestId }),
      })
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).message || 'Sale synchronization failed')
      const saved = await response.json()
      await posDb.sales.update(sale.localId, { ...saved, serverId: String(saved._id || saved.id), syncStatus: 'synced', updatedAt: Date.now() })
      await posDb.syncQueue.delete(job.localId)
    } catch (error) {
      console.warn('POS sync: sale remains pending', error)
      await posDb.syncQueue.update(job.localId, { attempts: (job.attempts || 0) + 1, lastError: error.message, updatedAt: Date.now() })
    }
  }
}

export async function syncPosData({ userId, token }) {
  if (!userId || !token || !navigator.onLine || syncing) return
  syncing = true
  try {
    await syncPendingSales(userId, token)
    const [products, sales, customers] = await Promise.all([
      fetchJson('/api/products', token), fetchJson('/api/sales?limit=50', token), fetchJson('/api/customers', token),
    ])
    await Promise.all([
      cacheServerRecords(posDb.products, userId, products),
      cacheServerRecords(posDb.sales, userId, sales),
      cacheServerRecords(posDb.customers, userId, customers),
    ])
  } catch (error) {
    // Cached records remain usable; a later online/focus event retries this work.
    console.warn('POS sync: using local cache because the server is unavailable', error)
  } finally {
    syncing = false
  }
}
