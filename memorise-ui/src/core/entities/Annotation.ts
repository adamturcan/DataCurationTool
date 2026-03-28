import type { NerSpan } from '../../types';

export interface AnnotationProps {
  start: number;
  end: number;
  entity: string;
  score?: number;
}

/**
 * Immutable domain entity representing an annotation span.
 */
export class Annotation {
  private readonly props: AnnotationProps;

  private constructor(props: AnnotationProps) {
    this.props = Object.freeze({ ...props });
  }

  /**
   * Factory for creating an Annotation with validation.
   */
  static create(props: AnnotationProps): Annotation {
    const { start, end, entity, score } = props;

    if (!Number.isFinite(start) || start < 0) {
      throw new Error('Annotation start position must be non-negative');
    }

    if (!Number.isFinite(end) || end <= start) {
      throw new Error('Annotation end position must be greater than start position');
    }

    if (!entity || entity.trim().length === 0) {
      throw new Error('Annotation entity type is required');
    }

    return new Annotation({
      start,
      end,
      entity: entity.trim(),
      score,
    });
  }

  /**
   * Build an annotation entity from a NerSpan DTO.
   */
  static fromSpan(span: NerSpan): Annotation {
    return Annotation.create({
      start: span.start,
      end: span.end,
      entity: span.entity,
      score: span.score,
    });
  }

  get start(): number {
    return this.props.start;
  }

  get end(): number {
    return this.props.end;
  }

  get entity(): string {
    return this.props.entity;
  }

  get score(): number | undefined {
    return this.props.score;
  }

  /**
   * Determines whether this annotation overlaps another.
   */
  overlapsWith(other: Annotation): boolean {
    return !(this.end <= other.start || this.start >= other.end);
  }

  /**
   * Convert to NerSpan DTO.
   */
  toSpan(): NerSpan {
    return {
      start: this.start,
      end: this.end,
      entity: this.entity,
      score: this.score,
    };
  }
}



