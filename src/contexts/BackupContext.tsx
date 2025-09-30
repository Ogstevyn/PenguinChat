import React, { createContext, useContext, useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BackupManager } from '../services/backupManager';
import { MessageRecoveryService } from '../services/messageRecoveryService';
import { LocalStorageService } from '../services/localStorageService';
import { useAuth } from './AuthContext';
import { ChatService } from '../services/chatService';
import { useWalrusBackup } from '../hooks/useWalrusBackup';

interface BackupContextType {
  backupManager: BackupManager | null;
  recoveryService: MessageRecoveryService | null;
  chatService: ChatService | null;
  isInitialized: boolean;
  pendingMessageCount: number;
  lastBackupTimestamp: number | null;
  performBackup: () => Promise<string | null>;
  updateBackupFrequency: (frequencyMinutes: number) => Promise<void>;
  getBackupStatus: () => Promise<any>;
  isBackingUp: boolean;
  backupError: string | null;
}

const BackupContext = createContext<BackupContextType | undefined>(undefined);

export const useBackup = () => {
  const context = useContext(BackupContext);
  if (!context) {
    throw new Error('useBackup must be used within a BackupProvider');
  }
  return context;
};

interface BackupProviderProps {
  children: React.ReactNode;
}

// Create a query client
const queryClient = new QueryClient({
  defaultOptions: {
    mutations: {
      retry: 3,
      retryDelay: 1000,
    },
  },
});

const BackupProviderInner: React.FC<BackupProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [backupManager, setBackupManager] = useState<BackupManager | null>(null);
  const [recoveryService, setRecoveryService] = useState<MessageRecoveryService | null>(null);
  const [chatService, setChatService] = useState<ChatService | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [pendingMessageCount, setPendingMessageCount] = useState(0);
  const [lastBackupTimestamp, setLastBackupTimestamp] = useState<number | null>(null);

  // Use the new Walrus backup hook
  const walrusBackupMutation = useWalrusBackup();

  useEffect(() => {
    if (user?.id) {
      console.log('🔄 User switched to:', user.id, user.name);
      
      if (chatService) {
        chatService.disconnect();
      }
      
      console.log('🚀 Initializing services for new user:', user.id);
      initializeBackupSystem();
    } else {
      console.log('👋 User disconnected, cleaning up');
      cleanupBackupSystem();
    }
  }, [user?.id]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (user?.id) {
        const allMessages = LocalStorageService.getAllMessages(user.id);
        const settings = LocalStorageService.getBackupSettings(user.id);
        const lastBackupTime = settings.lastBackupTimestamp;
        
        let pendingCount = 0;
        if (lastBackupTime) {
          pendingCount = allMessages.filter(msg => 
            msg.timestamp.getTime() > lastBackupTime
          ).length;
        } else {
          pendingCount = allMessages.length;
        }
        
        setPendingMessageCount(pendingCount);
        setLastBackupTimestamp(lastBackupTime || null);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [user]);

  const initializeBackupSystem = async () => {
    if (!user?.id) return;
    
    try {
      console.log('🔧 Initializing backup system for user:', user.id);
      
      const manager = new BackupManager();
      const recovery = new MessageRecoveryService();
      const chat = new ChatService(user.id);
      
      await manager.initializeUser(user.id, 5);
      await chat.connect();
      
      setBackupManager(manager);
      setRecoveryService(recovery);
      setChatService(chat);
      setIsInitialized(true);
      
      // Log all messages for this user
      const allMessages = LocalStorageService.getAllMessages(user.id);
      console.log(`📨 All messages for user ${user.id}:`, allMessages);
      console.log(`📊 Total messages: ${allMessages.length}`);
      
      console.log('✅ Backup system initialized for user:', user.id);
    } catch (error) {
      console.error('❌ Failed to initialize backup system:', error);
    }
  };

  const cleanupBackupSystem = () => {
    if (backupManager) {
      backupManager.stopAutoBackup();
    }
    setBackupManager(null);
    setRecoveryService(null);
    setIsInitialized(false);
  };

  const performBackup = async (): Promise<string | null> => {
    if (!user?.id) {
      throw new Error('User not connected');
    }

    try {
      const allMessages = LocalStorageService.getAllMessages(user.id);
      
      if (allMessages.length === 0) {
        console.log('📭 No messages to backup');
        return null;
      }

      console.log(`📦 Backing up ${allMessages.length} messages for user ${user.id}`);

      // Group messages by chat
      const conversations = allMessages.reduce((groups, message) => {
        const chatId = message.chatId;
        if (!groups[chatId]) {
          groups[chatId] = [];
        }
        groups[chatId].push(message);
        return groups;
      }, {} as Record<string, any[]>);

      const backupData = {
        timestamp: Date.now(),
        appId: "penguinchat",
        version: "1.0.0",
        conversations
      };

      // Use the new Walrus backup hook
      const blobId = await walrusBackupMutation.mutateAsync(backupData);
      
      const settings = LocalStorageService.getBackupSettings(user.id);
      settings.lastBackupTimestamp = Date.now();
      LocalStorageService.saveBackupSettings(user.id, settings);
      
      setLastBackupTimestamp(Date.now());
      
      console.log(`✅ Backup completed successfully: ${blobId}`);
      return blobId;
    } catch (error) {
      console.error('❌ Backup failed:', error);
      throw error;
    }
  };

  const updateBackupFrequency = async (frequencyMinutes: number): Promise<void> => {
    if (!backupManager || !user?.id) {
      throw new Error('Backup system not initialized');
    }
    await backupManager.updateBackupFrequency(user.id, frequencyMinutes);
  };

  const getBackupStatus = async () => {
    if (!user?.id) {
      return null;
    }
    
    try {
      const allMessages = LocalStorageService.getAllMessages(user.id);
      const settings = LocalStorageService.getBackupSettings(user.id);
      
      return {
        hasBackups: settings.lastBackupTimestamp !== null,
        pendingMessageCount: pendingMessageCount,
        lastBackupTimestamp: settings.lastBackupTimestamp || null,
        totalBackups: settings.lastBackupTimestamp ? 1 : 0
      };
    } catch (error) {
      console.error('Failed to get backup status:', error);
      throw error;
    }
  };

  const value: BackupContextType = {
    backupManager,
    recoveryService,
    chatService,
    isInitialized,
    pendingMessageCount,
    lastBackupTimestamp,
    performBackup,
    updateBackupFrequency,
    getBackupStatus,
    isBackingUp: walrusBackupMutation.isPending,
    backupError: walrusBackupMutation.error?.message || null,
  };

  return (
    <BackupContext.Provider value={value}>
      {children}
    </BackupContext.Provider>
  );
};

export const BackupProvider: React.FC<BackupProviderProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <BackupProviderInner>{children}</BackupProviderInner>
    </QueryClientProvider>
  );
};