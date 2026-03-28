import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Notice } from '../../types';

/**
 * Notification Store
 * 
 * Manages a queue-based system for global application messages.
 * Notifications are displayed to users via the NotificationSnackbar component.
 * Supports different tones (info, success, warning, error) and persistent messages.
 */

export interface NotificationWithId extends Notice {
  id: string;
  timestamp: number;
}

export interface NotificationStore {
  // Queue of notifications to display
  notifications: NotificationWithId[];
  
  // Currently displayed notification (head of queue)
  current: NotificationWithId | null;
  
  // Actions
  enqueue: (notice: Notice) => void;
  dequeue: () => void;
  clear: () => void;
}

let notificationId = 0;

export const useNotificationStore = create<NotificationStore>()(
  devtools(
    (set) => ({
      notifications: [],
      current: null,

      enqueue: (notice) => {
        const notification: NotificationWithId = {
          ...notice,
          id: `notice-${++notificationId}`,
          timestamp: Date.now(),
        };
        
        set((state) => {
          const newQueue = [...state.notifications, notification];
          return {
            notifications: newQueue,
            // If no current notification, set this one as current
            current: state.current === null ? notification : state.current,
          };
        });
      },

      dequeue: () => {
        set((state) => {
          const remaining = state.notifications.filter(
            (n) => n.id !== state.current?.id
          );
          return {
            notifications: remaining,
            current: remaining[0] || null,
          };
        });
      },

      clear: () => {
        set({
          notifications: [],
          current: null,
        });
      },
    }),
    { name: 'notification-store' }
  )
);
