import { WalrusService } from './walrusService';
import { Message, BackupData, SuiBlobObject } from '../types/backup';
import { blobIdFromInt } from '@mysten/walrus';

export class MessageRecoveryService {
  private walrusService: WalrusService;

  constructor(privateKey: string) {
    this.walrusService = new WalrusService(privateKey);
  }

  async recoverUserMessagesStream(
    userAddress: string, 
    onMessagesFound: (messages: Message[]) => void
  ): Promise<Message[]> {
    try {
      const response = await fetch(`http://localhost:3002/api/penguinchat-backups/${userAddress}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch backups');
      }
      
      console.log('🔍 API backups:', data.backups);
      
      if (data.backups.length === 0) {
        return [];
      }
  
      const allMessages: Message[] = [];
      
      for (const backup of data.backups) {
        try {
          if (backup.backupData) {
            const backupData = backup.backupData;
            
            if (this.isPenguinChatBackup(backupData)) {
              const newMessages: Message[] = [];
              Object.values(backupData.conversations).forEach(messages => {
                const convertedMessages = (messages as any[]).map((msg: any) => ({
                  ...msg,
                  timestamp: new Date(msg.timestamp)
                }));
                newMessages.push(...convertedMessages);
              });
              
              allMessages.push(...newMessages);
              onMessagesFound(newMessages);
            }
          }
        } catch (error) {
          console.error(`Failed to process backup ${backup.blobId}:`, error);
        }
      }
  
      allMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      return allMessages;
    } catch (error) {
      console.error('Failed to recover user messages:', error);
      throw error;
    }
  }
  
  async recoverUserMessages(userAddress: string): Promise<Message[]> {
    try {
      // Use the same API approach
      const response = await fetch(`http://localhost:3002/api/penguinchat-backups/${userAddress}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch backups');
      }
      
      if (data.backups.length === 0) {
        return [];
      }
  
      const allMessages: Message[] = [];
      
      for (const backup of data.backups) {
        try {
          const backupData = await this.walrusService.downloadBackup(backup.blobId);
          
          for (const backup of data.backups) {
            try {
              if (backup.backupData && this.isPenguinChatBackup(backup.backupData)) {
                Object.values(backup.backupData.conversations).forEach(messages => {
                  const convertedMessages = (messages as Message[]).map(msg => ({
                    ...msg,
                    timestamp: new Date(msg.timestamp)
                  }));
                  allMessages.push(...convertedMessages);
                });
              }
            } catch (error) {
              console.error(`Failed to process backup ${backup.blobId}:`, error);
            }
          }
        } catch (error) {
          console.error(`Failed to recover backup ${backup.blobId}:`, error);
        }
      }
  
      allMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      return allMessages;
    } catch (error) {
      console.error('Failed to recover user messages:', error);
      throw error;
    }
  }

  private isPenguinChatBackup(backupData: any): boolean {
    try {
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

  private extractBlobIdFromObject(blobObject: SuiBlobObject): string | null {
    try {
      if (blobObject.data && blobObject.data?.fields?.fields) {
        const blobIdString = blobObject.data.fields.fields.blob_id;

        if (blobIdString) {
          const properBlobId = blobIdFromInt(blobIdString);
          console.log('Proper blob ID:', properBlobId);
          return properBlobId;
        }
      }
      return blobObject.objectId;
    } catch (error) {
      return null;
    }
  }

}



