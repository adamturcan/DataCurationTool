import React, { useMemo, useState } from "react";
import { shadows } from "../../shared/theme";
import { Box, Paper, TextField, Button, InputAdornment } from "@mui/material";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";

type Props = {
  onLogin: (username: string) => void;
  defaultUsername?: string;
};

// choose ONE palette (A, B, or C) and paste:
const COLORS = {
  cardBg: "#0B0B0B",

  // === pick one group ===
  // A) Champagne Gold
  // logo: "#E8DCB0",
  // btnBg: "#C8A24A",
  // btnHover: "#B58F3F",
  // btnText: "#0B0B0B",
  // pageBg: "linear-gradient(135deg, #C2A878 0%, #8D6E4A 50%, #5C4033 100%)",

  // C) Burnished Gold
  logo: "#F1E3B6",
  btnBg: "#8F6B22",
  btnHover: "#7E5F1E",
  btnText: "#FFFFFF",
  pageBg: "linear-gradient(135deg, #C6AE82 0%, #9B7A4A 50%, #654A33 100%)",
};

const LoginPage: React.FC<Props> = ({ onLogin, defaultUsername = "" }) => {
  const [username, setUsername] = useState(defaultUsername);
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const trimmed = useMemo(() => username.trim(), [username]);
  const hasError = touched && trimmed.length === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!trimmed) return;
    try {
      setSubmitting(true);
      await new Promise((r) => setTimeout(r, 150));
      onLogin(trimmed);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        px: 2,
        background: "linear-gradient(135deg, #2f3e34 0%, #8d7f57 100%)",
      }}
    >
      <Paper
        sx={{
          width: "100%",
          maxWidth: 560,
          p: { xs: 3, sm: 5 },
          borderRadius: 3,
          backgroundColor: "#1F2C24", // darker than background
          border: "1px solid rgba(255,255,255,0.05)",
          boxShadow: shadows.lg,
          textAlign: "center",
        }}
      >
        {/* Logo */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            m: 0,
          }}
        >
          <img
            src={import.meta.env.BASE_URL + "memorise-dct.png"}
            alt="Memorise data curration tool logo"
            style={{
              maxHeight: "20%",
              maxWidth: "50%", // keep responsive
              objectFit: "contain",
              filter: "drop-shadow(0 2px 14px rgba(0,0,0,0.5))",
            }}
          />
        </Box>

        {/* Form */}
        <Box component="form" onSubmit={handleSubmit} noValidate>
          <TextField
            fullWidth
            label="Username"
            placeholder="your-username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onBlur={() => setTouched(true)}
            error={hasError}
            helperText={hasError ? "Please enter your username." : " "}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PersonOutlineRoundedIcon
                    sx={{ color: COLORS.logo, opacity: 0.9 }}
                  />
                </InputAdornment>
              ),
            }}
            InputLabelProps={{
              sx: {
                color: "rgba(255,255,255,0.75)",
                "&.Mui-focused": { color: COLORS.logo },
                "&.Mui-error": { color: "#FF9A9A" },
              },
            }}
            FormHelperTextProps={{
              sx: {
                mt: 1,
                fontWeight: 600,
                letterSpacing: 0.2,
                color: hasError ? "#FF9A9A" : "rgba(255,255,255,0.55)",
              },
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                color: "#F5F7FA",
                backgroundColor: "rgba(255,255,255,0.06)",
                borderRadius: 2,
                transition: "box-shadow .2s ease, border-color .2s ease",
                "& fieldset": { borderColor: "rgba(255,255,255,0.18)" },
                "&:hover fieldset": { borderColor: COLORS.logo },
                "&.Mui-focused fieldset": {
                  borderColor: COLORS.logo,
                  boxShadow: "0 0 0 3px rgba(232,220,176,0.22)", // uses A) logo color
                },
                "&.Mui-error fieldset": { borderColor: "#FF6B6B" },
              },
              "& .MuiInputBase-input::placeholder": {
                color: "rgba(255,255,255,0.5)",
                opacity: 1,
              },
            }}
          />

          <Button
            type="submit"
            variant="contained"
            disableElevation
            disabled={!trimmed || submitting}
            sx={{
              mt: 1,
              width: "100%",
              py: 1.2,
              fontWeight: 800,
              textTransform: "none",
              borderRadius: 2,
              backgroundColor: "#DDD1A0", // memorise gold
              color: "#0B0B0B",
              "&:hover": { backgroundColor: "#EDE8D4" },
              "&.Mui-disabled": {
                backgroundColor: "rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.35)",
              },
              boxShadow: shadows.md,
            }}
          >
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default LoginPage;
