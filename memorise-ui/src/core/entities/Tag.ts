import type { TagItem, TagSource } from '../../types';

export interface TagProps {
  name: string;
  source: TagSource;
  label?: number;
  parentId?: number;
  segmentId?: string;
}

/**
 * Immutable Tag value object.
 */
export class Tag {
  private readonly props: TagProps;

  private constructor(props: TagProps) {
    this.props = Object.freeze({ ...props });
  }

  static create(props: TagProps): Tag {
    const { name, source, label, parentId, segmentId } = props;

    if (!name || name.trim().length === 0) {
      throw new Error('Tag name is required');
    }

    return new Tag({
      name: name.trim(),
      source,
      label,
      parentId,
      segmentId,
    });
  }

  static fromTagItem(item: TagItem): Tag {
    return Tag.create({
      name: item.name,
      source: item.source,
      label: item.label,
      parentId: item.parentId,
      segmentId: item.segmentId,
    });
  }

  get name(): string {
    return this.props.name;
  }

  get source(): TagSource {
    return this.props.source;
  }

  get label(): number | undefined {
    return this.props.label;
  }

  get parentId(): number | undefined {
    return this.props.parentId;
  }

  get segmentId(): string | undefined {
    return this.props.segmentId;
  }

  equals(other: Tag): boolean {
    return (
      this.name === other.name &&
      this.source === other.source &&
      this.label === other.label &&
      this.parentId === other.parentId &&
      this.segmentId === other.segmentId
    );
  }

  toTagItem(): TagItem {
    return {
      name: this.name,
      source: this.source,
      label: this.label,
      parentId: this.parentId,
      segmentId: this.segmentId,
    };
  }
}



