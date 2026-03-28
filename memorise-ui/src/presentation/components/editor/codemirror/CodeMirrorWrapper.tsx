import React, { useMemo, useCallback, useRef } from "react";
import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { EditorView } from "@codemirror/view";
import { Transaction } from "@codemirror/state";

import type { NerSpan, SelectionBox, SpanCoordMap } from "../../../../types";

import { editorTheme } from "./theme/theme";
import { spansFacet, spanDecorationField } from "./features/spans/spanDecorations";
import { createSpanProtectionFilter, intentionalTextReplace } from "./features/spans/spanProtection";
import { handleSpanClickEvent } from "./features/spans/spanInteractions";
import { createSelectionObserver } from "./features/core/selectionObserver";

interface Props {
  value: string;
  spans: NerSpan[];
  onChange: (value: string, liveCoords?: SpanCoordMap, deadIds?: string[]) => void;
  onSpanClick?: (span: NerSpan, anchorElement: HTMLElement, replaceTextFn: (newText: string) => void) => void;
  onSelectionChange?: (selection: SelectionBox | null) => void;
  placeholder?: string;
  onDropTextPosition?: (localOffset: number, dataTransfer: DataTransfer) => void;
}

const getSpanId = (s: NerSpan) => s.id ?? `span-${s.start}-${s.end}-${s.entity}`;

export const CodeMirrorWrapper: React.FC<Props> = ({
  value, spans, onChange, onSpanClick, onSelectionChange, placeholder, onDropTextPosition
}) => {
  const selectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorRef = useRef<ReactCodeMirrorRef>(null);

  const extensions = useMemo(() => {
    return [
      EditorView.lineWrapping,
      editorTheme,
      spansFacet.of(spans),
      spanDecorationField,
      createSpanProtectionFilter(),
      createSelectionObserver(spans, onSelectionChange, selectionTimeoutRef),
      EditorView.domEventHandlers({
        dragover(event) {
          if (event.dataTransfer?.types.includes("application/segment-id")) {
            event.preventDefault();
          }
        },
        drop(event, view) {
          if (event.dataTransfer?.types.includes("application/segment-id") && onDropTextPosition) {
            event.preventDefault();

            const pos = view.posAtCoords({ x: event.clientX, y: event.clientY }, false);
            console.log("[CMWrapper Drop] Client coords: ", event.clientX, event.clientY, "-> Extracted View Pos:", pos);

            if (pos !== null) {
              onDropTextPosition(pos, event.dataTransfer);
            }
            return true;
          }
        }
      })
    ];
  }, [spans, onSelectionChange, onDropTextPosition]);

  const handleWrapperClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = (e.target as HTMLElement).closest(".cm-ner-span") as HTMLElement;
    const view = editorRef.current?.view;
    if (target && view && onSpanClick) {
      handleSpanClickEvent(target, view, spans, onSpanClick);
    }
  }, [spans, onSpanClick]);

  return (
    <div
      className="cm-editor-container"
      onClick={handleWrapperClick}
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "transparent",
      }}
    >
      <CodeMirror
        ref={editorRef}
        value={value}
        style={{ width: "100%" }}
        extensions={extensions}
        onChange={(val, viewUpdate) => {
          const isUserEvent = viewUpdate.transactions.some(
            (tr) => tr.annotation(Transaction.userEvent) !== undefined || tr.annotation(intentionalTextReplace)
          );

          if (!isUserEvent) return;

          const decorations = viewUpdate.state.field(spanDecorationField);
          const iter = decorations.iter();
          const liveCoords: SpanCoordMap = new Map();

          while (iter.value !== null) {
            const id = iter.value.spec.attributes["data-span-id"];
            if (id && iter.from < iter.to) {
              liveCoords.set(id, { start: iter.from, end: iter.to });
            }
            iter.next();
          }

          const deadSpanIds = spans.map(getSpanId).filter(id => !liveCoords.has(id));
          onChange(val, liveCoords, deadSpanIds);
        }}
        placeholder={placeholder}
        basicSetup={{ lineNumbers: false, foldGutter: false, highlightActiveLine: false }}
      />
    </div>
  );
};