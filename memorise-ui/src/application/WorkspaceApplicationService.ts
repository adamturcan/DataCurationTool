import type { WorkspaceRepository } from '../core/interfaces/WorkspaceRepository';
import type { WorkspaceDTO, TagItem, TranslationDTO, NerSpan, Segment } from '../types';
import { CreateWorkspaceUseCase } from '../core/usecases/CreateWorkspaceUseCase';
import { DeleteWorkspaceUseCase } from '../core/usecases/DeleteWorkspaceUseCase';
import {
  UpdateWorkspaceUseCase,
  type UpdateWorkspacePatch,
} from '../core/usecases/UpdateWorkspaceUseCase';
import { LoadWorkspacesUseCase } from '../core/usecases/LoadWorkspacesUseCase';
import { SyncWorkspaceTranslationsUseCase } from '../core/usecases/SyncWorkspaceTranslationsUseCase';
import { Workspace } from '../core/entities/Workspace';
import { requireOwnerId, requireWorkspaceName } from '../core/usecases/validators';

interface WorkspaceApplicationServiceDeps {
  workspaceRepository: WorkspaceRepository;
}

/**
 * Facade for workspace CRUD. Orchestrates use cases and handles
 * segment metadata preservation across load/save cycles.
 * Accessed via getWorkspaceApplicationService() provider.
 *
 * @category Application
 */
export class WorkspaceApplicationService {
  private readonly deps: WorkspaceApplicationServiceDeps;
  private readonly createUseCase: CreateWorkspaceUseCase;
  private readonly updateUseCase: UpdateWorkspaceUseCase;
  private readonly deleteUseCase: DeleteWorkspaceUseCase;
  private readonly loadUseCase: LoadWorkspacesUseCase;
  private readonly syncTranslationsUseCase: SyncWorkspaceTranslationsUseCase;

  constructor(deps: WorkspaceApplicationServiceDeps) {
    this.deps = deps;
    this.createUseCase = new CreateWorkspaceUseCase(deps.workspaceRepository);
    this.updateUseCase = new UpdateWorkspaceUseCase(deps.workspaceRepository);
    this.deleteUseCase = new DeleteWorkspaceUseCase(deps.workspaceRepository);
    this.loadUseCase = new LoadWorkspacesUseCase(deps.workspaceRepository);
    this.syncTranslationsUseCase = new SyncWorkspaceTranslationsUseCase(
      deps.workspaceRepository
    );
  }

  async loadForOwner(ownerId: string): Promise<WorkspaceDTO[]> {
    const workspaces = await this.loadUseCase.execute({ ownerId });
    workspaces.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
    
    // Preserve segments from stored data when converting entity to DTO
    // Segments are metadata not in domain entity, so we need to read them from persistence
    const rawPersistence = await this.getRawPersistenceForOwner(ownerId);
    const segmentsMap = new Map(rawPersistence.map(ws => [ws.id, ws.segments]));
    
    return workspaces.map((workspace) => {
      const existingDto = segmentsMap.has(workspace.id) 
        ? { segments: segmentsMap.get(workspace.id) }
        : undefined;
      return workspace.toDto(existingDto);
    });
  }

  async getWorkspaceById(workspaceId: string): Promise<WorkspaceDTO | null> {
    const workspace = await this.deps.workspaceRepository.findById(workspaceId);
    if (!workspace) return null;
    
    // Preserve segments from stored data
    const rawPersistence = await this.getRawPersistenceForWorkspace(workspaceId);
    const existingDto = rawPersistence ? { segments: rawPersistence.segments } : undefined;
    return workspace.toDto(existingDto);
  }

  /**
   * Helper method to get raw persistence data for an owner
   * This is needed to preserve metadata (like segments) that's not in the domain entity
   */
  private async getRawPersistenceForOwner(ownerId: string): Promise<Array<{ id: string; segments?: Segment[] }>> {
    if (this.deps.workspaceRepository.getRawPersistenceForOwner) {
      return await this.deps.workspaceRepository.getRawPersistenceForOwner(ownerId);
    }
    // Fallback: return empty array if repository doesn't support this method
    return [];
  }

