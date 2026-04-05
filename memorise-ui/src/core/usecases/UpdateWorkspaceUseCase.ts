import type { WorkspaceRepository } from '../interfaces/WorkspaceRepository';
import { Workspace } from '../entities/Workspace';
import type { TagItem, TranslationDTO, NerSpan, Segment } from '../../types';
import { errorHandlingService } from '../../infrastructure/services/ErrorHandlingService';
import { requireWorkspaceId, requireExistingWorkspace } from './validators';

const OPERATION = 'UpdateWorkspaceUseCase';

/** Partial update — only defined fields are applied. Undefined fields are left unchanged. */
export interface UpdateWorkspacePatch {
  name?: string;
  text?: string;
  isTemporary?: boolean;
  userSpans?: NerSpan[];
  apiSpans?: NerSpan[];
  deletedApiKeys?: string[];
  tags?: TagItem[];
  translations?: TranslationDTO[];
  segments?: Segment[];
  updatedAt?: number;
}

export interface UpdateWorkspaceRequest {
  workspaceId: string;
  patch: UpdateWorkspacePatch;
}

/** Applies a partial patch to an existing workspace via immutable builder methods */
export class UpdateWorkspaceUseCase {
  private readonly workspaceRepository: WorkspaceRepository;

  constructor(workspaceRepository: WorkspaceRepository) {
    this.workspaceRepository = workspaceRepository;
  }

  async execute(request: UpdateWorkspaceRequest): Promise<Workspace> {
    const workspaceId = requireWorkspaceId(request.workspaceId, OPERATION);
    const existing = await requireExistingWorkspace(this.workspaceRepository, workspaceId, OPERATION);

    // Apply each defined patch field via the entity's immutable builder methods.
    // Each with*() call returns a new Workspace instance, chained sequentially.
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
        workspace = workspace.withTranslations(patch.translations);
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

    // Segments are metadata not on the domain entity — persisted separately
    if (patch.segments !== undefined && this.workspaceRepository.updateSegments) {
      await this.workspaceRepository.updateSegments(workspace.id, patch.segments);
    }

    return workspace;
  }
}


