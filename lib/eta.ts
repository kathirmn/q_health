import { Clinic, QueueItem } from './store';

export function calculateWaitTime(
  queue: QueueItem[],
  clinic: Clinic,
  tokenId: number
): number {
  // Filter queue for this specific clinic if clinic_id is present
  const clinicQueue = queue.filter((q) => !q.clinic_id || q.clinic_id === clinic.id);
  
  // Sort by token_id to ensure order
  const sortedQueue = [...clinicQueue].sort((a, b) => a.token_id - b.token_id);
  
  const myIndex = sortedQueue.findIndex((q) => q.token_id === tokenId);
  if (myIndex === -1) return 0;

  // Count active and waiting patients ahead of this token
  const ahead = sortedQueue.slice(0, myIndex);
  const waitingAhead = ahead.filter((q) => q.status === 'waiting' || q.status === 'in-progress').length;

  return waitingAhead * (clinic.base_consult_time || 10);
}
