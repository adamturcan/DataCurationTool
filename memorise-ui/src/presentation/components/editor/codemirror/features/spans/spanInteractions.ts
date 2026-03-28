import { EditorView } from "@codemirror/view";
import { spanDecorationField, getSpanId } from "./spanDecorations";
import { intentionalTextReplace } from "./spanProtection";
import type { NerSpan } from "../../../../../../types";

export const handleSpanClickEvent = (
  target: HTMLElement,
  view: EditorView,
  spans: NerSpan[],
  onSpanClick: (span: NerSpan, anchor: HTMLElement, replaceFn: (text: string) => void) => void
) => {
  const spanId = target.getAttribute("data-span-id");
  if (!spanId) return;

  const decorations = view.state.field(spanDecorationField);
  const iter = decorations.iter();

  let currentStart = -1;
  let currentEnd = -1;

  while (iter.value !== null) {
    if (iter.value.spec.attributes["data-span-id"] === spanId) {
      currentStart = iter.from;
      currentEnd = iter.to;
      break;
    }
    iter.next();
  }

  const clickedSpan = spans.find((s) => getSpanId(s) === spanId);
  if (!clickedSpan || currentStart === -1) return;

  const replaceTextFn = (newText: string) => {
    const liveIter = view.state.field(spanDecorationField).iter();
    let liveStart = currentStart;
    let liveEnd = currentEnd;

    while (liveIter.value !== null) {
      if (liveIter.value.spec.attributes["data-span-id"] === spanId) {
        liveStart = liveIter.from;
        liveEnd = liveIter.to;
        break;
      }
      liveIter.next();
    }

    view.dispatch({
      annotations: intentionalTextReplace.of(true),
      changes: { from: liveStart, to: liveEnd, insert: newText },
    });
  };

  onSpanClick(
    { ...clickedSpan, id: spanId, start: currentStart, end: currentEnd },
    target,
    replaceTextFn
  );
};