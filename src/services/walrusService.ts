import { BackupData } from '../types/backup';

const BACKEND_URL = 'http://localhost:3002';

export class WalrusService {
  private keypair: any;

  constructor(privateKey: string) {
    // Just store the private key for reference
    this.keypair = { privateKey };
    console.log('WalrusService initialized - using backend API');
  }

  async uploadBackup(backupData: BackupData, retries: number = 3): Promise<string> {
    try {
      const messageCount = Object.values(backupData.conversations).reduce((sum, msgs) => sum + msgs.length, 0);
      
      console.log('🔄 Uploading backup via API:', {
        messageCount,
        previousBlobId: backupData.previousBlobId,
        timestamp: backupData.timestamp,
        conversations: Object.keys(backupData.conversations)
      });

      const response = await fetch(`${BACKEND_URL}/api/backup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ backupData }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Backup upload failed');
      }

      const result = await response.json();
      
      console.log('✅ Backup uploaded successfully via API:', result.blobId);
      return result.blobId;
    } catch (error) {
      console.error('Failed to upload backup via API:', error);
      throw error;
    }
  }

  async downloadBackup(blobId: string): Promise<BackupData> {
    try {
      console.log('📥 Downloading backup via API:', blobId);
      
      const response = await fetch(`${BACKEND_URL}/api/backup/${blobId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Backup download failed');
      }

      const result = await response.json();
      
      console.log('✅ Backup downloaded successfully via API');
      return result.backupData;
    } catch (error) {
      console.error('Failed to download backup via API:', error);
      throw error;
    }
  }

  async getBackupMetadata(blobId: string): Promise<any> {
    return {
      blobId,
      timestamp: Date.now()
    };
  }

  async blobExists(blobId: string): Promise<boolean> {
    try {
      await this.downloadBackup(blobId);
      return true;
    } catch (error) {
      return false;
    }
  }

  async getBlobSize(blobId: string): Promise<number> {
    try {
      const backupData = await this.downloadBackup(blobId);
      return JSON.stringify(backupData).length;
    } catch (error) {
      console.error('Failed to get blob size:', error);
      throw error;
    }
  }
}
