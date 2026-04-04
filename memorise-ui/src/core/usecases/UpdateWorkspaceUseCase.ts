import type { WorkspaceRepository } from '../interfaces/WorkspaceRepository';
import { Workspace, WorkspaceTranslation } from '../entities/Workspace';
import type { TagItem, Translation, NerSpan, Segment } from '../../types';
import { errorHandlingService } from '../../infrastructure/services/ErrorHandlingService';
import { requireWorkspaceId } from './validators';

const OPERATION = 'UpdateWorkspaceUseCase';

export interface UpdateWorkspacePatch {
  name?: string;
  text?: string;
  isTemporary?: boolean;
  userSpans?: NerSpan[];
  apiSpans?: NerSpan[];
  deletedApiKeys?: string[];
  tags?: TagItem[];
  translations?: Translation[];
  segments?: Segment[];
  updatedAt?: number;
}

export interface UpdateWorkspaceRequest {
  workspaceId: string;
  patch: UpdateWorkspacePatch;
}

export class UpdateWorkspaceUseCase {
  private readonly workspaceRepository: WorkspaceRepository;

  constructor(workspaceRepository: WorkspaceRepository) {
    this.workspaceRepository = workspaceRepository;
  }

  async execute(request: UpdateWorkspaceRequest): Promise<Workspace> {
    const workspaceId = requireWorkspaceId(request.workspaceId, OPERATION);
    const existing = await this.workspaceRepository.findById(workspaceId);

    if (!existing) {
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

    const { patch } = request;
    let workspace = existing;

    try {
      if (patch.name !== undefined) {
        workspace = workspace.withName(patch.name);
      }
      if (patch.text !== undefined) {
        workspace = workspace.withText(patch.text);
      }
      if (patch.isTemporary !== undefined) {
        workspace = workspace.withTemporaryFlag(patch.isTemporary);
      }
      if (patch.userSpans !== undefined) {
        workspace = workspace.withUserSpans(patch.userSpans);
      }
      if (patch.apiSpans !== undefined) {
        workspace = workspace.withApiSpans(patch.apiSpans);
      }
      if (patch.deletedApiKeys !== undefined) {
        workspace = workspace.withDeletedApiKeys(patch.deletedApiKeys);
      }
      if (patch.tags !== undefined) {
        workspace = workspace.withTags(patch.tags);
      }
      if (patch.translations !== undefined) {
        workspace = workspace.withTranslations(
          patch.translations.map((translation) =>
            WorkspaceTranslation.create(translation)
          )
        );
      }
      if (patch.updatedAt !== undefined) {
        workspace = workspace.withUpdatedAt(patch.updatedAt);
      }
    } catch (error) {
      throw errorHandlingService.createAppError({
        message:
          error instanceof Error ? error.message : 'Failed to update workspace.',
        code: 'WORKSPACE_UPDATE_FAILED',
        severity: 'error',
        context: {
          operation: OPERATION,
          workspaceId,
        },
        cause: error,
      });
    }

    await this.workspaceRepository.save(workspace);
    return workspace;
  }
}


