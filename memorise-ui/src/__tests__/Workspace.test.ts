import { describe, it, expect, vi } from 'vitest';
import { Workspace } from '../core/entities/Workspace';
import type { TranslationDTO } from '../types';

const fresh = () => Workspace.create({ id: 'ws-1', name: 'Workspace', owner: 'owner-1' });

describe('Workspace aggregate', () => {
  it('rejects construction without id / name / owner', () => {
    expect(() => Workspace.create({ id: '', name: 'n', owner: 'o' })).toThrow(/id/);
    expect(() => Workspace.create({ id: 'i', name: '', owner: 'o' })).toThrow(/name/);
    expect(() => Workspace.create({ id: 'i', name: 'n', owner: '' })).toThrow(/owner/);
  });

  it('withText produces a new instance and bumps updatedAt, leaving the original untouched', () => {
    vi.useFakeTimers();
    vi.setSystemTime(123);

    const original = fresh();
    const updated = original.withText('Hello');

    expect(updated.text).toBe('Hello');
    expect(updated.updatedAt).toBe(123);
    expect(original.text).toBe('');

    vi.useRealTimers();
  });

  it('withTags deduplicates by (name, source) so the same tag cannot appear twice', () => {
    const tag = { name: 'culture', source: 'user' as const };
    const ws = fresh().withTags([tag, tag]);

    expect(ws.tags).toHaveLength(1);
  });

  it('withTranslations keeps only one entry per language', () => {
    const now = Date.now();
    const cs: TranslationDTO = { language: 'cs', text: 'Ahoj', sourceLang: 'auto', createdAt: now, updatedAt: now };
    const en: TranslationDTO = { language: 'en', text: 'Hello', sourceLang: 'auto', createdAt: now, updatedAt: now };

    const ws = fresh().withTranslations([cs, en, cs]);

    expect(ws.translations.map((t) => t.language)).toEqual(['cs', 'en']);
  });
});
