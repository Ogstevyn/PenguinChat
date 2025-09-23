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
    }
  }

  async performBackup(userAddress: string): Promise<string | null> {
    return null;
    if (this.isBackingUp) {
      return null;
    }

    this.isBackingUp = true;

    try {
      const pendingMessages = LocalStorageService.getPendingMessages();
      
      if (pendingMessages.length === 0) {
        return null;
      }

      const conversations = this.groupMessagesByChat(pendingMessages);

      const backupData: BackupData = {
        timestamp: Date.now(),
        appId: "penguinchat",
        version: "1.0.0",
        conversations
      };

      const newBlobId = await this.walrusService.uploadBackup(backupData);
      LocalStorageService.clearPendingMessages();
      LocalStorageService.updateLastBackupTimestamp(Date.now());

      return newBlobId;
    } catch (error) {
      console.error('Backup failed:', error);
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
      const pendingMessageCount = LocalStorageService.getPendingMessageCount();
      const settings = LocalStorageService.getBackupSettings();
      const blobObjects = await this.walrusService.getUserBlobObjects(userAddress);
      
      return {
        hasBackups: blobObjects.length > 0,
        pendingMessageCount,
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
      const settings = LocalStorageService.getBackupSettings();
      settings.frequencyMinutes = frequencyMinutes;
      LocalStorageService.saveBackupSettings(settings);
      this.startAutoBackup(userAddress, frequencyMinutes);
    } catch (error) {
      console.error('Failed to update backup frequency:', error);
      throw error;
    }
  }

  async initializeUser(userAddress: string, frequencyMinutes: number = 5): Promise<void> {
    try {
      LocalStorageService.saveBackupSettings({
        frequencyMinutes,
        autoBackup: true
      });
      
      this.startAutoBackup(userAddress, frequencyMinutes);
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
