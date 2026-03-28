import type { WorkspaceRepository } from '../../interfaces/repositories/WorkspaceRepository';
import { Workspace, WorkspaceTranslation } from '../../entities/Workspace';
import { Tag } from '../../entities/Tag';
import type { TagItem, Translation, NerSpan } from '../../../types';
import { errorHandlingService } from '../../../infrastructure/services/ErrorHandlingService';
import { requireOwnerId, requireWorkspaceName } from '../shared/validators';

const OPERATION = 'CreateWorkspaceUseCase';

export interface CreateWorkspaceRequest {
  ownerId: string;
  name: string;
  workspaceId?: string;
  text?: string;
  isTemporary?: boolean;
  userSpans?: NerSpan[];
  apiSpans?: NerSpan[];
  deletedApiKeys?: string[];
  tags?: TagItem[];
  translations?: Translation[];
  updatedAt?: number;
}

export class CreateWorkspaceUseCase {
  private readonly workspaceRepository: WorkspaceRepository;

  constructor(workspaceRepository: WorkspaceRepository) {
    this.workspaceRepository = workspaceRepository;
  }

  async execute(request: CreateWorkspaceRequest): Promise<Workspace> {
    const ownerId = requireOwnerId(request.ownerId, OPERATION);
    const name = requireWorkspaceName(request.name, OPERATION);
    const workspaceId = request.workspaceId?.trim() || crypto.randomUUID();

    try {
      const workspace = Workspace.create({
        id: workspaceId,
        name,
        owner: ownerId,
        text: request.text ?? '',
        isTemporary: request.isTemporary ?? true,
        updatedAt: request.updatedAt,
        userSpans: request.userSpans ?? [],
        apiSpans: request.apiSpans ?? [],
        deletedApiKeys: request.deletedApiKeys ?? [],
        tags: request.tags?.map((tag) =>
          Tag.create({
            name: tag.name,
            source: tag.source,
            label: tag.label,
            parentId: tag.parentId,
            segmentId: tag.segmentId,
          })
        ),
        translations: request.translations?.map((translation) =>
          WorkspaceTranslation.create(translation)
        ),
      });

      await this.workspaceRepository.save(workspace);
      return workspace;
    } catch (error) {
      throw errorHandlingService.createAppError({
        message:
          error instanceof Error ? error.message : 'Failed to create workspace.',
        code: 'WORKSPACE_CREATE_FAILED',
        context: {
          operation: OPERATION,
          ownerId,
          name,
        },
        cause: error,
        severity: 'error',
      });
    }
  }
}


