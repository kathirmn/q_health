import { Clinic, QueueItem } from './store';

export function calculateWaitTime(
  queue: QueueItem[],
  clinic: Clinic,
  tokenId: number
): number {
  const myIndex = queue.findIndex((q) => q.token_id === tokenId);
  if (myIndex === -1) return 0;

  // Calculate how many people ahead of this token are still waiting or in-progress
  const ahead = queue.slice(0, myIndex);
  const waitingAhead = ahead.filter((q) => q.status === 'waiting' || q.status === 'in-progress').length;

  return waitingAhead * clinic.base_consult_time;
}
