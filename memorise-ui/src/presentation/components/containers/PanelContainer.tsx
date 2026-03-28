import React, { useCallback, useMemo, useEffect } from "react";
import { useParams } from "react-router-dom";
import RightPanel, { type TagRow } from "../rightPanel/RightPanel";
import type { ThesaurusItem } from "../rightPanel/inputs/TagThesaurusInput";
import { useSessionStore, useNotificationStore } from "../../stores";
import { useThesaurusDisplay, useThesaurusWorker } from "../../hooks";
import { taggingWorkflowService } from "../../../application/services/TaggingWorkflowSercice.ts";

const PanelContainer: React.FC = () => {
  const { id: routeId } = useParams();
  const session = useSessionStore((state) => state.session);
  const activeSegmentId = useSessionStore((state) => state.activeSegmentId);

  const currentId = routeId ?? session?.id ?? null;
  const tags = session?.tags ?? [];

  const thesaurusWorker = useThesaurusWorker();
  const thesaurusIndexForDisplay = useThesaurusDisplay(thesaurusWorker);

  const notify = useNotificationStore((state) => state.enqueue);

  const filteredTags = useMemo(() => {
    if (activeSegmentId && activeSegmentId !== "root") {
      return tags.filter(t => t.segmentId === activeSegmentId);
    }
    // Document level: show all tags deduplicated across segments
    const seen = new Set<string>();
    return tags.filter(t => {
      const key = `${t.name.toLowerCase()}|${t.label ?? ""}|${t.parentId ?? ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [tags, activeSegmentId]);

  const isTagPanelOpen = useSessionStore((state) => state.isTagPanelOpen);
  const setTagPanelOpen = useSessionStore((state) => state.setTagPanelOpen);

  useEffect(() => {
    if (filteredTags.length > 0) {
      setTagPanelOpen(true);
    } else {
      setTagPanelOpen(false);
    }
  }, [filteredTags.length, setTagPanelOpen]);



  const tagRows = useMemo<TagRow[]>(
    () => filteredTags.map((t) => ({
      name: t.name,
      source: t.source,
      keywordId: t.label ? Number(t.label) : undefined,
      parentId: t.parentId
    })),
    [filteredTags]
  );

  const addTag = useCallback(async (name: string, keywordId?: number, parentId?: number) => {
    try {
      const result = await taggingWorkflowService.addCustomTag(name, {
        keywordId,
        parentId,
        segmentId: (activeSegmentId && activeSegmentId !== "root") ? activeSegmentId : undefined
      }, tags);

      if (result.ok) {
        useSessionStore.getState().updateSession({ tags: result.tags ?? [] });
      }
      notify(result.notice);

      setTagPanelOpen(true);
    } catch {
      //TODO: handle error
    }
  }, [activeSegmentId, tags, notify]);

  const deleteTag = useCallback(
    (name: string, keywordId?: number, parentId?: number) => {
      const result = taggingWorkflowService.deleteTag(name, keywordId, parentId, tags, activeSegmentId);
      if (result.ok) {
        useSessionStore.getState().updateSession({ tags: result.tags ?? [] });
      }
      notify(result.notice);
    },
    [activeSegmentId, tags, notify]
  );

  const fetchThesaurus = useCallback(async (q: string): Promise<ThesaurusItem[]> => {
    if (!q.trim() || !thesaurusWorker.ready) return [];
    try {
      return (await thesaurusWorker.search(q, 20)).map(item => ({
        name: item.label, path: item.path, keywordId: item.id, parentId: item.parentId,
        isPreferred: item.isPreferred, depth: item.depth
      }));
    } catch {
      return [];
    }
  }, [thesaurusWorker]);

  const thesaurusConfig = useMemo(() => ({
    fetchSuggestions: fetchThesaurus, defaultRestrictToThesaurus: false,
    isThesaurusLoading: !thesaurusWorker.ready, resetKey: currentId ?? undefined
  }), [fetchThesaurus, thesaurusWorker.ready, currentId]);

  return (
    <RightPanel
      tags={tagRows}
      onDeleteTag={deleteTag}
      onAddTag={addTag}
      thesaurus={thesaurusConfig}
      thesaurusIndex={thesaurusIndexForDisplay}
      isExpanded={isTagPanelOpen}
      onToggleExpand={setTagPanelOpen}
      activeContext={activeSegmentId && activeSegmentId !== "root" ? "Segment Tags" : "Document Tags"}
    />
  );
};

export default PanelContainer;