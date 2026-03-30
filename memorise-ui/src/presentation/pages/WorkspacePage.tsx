import React from "react";
import { Box } from "@mui/material";
import { useLocation } from "react-router-dom";
import EditorContainer from "../components/containers/EditorContainer";
import { useSessionStore } from "../stores";
import PanelContainer from "../components/containers/PanelContainer";

const WorkspacePage: React.FC = () => {
  const location = useLocation();
  const currentSessionId = useSessionStore((state) => state.session?.id);
    
  const isTagPanelOpen = useSessionStore((state) => state.isTagPanelOpen);
  
  const match = location.pathname.match(/^\/workspace\/([^/]+)/);
  const urlId = match && match[1] !== 'new' ? match[1] : null;

  const isDataReady = currentSessionId === urlId && currentSessionId !== undefined;

  return (
    <Box sx={{ 
      display: "flex", 
      height: "100vh", 
      overflow: "visible", 
      px: 4, 
      color: "text.primary"
    }}>
      {/* EDITOR WRAPPER */}
      <Box sx={{ 
        flex: 1, 
        display: "flex", 
        flexDirection: "column", 
        height: "88.5vh", 
        pl: 4, 
        minHeight: 0,
        transition: "all 0.95s ease-in-out" 
      }}>        
        {isDataReady ? <EditorContainer key={currentSessionId} /> : <Box>Loading...</Box>}
      </Box>

      {/* PANEL WRAPPER */}
      <Box sx={{ 
        width: isTagPanelOpen ? "300px" : "0px", 
        opacity: isTagPanelOpen ? 1 : 0,
        
        height: "86vh", 
        display: "flex", 
        flexDirection: "column", 
        mt: 4, 
        minHeight: 0, 
        ml: isTagPanelOpen ? 2 : 0, 
        pr: isTagPanelOpen ? 1 : 0, 
        
        transition: isTagPanelOpen 
          ? "width 0.95s ease-in-out, margin 0.95s ease-in-out, padding 0.95s ease-in-out, opacity 0s"
          : "width 0.95s ease-in-out, margin 0.95s ease-in-out, padding 0.95s ease-in-out, opacity 0.1s linear 0.85s",
        
        overflow: "visible", 
        pointerEvents: isTagPanelOpen ? "auto" : "none"
      }}>
        <PanelContainer />
      </Box>
    </Box>
  );
};

export default WorkspacePage;