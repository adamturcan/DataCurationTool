import React from "react";
import { Box, Typography, Collapse, Divider } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import TagItem from "./TagItem";
import { sx as sxUtil } from "../../../../shared/styles";
import { countAllTags } from "../../../../shared/utils/thesaurusHelpers";
import type { HierarchyNode } from "../../../../shared/utils/thesaurusHelpers";

interface HierarchyGroupProps {
  node: HierarchyNode; depth?: number; collapsed: Record<string, boolean>; toggle: (k: string) => void;
  onDelete: (name: string, keywordId?: number, parentId?: number) => void;
}

/** Renders a collapsible group of tags arranged in a thesaurus hierarchy tree */
const HierarchyGroup: React.FC<HierarchyGroupProps> = React.memo(({ node, depth = 0, collapsed, toggle, onDelete }) => {
  const groupKey = node.fullPath.join(' › ');
  const isCollapsed = !!collapsed[groupKey];

  return (
    <Box sx={{ border: (t) => `1px dashed ${t.palette.divider}`, borderRadius: "12px", background: "#f8fafc", mb: 0.5, mx: 0.5, width: Math.max(200, 280 - depth * 20) }}>
      <Box onClick={() => toggle(groupKey)} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 0.75, px: 1, cursor: "pointer", userSelect: "none", "&:hover": { bgcolor: "#f1f5f9", borderRadius: "12px" } }}>
        <Box sx={{ ...sxUtil.flexRow, gap: 1, flex: 1, minWidth: 0 }}>
          {depth > 0 && <Box sx={{ width: 3, height: 16, borderRadius: 1, bgcolor: '#cbd5e1', flexShrink: 0 }} />}
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#334155", ...sxUtil.truncate }} title={groupKey}>{node.label}</Typography>
        </Box>
        <Typography sx={{ fontSize: 11, color: "#94a3b8", fontWeight: 700, mr: 0.5 }}>{countAllTags(node)}</Typography>
        {(node.tags.length > 0 || node.children.size > 0) && (isCollapsed ? <ExpandMoreIcon fontSize="small" sx={{ color: "#94a3b8" }} /> : <ExpandLessIcon fontSize="small" sx={{ color: "#94a3b8" }} />)}
      </Box>

      <Collapse in={!isCollapsed} timeout="auto" unmountOnExit>
        {node.tags.length > 0 && (
          <Box sx={{ px: 1, pb: 1 }}>
            <Divider sx={{ borderColor: "divider", mb: 0.5 }} />
            {node.tags.slice().sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })).map((row) => (
              <TagItem key={`${groupKey}::${row.name}::${row.source}`} row={row} onDelete={onDelete} />
            ))}
          </Box>
        )}
        {node.children.size > 0 && (
          <Box sx={{ px: 1, pb: 1, pt: node.tags.length > 0 ? 0 : 1 }}>
            {Array.from(node.children.values()).sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })).map((childNode) => (
              <HierarchyGroup key={childNode.fullPath.join(' › ')} node={childNode} depth={depth + 1} collapsed={collapsed} toggle={toggle} onDelete={onDelete} />
            ))}
          </Box>
        )}
      </Collapse>
    </Box>
  );
});
HierarchyGroup.displayName = "HierarchyGroup";
export default HierarchyGroup;