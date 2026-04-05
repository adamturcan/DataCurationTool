import type { NerSpan, TagItem, WorkspaceDTO, TranslationDTO } from '../../types';

/**
 * Lightweight metadata for workspace listing and quick operations.
 * Use this for list views, navigation, and when full workspace data is not needed.
 */
export interface WorkspaceMetadata {
  id: string;
  name: string;
  owner: string;
  updatedAt: number;
}

/** Raw input for constructing a Workspace — accepts Tags and Translation DTOs */
export interface WorkspaceInput {
  id: string;
  name: string;
  owner: string;
  text?: string;
  isTemporary?: boolean;
  updatedAt?: number;
  userSpans?: NerSpan[];
  apiSpans?: NerSpan[];
  deletedApiKeys?: string[];
  tags?: TagItem[];
  translations?: TranslationDTO[];
}

/** Validated, frozen internal state of a Workspace */
interface WorkspaceProps {
  id: string;
  name: string;
  owner: string;
  text: string;
  isTemporary: boolean;
  updatedAt: number;
  userSpans: readonly NerSpan[];
  apiSpans: readonly NerSpan[];
  deletedApiKeys: readonly string[];
  tags: readonly TagItem[];
  translations: readonly TranslationDTO[];
}

/**
 * Immutable workspace aggregate root. Holds source text, NER spans,
 * tags (as plain TagItem DTOs), and translations (as plain TranslationDTO
 * objects). All mutations return a new instance via `with*()` builder
 * methods. Internal arrays are frozen to prevent accidental mutation.
 *
 * Mapping convention: hydrate via fromDto(), serialize via toDto().
 *
 * @category Entities
 */
export class Workspace {
  private readonly props: WorkspaceProps;

  private constructor(props: WorkspaceProps) {
    this.props = {
      ...props,
      userSpans: Object.freeze([...props.userSpans]),
      apiSpans: Object.freeze([...props.apiSpans]),
      deletedApiKeys: Object.freeze([...props.deletedApiKeys]),
      tags: Object.freeze([...props.tags]),
      translations: Object.freeze([...props.translations]),
    };

    Object.freeze(this.props);
  }

  /** Reconstructs entity from a persisted DTO (e.g. from localStorage) */
  static fromDto(dto: WorkspaceDTO, options: { ownerFallback?: string } = {}): Workspace {
    const owner = dto.owner ?? options.ownerFallback;
    if (!owner) {
      throw new Error('Workspace DTO must include owner');
    }

    return Workspace.create({
      id: dto.id ?? crypto.randomUUID(),
      name: dto.name ?? 'Untitled Workspace',
      owner,
      text: dto.text,
      isTemporary: dto.isTemporary,
      updatedAt: dto.updatedAt,
      userSpans: dto.userSpans,
      apiSpans: dto.apiSpans,
      deletedApiKeys: dto.deletedApiKeys,
      tags: dto.tags,
      translations: dto.translations,
    });
  }

  static create(input: WorkspaceInput): Workspace {
    const id = input.id?.trim();
    const name = input.name?.trim();
    const owner = input.owner?.trim();

    if (!id) {
      throw new Error('Workspace id is required');
    }
    if (!name) {
      throw new Error('Workspace name is required');
    }
    if (!owner) {
      throw new Error('Workspace owner is required');
    }

    const tags = input.tags ?? [];

    const translations = input.translations ?? [];

    const now = Date.now();
    const updatedAt =
      typeof input.updatedAt === 'number' && Number.isFinite(input.updatedAt)
        ? input.updatedAt
        : now;

    return new Workspace({
      id,
      name,
      owner,
      text: typeof input.text === 'string' ? input.text : '',
      isTemporary: Boolean(input.isTemporary),
      updatedAt,
      userSpans: Array.isArray(input.userSpans) ? [...input.userSpans] : [],
      apiSpans: Array.isArray(input.apiSpans) ? [...input.apiSpans] : [],
      deletedApiKeys: Array.isArray(input.deletedApiKeys) ? [...input.deletedApiKeys] : [],
      tags,
      translations,
    });
  }

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get owner(): string {
    return this.props.owner;
  }

  get text(): string {
    return this.props.text;
  }

  get isTemporary(): boolean {
    return this.props.isTemporary;
  }

  get updatedAt(): number {
    return this.props.updatedAt;
  }

