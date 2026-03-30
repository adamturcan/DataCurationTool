import React, { useState, useEffect } from "react";
import { Menu, MenuItem, Divider, Box, TextField, InputAdornment, IconButton } from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import { ENTITY_COLORS, CATEGORY_LIST } from "../../../../shared/constants/notationEditor.ts";
import type { CategoryMenuProps } from "../../../../types/NotationEditor.ts";

// Add new props for text editing
interface ExtendedMenuProps extends CategoryMenuProps {
  spanText?: string;
  onTextUpdate?: (newText: string) => void;
}

const CategoryMenu: React.FC<ExtendedMenuProps> = ({
  anchorEl,
  onClose,
  onCategorySelect,
  showDelete = false,
  onDelete,
  spanText = "",
  onTextUpdate,
}) => {
  const [localText, setLocalText] = useState("");

  // Sync local input with the selected span's text when the menu opens
  useEffect(() => {
    if (anchorEl) setLocalText(spanText);
  }, [anchorEl, spanText]);

  const handleItemClick = (e: React.MouseEvent, category: string) => {
    e.preventDefault(); 
    e.stopPropagation();
    onCategorySelect(category);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDelete) onDelete();
  };

  const preventFocusLoss = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation(); // crucial so typing space/enter doesn't close the menu
  };

  const handleSaveText = () => {
    if (onTextUpdate && localText !== spanText) {
      onTextUpdate(localText);
    }
  };

  return (
    <Menu
      anchorEl={anchorEl}
      open={!!anchorEl}
      onClose={onClose}
      autoFocus={false} 
      disableAutoFocus={true} 
      disableEnforceFocus={true}
      MenuListProps={{
        dense: true,
        onMouseDown: preventFocusLoss, 
      }}
      PaperProps={{
        sx: { minWidth: 220 } 
      }}
    >
      {/* conditionally show text input ONLY if onTextUpdate is provided */}
      {onTextUpdate && (
        <Box sx={{ px: 2, py: 1.5 }} onKeyDown={preventFocusLoss}>
          <TextField
            size="small"
            fullWidth
            variant="outlined"
            value={localText}
            onChange={(e) => setLocalText(e.target.value)}
            onClick={(e) => e.stopPropagation()} 
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") {
                e.preventDefault(); 
                setTimeout(() => {
                  handleSaveText();
                }, 0);
              }
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton 
                    size="small" 
                    onClick={handleSaveText}
                    disabled={localText === spanText}
                    color="primary"
                  >
                    <CheckIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
        </Box>
      )}

      {/* --- EXISTING CATEGORIES --- */}
      {CATEGORY_LIST.map((category: string) => (
        <MenuItem
          key={category}          
          onMouseDown={preventFocusLoss}
          onClick={(e) => handleItemClick(e, category)}
        >
          <Box
            component="span"
            sx={{
              display: "inline-block",
              width: 10,
              height: 10,
              borderRadius: "50%",
              bgcolor: ENTITY_COLORS[category] ?? "#64748B",
              mr: 1,
            }}
          />
          {category}
        </MenuItem>
      ))}

      {showDelete && onDelete && [
        <Divider key="divider" />,
        <MenuItem
          key="delete"
          onMouseDown={preventFocusLoss}
          onClick={handleDeleteClick}
          sx={{ color: "error.dark", fontWeight: 600 }}
        >
          Delete
        </MenuItem>
      ]}
    </Menu>
  );
};

export default CategoryMenu;