import { Decoration, type DecorationSet, EditorView } from "@codemirror/view";
import { type Range, StateField, Facet } from "@codemirror/state";
import type { NerSpan } from "../../../../../../types";

export const getSpanId = (s: NerSpan) => s.id ?? `span-${s.start}-${s.end}-${s.entity}`;

export const spansFacet = Facet.define<NerSpan[], NerSpan[]>({
  combine: (values) => values[values.length - 1] || [],
});

const buildDecorations = (spans: NerSpan[], docLength: number) => {
  if (!spans || spans.length === 0) return Decoration.none;

  const marks: Range<Decoration>[] = [];
  for (const span of spans) {
    const start = Number(span.start);
    const end = Number(span.end);
    const id = getSpanId(span);

    if (!isNaN(start) && !isNaN(end) && start < end && start < docLength) {
      const safeEnd = Math.min(end, docLength);
      if (start < safeEnd) {
        marks.push(
          Decoration.mark({
            class: `cm-ner-span entity-${(span.entity || "").toLowerCase()}`,
            attributes: { "data-span-id": id },
          }).range(start, safeEnd)
        );
      }
    }
  }
  try { return Decoration.set(marks, true); } catch { return Decoration.none; }
};

export const spanDecorationField = StateField.define<DecorationSet>({
  create(state) {
    return buildDecorations(state.facet(spansFacet), state.doc.length);
  },
  update(decorations, tr) {
    const currentSpans = tr.state.facet(spansFacet);
    const oldSpans = tr.startState.facet(spansFacet);

    if (currentSpans !== oldSpans) return buildDecorations(currentSpans, tr.state.doc.length);

    let nextDecorations = decorations.map(tr.changes);
    const size = nextDecorations.size || 0;

    if (tr.docChanged && size === 0 && currentSpans.length > 0) {
      nextDecorations = buildDecorations(currentSpans, tr.state.doc.length);
    }
    return nextDecorations;
  },
  provide: (f) => EditorView.decorations.from(f),
});