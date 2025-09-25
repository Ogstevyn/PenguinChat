import React, { createContext, useContext, useEffect, useState } from 'react';
import { BackupManager } from '../services/backupManager';
import { MessageRecoveryService } from '../services/messageRecoveryService';
import { LocalStorageService } from '../services/localStorageService';
import { useAuth } from './AuthContext';
import { ChatService } from '../services/chatService';


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

export const BackupProvider: React.FC<BackupProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [backupManager, setBackupManager] = useState<BackupManager | null>(null);
  const [recoveryService, setRecoveryService] = useState<MessageRecoveryService | null>(null);
  const [chatService, setChatService] = useState<ChatService | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [pendingMessageCount, setPendingMessageCount] = useState(0);
  const [lastBackupTimestamp, setLastBackupTimestamp] = useState<number | null>(null);


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
        setPendingMessageCount(LocalStorageService.getAllMessages(user.id).length);
        const settings = LocalStorageService.getBackupSettings(user.id);
        setLastBackupTimestamp(settings.lastBackupTimestamp || null);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [user]);

  const initializeBackupSystem = async () => {
    if (!user?.id) return;
    
    try {
      console.log('🔧 Initializing backup system for user:', user.id);
      
      const dummyPrivateKey = "suiprivkey1qpqywg8f9kdhcfs3j23l0g0ejljxdawmxkjyypfs58ggzuj5j5hhxy7gaex";
      
      const manager = new BackupManager(dummyPrivateKey);
      const recovery = new MessageRecoveryService(dummyPrivateKey);
      const chat = new ChatService(user.id);
      
      await manager.initializeUser(user.id, 5);
      await chat.connect();
      
      setBackupManager(manager);
      setRecoveryService(recovery);
      setChatService(chat);
      setIsInitialized(true);
      
      // Log all messages for this user
      const allMessages = LocalStorageService.getAllMessages(user.id);
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
    if (!backupManager || !user?.id) {
      throw new Error('Backup system not initialized');
    }
    return await backupManager.performBackup(user.id);
  };

  const updateBackupFrequency = async (frequencyMinutes: number): Promise<void> => {
    if (!backupManager || !user?.id) {
      throw new Error('Backup system not initialized');
    }
    await backupManager.updateBackupFrequency(user.id, frequencyMinutes);
  };

  const getBackupStatus = async () => {
    if (!backupManager || !user?.id) {
      return null;
    }
    return await backupManager.getBackupStatus(user.id);
  };

  const value: BackupContextType = {
    backupManager,
    recoveryService,
    chatService, // Add this
    isInitialized,
    pendingMessageCount,
    lastBackupTimestamp,
    performBackup,
    updateBackupFrequency,
    getBackupStatus,
  };

  return (
    <BackupContext.Provider value={value}>
      {children}
    </BackupContext.Provider>
  );
};
