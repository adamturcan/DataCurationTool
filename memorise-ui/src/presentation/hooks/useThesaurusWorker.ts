

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import type { ThesaurusIndexItem } from '../../types';

export function useThesaurusWorker() {
  const workerRef = useRef<Worker | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const worker = new Worker(
      new URL('../../workers/thesaurusWorker.ts', import.meta.url),
      { type: 'module' }
    );
    
    worker.onmessage = (e: MessageEvent) => {
      if (e.data.type === 'READY') {
        setReady(true);
        console.log('Thesaurus worker ready');
      } else if (e.data.type === 'ERROR') {
        setError(e.data.error);
        console.error('Thesaurus worker error:', e.data.error);
      }
    };
    
    worker.onerror = (err) => {
      setError(err.message);
      console.error('Worker error:', err);
    };
    
    workerRef.current = worker;
    
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);
  
  const search = useCallback(
    (query: string, limit = 20): Promise<ThesaurusIndexItem[]> => {
      return new Promise((resolve) => {
        if (!workerRef.current || !ready || error) {
          resolve([]);
          return;
        }
        
        const handler = (e: MessageEvent) => {
          if (e.data.type === 'RESULTS') {
            workerRef.current?.removeEventListener('message', handler);
            resolve(e.data.results || []);
          }
        };
        
        workerRef.current.addEventListener('message', handler);
        
        workerRef.current.postMessage({ 
          type: 'SEARCH', 
          query, 
          limit 
        });
        
        setTimeout(() => {
          workerRef.current?.removeEventListener('message', handler);
          resolve([]);
        }, 5000);
      });
    },
    [ready, error]
  );
  
  return useMemo(() => ({
    search,      
    ready,       
    error,       
  }), [search, ready, error]);
}



