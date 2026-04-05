import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Paper,
  Button,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Slide,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditNoteIcon from "@mui/icons-material/EditNote";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import CodeIcon from "@mui/icons-material/Code";
import type { TransitionProps } from "@mui/material/transitions";
import type { WorkspaceMetadata } from "../../core/entities/Workspace";
import { PdfExportService } from "../../infrastructure/services/PdfExportService";
import { useWorkspaceStore } from "../stores";
import { getWorkspaceApplicationService } from "../../infrastructure/providers/workspaceProvider";
import { shadows } from "../../shared/theme";
import { sx as sxUtil } from "../../shared/styles";

const Transition = React.forwardRef(function Transition(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props: TransitionProps & { children: React.ReactElement<any, any> },
  ref: React.Ref<unknown>
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

/** Renders the workspace management page with rename, delete, and export actions */
const ManageWorkspacesPage: React.FC = () => {
  const navigate = useNavigate();

  const workspaces = useWorkspaceStore((state) => state.workspaces);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toDelete, setToDelete] = useState<{ id: string; name: string } | null>(
    null
  );

  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [workspaceToExport, setWorkspaceToExport] = useState<WorkspaceMetadata | null>(
    null
  );

  const handleOpen = (id: string) => navigate(`/workspace/${id}`);

  const openDeleteDialog = (id: string, name: string) => {
    setToDelete({ id, name });
    setConfirmOpen(true);
  };
  const closeDeleteDialog = () => {
    setConfirmOpen(false);
    setToDelete(null);
  };
  const confirmDelete = async () => {
    if (!toDelete) return;
    const { id } = toDelete;
    try {
      const service = getWorkspaceApplicationService();
      await service.deleteWorkspace(id);
      useWorkspaceStore.getState().removeWorkspaceMetadata(id);
    } catch (error) {
      console.error('Failed to delete workspace:', error);
    }
    closeDeleteDialog();
  };

  const startEdit = (ws: WorkspaceMetadata) => {
    setEditingId(ws.id);
    setDraftName(ws.name);
  };
  const cancelEdit = () => {
    setEditingId(null);
    setDraftName("");
  };
  const saveEdit = async () => {
    if (!editingId) return;
    const name = draftName.trim();
    if (!name) return;
    const id = editingId;
    try {
      const service = getWorkspaceApplicationService();
      await service.updateWorkspace({
        workspaceId: id,
        patch: { name },
      });
      useWorkspaceStore.getState().updateWorkspaceMetadata(id, { name });
    } catch (error) {
      console.error('Failed to update workspace:', error);
    }
    setEditingId(null);
    setDraftName("");
  };

  const handleExport = async (metadata: WorkspaceMetadata) => {
    try {
      const service = getWorkspaceApplicationService();
      const fullWorkspace = await service.getWorkspaceById(metadata.id);

      if (!fullWorkspace) {
        console.error(`Full workspace data not found for ID: ${metadata.id}`);
        return;
      }

      const exportData = {
        id: fullWorkspace.id,
        name: fullWorkspace.name,
        owner: fullWorkspace.owner,
        text: fullWorkspace.text,
        isTemporary: fullWorkspace.isTemporary,
        updatedAt: fullWorkspace.updatedAt,
        userSpans: fullWorkspace.userSpans,
        apiSpans: fullWorkspace.apiSpans,
        deletedApiKeys: fullWorkspace.deletedApiKeys,
        tags: fullWorkspace.tags,
        translations: fullWorkspace.translations,
        segments: fullWorkspace.segments,
        exportedAt: Date.now(),
        exportVersion: "1.0",
      };

      const jsonString = JSON.stringify(exportData, null, 2);

      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const sanitizedName = fullWorkspace.name.replace(/[^a-z0-9]/gi, "_");
      link.download = `${sanitizedName}_${fullWorkspace.id}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export workspace:', error);
    }
  };

  const handleExportPdf = async (metadata: WorkspaceMetadata) => {
    try {
      const service = getWorkspaceApplicationService();
      const fullWorkspace = await service.getWorkspaceById(metadata.id);

      if (!fullWorkspace) {
        console.error(`Full workspace data not found for ID: ${metadata.id}`);
        return;
      }
      await PdfExportService.exportWorkspace(fullWorkspace);
    } catch (error) {
      console.error("Failed to export PDF:", error);
    }
  };

  const openExportDialog = (workspace: WorkspaceMetadata) => {
    setWorkspaceToExport(workspace);
    setExportDialogOpen(true);
  };

  const closeExportDialog = () => {
    setExportDialogOpen(false);
    setWorkspaceToExport(null);
  };

  const handleExportType = async (type: "json" | "pdf") => {
    if (!workspaceToExport) return;

    if (type === "json") {
      await handleExport(workspaceToExport);
    } else {
      await handleExportPdf(workspaceToExport);
    }

    closeExportDialog();
  };

  return (
    <Box
      sx={{
        px: { xs: 2, sm: 4 },
        py: 3,
        width: "100%",
        height: "100%",
        color: "text.primary",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <Typography
        variant="h5"
        fontWeight={900}
        mb={2}
        ml={{ xs: 0, sm: 3 }}
        sx={{
          color: "gold.main",
          textTransform: "uppercase",
          letterSpacing: 1,
          textShadow: shadows.text,
        }}
      >
        Manage Workspaces
      </Typography>

      <TableContainer
        component={Paper}
        sx={{
          maxHeight: "85vh",
          overflowX: "auto",
          overflowY: "hidden",
          ml: { xs: 0, sm: 2 },
          borderRadius: 3,
          border: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
          backdropFilter: "blur(6px)",
          boxShadow: shadows.lg,
        }}
      >
        <Box
          sx={{
            maxHeight: "85vh",
            overflowY: "auto",
            overflowX: "auto",
            p: 2,
            "&::-webkit-scrollbar-thumb": {
              background: "#CBD5E1",
              borderRadius: 8,
            },
          }}
        >
          <Table stickyHeader>
            <TableHead
              sx={{
                "& .MuiTableCell-head": {
                  bgcolor: "background.paper",
                  color: "text.primary",
                  fontWeight: 700,
                  borderBottom: 1,
                  borderColor: "divider",
                },
              }}
            >
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>ID</TableCell>
                <TableCell>Last Updated</TableCell>
                <TableCell align="right">Action</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {workspaces.map((ws) => {
                return (
                  <TableRow
                    key={ws.id}
                    hover
                    sx={{
                      "&:hover": { backgroundColor: "action.hover" },
                      "& .MuiTableCell-root": {
                        borderBottom: 1,
                        borderColor: "divider",
                      },
                    }}
                  >
                    <TableCell sx={{ width: "40%", color: "text.primary" }}>
                      {editingId === ws.id ? (
                        <Box
                          sx={{ ...sxUtil.flexRow, gap: 1 }}
                        >
                          <TextField
                            size="small"
                            value={draftName}
                            onChange={(e) => setDraftName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                saveEdit();
                              }
                            }}
                            autoFocus
                          />
                          <IconButton
                            size="small"
                            onClick={saveEdit}
                            sx={{ color: "primary.main" }}
                          >
                            <CheckIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={cancelEdit}
                            sx={{ color: "text.secondary" }}
                          >
                            <CloseIcon />
                          </IconButton>
                        </Box>
                      ) : (
                        <Box
                          sx={{ ...sxUtil.flexRow, gap: 1 }}
                        >
                          <Typography
                            sx={{
                              color: "text.primary",
                              fontWeight: 800,
                            }}
                          >
                            {ws.name}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() => startEdit(ws)}
                            sx={{ color: "primary.main" }}
                            aria-label="Rename"
                          >
                            <EditNoteIcon />
                          </IconButton>
                        </Box>
                      )}
                    </TableCell>

                  <TableCell sx={{ color: "text.secondary" }}>{ws.id}</TableCell>

                  <TableCell sx={{ width: "20%", color: "text.secondary" }}>
                    {ws.updatedAt
                      ? new Date(ws.updatedAt).toLocaleString()
                      : "—"}
                  </TableCell>

                  <TableCell align="right">
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleOpen(ws.id)}
                      sx={{
                        mr: 1,
                        color: "text.primary",
                        borderColor: "#CBD5E1",
                        textTransform: "uppercase",
                        fontWeight: 700,
                        "&:hover": {
                          bgcolor: "background.paper",
                          borderColor: "text.secondary",
                        },
                      }}
                    >
                      Open
                    </Button>
                    <IconButton
                      size="small"
                      onClick={() => openExportDialog(ws)}
                      sx={{
                        color: "primary.main",
                        mr: 1,
                      }}
                      aria-label="Export"
                      title="Export workspace"
                    >
                      <FileDownloadIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => openDeleteDialog(ws.id, ws.name)}
                      sx={{ color: "error.main" }}
                      aria-label="Delete"
                    >
                      <DeleteOutlineIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
              })}
            </TableBody>
          </Table>
        </Box>
      </TableContainer>

      {/* Export Type Selection Dialog */}
      <Dialog
        open={exportDialogOpen}
        TransitionComponent={Transition}
        keepMounted
        onClose={closeExportDialog}
        PaperProps={{
          sx: {
            borderRadius: 3,
            border: 1,
            borderColor: "divider",
            bgcolor: "background.paper",
            boxShadow: shadows.lg,
            maxWidth: "400px",
            width: "100%",
          },
        }}
      >
        <DialogTitle
          sx={{
            color: "text.primary",
            fontWeight: 900,
            pb: 1,
          }}
        >
          Export Workspace
        </DialogTitle>
        <DialogContent sx={{ px: 3, py: 2 }}>
          {workspaceToExport ? (
            <Box>
              <Typography
                variant="body2"
                sx={{
                  color: "text.secondary",
                  mb: 3,
                  fontWeight: 500,
                }}
              >
                {workspaceToExport.name}
              </Typography>
              <Box sx={{ ...sxUtil.flexColumn, gap: 2 }}>
                <Button
                  variant="outlined"
                  onClick={() => handleExportType("json")}
                  startIcon={<CodeIcon />}
                  sx={{
                    justifyContent: "flex-start",
                    color: "text.primary",
                    borderColor: "#CBD5E1",
                    textTransform: "none",
                    fontWeight: 600,
                    py: 1.5,
                    px: 2,
                    borderRadius: 2,
                    "&:hover": {
                      backgroundColor: "action.hover",
                      borderColor: "primary.main",
                      color: "primary.main",
                    },
                  }}
                >
                  Export as JSON
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => handleExportType("pdf")}
                  startIcon={<PictureAsPdfIcon />}
                  sx={{
                    justifyContent: "flex-start",
                    color: "text.primary",
                    borderColor: "#CBD5E1",
                    textTransform: "none",
                    fontWeight: 600,
                    py: 1.5,
                    px: 2,
                    borderRadius: 2,
                    "&:hover": {
                      backgroundColor: "action.hover",
                      borderColor: "error.dark",
                      color: "error.dark",
                    },
                  }}
                >
                  Export as PDF
                </Button>
              </Box>
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
          <Button
            onClick={closeExportDialog}
            variant="text"
            sx={{
              color: "text.secondary",
              textTransform: "none",
              fontWeight: 600,
              "&:hover": {
                backgroundColor: "action.hover",
              },
            }}
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog
        open={confirmOpen}
        TransitionComponent={Transition}
        keepMounted
        onClose={closeDeleteDialog}
        PaperProps={{
          sx: {
            borderRadius: 3,
            border: 1,
            borderColor: "divider",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.9) 100%)",
            backdropFilter: "blur(6px)",
            boxShadow: shadows.lg,
          },
        }}
      >
        <DialogTitle sx={{ color: "text.primary", fontWeight: 900 }}>
          Delete workspace?
        </DialogTitle>
        <DialogContent sx={{ color: "text.secondary" }}>
          {toDelete ? (
            <Box sx={{ mt: 0.5 }}>
              <Typography variant="body1" sx={{ mb: 0.5 }}>
                You're about to delete:
              </Typography>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 800, color: "text.primary" }}
              >
                {toDelete.name}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                ID: {toDelete.id}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1.5 }}>
                This action can't be undone.
              </Typography>
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ p: 2.25 }}>
          <Button
            onClick={closeDeleteDialog}
            variant="outlined"
            sx={{
              color: "text.primary",
              borderColor: "#CBD5E1",
              textTransform: "uppercase",
              fontWeight: 800,
              "&:hover": {
                bgcolor: "background.paper",
                borderColor: "text.secondary",
              },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={confirmDelete}
            variant="contained"
            sx={{
              textTransform: "uppercase",
              fontWeight: 900,
              bgcolor: "error.main",
              "&:hover": { bgcolor: "error.dark" },
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ManageWorkspacesPage;
