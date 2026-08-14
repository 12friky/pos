import Dexie from 'dexie'

// Server IDs are never used as IndexedDB primary keys. This lets pending records
// exist before MongoDB has assigned an _id.
export const posDb = new Dexie('posOffline')

posDb.version(1).stores({
  products: '++localId, userId, serverId, [userId+serverId], updatedAt',
  customers: '++localId, userId, serverId, [userId+serverId], updatedAt',
  sales: '++localId, userId, serverId, clientRequestId, [userId+serverId], syncStatus, createdAt',
  syncQueue: '++localId, userId, entity, operation, recordLocalId, status, [userId+status], createdAt',
})

// Upgrade devices that created the original cache before the queue status index.
posDb.version(2).stores({
  products: '++localId, userId, serverId, [userId+serverId], updatedAt',
  customers: '++localId, userId, serverId, [userId+serverId], updatedAt',
  sales: '++localId, userId, serverId, clientRequestId, [userId+serverId], syncStatus, createdAt',
  syncQueue: '++localId, userId, entity, operation, recordLocalId, status, [userId+status], createdAt',
})

const serverIdOf = (record) => String(record._id || record.id)

export async function cacheServerRecords(table, userId, records) {
  if (!userId || !Array.isArray(records)) return
  const existing = await table.where('userId').equals(userId).toArray()
  const existingByServerId = new Map(existing.filter((item) => item.serverId).map((item) => [item.serverId, item]))
  const now = Date.now()
  const saved = records.map((record) => {
    const serverId = serverIdOf(record)
    const previous = existingByServerId.get(serverId)
    return {
      ...record,
      ...(previous ? { localId: previous.localId, syncStatus: previous.syncStatus || 'synced' } : { syncStatus: 'synced' }),
      userId,
      serverId,
      updatedAt: now,
    }
  })
  await table.bulkPut(saved)
}

export async function queueOfflineSale(userId, salePayload) {
  if (!userId) throw new Error('No signed-in user was available for this offline sale')
  const clientRequestId = crypto.randomUUID()
  const createdAt = new Date().toISOString()
  return posDb.transaction('rw', posDb.sales, posDb.products, posDb.syncQueue, async () => {
    const localId = await posDb.sales.add({
      ...salePayload,
      userId,
      serverId: null,
      clientRequestId,
      syncStatus: 'pending',
      createdAt,
      updatedAt: Date.now(),
    })
    for (const item of salePayload.items) {
      const product = await posDb.products.where('[userId+serverId]').equals([userId, String(item.product)]).first()
      if (product?.trackInventory) {
        await posDb.products.update(product.localId, { stock: Math.max(0, Number(product.stock || 0) - item.quantity), updatedAt: Date.now() })
      }
    }
    await posDb.syncQueue.add({ userId, entity: 'sale', operation: 'create', recordLocalId: localId, status: 'pending', attempts: 0, createdAt, updatedAt: Date.now() })
    return { localId, clientRequestId, createdAt }
  })
}
