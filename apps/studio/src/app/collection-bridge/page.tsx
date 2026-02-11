'use client';

import { useEffect } from 'react';

/**
 * Collection Bridge - Dev-only cross-origin data access
 * Loaded as a hidden iframe by the Collection page to read
 * Studio's localStorage (tidkit-texture-library, tidkit-ptex-presets) via postMessage.
 */
export default function CollectionBridge() {
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type !== 'tidkit-collection-request') return;

      const { dataType } = event.data;
      let payload: unknown = null;

      try {
        const raw = localStorage.getItem(dataType);
        payload = raw ? JSON.parse(raw) : [];
      } catch {
        payload = [];
      }

      event.source?.postMessage(
        {
          type: 'tidkit-collection-response',
          dataType,
          payload,
        },
        { targetOrigin: event.origin },
      );
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return null;
}
