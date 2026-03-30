import React, { useMemo, useState, useCallback, useEffect } from "react";
import { Box, Paper, Typography, Collapse, Divider, Tooltip, Button, IconButton } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import AutoStoriesOutlinedIcon from '@mui/icons-material/AutoStoriesOutlined';
import { sx as sxUtil } from "../../../../shared/styles";
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import CloseIcon from '@mui/icons-material/Close';
import { alpha } from "@mui/material/styles";
import { ENTITY_COLORS } from "../../../../shared/constants/notationEditor";

import TagThesaurusInput, { type ThesaurusItem } from "../inputs/TagThesaurusInput";
import type { ThesaurusIndexItem } from "../../../../types";
import { buildTagHierarchy } from "../../../../shared/utils/thesaurusHelpers";
import TagItem, { type TagRow } from "./TagItem";
import HierarchyGroup from "./HierarchyGroup";

export type { TagRow };

interface Props {
  data: TagRow[];
  onDelete: (name: string, keywordId?: number, parentId?: number) => void;
  thesaurus?: {
    onAdd: (name: string) => void;
    fetchSuggestions: (query: string) => Promise<ThesaurusItem[]>;
    restrictToThesaurus?: boolean;
    onRestrictChange?: (v: boolean) => void;
    defaultRestrictToThesaurus?: boolean;
    placeholder?: string;
    isThesaurusLoading?: boolean;
    resetKey?: string;
  };
  title?: string;
  thesaurusIndex?: ThesaurusIndexItem[];
  onClose?: () => void;
}

