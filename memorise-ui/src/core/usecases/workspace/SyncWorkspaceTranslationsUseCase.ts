import type { WorkspaceRepository } from '../../interfaces/repositories/WorkspaceRepository';
import type { Translation } from '../../../types';
import { WorkspaceTranslation } from '../../entities/Workspace';
import { errorHandlingService } from '../../../infrastructure/services/ErrorHandlingService';
import { requireWorkspaceId, requireTranslationLanguage } from '../shared/validators';

const OPERATION = 'SyncWorkspaceTranslationsUseCase';

export interface SyncWorkspaceTranslationsRequest {
  workspaceId: string;
  translations: Translation[];
}

export class SyncWorkspaceTranslationsUseCase {
  private readonly workspaceRepository: WorkspaceRepository;

  constructor(workspaceRepository: WorkspaceRepository) {
    this.workspaceRepository = workspaceRepository;
  }

  async execute(request: SyncWorkspaceTranslationsRequest) {
    const workspaceId = requireWorkspaceId(request.workspaceId, OPERATION);
    const workspace = await this.workspaceRepository.findById(workspaceId);

    if (!workspace) {
      throw errorHandlingService.createAppError({
        message: `Workspace ${workspaceId} was not found.`,
        code: 'WORKSPACE_NOT_FOUND',
        severity: 'warn',
        context: {
          operation: OPERATION,
          workspaceId,
        },
      });
    }

    const translations = (request.translations ?? []).map((translation) => {
      requireTranslationLanguage(translation.language, OPERATION);
      // Use fromDto to properly handle Translation DTO with segmentTranslations
      return WorkspaceTranslation.fromDto(translation);
    });

    const updated = workspace.withTranslations(translations);
    await this.workspaceRepository.save(updated);
    return updated;
  }
}


