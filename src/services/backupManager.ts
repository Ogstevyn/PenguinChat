import { LocalStorageService } from './localStorageService';
import { Message } from '../types/backup';

export class BackupManager {
  private backupInterval: NodeJS.Timeout | null = null;

  constructor() {
  }

  startAutoBackup(userAddress: string, frequencyMinutes: number = 5): void {
    this.stopAutoBackup();
    const frequencyMs = frequencyMinutes * 60 * 1000;
    
    console.log(`🔄 Starting auto backup for ${userAddress} every ${frequencyMinutes} minutes`);
    
    this.backupInterval = setInterval(async () => {
      try {
        console.log('⏰ Auto backup timer triggered - backup will be handled by BackupContext');
      } catch (error) {
        console.error('Auto backup failed:', error);
      }
    }, frequencyMs);
  }

  stopAutoBackup(): void {
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
      this.backupInterval = null;
      console.log('🛑 Stopped auto backup');
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
      
      const existingSettings = LocalStorageService.getBackupSettings(userAddress);
    
      LocalStorageService.saveBackupSettings(userAddress, {
        frequencyMinutes,
        autoBackup: true,
        lastBackupTimestamp: existingSettings.lastBackupTimestamp || null
      });
      
      this.startAutoBackup(userAddress, frequencyMinutes);
      console.log(`✅ Backup system initialized for user: ${userAddress}`);
    } catch (error) {
      console.error('Failed to initialize user backup system:', error);
      throw error;
    }
  }
}