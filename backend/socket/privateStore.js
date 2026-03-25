// In-memory store for private session messages
// Messages never touch MongoDB — they live only in server RAM
// When session ends or server restarts, they are gone forever

const privateMessages = new Map() // sessionId -> [messages]

export const storePrivateMessage = (sessionId, message) => {
  if (!privateMessages.has(sessionId)) privateMessages.set(sessionId, [])
  privateMessages.get(sessionId).push(message)
}

export const getPrivateMessages = (sessionId) => {
  return privateMessages.get(sessionId) || []
}

export const clearPrivateMessages = (sessionId) => {
  privateMessages.delete(sessionId)
}