/**
 * Thesaurus Web Worker - Background search for 750k keywords
 * 
 * This worker:
 * - Loads the pre-processed thesaurus index (5-10MB)
 * - Initializes Fuse.js for fuzzy search
 * - Handles search requests in background thread (doesn't block UI)
 * - Returns top 20 matches sorted by relevance
 * 
 * Benefits:
 * - UI stays responsive during search
 * - Search completes in ~50-100ms
 * - No freezing or lag
 */

import Fuse from 'fuse.js';
import type { ThesaurusIndexItem } from '../types';

let fuse: Fuse<ThesaurusIndexItem> | null = null;
let isReady = false;

/**
 * Initialize: Load and index thesaurus on worker startup
 */
(async () => {
  try {
    console.log('[Worker] Loading thesaurus index...');
    console.log('[Worker] Current location:', self.location.href);
    const startTime = performance.now();
    
    // Try multiple paths (handles different base URL configurations)
    const pathsToTry = [
      '/NPRG045/thesaurus-index.json',  // Production base
      '/thesaurus-index.json',          // Dev/no base
      './thesaurus-index.json',         // Relative
    ];
    
    let response: Response | null = null;
    
    // Try each path until one works
    for (const path of pathsToTry) {
      try {
        console.log(`[Worker] Trying: ${path}`);
        const res = await fetch(path);
        if (res.ok) {
          response = res;
          console.log(`[Worker] ✅ Found at: ${path}`);
          break;
        }
        console.log(`[Worker] ❌ Not found at ${path} (${res.status})`);
      } catch (err) {
        console.log(`[Worker] ❌ Error fetching ${path}:`, err);
      }
    }
    
    if (!response) {
      throw new Error('Could not load thesaurus-index.json from any path. Make sure file exists in public/ folder.');
    }
    
    console.log(`[Worker] Fetch response status: ${response.status}`);
    
    console.log('[Worker] Parsing JSON...');
    const index: ThesaurusIndexItem[] = await response.json();
    console.log(`[Worker] Loaded ${index.length.toLocaleString()} keywords`);
    
    // Validate data structure
    if (!Array.isArray(index) || index.length === 0) {
      throw new Error('Invalid index format: expected non-empty array');
    }
    
    console.log('[Worker] Initializing Fuse.js...');
    // Initialize Fuse.js for fuzzy search
    fuse = new Fuse(index, {
      keys: [
        { name: 'labelLower', weight: 3 },      // Primary: match on label
        { name: 'pathString', weight: 1 },      // Secondary: match in path
      ],
      threshold: 0.3,                           // Fuzzy tolerance (0 = exact, 1 = match anything)
      ignoreLocation: true,                     // Match anywhere in string
      minMatchCharLength: 2,                    // Minimum query length
      shouldSort: true,                         // Sort by relevance
      includeScore: true,                       // For debugging
    });
    
    const elapsed = performance.now() - startTime;
    console.log(`[Worker] ✅ Ready in ${elapsed.toFixed(0)}ms`);
    
    isReady = true;
    self.postMessage({ type: 'READY' });
    
  } catch (error) {
    console.error('[Worker] ❌ Failed to load thesaurus:', error);
    console.error('[Worker] Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    self.postMessage({ 
      type: 'ERROR', 
      error: error instanceof Error ? error.message : String(error)
    });
  }
})();

/**
 * Message handler: Process search requests
 */
self.onmessage = (e: MessageEvent) => {
  const { type, query, limit = 20 } = e.data;
  
  if (type === 'SEARCH') {
    // Not ready yet
    if (!isReady || !fuse) {
      self.postMessage({ type: 'RESULTS', results: [] });
      return;
    }
    
    // Empty or too short query
    if (!query || query.trim().length < 2) {
      self.postMessage({ type: 'RESULTS', results: [] });
      return;
    }
    
    // Perform fuzzy search
    const searchResults = fuse.search(query.toLowerCase(), { limit });
    
    // Extract items from Fuse results
    const results = searchResults.map(r => r.item);
    
    // Send results back to main thread
    self.postMessage({ type: 'RESULTS', results });
  }
};

