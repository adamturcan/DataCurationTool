import { useCallback, useState } from "react";
import { useNotificationStore } from "../stores";
import { exportWorkflowService } from "../../application/workflows/ExportWorkflowService";

/** Triggers workspace export (JSON or PDF) with download, loading state, and notifications */
export function useExportOperations() {
  const notify = useNotificationStore.getState().enqueue;
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(async (workspaceId: string, format: "json" | "pdf") => {
    setIsExporting(true);
    try {
      const result = await exportWorkflowService.exportWorkspace(workspaceId, format);

      if (result.ok && result.output) {
        const { blob, filename } = result.output;
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      notify(result.notice);
    } finally {
      setIsExporting(false);
    }
  }, [notify]);

  return { handleExport, isExporting };
}
