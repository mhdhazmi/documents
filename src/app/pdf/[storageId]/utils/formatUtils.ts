/**
 * Formats a timestamp to a localized date string
 */
export const formatTimestamp = (timestamp?: number) => {
  if (!timestamp) return 'No timestamp'
  return new Date(timestamp).toLocaleString()
} 