import type { Translation as TranslationDTO, Workspace as WorkspaceDTO } from '../../types';
import { Tag } from './Tag';
import { Workspace, WorkspaceTranslation } from './Workspace';

interface WorkspaceMapperOptions {
  ownerFallback?: string;
}

export type WorkspacePersistence = WorkspaceDTO & {
  owner: string;
  text: string;
  isTemporary: boolean;
  updatedAt: number;
};

export function workspaceFromDto(
  dto: WorkspaceDTO,
  options: WorkspaceMapperOptions = {}
): Workspace {
  const owner = dto.owner ?? options.ownerFallback;
  if (!owner) {
    throw new Error('Workspace DTO must include owner');
  }

  // Segments are metadata (not part of domain entity), so they're preserved in DTO
  // but not passed to Workspace.create() - they'll be preserved via repository layer
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
    tags: dto.tags?.map((item) => Tag.fromTagItem(item)),
    translations: dto.translations?.map((translation) =>
      WorkspaceTranslation.fromDto(translation as TranslationDTO)
    ),
  });
}

export function workspaceToDto(
  workspace: Workspace,
  existingDto?: Partial<WorkspaceDTO>
): WorkspaceDTO {
  return {
    id: workspace.id,
    name: workspace.name,
    owner: workspace.owner,
    text: workspace.text,
    isTemporary: workspace.isTemporary,
    updatedAt: workspace.updatedAt,
    userSpans: [...workspace.userSpans],
    apiSpans: [...workspace.apiSpans],
    deletedApiKeys: [...workspace.deletedApiKeys],
    tags: workspace.tags.map((tag) => tag.toTagItem()),
    translations: workspace.translations.map((translation) => 
      translation.toDto(existingDto?.translations?.find(t => t.language === translation.language))
    ),
    // Preserve segments from existing DTO (metadata, not part of entity)
    segments: existingDto?.segments,
  };
}

export function workspaceToPersistence(
  workspace: Workspace,
  existing?: Partial<WorkspacePersistence>
): WorkspacePersistence {
  const dto = workspaceToDto(workspace, existing);
  return {
    ...dto,
    owner: workspace.owner,
    text: workspace.text,
    isTemporary: workspace.isTemporary,
    updatedAt: workspace.updatedAt,
    // Preserve segments from existing persistence (metadata, not part of entity)
    segments: existing?.segments ?? dto.segments,
  };
}




