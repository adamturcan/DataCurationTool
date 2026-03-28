// src/pages/AccountPage.tsx
import React from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Avatar,
  Divider,
  Stack,
  Button,
} from "@mui/material";
import WorkspacesIcon from "@mui/icons-material/Workspaces";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import { useNavigate } from "react-router-dom";
import type { Workspace } from "../../types";

interface Props {
  username: string;
  workspaces: Workspace[];
}

const COLORS = {
  titleGold: "#DDD1A0", // memorise gold for headings
  text: "#0F172A", // deep slate for max contrast
  textSub: "#334155",
  border: "#E2E8F0", // slate-200
  hover: "#F8FAFC", // slate-50
  accent: "#1D4ED8",
  accentHover: "#1E40AF",
  avatarBg: "#DDA0AF", // memorise pink-100
};

const AccountPage: React.FC<Props> = ({ username, workspaces }) => {
  const lastLogin = new Date().toLocaleString();
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        px: { xs: 2, md: 8 },
        py: 3,
        width: "100%",
        height: "100%",
        fontFamily: "'DM Sans', sans-serif",
        color: COLORS.text,
      }}
    >
      {/* Title in gold */}
      <Typography
        variant="h5"
        fontWeight={900}
        mb={3}
        sx={{
          color: COLORS.titleGold,
          textTransform: "uppercase",
          letterSpacing: 1,
          textShadow: "0 2px 4px rgba(0,0,0,0.35)",
        }}
      >
        Manage Account
      </Typography>

      {/* Main card with stronger shadow */}
      <Card
        sx={{
          borderRadius: 3,
          border: `1px solid ${COLORS.border}`,
          background: "#FFFFFF",
          backdropFilter: "blur(6px)",
          boxShadow: "0 14px 40px rgba(0,0,0,0.6), 0 4px 12px rgba(0,0,0,0.25)",
          maxWidth: 720,
        }}
      >
        <CardContent>
          {/* Header */}
          <Box display="flex" alignItems="center" mb={2}>
            <Avatar
              sx={{ bgcolor: COLORS.avatarBg, width: 64, height: 64, mr: 2 }}
            >
              <AccountCircleIcon sx={{ fontSize: 40 }} />
            </Avatar>
            <Box>
              <Typography
                variant="h6"
                sx={{ color: COLORS.text, fontWeight: 800 }}
              >
                {username}
              </Typography>
              <Typography variant="body2" sx={{ color: COLORS.textSub }}>
                Active User
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 2, borderColor: COLORS.border }} />

          {/* Stats row */}
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={3}
            alignItems="stretch"
          >
            <Box
              sx={{
                flex: 1,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 2,
                p: 2.5,
                textAlign: "center",
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.75) 100%)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 1.5,
                "&:hover": { backgroundColor: COLORS.hover },
              }}
            >
              <WorkspacesIcon sx={{ fontSize: 36, color: COLORS.accent }} />
              <Typography
                variant="h6"
                fontWeight={800}
                sx={{ color: COLORS.text }}
              >
                {workspaces.length}
              </Typography>
              <Typography variant="body2" sx={{ color: COLORS.textSub }}>
                Workspaces
              </Typography>

              <Button
                variant="contained"
                size="small"
                onClick={() => navigate("/manage-workspaces")}
                sx={{
                  mt: 1,
                  px: 2.5,
                  backgroundColor: COLORS.accent,
                  "&:hover": { backgroundColor: COLORS.accentHover },
                  color: "#FFFFFF",
                  borderRadius: "20px",
                  fontWeight: 800,
                  textTransform: "none",
                  boxShadow:
                    "0 1px 0 rgba(12,24,38,0.08), 0 10px 30px rgba(12,24,38,0.25)",
                }}
              >
                Manage Workspaces
              </Button>
            </Box>

            <Box
              sx={{
                flex: 1,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 2,
                p: 2.5,
                textAlign: "center",
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.75) 100%)",
              }}
            >
              <Typography
                variant="h6"
                fontWeight={800}
                sx={{ color: COLORS.text }}
              >
                {lastLogin}
              </Typography>
              <Typography variant="body2" sx={{ color: COLORS.textSub }}>
                Last Login
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default AccountPage;
