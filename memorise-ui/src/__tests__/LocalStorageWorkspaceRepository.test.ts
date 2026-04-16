import { describe, it, expect, beforeEach } from "vitest";
import { LocalStorageWorkspaceRepository } from '../infrastructure/repositories/LocalStorageWorkspaceRepository';
import { Workspace, type WorkspaceInput } from '../core/entities/Workspace';

const ws = (overrides: Partial<WorkspaceInput> = {}): Workspace =>
  Workspace.create({
    id: "ws-1",
    name: "Workspace 1",
    owner: "user-1",
    text: "Hello",
    isTemporary: false,
    updatedAt: Date.now(),
    ...overrides,
  });

describe("LocalStorageWorkspaceRepository", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("save → findByOwner round-trips and isolates workspaces per owner", async () => {
    const repo = new LocalStorageWorkspaceRepository();
    await repo.save(ws());
    await repo.save(ws({ id: "ws-2" }));
    await repo.save(ws({ id: "ws-3", owner: "user-2" }));

    const mine = await repo.findByOwner("user-1");
    const theirs = await repo.findByOwner("user-2");

    expect(mine.map((w) => w.id).sort()).toEqual(["ws-1", "ws-2"]);
    expect(theirs.map((w) => w.id)).toEqual(["ws-3"]);
  });

  it("save overwrites when the id already exists (upsert, not append)", async () => {
    const repo = new LocalStorageWorkspaceRepository();
    await repo.save(ws());
    await repo.save(ws({ name: "Renamed", text: "Updated" }));

    const reloaded = await repo.findById("ws-1");
    const all = await repo.findByOwner("user-1");

    expect(reloaded?.name).toBe("Renamed");
    expect(all).toHaveLength(1);
  });

  it("delete removes the workspace and leaves siblings intact", async () => {
    const repo = new LocalStorageWorkspaceRepository();
    await repo.save(ws());
    await repo.save(ws({ id: "ws-2" }));

    await repo.delete("ws-1");

    const remaining = await repo.findByOwner("user-1");
    expect(remaining.map((w) => w.id)).toEqual(["ws-2"]);
  });

  // Regression: users on the previous schema had workspaces keyed as
  // "memorise.workspaces.v1:<ownerId>". The repo should migrate those on
  // first read and clean up the legacy key so we don't double-count.
  it("migrates legacy per-user buckets on first load and removes the legacy key", async () => {
    const legacyKey = "memorise.workspaces.v1:user-legacy";
    window.localStorage.setItem(
      legacyKey,
      JSON.stringify([{ id: "legacy-1", name: "Legacy", text: "x" }])
    );

    const repo = new LocalStorageWorkspaceRepository();
    const migrated = await repo.findByOwner("user-legacy");

    expect(migrated).toHaveLength(1);
    expect(migrated[0].owner).toBe("user-legacy");
    expect(window.localStorage.getItem(legacyKey)).toBeNull();
  });
});
