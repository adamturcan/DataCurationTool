import type { Segment } from "./Segment";


export type NerSpan = {
  id?: string;
  origin?: 'api' | 'user';

  start: number;
  end: number;
  entity: string;
  score?: number;
};

export type SelectionBox = {
  start: number;
  end: number;
  top: number;
  left: number;
};

export type SpanCoordMap = Map<string, { start: number; end: number }>;

export type SpanBox = {
  top: number;
  left: number;
  span: NerSpan;
};

export type DeletionWarningBox = {
  top: number;
  left: number;
  affectedSpans: NerSpan[];
};

export type LeafInfo = {
  path: number[];
  gStart: number;
  gEnd: number;
  len: number
};

export interface NotationEditorProps {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  spans?: NerSpan[];
  onDeleteSpan?: (span: NerSpan) => void;
  highlightedCategories?: string[];
  onSelectionChange?: (sel: { start: number; end: number } | null) => void;
  onSpansAdjusted?: (next: NerSpan[]) => void;
  onSegmentsAdjusted?: (next: Segment[]) => void;
  deletableKeys?: Set<string>;
  onAddSpan?: (span: NerSpan) => void;
  segments?: Segment[];
  activeSegmentId?: string;

  viewMode?: "document" | "segments";
}



export interface CategoryMenuProps {
  anchorEl: HTMLElement | null;
  open?: boolean;
  onClose: () => void;
  onCategorySelect: (category: string) => void;
  onMouseDown?: (event: React.MouseEvent) => void;
  showDelete?: boolean;
  onDelete?: () => void;
}

export interface EditorContainerProps {
  children: React.ReactNode;
  containerRef: React.RefObject<HTMLDivElement | null>;
}