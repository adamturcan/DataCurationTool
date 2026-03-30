import React, { useState, useCallback } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import BlockIcon from "@mui/icons-material/Block";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { ENTITY_COLORS } from "../../../../shared/constants/notationEditor";

// Types

export type ActionGuardMode = "block" | "confirm" | "resolution";

export type ResolutionStep = {
  label: string;
  action: () => Promise<void>;
};

export interface ActionGuardDialogProps {
  open: boolean;
  onClose: () => void;
  mode: ActionGuardMode;

  title: string;
  description: string;

  // confirm mode
  onConfirm?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;

  // resolution mode
  resolutionLabel?: string;
  resolutionSteps?: ResolutionStep[];
  onResolutionComplete?: () => void | Promise<void>;
}

// Helpers

type ExecState = "idle" | "executing" | "success" | "error";

const MODE_ICON: Record<ActionGuardMode, React.ReactNode> = {
  block: <BlockIcon sx={{ color: "error.main", fontSize: 28 }} />,
  confirm: <WarningAmberIcon sx={{ color: "warning.main", fontSize: 28 }} />,
  resolution: <InfoOutlinedIcon sx={{ color: ENTITY_COLORS.DATE, fontSize: 28 }} />,
};

const MODE_TITLE_COLOR: Record<ActionGuardMode, string> = {
  block: "#DC2626",  // error.main
  confirm: "#ed6c02", // warning.main
  resolution: ENTITY_COLORS.DATE,
};

// Component

const ActionGuardDialog: React.FC<ActionGuardDialogProps> = ({
  open,
  onClose,
  mode,
  title,
  description,
  onConfirm,
  confirmLabel = "Proceed",
  cancelLabel = "Cancel",
  resolutionLabel = "Resolve & Continue",
  resolutionSteps = [],
  onResolutionComplete,
}) => {
  const [execState, setExecState] = useState<ExecState>("idle");
  const [completedSteps, setCompletedSteps] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  const isExecuting = execState === "executing";

  const handleClose = useCallback(() => {
    if (isExecuting) return;
    setExecState("idle");
    setCompletedSteps(0);
    setErrorMessage("");
    onClose();
  }, [isExecuting, onClose]);

  const handleConfirm = useCallback(() => {
    onConfirm?.();
    handleClose();
  }, [onConfirm, handleClose]);

  const handleResolution = useCallback(async () => {
    setExecState("executing");
    setCompletedSteps(0);
    setErrorMessage("");

    for (let i = 0; i < resolutionSteps.length; i++) {
      try {
        await resolutionSteps[i].action();
        setCompletedSteps(i + 1);
      } catch (err) {
        setExecState("error");
        setErrorMessage(
          err instanceof Error ? err.message : "An unexpected error occurred."
        );
        return;
      }
    }

    setExecState("success");

    try {
      await onResolutionComplete?.();
      handleClose();
    } catch (err) {
      setExecState("error");
      setErrorMessage(
        "Resolution succeeded but the final action failed: " +
        (err instanceof Error ? err.message : "Unknown error")
      );
    }
  }, [resolutionSteps, onResolutionComplete, handleClose]);

  return (
    <Dialog
      open={open}
      onClose={(_, reason) => {
        if (reason === "backdropClick" || reason === "escapeKeyDown") {
          if (isExecuting) return;
        }
        handleClose();
      }}
      maxWidth={mode === "resolution" ? "md" : "sm"}
      fullWidth
      disableEscapeKeyDown={isExecuting}
      aria-labelledby="action-guard-dialog-title"
    >
      <DialogTitle
        id="action-guard-dialog-title"
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          color: MODE_TITLE_COLOR[mode],
        }}
      >
        {MODE_ICON[mode]}
        {title}
      </DialogTitle>

      <DialogContent>
        <DialogContentText sx={{ mb: mode === "resolution" ? 2.5 : 0 }}>
          {description}
        </DialogContentText>

        {/* Resolution step list */}
        {mode === "resolution" && resolutionSteps.length > 0 && (
          <List dense disablePadding>
            {resolutionSteps.map((step, i) => {
              const isDone = i < completedSteps;
              const isRunning = isExecuting && i === completedSteps;
              const isFailed = execState === "error" && i === completedSteps;

              return (
                <ListItem key={i} sx={{ py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    {isDone && (
                      <CheckCircleIcon
                        sx={{ color: "success.main", fontSize: 20 }}
                      />
                    )}
                    {isRunning && !isFailed && (
                      <CircularProgress size={18} sx={{ color: ENTITY_COLORS.DATE }} />
                    )}
                    {isFailed && (
                      <ErrorIcon sx={{ color: "error.main", fontSize: 20 }} />
                    )}
                    {!isDone && !isRunning && !isFailed && (
                      <RadioButtonUncheckedIcon
                        sx={{ color: "grey.400", fontSize: 20 }}
                      />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={step.label}
                    primaryTypographyProps={{
                      variant: "body2",
                      sx: {
                        fontWeight: isDone ? 500 : 400,
                        color: isDone ? "text.secondary" : "text.primary",
                      },
                    }}
                  />
                </ListItem>
              );
            })}
          </List>
        )}

        {/* Error message */}
        {execState === "error" && errorMessage && (
          <Box
            sx={{
              mt: 2,
              p: 1.5,
              borderRadius: 1,
              bgcolor: "error.50",
              border: "1px solid",
              borderColor: "error.200",
            }}
          >
            <Typography variant="body2" color="error.main">
              {errorMessage}
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        {mode === "block" && (
          <Button onClick={handleClose} variant="contained" color="primary">
            Close
          </Button>
        )}

        {mode === "confirm" && (
          <>
            <Button onClick={handleClose}>{cancelLabel}</Button>
            <Button
              onClick={handleConfirm}
              variant="contained"
              color="warning"
            >
              {confirmLabel}
            </Button>
          </>
        )}

        {mode === "resolution" && (
          <>
            <Button onClick={handleClose} disabled={isExecuting}>
              {cancelLabel}
            </Button>
            <Button
              onClick={handleResolution}
              variant="contained"
              disabled={isExecuting || execState === "success"}
              sx={{
                bgcolor: ENTITY_COLORS.DATE,
                "&:hover": { bgcolor: "primary.dark" },
              }}
              startIcon={
                isExecuting ? <CircularProgress size={16} color="inherit" /> : null
              }
            >
              {isExecuting ? "Processing..." : resolutionLabel}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ActionGuardDialog;
