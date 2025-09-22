import { WalrusService } from './walrusService';
import { Message, BackupData, SuiBlobObject } from '../types/backup';

export class MessageRecoveryService {
  private walrusService: WalrusService;

  constructor(privateKey: string) {
    this.walrusService = new WalrusService(privateKey);
  }

  /**
   * Recover all messages for a user by querying their wallet objects
   */
  async recoverUserMessages(userAddress: string): Promise<Message[]> {
    try {
      console.log(`Starting message recovery for ${userAddress}`);
      
      // 1. Get all blob objects from user's wallet
      const blobObjects = await this.walrusService.getUserBlobObjects(userAddress);
      
      if (blobObjects.length === 0) {
        console.log('No backups found for user');
        return [];
      }

      console.log(`Found ${blobObjects.length} blob objects`);

      // 2. Download all backups and collect messages
      const allMessages: Message[] = [];
      
      for (const blobObject of blobObjects) {
        try {
          // Extract blob ID from the object
          const blobId = this.extractBlobIdFromObject(blobObject);
          
          if (blobId) {
            console.log(`Recovering backup: ${blobId}`);
            
            // Download backup from Walrus
            const backupData = await this.walrusService.downloadBackup(blobId);
            
            // 3. Filter out non-PenguinChat backups
            if (this.isPenguinChatBackup(backupData)) {
              console.log(`✅ Valid PenguinChat backup found: ${blobId}`);
              
              // Extract messages from all conversations
              Object.values(backupData.conversations).forEach(messages => {
                allMessages.push(...messages);
              });
            } else {
              console.log(`⚠️ Skipping non-PenguinChat backup: ${blobId}`);
            }
          }
        } catch (error) {
          console.error(`Failed to recover backup ${blobObject.objectId}:`, error);
          // Continue with other backups
        }
      }

      // 4. Sort messages by timestamp
      allMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      console.log(`Recovered ${allMessages.length} messages from ${blobObjects.length} blob objects`);
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
      const blobObjects = await this.walrusService.getUserBlobObjects(userAddress);
      
      if (blobObjects.length === 0) {
        return {
          totalBackups: 0,
          latestBackupTimestamp: 0,
          oldestBackupTimestamp: 0,
          totalMessages: 0
        };
      }

      let totalMessages = 0;
      let latestTimestamp = 0;
      let oldestTimestamp = Number.MAX_SAFE_INTEGER;
      let validBackups = 0;

      for (const blobObject of blobObjects) {
        try {
          const blobId = this.extractBlobIdFromObject(blobObject);
          if (blobId) {
            const backupData = await this.walrusService.downloadBackup(blobId);
            
            // Only count PenguinChat backups
            if (this.isPenguinChatBackup(backupData)) {
              validBackups++;
              
              totalMessages += Object.values(backupData.conversations).reduce(
                (sum, messages) => sum + messages.length, 0
              );
              
              latestTimestamp = Math.max(latestTimestamp, backupData.timestamp);
              oldestTimestamp = Math.min(oldestTimestamp, backupData.timestamp);
            }
          }
        } catch (error) {
          console.error(`Failed to get info for backup ${blobObject.objectId}:`, error);
          // Continue with other backups
        }
      }

      return {
        totalBackups: validBackups,
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
      const blobObjects = await this.walrusService.getUserBlobObjects(userAddress);
      
      if (blobObjects.length === 0) {
        return {
          isValid: true,
          brokenLinks: [],
          totalBackups: 0
        };
      }

      const brokenLinks: string[] = [];
      let totalBackups = 0;

      for (const blobObject of blobObjects) {
        try {
          const blobId = this.extractBlobIdFromObject(blobObject);
          if (blobId) {
            const backupData = await this.walrusService.downloadBackup(blobId);
            
            // Only verify PenguinChat backups
            if (this.isPenguinChatBackup(backupData)) {
              totalBackups++;
            }
          }
        } catch (error) {
          brokenLinks.push(blobObject.objectId);
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

  /**
   * Check if a backup is a valid PenguinChat backup
   */
  private isPenguinChatBackup(backupData: any): boolean {
    try {
      // Check if it has the required PenguinChat identifiers
      return (
        backupData &&
        typeof backupData === 'object' &&
        backupData.appId === 'penguinchat' &&
        backupData.version &&
        backupData.conversations &&
        typeof backupData.conversations === 'object' &&
        typeof backupData.timestamp === 'number'
      );
    } catch (error) {
      console.error('Error validating backup data:', error);
      return false;
    }
  }

  /**
   * Extract blob ID from Sui object
   */
  private extractBlobIdFromObject(blobObject: SuiBlobObject): string | null {
    try {
      // The blob ID is typically stored in the object's data fields
      // This might need adjustment based on the actual structure
      if (blobObject.data && blobObject.data.fields) {
        return blobObject.data.fields.blob_id || blobObject.objectId;
      }
      return blobObject.objectId;
    } catch (error) {
      console.error('Failed to extract blob ID from object:', error);
      return null;
    }
  }
}
