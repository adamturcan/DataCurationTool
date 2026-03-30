import React from "react";
import { Box, IconButton, Typography } from "@mui/material";
import ClearIcon from "@mui/icons-material/Clear";
import { alpha } from "@mui/material/styles";
import { ENTITY_COLORS } from "../../../../shared/constants/notationEditor";
import { sx as sxUtil } from "../../../../shared/styles";

export type TagRow = {
  name: string;
  source: "api" | "user";
  keywordId?: number;
  parentId?: number;
  hierarchicalPath?: string[];
  isCategory?: boolean;
};

interface TagItemProps {
  row: TagRow;
  onDelete: (name: string, keywordId?: number, parentId?: number) => void;
}

const TagItem: React.FC<TagItemProps> = React.memo(({ row, onDelete }) => {
  const isUser = row.source === "user";
  const mainColor = isUser ? ENTITY_COLORS.PER : ENTITY_COLORS.DATE;

  return (
    <Box sx={{ ...sxUtil.flexRow, gap: 0.5, py: 0.5, "&:hover .delete-btn": { opacity: 1 } }}>
      <Box sx={{ 
        flex: 1, minWidth: 0, 
        backgroundColor: alpha(mainColor, 0.08), 
        borderRadius: "999px", 
        px: 1.5, py: 0.5, 
        border: `1px solid ${alpha(mainColor, 0.2)}`, 
        overflow: 'hidden' 
      }}>
        <Typography sx={{ m: 0, fontSize: 12, fontWeight: 600, color: mainColor, lineHeight: 1.2, ...sxUtil.truncate }} title={row.name}>
          {row.name}
        </Typography>
      </Box>
      <IconButton 
        className="delete-btn"
        onClick={() => onDelete(row.name, row.keywordId, row.parentId)} 
        size="small" 
        sx={{ color: alpha(mainColor, 0.6), width: 24, height: 24, flexShrink: 0, opacity: 0.4, transition: "all 0.2s", "&:hover": { bgcolor: alpha(mainColor, 0.1), color: mainColor, opacity: 1 } }}
      >
        <ClearIcon sx={{ fontSize: 14 }} />
      </IconButton>
    </Box>
  );
});

TagItem.displayName = "TagItem";
export default TagItem;