import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSessionStore, useWorkspaceStore, useNotificationStore } from '../../stores';
import { getWorkspaceApplicationService } from '../../../infrastructure/providers/workspaceProvider';

interface StateSynchronizerProps {
  username: string | null;
  children?: React.ReactNode;
}

export const StateSynchronizer: React.FC<StateSynchronizerProps> = ({ username, children }) => {
  const location = useLocation(); 
  const isDirty = useSessionStore((state) => state.isDirty);

  let workspaceId: string | undefined = undefined;
  
  const match = location.pathname.match(/^\/workspace\/([^/]+)/);
  if (match && match[1] !== 'new') {
    workspaceId = match[1];
  }

  // Hydrate workspace metadata when username changes
  useEffect(() => {
    if (!username) {
      console.log('[StateSynchronizer] No username, skipping workspace metadata load');
      return;
    }

    const hydrateMetadata = async () => {
      // Get the pure state setters from the purified store
      const { setWorkspaces } = useWorkspaceStore.getState();
      const { enqueue: enqueueNotification } = useNotificationStore.getState();
      
      try {
        console.log(`[StateSynchronizer] Loading workspace metadata for user: ${username}`);
        
        // Use the App Service directly
        const service = getWorkspaceApplicationService();
        const loaded = await service.loadForOwner(username);

        if (loaded && loaded.length > 0) {
          // Map Domain DTOs to lightweight UI metadata
          const metadata = loaded.map(ws => ({
            id: ws.id!,
            name: ws.name,
            owner: ws.owner ?? username,
            updatedAt: ws.updatedAt ?? Date.now(),
          }));
          
          setWorkspaces(metadata, username);
        } else {
          // If no workspaces exist, handle the seed logic from the App Service
          const seeded = service.seedForOwner(username);
          const metadata = seeded.map(ws => ({
            id: ws.id!,
            name: ws.name,
            owner: ws.owner ?? username,
            updatedAt: ws.updatedAt ?? Date.now(),
          }));
          
          setWorkspaces(metadata, username);
          await service.replaceAllForOwner(username, seeded);
        }

      } catch (error) {
        console.error('[StateSynchronizer] Failed to load workspace metadata:', error);
        enqueueNotification({
          message: 'Failed to load workspaces',
          tone: 'error',
        });
      }
    };

    void hydrateMetadata();
  }, [username]);
  
  // Hydrate the active session when the workspaceId changes
  useEffect(() => {
    console.log("synchronizer workspaceId", workspaceId);
    
    if (!workspaceId) {
      console.log('[StateSynchronizer] No workspaceId in route, skipping session hydration');      
      return;
    }

    const hydrateActiveSession = async () => {      
      const { setLoading, loadSession } = useSessionStore.getState();
      const { setCurrentWorkspace } = useWorkspaceStore.getState();
      const { enqueue: enqueueNotification } = useNotificationStore.getState();
      
      setLoading();

      try {
        console.log(`[StateSynchronizer] Loading active workspace: ${workspaceId}`);
        
        // Use the App Service directly
        const service = getWorkspaceApplicationService();
        const workspace = await service.getWorkspaceById(workspaceId);

        if (!workspace) {
          throw new Error(`Workspace ${workspaceId} not found`);
        }
              
        // Load heavy data into Session Store
        loadSession(workspace);
        // Track active ID in Metadata Store
        setCurrentWorkspace(workspaceId);

        console.log(`[StateSynchronizer] Successfully hydrated session for workspace: ${workspace.name}`);
      } catch (error) {
        console.error('[StateSynchronizer] Failed to load workspace session:', error);
        enqueueNotification({
          message: 'Failed to load workspace',
          tone: 'error',
        });
      }
    };

    void hydrateActiveSession();
  }, [workspaceId]);

  // guard to prevent navigation or close when unsaved
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = ''; 
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  return <>{children}</>;
};