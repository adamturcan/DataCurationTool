import { readJSON, writeJSON, removeItem } from "../storage/localStorageHelpers";
import type { WorkspaceRepository } from "../../core/interfaces/repositories/WorkspaceRepository";
import { Workspace } from "../../core/entities/Workspace";
import {
  workspaceFromDto,
  workspaceToPersistence,
  type WorkspacePersistence,
} from "../../core/entities/mappers";
import type { Workspace as WorkspaceDTO, Translation, Segment } from "../../types";
import { errorHandlingService } from "../services/ErrorHandlingService";

const STORAGE_KEY = "memorise.workspaces";
const LEGACY_BASE_KEY = "memorise.workspaces.v1";
const LEGACY_USER_PREFIX = `${LEGACY_BASE_KEY}:`;

const EMPTY_LIST: WorkspacePersistence[] = [];
const REPOSITORY_NAME = "LocalStorageWorkspaceRepository";

export class LocalStorageWorkspaceRepository implements WorkspaceRepository {
  async findById(id: string): Promise<Workspace | null> {
    return errorHandlingService.withRepositoryError(
      {
        operation: "load workspace",
        repository: REPOSITORY_NAME,
        workspaceId: id,
      },
      () => {
        const workspaces = this.readAll();
        const match = workspaces.find((ws) => ws.id === id);
        return match ? this.toDomain(match) : null;
      }
    );
  }

  async findByOwner(ownerId: string): Promise<Workspace[]> {
    return errorHandlingService.withRepositoryError(
      {
        operation: "load workspaces",
        repository: REPOSITORY_NAME,
        ownerId,
      },
      () => {
        let workspaces = this.readAll().filter((ws) => ws.owner === ownerId);

        if (workspaces.length === 0) {
          const migrated = this.migrateLegacyBuckets(ownerId);
          if (migrated.length > 0) {
            workspaces = migrated;
          }
        }

        return workspaces.map((ws) => this.toDomain(ws));
      }
    );
  }

  async findAll(): Promise<Workspace[]> {
    return errorHandlingService.withRepositoryError(
      {
        operation: "load workspaces",
        repository: REPOSITORY_NAME,
      },
      () => this.readAll().map((ws) => this.toDomain(ws))
    );
  }

  async save(workspace: Workspace): Promise<void> {
    return errorHandlingService.withRepositoryError(
      {
        operation: "save workspace",
        repository: REPOSITORY_NAME,
        workspaceId: workspace.id,
      },
      () => {
        const stored = this.normalize(workspace);
        const workspaces = this.readAll();
        const index = workspaces.findIndex((ws) => ws.id === stored.id);

        if (index >= 0) {
          workspaces[index] = stored;
        } else {
          workspaces.push(stored);
        }

        this.writeAll(workspaces);
      }
    );
  }

  async delete(id: string): Promise<void> {
    return errorHandlingService.withRepositoryError(
      {
        operation: "delete workspace",
        repository: REPOSITORY_NAME,
        workspaceId: id,
      },
      () => {
        const workspaces = this.readAll();
        const next = workspaces.filter((ws) => ws.id !== id);
        this.writeAll(next);
      }
    );
  }

  async exists(id: string): Promise<boolean> {
    return errorHandlingService.withRepositoryError(
      {
        operation: "check workspace",
        repository: REPOSITORY_NAME,
        workspaceId: id,
      },
      () => {
        const workspaces = this.readAll();
        return workspaces.some((ws) => ws.id === id);
      }
    );
  }

  private readAll(): WorkspacePersistence[] {
    const workspaces = readJSON<WorkspacePersistence[]>(STORAGE_KEY, EMPTY_LIST);
    return Array.isArray(workspaces) ? workspaces.map((ws) => this.sanitize(ws)) : EMPTY_LIST;
  }

  private writeAll(workspaces: WorkspacePersistence[]): void {
    writeJSON<WorkspacePersistence[]>(STORAGE_KEY, workspaces);
  }

  private migrateLegacyBuckets(ownerId: string): WorkspacePersistence[] {
    const legacyPerUser = readJSON<WorkspaceDTO[] | null>(`${LEGACY_USER_PREFIX}${ownerId}`, null);
    const legacyGlobal = readJSON<WorkspaceDTO[] | null>(LEGACY_BASE_KEY, null);

    const migrated: WorkspacePersistence[] = [];

    if (Array.isArray(legacyPerUser)) {
      migrated.push(
        ...legacyPerUser.map((ws) =>
          this.sanitize({
            ...ws,
            owner: ownerId,
          })
        )
      );
      removeItem(`${LEGACY_USER_PREFIX}${ownerId}`);
    }

    if (Array.isArray(legacyGlobal)) {
      migrated.push(
        ...legacyGlobal.map((ws) =>
          this.sanitize({
            ...ws,
            owner: ownerId,
          })
        )
      );
      removeItem(LEGACY_BASE_KEY);
    }

    if (migrated.length > 0) {
      const existing = this.readAll().filter((ws) => ws.owner !== ownerId);
      this.writeAll([...existing, ...migrated]);
    }

    return migrated;
  }

