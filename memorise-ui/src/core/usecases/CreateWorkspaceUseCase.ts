import type { WorkspaceRepository } from '../interfaces/WorkspaceRepository';
import { Workspace } from '../entities/Workspace';
import type { TagItem, TranslationDTO, NerSpan } from '../../types';
import { errorHandlingService } from '../../infrastructure/services/ErrorHandlingService';
import { requireOwnerId, requireWorkspaceName } from './validators';

const OPERATION = 'CreateWorkspaceUseCase';

/** All fields except ownerId and name are optional — defaults to empty/temporary workspace */
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
  translations?: TranslationDTO[];
  updatedAt?: number;
}

/** Creates a new workspace with defaults, persists it, and returns the entity */
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
        tags: request.tags,
        translations: request.translations,
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


