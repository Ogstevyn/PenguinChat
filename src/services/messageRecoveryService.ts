import { WalrusService } from './walrusService';
import { SupabaseService } from './supabaseService';
import { Message, BackupData } from '../types/backup';

export class MessageRecoveryService {
  private walrusService: WalrusService;
  private supabaseService: SupabaseService;

  constructor(privateKey: string) {
    this.walrusService = new WalrusService(privateKey);
    this.supabaseService = new SupabaseService();
  }

  async recoverUserMessages(userAddress: string): Promise<Message[]> {
    try {
      console.log(`Starting message recovery for ${userAddress}`);
      
      // 1. Get latest blob ID from Supabase
      const latestBlobId = await this.supabaseService.getLatestBlobId(userAddress);
      
      if (!latestBlobId) {
        console.log('No backups found for user');
        return [];
      }

      // 2. Follow the backup chain and collect all messages
      const allMessages: Message[] = [];
      let currentBlobId: string | null = latestBlobId;
      let backupCount = 0;

      while (currentBlobId) {
        try {
          console.log(`Recovering backup ${++backupCount}: ${currentBlobId}`);
          
          // Download backup from Walrus
          const backupData = await this.walrusService.downloadBackup(currentBlobId);
          
          // Extract messages from all conversations
          Object.values(backupData.conversations).forEach(messages => {
            allMessages.push(...messages);
          });
          
          // Move to previous backup
          currentBlobId = backupData.previousBlobId;
          
        } catch (error) {
          console.error(`Failed to recover backup ${currentBlobId}:`, error);
          break; // Stop if we can't recover a backup
        }
      }

      // 3. Sort messages by timestamp
      allMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      console.log(`Recovered ${allMessages.length} messages from ${backupCount} backups`);
      return allMessages;

    } catch (error) {
      console.error('Failed to recover user messages:', error);
      throw error;
    }
  }

  /**
   * Recover messages for a specific chat
   */
  async recoverChatMessages(userAddress: string, chatId: string): Promise<Message[]> {
    try {
      const allMessages = await this.recoverUserMessages(userAddress);
      return allMessages.filter(message => message.chatId === chatId);
    } catch (error) {
      console.error(`Failed to recover messages for chat ${chatId}:`, error);
      throw error;
    }
  }

  /**
   * Get backup chain information
   */
  async getBackupChainInfo(userAddress: string): Promise<{
    totalBackups: number;
    latestBackupTimestamp: number;
    oldestBackupTimestamp: number;
    totalMessages: number;
  }> {
    try {
      const latestBlobId = await this.supabaseService.getLatestBlobId(userAddress);
      
      if (!latestBlobId) {
        return {
          totalBackups: 0,
          latestBackupTimestamp: 0,
          oldestBackupTimestamp: 0,
          totalMessages: 0
        };
      }

      let totalBackups = 0;
      let totalMessages = 0;
      let latestTimestamp = 0;
      let oldestTimestamp = Number.MAX_SAFE_INTEGER;
      let currentBlobId: string | null = latestBlobId;

      while (currentBlobId) {
        try {
          const backupData = await this.walrusService.downloadBackup(currentBlobId);
          
          totalBackups++;
          totalMessages += Object.values(backupData.conversations).reduce(
            (sum, messages) => sum + messages.length, 0
          );
          
          latestTimestamp = Math.max(latestTimestamp, backupData.timestamp);
          oldestTimestamp = Math.min(oldestTimestamp, backupData.timestamp);
          
          currentBlobId = backupData.previousBlobId;
          
        } catch (error) {
          console.error(`Failed to get info for backup ${currentBlobId}:`, error);
          break;
        }
      }

      return {
        totalBackups,
        latestBackupTimestamp: latestTimestamp,
        oldestBackupTimestamp: oldestTimestamp === Number.MAX_SAFE_INTEGER ? 0 : oldestTimestamp,
        totalMessages
      };

    } catch (error) {
      console.error('Failed to get backup chain info:', error);
      throw error;
    }
  }

  /**
   * Verify backup chain integrity
   */
  async verifyBackupChain(userAddress: string): Promise<{
    isValid: boolean;
    brokenLinks: string[];
    totalBackups: number;
  }> {
    try {
      const latestBlobId = await this.supabaseService.getLatestBlobId(userAddress);
      
      if (!latestBlobId) {
        return {
          isValid: true,
          brokenLinks: [],
          totalBackups: 0
        };
      }

      const brokenLinks: string[] = [];
      let totalBackups = 0;
      let currentBlobId: string | null = latestBlobId;

      while (currentBlobId) {
        try {
          const backupData = await this.walrusService.downloadBackup(currentBlobId);
          totalBackups++;
          currentBlobId = backupData.previousBlobId;
        } catch (error) {
          brokenLinks.push(currentBlobId);
          break;
        }
      }

      return {
        isValid: brokenLinks.length === 0,
        brokenLinks,
        totalBackups
      };

    } catch (error) {
      console.error('Failed to verify backup chain:', error);
      throw error;
    }
  }
}
