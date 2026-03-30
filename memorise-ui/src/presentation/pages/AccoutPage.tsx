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
import { CUSTOM_TAG_COLOR } from "../../shared/constants/ui";
import { shadows } from "../../shared/theme";

interface Props {
  username: string;
  workspaces: Workspace[];
}

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
        color: "text.primary",
      }}
    >
      {/* Title in gold */}
      <Typography
        variant="h5"
        fontWeight={900}
        mb={3}
        sx={{
          color: "gold.main",
          textTransform: "uppercase",
          letterSpacing: 1,
          textShadow: shadows.text,
        }}
      >
        Manage Account
      </Typography>

      {/* Main card with stronger shadow */}
      <Card
        sx={{
          borderRadius: 3,
          border: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
          backdropFilter: "blur(6px)",
          boxShadow: shadows.lg,
          maxWidth: 720,
        }}
      >
        <CardContent>
          {/* Header */}
          <Box display="flex" alignItems="center" mb={2}>
            <Avatar
              sx={{ bgcolor: CUSTOM_TAG_COLOR, width: 64, height: 64, mr: 2 }}
            >
              <AccountCircleIcon sx={{ fontSize: 40 }} />
            </Avatar>
            <Box>
              <Typography
                variant="h6"
                sx={{ color: "text.primary", fontWeight: 800 }}
              >
                {username}
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Active User
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Stats row */}
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={3}
            alignItems="stretch"
          >
            <Box
              sx={{
                flex: 1,
                border: 1,
                borderColor: "divider",
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
                "&:hover": { backgroundColor: "action.hover" },
              }}
            >
              <WorkspacesIcon sx={{ fontSize: 36, color: "primary.main" }} />
              <Typography
                variant="h6"
                fontWeight={800}
                sx={{ color: "text.primary" }}
              >
                {workspaces.length}
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Workspaces
              </Typography>

              <Button
                variant="contained"
                size="small"
                onClick={() => navigate("/manage-workspaces")}
                sx={{
                  mt: 1,
                  px: 2.5,
                  backgroundColor: "primary.main",
                  "&:hover": { backgroundColor: "primary.dark" },
                  color: "common.white",
                  borderRadius: "20px",
                  fontWeight: 800,
                  boxShadow: shadows.md,
                }}
              >
                Manage Workspaces
              </Button>
            </Box>

            <Box
              sx={{
                flex: 1,
                border: 1,
                borderColor: "divider",
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
                sx={{ color: "text.primary" }}
              >
                {lastLogin}
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
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
