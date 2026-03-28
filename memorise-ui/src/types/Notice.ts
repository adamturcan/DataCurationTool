export type NoticeTone = "default" | "info" | "success" | "warning" | "error";

export interface NoticeOptions {
  tone?: NoticeTone;
  persistent?: boolean;
}

export interface Notice extends NoticeOptions {
  message: string;
}

export type WorkflowResult = {
  ok: boolean;
  notice: Notice;
};

