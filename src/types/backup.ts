export interface BackupData {
  timestamp: number;
  appId: string; // "penguinchat" - to identify our backups
  version: string; // "1.0.0" - for future compatibility
  conversations: Record<string, Message[]>;
  suiObjectId?: string; // Optional: store the Sui object ID for reference
}


export interface MessageStatus {
  id: string;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: number;
}

export interface ChatSummary {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  lastMessageTimestamp: Date;
  participants: string[];
}

export interface Message {
    id: string;
    text: string;
    timestamp: Date;
    isSent: boolean;
    isRead?: boolean;
    status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
    sender: {
      name: string;
      avatar: string;
    };
    chatId: string;
    senderAddress?: string;
    type?: 'text' | 'image' | 'gift';
    imageUrl?: string;
    imageData?: string;
    fileName?: string;
    fileSize?: number;
    giftData?: {
      amount: string;
      asset: string;
      transactionDigest: string;
      recipient: string;
    };
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

export interface SuiBlobObject {
  objectId: string;
  version: string;
  digest: string;
  type: string;
  owner: {
    AddressOwner: string;
  };
  previousTransaction: string;
  storageRebate: string;
  reference: {
    objectId: string;
    version: string;
    digest: string;
  };
  data: {
    dataType: string;
    type: string;
    has_public_transfer: boolean;
    fields: any;
  };
}
