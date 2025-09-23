import { Message, BackupSettings } from '../types/backup';

export class LocalStorageService {
  private static readonly MESSAGES_KEY = 'pending_messages';
  private static readonly BACKUP_SETTINGS_KEY = 'backup_settings';

  static saveMessage(message: Message): void {
    try {
      const existingMessages = this.getPendingMessages();
      const updatedMessages = [...existingMessages, message];
      localStorage.setItem(this.MESSAGES_KEY, JSON.stringify(updatedMessages));
    } catch (error) {
      console.error('Failed to save message to localStorage:', error);
    }
  }

  static getPendingMessages(): Message[] {
    try {
      const messagesJson = localStorage.getItem(this.MESSAGES_KEY);
      if (!messagesJson) return [];
      
      const messages = JSON.parse(messagesJson);
      return messages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));
    } catch (error) {
      console.error('Failed to get pending messages from localStorage:', error);
      return [];
    }
  }

  static clearPendingMessages(): void {
    try {
      localStorage.removeItem(this.MESSAGES_KEY);
    } catch (error) {
      console.error('Failed to clear pending messages from localStorage:', error);
    }
  }

  static getPendingMessageCount(): number {
    return this.getPendingMessages().length;
  }

  static saveBackupSettings(settings: BackupSettings): void {
    try {
      localStorage.setItem(this.BACKUP_SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save backup settings to localStorage:', error);
    }
  }

  static getBackupSettings(): BackupSettings {
    try {
      const settingsJson = localStorage.getItem(this.BACKUP_SETTINGS_KEY);
      if (!settingsJson) {
        return {
          frequencyMinutes: 5,
          autoBackup: true
        };
      }
      return JSON.parse(settingsJson);
    } catch (error) {
      console.error('Failed to get backup settings from localStorage:', error);
      return {
        frequencyMinutes: 5,
        autoBackup: true
      };
    }
  }

  static updateLastBackupTimestamp(timestamp: number): void {
    try {
      const settings = this.getBackupSettings();
      settings.lastBackupTimestamp = timestamp;
      this.saveBackupSettings(settings);
    } catch (error) {
      console.error('Failed to update last backup timestamp:', error);
    }
  }

  static isBackupDue(): boolean {
    const settings = this.getBackupSettings();
    if (!settings.autoBackup || !settings.lastBackupTimestamp) {
      return true;
    }
    
    const now = Date.now();
    const timeSinceLastBackup = now - settings.lastBackupTimestamp;
    const frequencyMs = settings.frequencyMinutes * 60 * 1000;
    
    return timeSinceLastBackup >= frequencyMs;
  }
}
