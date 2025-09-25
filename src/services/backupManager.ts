import { WalrusService } from './walrusService';
import { LocalStorageService } from './localStorageService';
import { BackupData, Message } from '../types/backup';

export class BackupManager {
  private walrusService: WalrusService;
  private backupInterval: NodeJS.Timeout | null = null;
  private isBackingUp: boolean = false;

  constructor(privateKey: string) {
    this.walrusService = new WalrusService(privateKey);
  }

  startAutoBackup(userAddress: string, frequencyMinutes: number = 5): void {
    this.stopAutoBackup();
    const frequencyMs = frequencyMinutes * 60 * 1000;
    
    console.log(`🔄 Starting auto backup for ${userAddress} every ${frequencyMinutes} minutes`);
    
    this.backupInterval = setInterval(async () => {
      try {
        await this.performBackup(userAddress);
      } catch (error) {
        console.error('Auto backup failed:', error);
      }
    }, frequencyMs);
  }

  stopAutoBackup(): void {
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
      this.backupInterval = null;
      console.log('�� Stopped auto backup');
    }
  }

  async performBackup(userAddress: string): Promise<string | null> {
    if (this.isBackingUp) {
      console.log('⏳ Backup already in progress, skipping...');
      return null;
    }

    this.isBackingUp = true;

    try {
      const allMessages = LocalStorageService.getAllMessages(userAddress);
      
      if (allMessages.length === 0) {
        console.log('�� No messages to backup');
        return null;
      }

      console.log(`📦 Backing up ${allMessages.length} messages for user ${userAddress}`);

      const conversations = this.groupMessagesByChat(allMessages);

      const backupData: BackupData = {
        timestamp: Date.now(),
        appId: "penguinchat",
        version: "1.0.0",
        conversations
      };

      const newBlobId = await this.walrusService.uploadBackup(backupData);
      
      // Update last backup timestamp
      LocalStorageService.updateLastSyncTimestamp(userAddress, Date.now());
      
      console.log(`✅ Backup completed successfully: ${newBlobId}`);
      return newBlobId;
    } catch (error) {
      console.error('❌ Backup failed:', error);
      throw error;
    } finally {
      this.isBackingUp = false;
    }
  }

  async getBackupStatus(userAddress: string): Promise<{
    hasBackups: boolean;
    pendingMessageCount: number;
    lastBackupTimestamp: number | null;
    totalBackups: number;
  }> {
    try {
      // Use current system - get all messages for user
      const allMessages = LocalStorageService.getAllMessages(userAddress);
      const settings = LocalStorageService.getBackupSettings(userAddress);
      const blobObjects = await this.walrusService.getUserBlobObjects(userAddress);
      
      return {
        hasBackups: blobObjects.length > 0,
        pendingMessageCount: allMessages.length, // All messages are "pending" backup
        lastBackupTimestamp: settings.lastBackupTimestamp || null,
        totalBackups: blobObjects.length
      };
    } catch (error) {
      console.error('Failed to get backup status:', error);
      throw error;
    }
  }

  async updateBackupFrequency(userAddress: string, frequencyMinutes: number): Promise<void> {
    try {
      const settings = LocalStorageService.getBackupSettings(userAddress);
      settings.frequencyMinutes = frequencyMinutes;
      LocalStorageService.saveBackupSettings(userAddress, settings);
      this.startAutoBackup(userAddress, frequencyMinutes);
    } catch (error) {
      console.error('Failed to update backup frequency:', error);
      throw error;
    }
  }

  async initializeUser(userAddress: string, frequencyMinutes: number = 5): Promise<void> {
    try {
      console.log(`🚀 Initializing backup system for user: ${userAddress}`);
      
      LocalStorageService.saveBackupSettings(userAddress, {
        frequencyMinutes,
        autoBackup: true,
        lastBackupTimestamp: null
      });
      
      this.startAutoBackup(userAddress, frequencyMinutes);
      console.log(`✅ Backup system initialized for user: ${userAddress}`);
    } catch (error) {
      console.error('Failed to initialize user backup system:', error);
      throw error;
    }
  }

  private groupMessagesByChat(messages: Message[]): Record<string, Message[]> {
    return messages.reduce((groups, message) => {
      const chatId = message.chatId;
      if (!groups[chatId]) {
        groups[chatId] = [];
      }
      groups[chatId].push(message);
      return groups;
    }, {} as Record<string, Message[]>);
  }
}