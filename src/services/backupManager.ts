import { WalrusService } from './walrusService';
import { SupabaseService } from './supabaseService';
import { LocalStorageService } from './localStorageService';
import { BackupData, Message } from '../types/backup';

export class BackupManager {
  private walrusService: WalrusService;
  private supabaseService: SupabaseService;
  private backupInterval: NodeJS.Timeout | null = null;
  private isBackingUp: boolean = false;

  constructor(privateKey: string) {
    this.walrusService = new WalrusService(privateKey);
    this.supabaseService = new SupabaseService();
  }

  /**
   * Start automatic backup for a user
   */
  startAutoBackup(userAddress: string, frequencyMinutes: number = 5): void {
    this.stopAutoBackup(); // Clear any existing interval

    const frequencyMs = frequencyMinutes * 60 * 1000;
    
    this.backupInterval = setInterval(async () => {
      try {
        await this.performBackup(userAddress);
      } catch (error) {
        console.error('Auto backup failed:', error);
      }
    }, frequencyMs);

    console.log(`Auto backup started for ${userAddress} every ${frequencyMinutes} minutes`);
  }

  /**
   * Stop automatic backup
   */
  stopAutoBackup(): void {
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
      this.backupInterval = null;
      console.log('Auto backup stopped');
    }
  }

  /**
   * Perform a manual backup
   */
  async performBackup(userAddress: string): Promise<string | null> {
    if (this.isBackingUp) {
      console.log('Backup already in progress, skipping...');
      return null;
    }

    this.isBackingUp = true;

    try {
      // 1. Get pending messages from localStorage
      const pendingMessages = LocalStorageService.getPendingMessages();
      
      if (pendingMessages.length === 0) {
        console.log('No pending messages to backup');
        return null;
      }

      console.log(`Backing up ${pendingMessages.length} messages for ${userAddress}`);

      // 2. Get latest blob ID from Supabase
      const latestBlobId = await this.supabaseService.getLatestBlobId(userAddress);

      // 3. Group messages by chatId
      const conversations = this.groupMessagesByChat(pendingMessages);

      // 4. Create backup data
      const backupData: BackupData = {
        timestamp: Date.now(),
        previousBlobId: latestBlobId,
        conversations
      };

      // 5. Upload to Walrus
      const newBlobId = await this.walrusService.uploadBackup(backupData);

      // 6. Update Supabase with new blob ID
      await this.supabaseService.updateLatestBlobId(userAddress, newBlobId);

      // 7. Clear localStorage
      LocalStorageService.clearPendingMessages();

      // 8. Update last backup timestamp
      LocalStorageService.updateLastBackupTimestamp(Date.now());

      console.log(`Backup successful for ${userAddress}: ${newBlobId}`);
      return newBlobId;

    } catch (error) {
      console.error('Backup failed:', error);
      throw error;
    } finally {
      this.isBackingUp = false;
    }
  }

  /**
   * Group messages by chatId
   */
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

  /**
   * Check if backup is due and perform it if needed
   */
  async checkAndPerformBackup(userAddress: string): Promise<boolean> {
    if (LocalStorageService.isBackupDue()) {
      await this.performBackup(userAddress);
      return true;
    }
    return false;
  }

  /**
   * Get backup status for a user
   */
  async getBackupStatus(userAddress: string): Promise<{
    hasBackups: boolean;
    latestBlobId: string | null;
    pendingMessageCount: number;
    lastBackupTimestamp: number | null;
  }> {
    try {
      const latestBlobId = await this.supabaseService.getLatestBlobId(userAddress);
      const pendingMessageCount = LocalStorageService.getPendingMessageCount();
      const settings = LocalStorageService.getBackupSettings();
      
      return {
        hasBackups: latestBlobId !== null,
        latestBlobId,
        pendingMessageCount,
        lastBackupTimestamp: settings.lastBackupTimestamp || null
      };
    } catch (error) {
      console.error('Failed to get backup status:', error);
      throw error;
    }
  }

  /**
   * Update backup frequency
   */
  async updateBackupFrequency(userAddress: string, frequencyMinutes: number): Promise<void> {
    try {
      // Update in Supabase
      await this.supabaseService.updateBackupFrequency(userAddress, frequencyMinutes);
      
      // Update in localStorage
      const settings = LocalStorageService.getBackupSettings();
      settings.frequencyMinutes = frequencyMinutes;
      LocalStorageService.saveBackupSettings(settings);
      
      // Restart auto backup with new frequency
      this.startAutoBackup(userAddress, frequencyMinutes);
      
      console.log(`Backup frequency updated to ${frequencyMinutes} minutes for ${userAddress}`);
    } catch (error) {
      console.error('Failed to update backup frequency:', error);
      throw error;
    }
  }

  /**
   * Initialize backup system for a new user
   */
  async initializeUser(userAddress: string, frequencyMinutes: number = 5): Promise<void> {
    try {
      // Create initial backup record in Supabase
      await this.supabaseService.createUserBackupRecord(userAddress, frequencyMinutes);
      
      // Set up localStorage settings
      LocalStorageService.saveBackupSettings({
        frequencyMinutes,
        autoBackup: true
      });
      
      // Start auto backup
      this.startAutoBackup(userAddress, frequencyMinutes);
      
      console.log(`Backup system initialized for ${userAddress}`);
    } catch (error) {
      console.error('Failed to initialize user backup system:', error);
      throw error;
    }
  }
}
