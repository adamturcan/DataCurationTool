import type { NerSpan, TagItem, Translation as TranslationDTO } from '../../types';
import { Tag, type TagProps } from './Tag';

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

export interface WorkspaceTranslationInput {
  language: string;
  text?: string;
  sourceLang?: string;
  createdAt?: number;
  updatedAt?: number;
  userSpans?: NerSpan[];
  apiSpans?: NerSpan[];
  deletedApiKeys?: string[];
  segmentTranslations?: {
    [segmentId: string]: string;
  };
}

export interface WorkspaceTranslationProps {
  language: string;
  text: string;
  sourceLang: string;
  createdAt: number;
  updatedAt: number;
  userSpans: readonly NerSpan[];
  apiSpans: readonly NerSpan[];
  deletedApiKeys: readonly string[];
  segmentTranslations?: {
    [segmentId: string]: string;
  };
}

export class WorkspaceTranslation {
  private readonly props: WorkspaceTranslationProps;

  private constructor(props: WorkspaceTranslationProps) {
    this.props = {
      ...props,
      userSpans: Object.freeze([...props.userSpans]),
      apiSpans: Object.freeze([...props.apiSpans]),
      deletedApiKeys: Object.freeze([...props.deletedApiKeys]),
      segmentTranslations: props.segmentTranslations ? { ...props.segmentTranslations } : undefined,
    };
    Object.freeze(this.props);
  }

  static create(input: WorkspaceTranslationInput): WorkspaceTranslation {
    const language = input.language?.trim();
    if (!language) {
      throw new Error('Translation language is required');
    }

    const now = Date.now();
    return new WorkspaceTranslation({
      language,
      text: typeof input.text === 'string' ? input.text : '',
      sourceLang: input.sourceLang?.trim() || 'auto',
      createdAt: typeof input.createdAt === 'number' ? input.createdAt : now,
      updatedAt: typeof input.updatedAt === 'number' ? input.updatedAt : now,
      userSpans: Array.isArray(input.userSpans) ? [...input.userSpans] : [],
      apiSpans: Array.isArray(input.apiSpans) ? [...input.apiSpans] : [],
      deletedApiKeys: Array.isArray(input.deletedApiKeys) ? [...input.deletedApiKeys] : [],
      segmentTranslations: input.segmentTranslations ? { ...input.segmentTranslations } : undefined,
    });
  }

  static fromDto(dto: TranslationDTO): WorkspaceTranslation {
    return WorkspaceTranslation.create({
      language: dto.language,
      text: dto.text,
      sourceLang: dto.sourceLang,
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt,
      userSpans: dto.userSpans,
      apiSpans: dto.apiSpans,
      deletedApiKeys: dto.deletedApiKeys,
      segmentTranslations: dto.segmentTranslations,
    });
  }

  get language(): string {
    return this.props.language;
  }

  get text(): string {
    return this.props.text;
  }

  get sourceLang(): string {
    return this.props.sourceLang;
  }

  get createdAt(): number {
    return this.props.createdAt;
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

  get segmentTranslations(): { [segmentId: string]: string } | undefined {
    return this.props.segmentTranslations;
  }

  withText(text: string): WorkspaceTranslation {
    return this.clone({
      text,
      updatedAt: Date.now(),
    });
  }

  withUserSpans(spans: NerSpan[]): WorkspaceTranslation {
    return this.clone({
      userSpans: [...spans],
      updatedAt: Date.now(),
    });
  }

  withApiSpans(spans: NerSpan[]): WorkspaceTranslation {
    return this.clone({
      apiSpans: [...spans],
      updatedAt: Date.now(),
    });
  }

  withDeletedApiKeys(keys: string[]): WorkspaceTranslation {
    return this.clone({
      deletedApiKeys: [...keys],
      updatedAt: Date.now(),
    });
  }

  withUpdatedAt(updatedAt: number): WorkspaceTranslation {
    return this.clone({ updatedAt });
  }

  toDto(existingDto?: Partial<TranslationDTO>): TranslationDTO {
    return {
      language: this.language,
      text: this.text,
      sourceLang: this.sourceLang,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      userSpans: [...this.userSpans],
      apiSpans: [...this.apiSpans],
      deletedApiKeys: [...this.deletedApiKeys],
      // Use segmentTranslations from entity, fallback to existingDto for backward compatibility
      segmentTranslations: this.segmentTranslations ?? existingDto?.segmentTranslations,
    };
  }

  private clone(overrides: Partial<WorkspaceTranslationProps>): WorkspaceTranslation {
    return new WorkspaceTranslation({
      language: overrides.language ?? this.language,
      text: overrides.text ?? this.text,
      sourceLang: overrides.sourceLang ?? this.sourceLang,
      createdAt: overrides.createdAt ?? this.createdAt,
      updatedAt: overrides.updatedAt ?? this.updatedAt,
      userSpans: overrides.userSpans ?? [...this.userSpans],
      apiSpans: overrides.apiSpans ?? [...this.apiSpans],
      deletedApiKeys: overrides.deletedApiKeys ?? [...this.deletedApiKeys],
      segmentTranslations: overrides.segmentTranslations !== undefined 
        ? overrides.segmentTranslations 
        : this.segmentTranslations ? { ...this.segmentTranslations } : undefined,
    });
  }
}

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
  tags?: Array<Tag | TagProps | TagItem>;
  translations?: Array<WorkspaceTranslation | WorkspaceTranslationInput | TranslationDTO>;
}