  get userSpans(): readonly NerSpan[] {
    return this.props.userSpans;
  }

  get apiSpans(): readonly NerSpan[] {
    return this.props.apiSpans;
  }

  get deletedApiKeys(): readonly string[] {
    return this.props.deletedApiKeys;
  }

  get tags(): readonly TagItem[] {
    return this.props.tags;
  }

  get translations(): readonly TranslationDTO[] {
    return this.props.translations;
  }

  withName(name: string): Workspace {
    if (!name.trim()) {
      throw new Error('Workspace name is required');
    }

    return this.clone({
      name: name.trim(),
      updatedAt: Date.now(),
    });
  }

  withText(text: string): Workspace {
    return this.clone({
      text,
      updatedAt: Date.now(),
    });
  }

  withTemporaryFlag(isTemporary: boolean): Workspace {
    return this.clone({
      isTemporary,
      updatedAt: Date.now(),
    });
  }

  withUserSpans(spans: NerSpan[]): Workspace {
    return this.clone({
      userSpans: [...spans],
      updatedAt: Date.now(),
    });
  }

  withApiSpans(spans: NerSpan[]): Workspace {
    return this.clone({
      apiSpans: [...spans],
      updatedAt: Date.now(),
    });
  }

  withDeletedApiKeys(keys: string[]): Workspace {
    return this.clone({
      deletedApiKeys: [...keys],
      updatedAt: Date.now(),
    });
  }

  withTags(tags: TagItem[]): Workspace {
    return this.clone({
      tags: dedupeTags(tags),
      updatedAt: Date.now(),
    });
  }

  withTranslations(translations: TranslationDTO[]): Workspace {
    return this.clone({
      translations: dedupeTranslations(translations),
      updatedAt: Date.now(),
    });
  }

  withUpdatedAt(updatedAt?: number): Workspace {
    const nextUpdatedAt =
      typeof updatedAt === 'number' && Number.isFinite(updatedAt) ? updatedAt : Date.now();
    return this.clone({ updatedAt: nextUpdatedAt });
  }

  /** Serializes to plain Workspace DTO for persistence, preserving segments from existingDto */
  toDto(existingDto?: Partial<WorkspaceDTO>): WorkspaceDTO {
    return {
      id: this.id,
      name: this.name,
      owner: this.owner,
      text: this.text,
      isTemporary: this.isTemporary,
      updatedAt: this.updatedAt,
      userSpans: [...this.userSpans],
      apiSpans: [...this.apiSpans],
      deletedApiKeys: [...this.deletedApiKeys],
      tags: [...this.tags],
      translations: [...this.translations],
      segments: existingDto?.segments,
    };
  }

  private clone(overrides: Partial<WorkspaceProps>): Workspace {
    return new Workspace({
      id: overrides.id ?? this.id,
      name: overrides.name ?? this.name,
      owner: overrides.owner ?? this.owner,
      text: overrides.text ?? this.text,
      isTemporary: overrides.isTemporary ?? this.isTemporary,
      updatedAt: overrides.updatedAt ?? this.updatedAt,
      userSpans: overrides.userSpans ?? [...this.userSpans],
      apiSpans: overrides.apiSpans ?? [...this.apiSpans],
      deletedApiKeys: overrides.deletedApiKeys ?? [...this.deletedApiKeys],
      tags: overrides.tags ?? [...this.tags],
      translations: overrides.translations ?? [...this.translations],
    });
  }
}

/** Deduplicates tags by composite key (name + label + parentId) */
function dedupeTags(tags: readonly TagItem[]): TagItem[] {
  const seen = new Map<string, TagItem>();
  tags.forEach((tag) => {
    const key = `${tag.name.toLowerCase()}:${tag.label ?? 'none'}:${tag.parentId ?? 'none'}`;
    if (!seen.has(key)) {
      seen.set(key, tag);
    }
  });
  return Array.from(seen.values());
}

/** Deduplicates translations by language code, keeping the first occurrence */
function dedupeTranslations(translations: readonly TranslationDTO[]): TranslationDTO[] {
  const seen = new Map<string, TranslationDTO>();
  translations.forEach((translation) => {
    if (!seen.has(translation.language)) {
      seen.set(translation.language, translation);
    }
  });
  return Array.from(seen.values());
}



