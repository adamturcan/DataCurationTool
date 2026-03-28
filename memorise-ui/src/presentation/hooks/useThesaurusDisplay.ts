/**
 * useThesaurusDisplay - Hook to load and manage thesaurus index for display
 * 
 * This hook handles loading the thesaurus index JSON file once the thesaurus
 * worker is ready. The index is used to display the tag hierarchy in the RightPanel.
 * 
 * @param thesaurusWorker - The thesaurus worker instance from useThesaurusWorker
 * @returns The loaded thesaurus index array, or undefined if not loaded yet
 */

import { useState, useEffect } from 'react';
import { loadThesaurusIndex } from '../../shared/utils/thesaurusHelpers';
import type { ThesaurusIndexItem } from '../../types';
import type { useThesaurusWorker } from './useThesaurusWorker';

export function useThesaurusDisplay(
  thesaurusWorker: ReturnType<typeof useThesaurusWorker>
): ThesaurusIndexItem[] | undefined {
  const [thesaurusIndexForDisplay, setThesaurusIndexForDisplay] = 
    useState<ThesaurusIndexItem[] | null>(null);

  useEffect(() => {
    if (thesaurusWorker.ready && !thesaurusIndexForDisplay) {
      loadThesaurusIndex()
        .then(setThesaurusIndexForDisplay)
        .catch(err => {
          console.error('Failed to load thesaurus for display:', err);
        });
    }
  }, [thesaurusWorker.ready, thesaurusIndexForDisplay]);

  return thesaurusIndexForDisplay || undefined;
}