  /**
   * Helper method to get raw persistence data for a specific workspace
   * This is needed to preserve metadata (like segments) that's not in the domain entity
   */
  private async getRawPersistenceForWorkspace(workspaceId: string): Promise<{ segments?: Segment[] } | null> {
    // Get the workspace entity to find its owner
    const workspace = await this.deps.workspaceRepository.findById(workspaceId);
    if (!workspace) return null;
    
    // Get all raw persistence data for the owner and find the matching workspace
    if (this.deps.workspaceRepository.getRawPersistenceForOwner) {
      const all = await this.deps.workspaceRepository.getRawPersistenceForOwner(workspace.owner);
      const match = all.find(ws => ws.id === workspaceId);
      return match ? { segments: match.segments } : null;
    }
    return null;
  }

  async createWorkspace(params: {
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
  }): Promise<WorkspaceDTO> {
    const workspace = await this.createUseCase.execute(params);
    return workspace.toDto();
  }

  async updateWorkspace(params: {
    workspaceId: string;
    patch: UpdateWorkspacePatch;
  }): Promise<WorkspaceDTO | null> {
    const workspace = await this.updateUseCase.execute(params);
    if (!workspace) return null;

    // Preserve segments from stored data to return the complete DTO
    const rawPersistence = await this.getRawPersistenceForWorkspace(workspace.id);
    const existingDto = rawPersistence ? { segments: rawPersistence.segments } : undefined;
    return workspace.toDto(existingDto);
  }

  async deleteWorkspace(workspaceId: string): Promise<void> {
    await this.deleteUseCase.execute({ workspaceId });
  }

  async replaceAllForOwner(ownerId: string, workspaces: WorkspaceDTO[]): Promise<void> {
    const existing = await this.deps.workspaceRepository.findByOwner(ownerId);
    const existingIds = new Set(existing.map((ws) => ws.id));
    const incomingIds = new Set(workspaces.map((ws) => ws.id));

    // Delete workspaces not present in incoming list
    for (const id of existingIds) {
      if (!incomingIds.has(id)) {
        await this.deleteUseCase.execute({ workspaceId: id });
      }
    }

    for (const dto of workspaces) {
      if (!dto.id) continue;

      if (existingIds.has(dto.id)) {
        // Update existing workspace — use case handles segments too
        await this.updateUseCase.execute({
          workspaceId: dto.id,
          patch: this.dtoToPatch(dto),
        });
      } else {
        await this.createUseCase.execute({
          ownerId: dto.owner ?? ownerId,
          workspaceId: dto.id,
          name: dto.name,
          text: dto.text,
          isTemporary: dto.isTemporary,
          userSpans: dto.userSpans,
          apiSpans: dto.apiSpans,
          deletedApiKeys: dto.deletedApiKeys,
          tags: dto.tags,
          translations: dto.translations,
          updatedAt: dto.updatedAt,
        });
      }
    }
  }

  async syncWorkspaceTranslations(params: {
    workspaceId: string;
    translations: TranslationDTO[];
  }): Promise<WorkspaceDTO | null> {
    const workspace = await this.syncTranslationsUseCase.execute(params);
    if (!workspace) return null;
    
    // Preserve segments from stored data
    const rawPersistence = await this.getRawPersistenceForWorkspace(workspace.id);
    const existingDto = rawPersistence ? { segments: rawPersistence.segments } : undefined;
    return workspace.toDto(existingDto);
  }

  createWorkspaceDraft(ownerId: string, name: string): WorkspaceDTO {
    const validatedOwner = requireOwnerId(ownerId, 'WorkspaceApplicationService');
    const validatedName = requireWorkspaceName(name, 'WorkspaceApplicationService');

    const workspace = Workspace.create({
      id: crypto.randomUUID(),
      owner: validatedOwner,
      name: validatedName,
      isTemporary: true,
    });

    return workspace.toDto();
  }

  seedForOwner(ownerId: string): WorkspaceDTO[] {
    const validatedOwner = requireOwnerId(ownerId, 'WorkspaceApplicationService');
    const now = Date.now();

    return ['Workspace A', 'Workspace B', 'Workspace C'].map((name) =>
      Workspace.create({
        id: crypto.randomUUID(),
        owner: validatedOwner,
        name,
        isTemporary: false,
        text: '',
        userSpans: [],
        updatedAt: now,
      }).toDto()
    );
  }

  private dtoToPatch(dto: WorkspaceDTO): UpdateWorkspacePatch {
    return {
      name: dto.name,
      text: dto.text,
      isTemporary: dto.isTemporary,
      userSpans: dto.userSpans,
      apiSpans: dto.apiSpans,
      deletedApiKeys: dto.deletedApiKeys,
      tags: dto.tags,
      translations: dto.translations,
      segments: dto.segments,
      updatedAt: dto.updatedAt,
    };
  }
}


