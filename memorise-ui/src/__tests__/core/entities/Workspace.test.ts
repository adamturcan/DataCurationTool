import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Workspace } from '@/core/entities/Workspace';
import type { TranslationDTO } from '@/types';

const baseWorkspace = () =>
  Workspace.create({
    id: 'ws-1',
    name: 'Workspace',
    owner: 'owner-1',
  });

describe('Workspace aggregate', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('requires id, name, and owner', () => {
    expect(() => Workspace.create({ id: '', name: 'name', owner: 'owner' })).toThrow(
      'Workspace id is required'
    );
    expect(() => Workspace.create({ id: 'id', name: '', owner: 'owner' })).toThrow(
      'Workspace name is required'
    );
    expect(() => Workspace.create({ id: 'id', name: 'name', owner: '' })).toThrow(
      'Workspace owner is required'
    );
  });

  it('defaults optional fields', () => {
    const workspace = baseWorkspace();
    expect(workspace.text).toBe('');
    expect(workspace.isTemporary).toBe(false);
    expect(workspace.userSpans).toEqual([]);
    expect(workspace.translations).toEqual([]);
  });

  it('updates text immutably and bumps timestamp', () => {
    const workspace = baseWorkspace();
    vi.useFakeTimers();
    vi.setSystemTime(123);

    const updated = workspace.withText('Hello');
    expect(updated.text).toBe('Hello');
    expect(updated.updatedAt).toBe(123);
    expect(workspace.text).toBe('');
  });

  it('manages spans immutably', () => {
    const workspace = baseWorkspace();
    const withUser = workspace.withUserSpans([{ start: 0, end: 1, entity: 'A' }]);
    expect(withUser.userSpans).toHaveLength(1);

    const withApi = withUser.withApiSpans([{ start: 1, end: 2, entity: 'B' }]);
    expect(withApi.apiSpans).toHaveLength(1);
    expect(workspace.userSpans).toEqual([]);
  });

  it('deduplicates tags via withTags', () => {
    const tag = { name: 'culture', source: 'user' as const };
    const workspace = baseWorkspace().withTags([tag, tag]);
    expect(workspace.tags).toHaveLength(1);
  });

  it('sets translations via withTranslations while deduplicating languages', () => {
    const now = Date.now();
    const cs: TranslationDTO = { language: 'cs', text: 'Ahoj', sourceLang: 'auto', createdAt: now, updatedAt: now };
    const en: TranslationDTO = { language: 'en', text: 'Hello', sourceLang: 'auto', createdAt: now, updatedAt: now };

    const workspace = baseWorkspace().withTranslations([cs, en, cs]);
    expect(workspace.translations).toHaveLength(2);
  });
});