export interface WorkspaceProps {
  id: string;
  name: string;
  owner: string;
  text: string;
  isTemporary: boolean;
  updatedAt: number;
  userSpans: readonly NerSpan[];
  apiSpans: readonly NerSpan[];
  deletedApiKeys: readonly string[];
  tags: readonly Tag[];
  translations: readonly WorkspaceTranslation[];
}

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

    const tags = (input.tags ?? []).map((tag) => {
      if (tag instanceof Tag) return tag;
      if ('source' in tag && 'name' in tag) {
        return Tag.create({
          name: tag.name,
          source: tag.source,
          label: 'label' in tag ? tag.label : undefined,
          parentId: 'parentId' in tag ? tag.parentId : undefined,
          segmentId: 'segmentId' in tag ? tag.segmentId : undefined,
        });
      }
      const tagProps = tag as TagProps;
      return Tag.create(tagProps);
    });

    const translations = (input.translations ?? []).map((translation) => {
      if (translation instanceof WorkspaceTranslation) return translation;
      if ('language' in translation) {
        return WorkspaceTranslation.create(translation as WorkspaceTranslationInput);
      }
      return WorkspaceTranslation.fromDto(translation as TranslationDTO);
    });

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

  get tags(): readonly Tag[] {
    return this.props.tags;
  }

  get translations(): readonly WorkspaceTranslation[] {
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

  withTags(tags: Tag[]): Workspace {
    return this.clone({
      tags: dedupeTags(tags),
      updatedAt: Date.now(),
    });
  }

  addTag(tag: Tag): Workspace {
    const tags = dedupeTags([...this.tags, tag]);
    return this.clone({
      tags,
      updatedAt: Date.now(),
    });
  }

  removeTag(predicate: (tag: Tag) => boolean): Workspace {
    const tags = this.tags.filter((tag) => !predicate(tag));
    return this.clone({
      tags,
      updatedAt: Date.now(),
    });
  }

  getTranslation(language: string): WorkspaceTranslation | undefined {
    return this.translations.find((translation) => translation.language === language);
  }

  upsertTranslation(translation: WorkspaceTranslation): Workspace {
    const existingIndex = this.translations.findIndex(
      (t) => t.language === translation.language
    );

    if (existingIndex === -1) {
      return this.clone({
        translations: [...this.translations, translation],
        updatedAt: Date.now(),
      });
    }

    const nextTranslations = [...this.translations];
    nextTranslations[existingIndex] = translation;

    return this.clone({
      translations: nextTranslations,
      updatedAt: Date.now(),
    });
  }

  removeTranslation(language: string): Workspace {
    const nextTranslations = this.translations.filter(
      (translation) => translation.language !== language
    );

    return this.clone({
      translations: nextTranslations,
      updatedAt: Date.now(),
    });
  }

  withTranslations(translations: WorkspaceTranslation[]): Workspace {
    return this.clone({
      translations: dedupeTranslations(translations),
      updatedAt: Date.now(),
    });
  }

  updateTranslation(
    language: string,
    updater: (translation: WorkspaceTranslation) => WorkspaceTranslation
  ): Workspace {
    const existing = this.getTranslation(language);

    if (!existing) {
      throw new Error(`Translation ${language} not found in workspace ${this.id}`);
    }

    return this.upsertTranslation(updater(existing));
  }

  withUpdatedAt(updatedAt?: number): Workspace {
    const nextUpdatedAt =
      typeof updatedAt === 'number' && Number.isFinite(updatedAt) ? updatedAt : Date.now();
    return this.clone({ updatedAt: nextUpdatedAt });
  }

  markAsPermanent(): Workspace {
    if (!this.isTemporary) {
      return this;
    }
    return this.withTemporaryFlag(false);
  }

  /**
   * Extracts lightweight metadata from the workspace.
   * Use this when only basic workspace information is needed.
   */
  toMetadata(): WorkspaceMetadata {
    return {
      id: this.id,
      name: this.name,
      owner: this.owner,
      updatedAt: this.updatedAt,
    };
  }

  toJSON(): WorkspaceProps {
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

function dedupeTags(tags: readonly Tag[]): Tag[] {
  const seen = new Map<string, Tag>();
  tags.forEach((tag) => {
    const key = `${tag.name.toLowerCase()}:${tag.label ?? 'none'}:${tag.parentId ?? 'none'}`;
    if (!seen.has(key)) {
      seen.set(key, tag);
    }
  });
  return Array.from(seen.values());
}

function dedupeTranslations(translations: readonly WorkspaceTranslation[]): WorkspaceTranslation[] {
  const seen = new Map<string, WorkspaceTranslation>();
  translations.forEach((translation) => {
    if (!seen.has(translation.language)) {
      seen.set(translation.language, translation);
    }
  });
  return Array.from(seen.values());
}