  private sanitize(workspace: Partial<WorkspacePersistence>): WorkspacePersistence {
    const owner = workspace.owner ?? "unknown";
    const id = workspace.id ?? crypto.randomUUID();
    const name = workspace.name ?? "Untitled Workspace";
    const updatedAt = typeof workspace.updatedAt === "number" ? workspace.updatedAt : Date.now();
    const isTemporary = Boolean(workspace.isTemporary);

    return {
      id,
      owner,
      name,
      text: typeof workspace.text === "string" ? workspace.text : "",
      isTemporary,
      updatedAt,
      userSpans: Array.isArray(workspace.userSpans) ? workspace.userSpans : [],
      apiSpans: Array.isArray(workspace.apiSpans) ? workspace.apiSpans : [],
      deletedApiKeys: Array.isArray(workspace.deletedApiKeys) ? workspace.deletedApiKeys : [],
      tags: Array.isArray(workspace.tags) ? workspace.tags : [],
      translations: Array.isArray(workspace.translations)
        ? workspace.translations.map((t) => this.sanitizeTranslation(t))
        : [],
      // Preserve segments (optional metadata)
      segments: Array.isArray(workspace.segments) ? workspace.segments : undefined,
    };
  }

  private sanitizeTranslation(translation: Partial<Translation>): Translation {
    const now = Date.now();
    return {
      language: translation?.language ?? "unknown",
      text: typeof translation?.text === "string" ? translation.text : "",
      sourceLang: translation?.sourceLang ?? "auto",
      createdAt: typeof translation?.createdAt === "number" ? translation.createdAt : now,
      updatedAt: typeof translation?.updatedAt === "number" ? translation.updatedAt : now,
      userSpans: Array.isArray(translation?.userSpans) ? translation.userSpans : [],
      apiSpans: Array.isArray(translation?.apiSpans) ? translation.apiSpans : [],
      deletedApiKeys: Array.isArray(translation?.deletedApiKeys)
        ? translation.deletedApiKeys
        : [],
      // Preserve segmentTranslations (optional metadata)
      segmentTranslations:
        translation?.segmentTranslations &&
        typeof translation.segmentTranslations === "object"
          ? translation.segmentTranslations
          : undefined,
    };
  }

  private normalize(workspace: Workspace): WorkspacePersistence {
    // Read existing workspace to preserve segments and segmentTranslations
    const existing = this.readAll().find((ws) => ws.id === workspace.id);
    return this.sanitize(workspaceToPersistence(workspace, existing));
  }

   
  private toDomain(workspace: WorkspacePersistence): Workspace {
    return workspaceFromDto(workspace);
  }

  async getRawPersistenceForOwner(ownerId: string): Promise<Array<{ id: string; segments?: Segment[] }>> {
    return errorHandlingService.withRepositoryError(
      {
        operation: "get raw persistence",
        repository: REPOSITORY_NAME,
        ownerId,
      },
      () => {
        let workspaces = this.readAll().filter((ws) => ws.owner === ownerId);

        if (workspaces.length === 0) {
          const migrated = this.migrateLegacyBuckets(ownerId);
          if (migrated.length > 0) {
            workspaces = migrated;
          }
        }

        return workspaces.map((ws) => ({
          id: ws.id,
          segments: ws.segments,
        }));
      }
    );
  }

  /**
   * Update segments for a workspace directly in persistence
   * This is needed because segments are metadata not in the domain entity
   */
  async updateSegments(workspaceId: string, segments: Segment[] | undefined): Promise<void> {
    return errorHandlingService.withRepositoryError(
      {
        operation: "update segments",
        repository: REPOSITORY_NAME,
        workspaceId,
      },
      () => {
        const workspaces = this.readAll();
        const index = workspaces.findIndex((ws) => ws.id === workspaceId);
        
        if (index >= 0) {
          workspaces[index] = {
            ...workspaces[index],
            segments: segments !== undefined ? segments : undefined,
          };
          this.writeAll(workspaces);
        }
      }
    );
  }
}


