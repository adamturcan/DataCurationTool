/**
 * NotificationSnackbar - Reusable snackbar component for showing notifications
 * 
 * Displays a notification message at the bottom center of the screen.
 * Automatically hides after a specified duration.
 * 
 * @param message - The message to display, or null to hide
 * @param onClose - Callback when the snackbar is closed
 */

import React from "react";
import { Snackbar, Alert } from "@mui/material";
import type { NoticeOptions, NoticeTone } from "../../../types";

// Constants for snackbar configuration
const ANCHOR_ORIGIN = { vertical: "bottom" as const, horizontal: "center" as const };
const AUTO_HIDE_DURATION = 2200;
const ALERT_BG_COLOR = "#21426C";
const ALERT_BG_COLOR_INFO = "#0E4AA1";

export interface NotificationSnackbarProps extends NoticeOptions {
  message: string | null;
  onClose: () => void;
  action?: React.ReactNode;
}

export const NotificationSnackbar: React.FC<NotificationSnackbarProps> = ({
  message,
  onClose,
  tone = "default",
  persistent = false,
  action,
}) => {
  const resolvedTone: NoticeTone = tone ?? "default";
  const severity = resolvedTone === "default" ? "info" : resolvedTone;
  const backgroundColor = resolvedTone === "info" || resolvedTone === "default"
    ? ALERT_BG_COLOR_INFO
    : resolvedTone === "success"
      ? "#2E7D32"
      : resolvedTone === "warning"
        ? "#ED6C02"
        : resolvedTone === "error"
          ? "#D32F2F"
          : ALERT_BG_COLOR;

  const handleClose = (
    _event?: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (persistent && reason === "clickaway") {
      return;
    }
    onClose();
  };

  return (
    <Snackbar
      open={!!message}
      autoHideDuration={persistent ? undefined : AUTO_HIDE_DURATION}
      onClose={handleClose}
      anchorOrigin={ANCHOR_ORIGIN}
    >
      <Alert
        onClose={handleClose}
        severity={severity}
        variant="filled"
        sx={{ bgcolor: backgroundColor }}
        action={action}
      >
        {message}
      </Alert>
    </Snackbar>
  );
};

