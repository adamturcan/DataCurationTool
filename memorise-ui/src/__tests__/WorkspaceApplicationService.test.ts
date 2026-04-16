import { describe, it, expect, beforeEach } from 'vitest';
import { WorkspaceApplicationService } from '../application/WorkspaceApplicationService';
import type { WorkspaceRepository } from '../core/interfaces/WorkspaceRepository';
import { Workspace } from '../core/entities/Workspace';

class InMemoryWorkspaceRepository implements WorkspaceRepository {
  private store = new Map<string, Workspace>();

  async findById(id: string) { return this.store.get(id) ?? null; }
  async findByOwner(ownerId: string) {
    return Array.from(this.store.values()).filter((ws) => ws.owner === ownerId);
  }
  async save(ws: Workspace) { this.store.set(ws.id, ws); }
  async delete(id: string) { this.store.delete(id); }
}

describe('WorkspaceApplicationService', () => {
  let repo: InMemoryWorkspaceRepository;
  let service: WorkspaceApplicationService;

  beforeEach(() => {
    repo = new InMemoryWorkspaceRepository();
    service = new WorkspaceApplicationService({ workspaceRepository: repo });
  });

  it('createWorkspace persists the new workspace; createWorkspaceDraft does not', async () => {
    const saved = await service.createWorkspace({ ownerId: 'u1', name: 'Saved' });
    const draft = service.createWorkspaceDraft('u1', 'Draft');

    expect(await repo.findById(saved.id)).not.toBeNull();
    expect(await repo.findById(draft.id)).toBeNull();
  });

  it('loadForOwner returns only the caller’s workspaces, newest first', async () => {
    const now = Date.now();
    await service.createWorkspace({ ownerId: 'u1', name: 'A', workspaceId: 'a', updatedAt: now - 1000 });
    await service.createWorkspace({ ownerId: 'u1', name: 'B', workspaceId: 'b', updatedAt: now });
    await service.createWorkspace({ ownerId: 'u2', name: 'C', workspaceId: 'c' });

    const results = await service.loadForOwner('u1');

    expect(results.map((w) => w.id)).toEqual(['b', 'a']);
  });

  it('updateWorkspace applies only the defined patch fields', async () => {
    await service.createWorkspace({ ownerId: 'u1', name: 'A', workspaceId: 'a', text: 'original' });

    const updated = await service.updateWorkspace({
      workspaceId: 'a',
      patch: { name: 'Renamed' },
    });

    expect(updated?.name).toBe('Renamed');
    expect(updated?.text).toBe('original'); // untouched because not in patch
  });

  it('replaceAllForOwner deletes workspaces that are no longer present', async () => {
    await service.createWorkspace({ ownerId: 'u1', name: 'Old', workspaceId: 'old' });

    await service.replaceAllForOwner('u1', [
      {
        id: 'new', name: 'New', owner: 'u1', isTemporary: false, text: '',
        userSpans: [], apiSpans: [], deletedApiKeys: [], tags: [], translations: [],
        updatedAt: Date.now(),
      },
    ]);

    expect(await repo.findById('old')).toBeNull();
    expect(await repo.findById('new')).not.toBeNull();
  });
});
