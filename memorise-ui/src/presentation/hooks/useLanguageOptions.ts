import { useState, useEffect } from "react";
import { getApiService } from "../../infrastructure/providers/apiProvider";

/**
 * Loads the list of supported translation languages from the API service once, with loading state.
 */
export type LanguageOption = { code: string; label: string };

export function useLanguageOptions() {
  const [options, setOptions] = useState<LanguageOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    getApiService()
      .getSupportedLanguages()
      .then((langs) => {
        if (mounted) {
          setOptions(langs.map((c) => ({ code: c, label: c })));
        }
      })
      .catch(() => { })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return { languageOptions: options, isLanguageListLoading: isLoading };
}
