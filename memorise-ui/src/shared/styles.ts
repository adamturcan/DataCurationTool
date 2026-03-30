import type { SxProps, Theme } from "@mui/material";

/** Reusable sx patterns **/
export const sx = {
  flexRow: {
    display: "flex",
    alignItems: "center",
  } as const satisfies SxProps<Theme>,

  flexColumn: {
    display: "flex",
    flexDirection: "column",
  } as const satisfies SxProps<Theme>,

  flexCenter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  } as const satisfies SxProps<Theme>,

  truncate: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  } as const satisfies SxProps<Theme>,
};
