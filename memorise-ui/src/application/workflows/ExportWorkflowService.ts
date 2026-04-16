import type { WorkspaceDTO, WorkflowResult } from "../../types";
import { getWorkspaceApplicationService } from "../../infrastructure/providers/workspaceProvider";

export interface ExportOutput {
  blob: Blob;
  filename: string;
}

export type ExportResult = WorkflowResult & {
  output?: ExportOutput;
};

/**
 * Generates JSON and PDF exports of a workspace.
 * Fetches the full workspace, delegates to the appropriate generator,
 * and returns a blob + filename for the presentation layer to download.
 *
 * @category Application
 */
export class ExportWorkflowService {

  async exportWorkspace(workspaceId: string, format: "json" | "pdf"): Promise<ExportResult> {
    try {
      const service = getWorkspaceApplicationService();
      const workspace = await service.getWorkspaceById(workspaceId);

      if (!workspace) {
        return { ok: false, notice: { message: "Workspace not found.", tone: "error" } };
      }

      const output = format === "json"
        ? this.generateJson(workspace)
        : await this.generatePdf(workspace);

      return {
        ok: true,
        notice: { message: `Exported "${workspace.name}" as ${format.toUpperCase()}.`, tone: "success" },
        output,
      };
    } catch (error) {
      console.error("Export failed:", error);
      return { ok: false, notice: { message: "Export failed.", tone: "error" } };
    }
  }

  private sanitizeName(name: string): string {
    return name.replace(/[^a-z0-9]/gi, "_");
  }

  private generateJson(workspace: WorkspaceDTO): ExportOutput {
    const exportData = {
      id: workspace.id,
      name: workspace.name,
      owner: workspace.owner,
      text: workspace.text,
      isTemporary: workspace.isTemporary,
      updatedAt: workspace.updatedAt,
      userSpans: workspace.userSpans,
      apiSpans: workspace.apiSpans,
      deletedApiKeys: workspace.deletedApiKeys,
      tags: workspace.tags,
      translations: workspace.translations,
      segments: workspace.segments,
      exportedAt: Date.now(),
      exportVersion: "1.0",
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const filename = `${this.sanitizeName(workspace.name)}_${workspace.id}.json`;
    return { blob, filename };
  }

  private async loadFont(url: string): Promise<string> {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const chunkSize = 8192;
    let binary = "";
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
    }
    return btoa(binary);
  }

  private async generatePdf(workspace: WorkspaceDTO): Promise<ExportOutput> {
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF();

    // Load Unicode fonts for Czech/Slovak support
    const basePath = import.meta.env.BASE_URL ?? "/";
    const [regularBase64, boldBase64] = await Promise.all([
      this.loadFont(`${basePath}fonts/NotoSans-Regular.ttf`),
      this.loadFont(`${basePath}fonts/NotoSans-Bold.ttf`),
    ]);

    doc.addFileToVFS("NotoSans-Regular.ttf", regularBase64);
    doc.addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
    doc.addFileToVFS("NotoSans-Bold.ttf", boldBase64);
    doc.addFont("NotoSans-Bold.ttf", "NotoSans", "bold");
    doc.setFont("NotoSans");

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const maxWidth = pageWidth - margin * 2;
    let y = margin;

    const ensureSpace = (needed: number) => {
      if (y + needed > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
    };

    const addSection = (title: string) => {
      ensureSpace(16);
      doc.setFontSize(13);
      doc.setFont("NotoSans", "bold");
      doc.text(title, margin, y);
      y += 8;
      doc.setFont("NotoSans", "normal");
      doc.setFontSize(10);
    };

    const addWrappedText = (text: string) => {
      const lines: string[] = doc.splitTextToSize(text, maxWidth);
      for (const line of lines) {
        ensureSpace(6);
        doc.text(line, margin, y);
        y += 5;
      }
    };

    // Title
    doc.setFontSize(18);
    doc.setFont("NotoSans", "bold");
    doc.text(workspace.name, margin, y);
    y += 10;

    // Metadata
    doc.setFontSize(9);
    doc.setFont("NotoSans", "normal");
    doc.setTextColor(100);
    doc.text(`ID: ${workspace.id}`, margin, y); y += 5;
    if (workspace.owner) { doc.text(`Owner: ${workspace.owner}`, margin, y); y += 5; }
    if (workspace.updatedAt) { doc.text(`Updated: ${new Date(workspace.updatedAt).toLocaleString()}`, margin, y); y += 5; }
    doc.text(`Exported: ${new Date().toLocaleString()}`, margin, y); y += 5;
    doc.setTextColor(0);
    y += 6;

    // Source text
    if (workspace.text) {
      addSection("Source Text");
      addWrappedText(workspace.text);
      y += 6;
    }

    // Segments
    if (workspace.segments?.length) {
      addSection(`Segments (${workspace.segments.length})`);
      for (const seg of workspace.segments) {
        ensureSpace(12);
        doc.setFont("NotoSans", "bold");
        doc.text(seg.id, margin, y);
        doc.setFont("NotoSans", "normal");
        y += 5;
        if (seg.text) {
          addWrappedText(seg.text);
        }
        y += 3;
      }
      y += 4;
    }

    // Spans
    const userCount = workspace.userSpans?.length ?? 0;
    const apiCount = workspace.apiSpans?.length ?? 0;
    if (userCount > 0 || apiCount > 0) {
      addSection("Annotations");
      doc.text(`User spans: ${userCount}  |  API spans: ${apiCount}`, margin, y);
      y += 8;
    }

    // Tags
    if (workspace.tags?.length) {
      addSection(`Tags (${workspace.tags.length})`);
      const tagNames = workspace.tags.map(t => t.name).join(", ");
      addWrappedText(tagNames);
      y += 6;
    }

    // Translations
    if (workspace.translations?.length) {
      addSection(`Translations (${workspace.translations.length})`);
      for (const t of workspace.translations) {
        ensureSpace(14);
        doc.setFont("NotoSans", "bold");
        doc.text(`${t.language} (from ${t.sourceLang})`, margin, y);
        doc.setFont("NotoSans", "normal");
        y += 5;
        if (t.text) {
          addWrappedText(t.text);
        }
        y += 4;
      }
    }

    const blob = doc.output("blob");
    const filename = `${this.sanitizeName(workspace.name)}_${workspace.id}.pdf`;
    return { blob, filename };
  }
}

export const exportWorkflowService = new ExportWorkflowService();
