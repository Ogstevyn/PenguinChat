import { Message, ChatSummary } from '../types/backup';
import { LocalStorageService } from './localStorageService';
import { MessageSyncService } from './messageSyncService';

export class ChatService {
  private syncService: MessageSyncService;
  private userAddress: string;

  constructor(userAddress: string) {
    this.userAddress = userAddress;
    this.syncService = new MessageSyncService(userAddress);
  }

  async getUserChats(userAddress: string): Promise<ChatSummary[]> {
    try {
      const localChats = LocalStorageService.getUserChats(userAddress);
      return localChats;
    } catch (error) {
      console.error('Failed to load user chats:', error);
      return [];
    }
  }

  async getChatMessages(userAddress: string, chatId: string): Promise<Message[]> {
    try {
      console.log(`🔍 Loading messages for chat ${chatId} (user: ${userAddress})`);
      const localMessages = LocalStorageService.getMessagesByChat(userAddress, chatId);
      console.log(`📨 Found ${localMessages.length} messages for chat ${chatId}`);
      return localMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    } catch (error) {
      console.error(`❌ Failed to load messages for chat ${chatId}:`, error);
      return [];
    }
  }

  async sendMessage(userAddress: string, message: Message): Promise<void> {
    try {
      LocalStorageService.saveMessage(userAddress, message);
      console.log('Message saved to localStorage:', message);
      await this.syncService.sendMessage(message, true);
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }

  async createNewChat(userAddress: string, chatId: string, chatName: string, chatAvatar: string): Promise<void> {
    try {
      console.log(`🚀 Creating new chat:`, { userAddress, chatId, chatName, chatAvatar });
      
      // Extract the other participant's address
      const parts = chatId.split('_');
      const address1 = parts[1];
      const address2 = parts[2];
      const otherParticipantAddress = userAddress === address1 ? address2 : address1;
      
      // Save user mapping for the other participant
      LocalStorageService.saveUserMapping(otherParticipantAddress, chatName);
      console.log(`�� Saved user mapping: ${otherParticipantAddress} -> ${chatName}`);
      
      const welcomeMessage: Message = {
        id: `${Date.now()}_${Math.random()}`,
        text: `Started conversation with ${chatName}`,
        timestamp: new Date(),
        isSent: true,
        isRead: true,
        status: 'sent',
        chatId,
        sender: {
          name: 'System',
          avatar: LocalStorageService.getAvatarUrl("0x1", "System")
        },
      };
  
      // Save the welcome message
      LocalStorageService.saveMessage(userAddress, welcomeMessage);
      
      // Create and save the chat summary with participants list
      const chatSummary: ChatSummary = {
        id: chatId,
        name: chatName, // This will be overridden when displaying
        avatar: chatAvatar, // This will be overridden when displaying
        lastMessage: welcomeMessage.text,
        timestamp: 'Just now',
        unreadCount: 0,
        lastMessageTimestamp: welcomeMessage.timestamp,
        participants: [userAddress, otherParticipantAddress] // Store both participants
      };
      
      console.log(`💬 Chat summary to save:`, chatSummary);
      LocalStorageService.saveChat(userAddress, chatSummary);
      console.log(`✅ New chat created: ${chatName}`);
    } catch (error) {
      console.error('Failed to create new chat:', error);
      throw error;
    }
  }

  onMessage(callback: (message: Message) => void): void {
    this.syncService.onMessage(callback);
  }

  offMessage(callback: (message: Message) => void): void {
    this.syncService.offMessage(callback);
  }

  async connect(): Promise<void> {
    if (this.syncService) {
      await this.syncService.connect();
    }
  }

  disconnect(): void {
    if (this.syncService) {
      this.syncService.disconnect();
    }
  }

  private formatTimestamp(timestamp: Date): string {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return timestamp.toLocaleDateString();
  }
}