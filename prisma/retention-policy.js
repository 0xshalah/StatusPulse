/**
 * MongoDB Data Retention Policy
 *
 * Run once via MongoDB shell or Atlas:
 *
 * // Pings older than 90 days auto-deleted
 * db.pings.createIndex({ "timestamp": 1 }, { expireAfterSeconds: 7776000, name: "ttl_pings_90d" })
 *
 * // Subscribers inactive for 180 days auto-deleted  
 * db.subscribers.createIndex({ "createdAt": 1 }, { expireAfterSeconds: 15552000, name: "ttl_subscribers_180d" })
 *
 * Verification:
 * db.pings.getIndexes()
 * db.subscribers.getIndexes()
 */
