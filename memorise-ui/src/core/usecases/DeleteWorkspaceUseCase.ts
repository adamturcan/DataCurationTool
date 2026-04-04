import type { WorkspaceRepository } from '../interfaces/WorkspaceRepository';
import { errorHandlingService } from '../../infrastructure/services/ErrorHandlingService';
import { requireWorkspaceId } from './validators';

const OPERATION = 'DeleteWorkspaceUseCase';

export interface DeleteWorkspaceRequest {
  workspaceId: string;
}

export class DeleteWorkspaceUseCase {
  private readonly workspaceRepository: WorkspaceRepository;

  constructor(workspaceRepository: WorkspaceRepository) {
    this.workspaceRepository = workspaceRepository;
  }

  async execute(request: DeleteWorkspaceRequest): Promise<void> {
    const workspaceId = requireWorkspaceId(request.workspaceId, OPERATION);
    const exists = await this.workspaceRepository.exists(workspaceId);

    if (!exists) {
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

    await this.workspaceRepository.delete(workspaceId);
  }
}


