import React, { useState, useMemo } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Typography,
  List,
  ListItem,
  ListItemButton,
} from "@mui/material";
import type { Segment } from "../../../../types";

interface SplitOption {
  position: number; 
  separator: string; 
  beforeText: string; 
  afterText: string; 
}

interface Props {
  open: boolean;
  segment: Segment | null;  
  onClose: () => void;
  onConfirm: (splitPosition: number) => void;
}

const SEPARATORS = ['.', ',', ':', ';', '!', '?', '—', '–'];

const SplitSegmentDialog: React.FC<Props> = ({
  open,
  segment,
  onClose,
  onConfirm,
}) => {
  const [selectedOption, setSelectedOption] = useState<SplitOption | null>(null);

  const splitOptions = useMemo<SplitOption[]>(() => {
    if (!segment) return [];
    
    const segmentText = segment.text;
    const options: SplitOption[] = [];
    
    for (let i = 0; i < segmentText.length; i++) {
      const char = segmentText[i];
      if (SEPARATORS.includes(char)) {
        const absolutePosition = segment.start + i + 1;
        options.push({
          position: absolutePosition,
          separator: char,
          beforeText: segmentText.substring(0, i + 1), 
          afterText: segmentText.substring(i + 1).trimStart(),
        });
      }
    }
    
    return options;
  }, [segment]);

  const handleConfirm = () => {
    if (selectedOption) {
      onConfirm(selectedOption.position);
      setSelectedOption(null);
    }
  };

  const handleClose = () => {
    setSelectedOption(null);
    onClose();
  };

  React.useEffect(() => {
    if (open) {
      setSelectedOption(null);
    }
  }, [open, segment]);

  if (!segment) return null;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>Split Segment</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 3 }}>
          Choose where to split this segment. The separator will remain in the first segment.
        </DialogContentText>

        {splitOptions.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No split points found. This segment doesn't contain common separators (., : ; ! ? — –).
          </Typography>
        ) : (
          <>
            <Typography variant="subtitle2" gutterBottom>
              Full segment text:
            </Typography>
            <Box
              sx={{
                p: 2,
                mb: 3,
                borderRadius: 1,
                backgroundColor: "#F8FAFC",
                border: "1px solid #E2E8F0",
                fontFamily: "DM Mono, monospace",
                fontSize: "0.875rem",
              }}
            >
              {segment.text}
            </Box>

            <Typography variant="subtitle2" gutterBottom>
              Select split point:
            </Typography>
            <List sx={{ maxHeight: 300, overflow: "auto" }}>
              {splitOptions.map((option, index) => (
                <ListItem key={index} disablePadding>
                  <ListItemButton
                    selected={selectedOption === option}
                    onClick={() => setSelectedOption(option)}
                    sx={{
                      borderRadius: 1,
                      mb: 0.5,
                      "&.Mui-selected": {
                        backgroundColor: "rgba(59, 130, 246, 0.1)",
                        "&:hover": {
                          backgroundColor: "rgba(59, 130, 246, 0.15)",
                        },
                      },
                    }}
                  >
                    <Box sx={{ width: "100%" }}>
                      <Box sx={{ display: "flex", gap: 1, mb: 1, alignItems: "center" }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontFamily: "DM Mono, monospace",
                            flex: 1,
                            color: "text.primary",
                          }}
                        >
                          "{option.beforeText}"
                        </Typography>
                        <Box
                          sx={{
                            px: 1,
                            py: 0.25,
                            borderRadius: 0.5,
                            backgroundColor: "#3B82F6",
                            color: "white",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            minWidth: "24px",
                            textAlign: "center",
                          }}
                        >
                          {option.separator}
                        </Box>
                      </Box>
                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily: "DM Mono, monospace",
                          color: "text.secondary",
                          fontSize: "0.8125rem",
                        }}
                      >
                        "{option.afterText}"
                      </Typography>
                    </Box>
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={!selectedOption || splitOptions.length === 0}
        >
          Split Segment
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SplitSegmentDialog;



