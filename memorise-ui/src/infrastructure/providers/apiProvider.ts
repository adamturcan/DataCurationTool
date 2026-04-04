import { BrowserApiService } from '../services/BrowserApiService';
import type { ApiService } from '../../core/interfaces/ApiService';

export interface ApiProviderOverrides {
  apiService?: ApiService;
}

let apiServiceSingleton: ApiService | null = null;
let overrides: ApiProviderOverrides | null = null;

export function setApiProviderOverrides(next: ApiProviderOverrides): void {
  overrides = next;
  if (next.apiService) {
    apiServiceSingleton = null;
  }
}

export function resetApiProvider(): void {
  overrides = null;
  apiServiceSingleton = null;
}

export function getApiService(): ApiService {
  if (overrides?.apiService) {
    return overrides.apiService;
  }

  if (!apiServiceSingleton) {
    apiServiceSingleton = new BrowserApiService();
  }

  return apiServiceSingleton;
}


