import React from "react";
import { Box, Menu, MenuItem, Typography } from "@mui/material";

import CallSplitIcon from "@mui/icons-material/CallSplit";

import { useSessionStore, useNotificationStore } from "../../stores";
import { useLanguageOptions, useLayerOperations, useEditorOperations, useSpanInteractions, useSegmentSplitMerge } from "../../hooks";
import { ConflictResolutionDialog, ActionGuardDialog } from "../editor/dialogs";
import { EditorGlobalMenu, CategoryMenu } from "../editor/menus";
import { SegmentBlock } from "../editor/SegmentBlock";
import type { SegmentHandlers, SegmentTranslationHandlers } from "../editor/SegmentBlock";
import { SegmentDragProvider } from "../editor/context/SegmentDragContext";
import { COLORS } from "../editor/utils/editorUtils";

const EditorContainer: React.FC = () => {
  const notify = useNotificationStore.getState().enqueue;
  const { session, draftText, activeSegmentId, setActiveSegmentId } = useSessionStore();

  const setTagPanelOpen = useSessionStore((state) => state.setTagPanelOpen);
  const isTagPanelOpen = useSessionStore((state) => state.isTagPanelOpen);

  const { languageOptions, isLanguageListLoading } = useLanguageOptions();

  const layers = useLayerOperations();
  const ops = useEditorOperations(layers);
  const splits = useSegmentSplitMerge();
  const spans = useSpanInteractions(layers, splits.setSplitAnchor, () => splits.setSplitAnchor(null));

  return (
    <div style={{ height: "100%", width: "100%", display: "flex", flexDirection: "column", boxSizing: "border-box", overflow: "hidden", backgroundColor: "transparent" }}>

      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", pt: 2, pb: 1, zIndex: 50 }}>
        <EditorGlobalMenu
          onNer={ops.handleRunGlobalNer}
          onSegment={ops.handleRunGlobalSegment}
          onSemTag={ops.handleRunGlobalSemTag}
          onSave={ops.handleSave}
          onTranslateAll={ops.handleRunGlobalTranslate}
          isProcessing={ops.isProcessing}
          isTagPanelOpen={isTagPanelOpen}
          onToggleTagPanel={(isOpen) => {
            setTagPanelOpen(isOpen);
            if (isOpen) {
              setActiveSegmentId(undefined);
            }
          }}
          hasActiveSegment={!!activeSegmentId && activeSegmentId !== "root"}
          hasSegments={(session?.segments?.length ?? 0) > 0}
          isAlreadySegmented={(session?.segments?.length ?? 0) > 1}
          languageOptions={languageOptions}
          isLanguageListLoading={isLanguageListLoading}
        />
      </Box>

      <Box sx={{ flexGrow: 1, overflowY: "auto", width: "100%", px: { xs: 2, md: 4 }, py: 2 }}>
        <Box sx={{ borderRadius: "8px", border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.04)", overflow: "hidden", backgroundColor: "transparent" }}>
          {!session?.segments || session.segments.length === 0 ? (
            <SegmentDragProvider onDraggingChange={splits.setDraggingFromIndex} draggingFromIndex={splits.draggingFromIndex}>
              <SegmentBlock
                segment={{ id: "root", start: 0, end: draftText.length, text: draftText, order: 0 }}
                index={0}
                session={session}
                display={{ isActive: activeSegmentId === "root", isDragging: false, dropDisabled: false }}
                handlers={{
                  onActivate: () => setActiveSegmentId("root"),
                  onJoinUp: splits.handleJoinUp,
                  onRunNer: ops.handleRunSegmentNer,
                  onRunSemTag: ops.handleRunSegmentSemTag,
                  onSpanClick: spans.handleSpanClick,
                  onSelectionChange: spans.handleSelectionChange,
                  onTextChange: ops.handleTextChange,
                  onShiftBoundary: splits.handleShiftBoundary,
                }}
                translationHandlers={{
                  onAddTranslation: ops.handleTranslateSegment,
                  onDeleteTranslation: ops.handleDeleteSegmentTranslation,
                  onUpdateTranslation: ops.handleUpdateSegmentTranslation,
                  languageOptions: languageOptions,
                  isLanguageListLoading: isLanguageListLoading,
                }}
                dragHandlers={{}}
              />
            </SegmentDragProvider>
          ) : (
            <SegmentDragProvider onDraggingChange={splits.setDraggingFromIndex} draggingFromIndex={splits.draggingFromIndex}>
              {session.segments.map((segment, idx) => {
                const isDragging = splits.draggingFromIndex !== null;
                const dropDisabled = splits.draggingFromIndex !== null && idx <= splits.draggingFromIndex;

                const handlers: SegmentHandlers = {
                  onActivate: () => setActiveSegmentId(segment.id),
                  onJoinUp: splits.handleJoinUp,
                  onRunNer: ops.handleRunSegmentNer,
                  onRunSemTag: ops.handleRunSegmentSemTag,
                  onSpanClick: spans.handleSpanClick,
                  onSelectionChange: spans.handleSelectionChange,
                  onTextChange: ops.handleTextChange,
                  onShiftBoundary: splits.handleShiftBoundary,
                  onInvalidDrop: () => notify({ message: "Cannot drop boundary here — target is above the source or showing a translation view.", tone: "warning" }),
                };

                const translationHandlers: SegmentTranslationHandlers = {
                  onAddTranslation: ops.handleTranslateSegment,
                  onDeleteTranslation: ops.handleDeleteSegmentTranslation,
                  onUpdateTranslation: ops.handleUpdateSegmentTranslation,
                  languageOptions: languageOptions,
                  isLanguageListLoading: isLanguageListLoading,
                };

                return (
                  <SegmentBlock
                    key={segment.id}
                    segment={segment}
                    index={idx}
                    session={session}
                    display={{ isActive: activeSegmentId === segment.id, isDragging, dropDisabled }}
                    handlers={handlers}
                    translationHandlers={translationHandlers}
                    dragHandlers={{ prevSegmentId: idx > 0 ? session.segments?.[idx - 1].id : undefined }}
                  />
                );
              })}
            </SegmentDragProvider>
          )}
        </Box>
        <Box sx={{ minHeight: "100px" }} />
      </Box>

      {/* MENUS */}
      <CategoryMenu
        anchorEl={spans.menuAnchor} open={Boolean(spans.menuAnchor)} onClose={spans.closeEditMenu}
        onCategorySelect={spans.handleCategorySelect}
        showDelete={true}
        onDelete={spans.handleDeleteSpan}
        spanText={spans.spanText}
        onTextUpdate={spans.handleUpdateSpanText}
      />

      <CategoryMenu anchorEl={spans.virtualElement} open={Boolean(spans.virtualElement)} onClose={() => spans.setNewSelection(null)} onCategorySelect={spans.handleCreateSpan} showDelete={false} />

      <Menu
        open={Boolean(splits.splitAnchor)}
        anchorReference="anchorPosition"
        anchorPosition={splits.splitAnchor ? { top: splits.splitAnchor.top, left: splits.splitAnchor.left } : undefined}
        onClose={() => splits.setSplitAnchor(null)}
        PaperProps={{ sx: { borderRadius: 2, mt: 1, boxShadow: "0 8px 16px rgba(0,0,0,0.1)" } }}
      >
        <MenuItem onClick={splits.handleConfirmSplit} sx={{ gap: 1.5, py: 1.2, px: 2 }}>
          <CallSplitIcon fontSize="small" sx={{ color: COLORS.dateBlue }} />
          <Typography variant="body2" fontWeight={600}>Split segment here</Typography>
        </MenuItem>
      </Menu>

      {ops.conflictPrompt && (
        <ConflictResolutionDialog
          prompt={ops.conflictPrompt}
          onKeepExisting={() => ops.resolveConflictPrompt("existing")}
          onKeepApi={() => ops.resolveConflictPrompt("api")}
        />
      )}

      {splits.guardDialogProps && (
        <ActionGuardDialog {...splits.guardDialogProps} onClose={splits.closeGuardDialog} />
      )}
    </div>
  );
};

export default EditorContainer;
