import React from "react";
import { Box, Fade } from "@mui/material";

import TagTable, { type TagRow } from "./tags/TagTable";
import type { ThesaurusItem } from "./inputs/TagThesaurusInput";
import type { ThesaurusIndexItem } from "../../../types";

export type { TagRow };

const COLORS = { text: "#0F172A", border: "#E2E8F0", pillBg: "white" };

interface Props {
  tags: TagRow[];
  onDeleteTag: (name: string, keywordId?: number, parentId?: number) => void;
  onAddTag: (name: string, keywordId?: number, parentId?: number) => void;
  thesaurus?: {
    fetchSuggestions: (query: string) => Promise<ThesaurusItem[]>;
    restrictToThesaurus?: boolean;
    onRestrictChange?: (v: boolean) => void;
    defaultRestrictToThesaurus?: boolean;
    placeholder?: string;
    isThesaurusLoading?: boolean;
    resetKey?: string;
  };
  thesaurusIndex?: ThesaurusIndexItem[];
  isExpanded: boolean;
  onToggleExpand: (val: boolean) => void;
  activeContext: string;
}

const RightPanel: React.FC<Props> = (props) => {
  return (
    // 1. THE INVISIBLE GHOST LAYOUT
    <Box sx={{
      position: "relative",
      width: props.isExpanded ? 300 : 0,
      height: "100%",
      transition: "width 0.95s ease-in-out",
      mt: -1.1,
      zIndex: 150,
      pointerEvents: props.isExpanded ? "auto" : "none",
      overflow: "visible"
    }}>

      {/* 2. THE SEQUENCED BUBBLE */}
      <Box sx={{
        position: "absolute",
        top: 0,
        right: 0,
        width: props.isExpanded ? "300px" : "42px",
        height: props.isExpanded ? "100%" : "42px",
        transform: props.isExpanded ? "translateX(0px)" : "translateX(calc(-43vw + 21px))",

        opacity: props.isExpanded ? 1 : 0,


        transition: props.isExpanded
          ? "opacity 0.01s linear 0s, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s, width 0.25s ease-out 0.4s, height 0.3s ease-out 0.65s, border-radius 0.3s ease 0.65s"
          : "height 0.3s ease-in 0s, border-radius 0.3s ease 0s, width 0.25s ease-in 0.3s, transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) 0.55s, opacity 0.1s linear 0.85s",

        background: "#FFFFFF",
        border: `1px solid ${COLORS.border}`,


        boxShadow: props.isExpanded
          ? "0 14px 40px rgba(0,0,0,0.2), 0 4px 12px rgba(0,0,0,0.1)"
          : "0 8px 24px rgba(0,0,0,0.3), 0 2px 6px rgba(0,0,0,0.2)",

        borderRadius: props.isExpanded ? "12px" : "21px",
        overflow: "hidden",
        pointerEvents: "auto"
      }}>

        <Box sx={{ position: "relative", minWidth: 300, height: "100%", display: "flex", flexDirection: "column" }}>

          <Fade in={props.isExpanded} timeout={{ enter: 950, exit: 50 }}>
            <Box sx={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
              <TagTable
                data={props.tags}
                onDelete={props.onDeleteTag}
                thesaurus={props.thesaurus ? { ...props.thesaurus, onAdd: props.onAddTag } : undefined}
                thesaurusIndex={props.thesaurusIndex}
                title={props.activeContext}
                onClose={() => props.onToggleExpand(false)}
              />
            </Box>
          </Fade>

        </Box>
      </Box>
    </Box>
  );
};

export default RightPanel;