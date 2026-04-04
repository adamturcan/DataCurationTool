import type { WorkspaceRepository } from '../interfaces/WorkspaceRepository';
import { requireOwnerId } from './validators';

const OPERATION = 'LoadWorkspacesUseCase';

export interface LoadWorkspacesRequest {
  ownerId: string;
}

export class LoadWorkspacesUseCase {
  private readonly workspaceRepository: WorkspaceRepository;

  constructor(workspaceRepository: WorkspaceRepository) {
    this.workspaceRepository = workspaceRepository;
  }

  async execute(request: LoadWorkspacesRequest) {
    const ownerId = requireOwnerId(request.ownerId, OPERATION);
    return this.workspaceRepository.findByOwner(ownerId);
  }
}


