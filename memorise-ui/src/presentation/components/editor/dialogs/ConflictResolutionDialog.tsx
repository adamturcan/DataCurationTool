import React from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";

import type {
  ConflictPrompt,
  ConflictSource,
  ConflictEntry,
} from "../../../../core/services/resolveApiSpanConflicts";
import { ENTITY_COLORS, hexToRgba } from "../../../../shared/constants/notationEditor";

interface Props {
  prompt: ConflictPrompt;
  onKeepExisting: () => void;
  onKeepApi: () => void;
}

const chipBySource: Record<ConflictSource, { label: string; color: "primary" | "secondary"; variant: "filled" | "outlined" }> = {
  user: { label: "Your annotation", color: "primary", variant: "filled" },
  api: { label: "Existing API span", color: "secondary", variant: "outlined" },
};

const getEntityColor = (entity: string) => ENTITY_COLORS[entity] ?? "#94A3B8";

const ConflictResolutionDialog: React.FC<Props> = ({
  prompt,
  onKeepExisting,
  onKeepApi,
}) => {
  const { candidate, conflicts, index, total } = prompt;
  const candidateColor = getEntityColor(candidate.span.entity);

  return (
    <Dialog
      open
      onClose={(_, reason) => {
        if (reason === "backdropClick" || reason === "escapeKeyDown") {
          return;
        }
        onKeepExisting();
      }}
      aria-labelledby="ner-conflict-dialog-title"
      aria-describedby="ner-conflict-dialog-description"
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown
    >
      <DialogTitle id="ner-conflict-dialog-title">
        Resolve annotation conflict
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="ner-conflict-dialog-description" sx={{ mb: 2 }}>
          Conflict {index} of {total}
        </DialogContentText>
        <DialogContentText sx={{ mb: 3 }}>
          We found overlapping annotations. Choose which annotation you want to keep.
        </DialogContentText>

        <Box
          sx={{
            borderRadius: 2,
            border: `1px solid ${hexToRgba(candidateColor, 0.7)}`,
            p: 2,
            mb: 3,
            backgroundColor: hexToRgba(candidateColor, 0.1),
          }}
        >
          <Typography variant="subtitle2" gutterBottom>
            API suggestion
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="body1" sx={{ fontFamily: "DM Mono, monospace" }}>
              “{candidate.snippet}”
            </Typography>
            <Chip
              label={candidate.span.entity}
              size="small"
              sx={{
                backgroundColor: candidateColor,
                color: "#fff",
              }}
            />
          </Stack>
        </Box>

        <Typography variant="subtitle2" gutterBottom>
          Conflicting annotations
        </Typography>
        <Stack spacing={1.5}>
          {conflicts.map((conflict: ConflictEntry, index: number) => {
            const chip = chipBySource[conflict.source];
            return (
              <Box
                key={`${conflict.span.start}:${conflict.span.end}:${conflict.span.entity}:${index}`}
                sx={{
                  borderRadius: 1,
                  border: `1px solid ${hexToRgba(getEntityColor(conflict.span.entity), 0.7)}`,
                  p: 1.5,
                  backgroundColor: hexToRgba(getEntityColor(conflict.span.entity), 0.06),
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography
                    variant="body2"
                    sx={{ fontFamily: "DM Mono, monospace", flexGrow: 1 }}
                  >
                    “{conflict.snippet}”
                  </Typography>
                  <Chip
                    label={conflict.span.entity}
                    size="small"
                    sx={{
                      backgroundColor: getEntityColor(conflict.span.entity),
                      color: "#fff",
                    }}
                  />
                  <Chip
                    label={chip.label}
                    size="small"
                    color={chip.color}
                    variant={chip.variant}
                  />
                </Stack>
              </Box>
            );
          })}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onKeepExisting} color="primary">
          Keep existing
        </Button>
        <Button onClick={onKeepApi} color="secondary" variant="contained">
          Use API suggestion
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConflictResolutionDialog;