const TagTable: React.FC<Props> = ({ data, onDelete, thesaurus, thesaurusIndex, title, onClose }) => {
  const [restrictOnly, setRestrictOnly] = useState(Boolean(thesaurus?.restrictToThesaurus ?? thesaurus?.defaultRestrictToThesaurus ?? false));
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (typeof thesaurus?.restrictToThesaurus === "boolean") setRestrictOnly(thesaurus.restrictToThesaurus);
  }, [thesaurus?.restrictToThesaurus]);

  const handleToggleRestrict = useCallback(() => {
    const newVal = !restrictOnly;
    setRestrictOnly(newVal);
    thesaurus?.onRestrictChange?.(newVal);
  }, [restrictOnly, thesaurus]);

  const toggle = useCallback((k: string) => setCollapsed((prev) => ({ ...prev, [k]: !prev[k] })), []);
  const emptySuggestions = useCallback(async () => [], []);

  const hierarchyTree = useMemo(() => {
    return (thesaurusIndex && thesaurusIndex.length > 0) ? buildTagHierarchy(data, thesaurusIndex) : null;
  }, [data, thesaurusIndex]);

  const groups = useMemo(() => {
    if (hierarchyTree) return [];
    const suggested = data.filter(row => row.source === "api");
    const userTags = data.filter(row => row.source === "user");
    return [
      ...(suggested.length > 0 ? [["Suggested", suggested]] : []),
      ...(userTags.length > 0 ? [["User tags", userTags]] : [])
    ] as Array<[string, TagRow[]]>;
  }, [data, hierarchyTree]);

  return (
    <Paper elevation={0} sx={{ height: "100%", ...sxUtil.flexColumn, bgcolor: "background.paper", borderRadius: "12px" }}>


      {thesaurus && (
        <Box sx={{ px: 1.5, py: 1.5, borderBottom: "1px solid #e2e8f0", ...sxUtil.flexColumn, gap: 1.25 }}>

          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography sx={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "#64748b", letterSpacing: 0.5 }}>
              {title || "Semantic Tags"}
            </Typography>

            <Box sx={{ ...sxUtil.flexRow, gap: 0.5 }}>
              <Tooltip title={restrictOnly ? "Only thesaurus tags are allowed" : "You can type custom tags"}>
                <Button
                  disableElevation
                  onClick={handleToggleRestrict}
                  startIcon={restrictOnly ? <AutoStoriesOutlinedIcon sx={{ fontSize: "16px !important" }} /> : <EditOutlinedIcon sx={{ fontSize: "16px !important" }} />}
                  sx={{
                    borderRadius: "30px",
                    textTransform: "none",
                    fontWeight: 700,
                    fontSize: 11,
                    px: 1.5,
                    height: 26,
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                    transition: "all 0.2s ease",
                    bgcolor: restrictOnly ? alpha(ENTITY_COLORS.DATE, 0.08) : "#f8fafc",
                    color: restrictOnly ? ENTITY_COLORS.DATE : "#64748b",
                    border: `1px solid ${restrictOnly ? alpha(ENTITY_COLORS.DATE, 0.2) : "#E2E8F0"}`,
                    "&:hover": {
                      bgcolor: restrictOnly ? alpha("#1976D2", 0.15) : "#f1f5f9",
                      borderColor: restrictOnly ? alpha("#1976D2", 0.3) : "#cbd5e1"
                    }
                  }}
                >
                  {restrictOnly ? "Thesaurus" : "Free Text"}
                </Button>
              </Tooltip>

              {/* The Close Button */}
              {onClose && (
                <Tooltip title="Hide Panel">
                  <IconButton size="small" onClick={onClose} sx={{ width: 26, height: 26, color: "#94a3b8", bgcolor: "transparent", "&:hover": { bgcolor: "#f1f5f9", color: "#334155" } }}>
                    <CloseIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </Box>

          {/* Full-width Input Row */}
          <TagThesaurusInput
            key={thesaurus.resetKey}
            onAdd={thesaurus.onAdd}
            fetchSuggestions={restrictOnly ? thesaurus.fetchSuggestions : emptySuggestions}
            restrictToThesaurus={restrictOnly}
            placeholder={thesaurus.placeholder}
            isThesaurusLoading={thesaurus.isThesaurusLoading}
          />
        </Box>
      )}

      {/* Tag list */}
      <Box sx={{ flex: 1, overflowY: "auto", overflowX: "hidden", p: 1.5, ...sxUtil.flexColumn, gap: 1 }}>
        {data.length === 0 ? (
          <Typography sx={{ color: "#94a3b8", fontSize: 13, textAlign: "center", mt: 4 }}>No semantic tags yet.<br />Type above to add one.</Typography>
        ) : hierarchyTree ? (
          Array.from(hierarchyTree.values()).sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })).map(rootNode => (
            <HierarchyGroup key={rootNode.fullPath.join(' › ')} node={rootNode} collapsed={collapsed} toggle={toggle} onDelete={onDelete} />
          ))
        ) : (
          groups.map(([groupKey, rows]) => (
            <Box key={groupKey} sx={{ border: "1px dashed #e2e8f0", borderRadius: "12px", background: "#f8fafc" }}>
              <Box onClick={() => toggle(groupKey)} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 1, px: 1.5, cursor: "pointer", "&:hover": { bgcolor: "#f1f5f9", borderRadius: "12px" } }}>
                <Box sx={{ ...sxUtil.flexRow, gap: 1 }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "#64748b", letterSpacing: 0.5 }}>{groupKey}</Typography>
                  <Typography sx={{ fontSize: 11, color: "#94a3b8", fontWeight: 700, bgcolor: "divider", px: 0.8, py: 0.2, borderRadius: "10px" }}>{rows.length}</Typography>
                </Box>
                {collapsed[groupKey] ? <ExpandMoreIcon fontSize="small" sx={{ color: "#94a3b8" }} /> : <ExpandLessIcon fontSize="small" sx={{ color: "#94a3b8" }} />}
              </Box>
              <Collapse in={!collapsed[groupKey]} timeout="auto" unmountOnExit>
                <Divider sx={{ borderColor: "divider" }} />
                <Box sx={{ p: 1 }}>
                  {rows.slice().sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })).map(row => (
                    <TagItem key={`${groupKey}::${row.name}::${row.source}`} row={row} onDelete={onDelete} />
                  ))}
                </Box>
              </Collapse>
            </Box>
          ))
        )}
      </Box>
    </Paper>
  );
};

export default TagTable;