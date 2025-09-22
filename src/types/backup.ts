export interface BackupData {
  timestamp: number;
  previousBlobId: string | null;
  conversations: Record<string, Message[]>;
}

export interface Message {
  id: string;
  text: string;
  timestamp: Date;
  isSent: boolean;
  isRead?: boolean;
  sender: {
    name: string;
    avatar: string;
  };
  chatId: string;
}

export interface BackupSettings {
  frequencyMinutes: number;
  autoBackup: boolean;
  lastBackupTimestamp?: number;
}

export interface WalrusUploadResult {
  blobId: string;
  blobObject: {
    id: {
      id: string;
    };
    registered_epoch: number;
    blob_id: string;
    size: string;
    encoding_type: number;
    certified_epoch: number;
    storage: {
      id: any;
      start_epoch: number;
      end_epoch: number;
      storage_size: string;
    };
    deletable: boolean;
  };
}

export interface UserBackupRecord {
  user_address: string;
  latest_blob_id: string;
  last_backup_timestamp: number;
  backup_frequency_minutes: number;
  created_at: string;
  updated_at: string;
}
