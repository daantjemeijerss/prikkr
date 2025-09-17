import { useEffect } from 'react';

export function useTouchMeta(id: string | undefined, status: 'collecting' | 'active' | 'finalized' | 'archived' | 'open' = 'active') {
  useEffect(() => {
    if (!id) return;
    // fire-and-forget
    fetch('/api/meta/touch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
      cache: 'no-store',
    }).catch(() => {});
  }, [id, status]);
}
