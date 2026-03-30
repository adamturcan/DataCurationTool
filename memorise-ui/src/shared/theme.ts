import { createTheme, responsiveFontSizes } from "@mui/material";

/** Named shadow tokens */
export const shadows = {
  sm: "0 2px 6px rgba(0,0,0,0.08)",
  md: "0 6px 20px rgba(0,0,0,0.12)",
  lg: "0 14px 40px rgba(0,0,0,0.2)",
  text: "0 2px 4px rgba(0,0,0,0.35)",
} as const;

declare module "@mui/material/styles" {
  interface Palette {
    gold: Palette["primary"];
  }
  interface PaletteOptions {
    gold?: PaletteOptions["primary"];
  }
}

let theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#1D4ED8", dark: "#1E40AF" },
    secondary: { main: "#21426C" },
    error: { main: "#DC2626", dark: "#B91C1C" },
    gold: { main: "#DDD1A0", dark: "#C8A24A", contrastText: "#0F172A" },
    text: {
      primary: "#0F172A",
      secondary: "#334155",
    },
    divider: "#E2E8F0",
    background: {
      default: "#545742",
      paper: "#FFFFFF",
    },
    action: {
      hover: "#F8FAFC",
    },
  },

  typography: {
    fontFamily: ["DM Sans", "DM Mono", "Jacques Francois", "sans-serif"].join(","),
    h1: { fontSize: "3.5rem", fontWeight: 700, lineHeight: 1.2 },
    h2: { fontSize: "2.5rem", fontWeight: 700, lineHeight: 1.3 },
    h3: { fontSize: "2rem", fontWeight: 700, lineHeight: 1.3 },
    body1: { fontSize: "1rem", lineHeight: 1.5 },
    body2: { fontSize: "0.875rem", lineHeight: 1.5 },
  },

  shape: {
    borderRadius: 8,
  },

  transitions: {
    duration: {
      shortest: 150,
      short: 200,
      standard: 250,
      complex: 375,
    },
    easing: {
      easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
    },
  },

  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 12,
        },
      },
    },
  },
});

theme = responsiveFontSizes(theme);

export default theme;
