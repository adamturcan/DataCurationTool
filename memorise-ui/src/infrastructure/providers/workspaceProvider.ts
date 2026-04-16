/**
 * Singleton provider for WorkspaceApplicationService and its repository.
 * Supports DI overrides for testing. Production code uses getWorkspaceApplicationService().
 *
 * @category Infrastructure
 */
import { LocalStorageWorkspaceRepository } from '../repositories/LocalStorageWorkspaceRepository';
import type { WorkspaceRepository } from '../../core/interfaces/WorkspaceRepository';
import { WorkspaceApplicationService } from '../../application/WorkspaceApplicationService';

export interface WorkspaceProviderOverrides {
  repository?: WorkspaceRepository; 
  applicationService?: WorkspaceApplicationService;
}

let repositorySingleton: WorkspaceRepository | null = null;

let applicationServiceSingleton: WorkspaceApplicationService | null = null;
let overrides: WorkspaceProviderOverrides | null = null;

export function setWorkspaceProviderOverrides(next: WorkspaceProviderOverrides): void {
  overrides = next;
  if (next.repository) {
    repositorySingleton = null;

    applicationServiceSingleton = null;
  }
  if (next.applicationService) {
    applicationServiceSingleton = null;
  }
}

export function resetWorkspaceProvider(): void {
  overrides = null;
  repositorySingleton = null;
  applicationServiceSingleton = null;
}

function createDefaultRepository(): WorkspaceRepository {
  return new LocalStorageWorkspaceRepository();
}

function ensureRepository(): WorkspaceRepository {
  if (overrides?.repository) {
    return overrides.repository;
  }

  if (!repositorySingleton) {
    repositorySingleton = createDefaultRepository();
  }

  return repositorySingleton;
}


export function getWorkspaceApplicationService(): WorkspaceApplicationService {
  if (overrides?.applicationService) {
    return overrides.applicationService;
  }

  if (!applicationServiceSingleton) {
    applicationServiceSingleton = new WorkspaceApplicationService({
      workspaceRepository: ensureRepository(),
    });
  }

  return applicationServiceSingleton;
}


