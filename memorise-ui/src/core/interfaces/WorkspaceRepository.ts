import { Workspace } from '../entities/Workspace';
import type { Segment } from '../../types';

/**
 * Storage contract for workspace persistence. Implemented by
 * LocalStorageWorkspaceRepository; future server-side adapters
 * would implement the same interface.
 *
 * @category Interfaces
 */
export interface WorkspaceRepository {
  findById(id: string): Promise<Workspace | null>;
  findByOwner(ownerId: string): Promise<Workspace[]>;
  findAll(): Promise<Workspace[]>;
  save(workspace: Workspace): Promise<void>;
  delete(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;

  /** Returns raw persistence data including segments (metadata not on the domain entity) */
  getRawPersistenceForOwner?(ownerId: string): Promise<Array<{ id: string; segments?: Segment[] }>>;
  /** Updates segments directly in storage, bypassing entity layer */
  updateSegments?(workspaceId: string, segments: Segment[] | undefined): Promise<void>;
}

