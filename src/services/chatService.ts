import { Message, BackupData } from '../types/backup';
import { MessageRecoveryService } from './messageRecoveryService';
import { LocalStorageService } from './localStorageService';

export interface ChatSummary {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  unreadCount?: number;
  lastMessageTimestamp: Date;
}

export class ChatService {
  private recoveryService: MessageRecoveryService;

  constructor(privateKey: string) {
    this.recoveryService = new MessageRecoveryService(privateKey);
  }

  async getUserChats(userAddress: string): Promise<ChatSummary[]> {
    try {
      console.log('🔍 Loading user chats from backup system...');
      
      // Get all messages from backup system
      const allMessages = await this.recoveryService.recoverUserMessages(userAddress);
      
      // Get pending messages from localStorage
      const pendingMessages = LocalStorageService.getPendingMessages();
      
      // Combine all messages
      const combinedMessages = [...allMessages, ...pendingMessages];
      
      if (combinedMessages.length === 0) {
        console.log('No messages found, returning empty chat list');
        return [];
      }

      // Group messages by chatId
      const messagesByChat = this.groupMessagesByChat(combinedMessages);
      
      // Create chat summaries
      const chats: ChatSummary[] = Object.entries(messagesByChat).map(([chatId, messages]) => {
        // Sort messages by timestamp to get the latest
        const sortedMessages = messages.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        const lastMessage = sortedMessages[0];
        
        // Count unread messages (messages not sent by current user and not read)
        const unreadCount = messages.filter(msg => 
          !msg.isSent && !msg.isRead
        ).length;

        return {
          id: chatId,
          name: this.getChatName(chatId, messages),
          avatar: this.getChatAvatar(chatId, messages),
          lastMessage: lastMessage.text,
          timestamp: this.formatTimestamp(lastMessage.timestamp),
          unreadCount: unreadCount > 0 ? unreadCount : undefined,
          lastMessageTimestamp: lastMessage.timestamp
        };
      });

      // Sort chats by last message timestamp
      chats.sort((a, b) => b.lastMessageTimestamp.getTime() - a.lastMessageTimestamp.getTime());

      console.log(`✅ Loaded ${chats.length} chats from backup system`);
      return chats;

    } catch (error) {
      console.error('Failed to load user chats:', error);
      // Return empty array on error
      return [];
    }
  }

  async getChatMessages(userAddress: string, chatId: string): Promise<Message[]> {
    try {
      console.log(`🔍 Loading messages for chat ${chatId}...`);
      
      // Get all messages from backup system
      const allMessages = await this.recoveryService.recoverUserMessages(userAddress);
      
      // Get pending messages from localStorage
      const pendingMessages = LocalStorageService.getPendingMessages();
      
      // Combine and filter by chatId
      const chatMessages = [...allMessages, ...pendingMessages]
        .filter(msg => msg.chatId === chatId)
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      console.log(`✅ Loaded ${chatMessages.length} messages for chat ${chatId}`);
      return chatMessages;

    } catch (error) {
      console.error(`Failed to load messages for chat ${chatId}:`, error);
      return [];
    }
  }

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

    private getChatName(chatId: string, messages: Message[]): string {
        
        const nonUserMessage = messages.find(msg => !msg.isSent);
        if (nonUserMessage) {
        return nonUserMessage.sender.name;
        }
        
        const welcomeMessage = messages.find(msg => 
        msg.isSent && msg.text.includes('Started conversation with')
        );
        if (welcomeMessage) {
        const match = welcomeMessage.text.match(/Started conversation with (.+)/);
        if (match) {
            return match[1];
        }
        }
        
        const parts = chatId.split('_');
        if (parts.length >= 3) {
        const userAddress = parts[2];
        return userAddress;
        }
        
        return chatId;
    }

  private getChatAvatar(chatId: string, messages: Message[]): string {
    // Try to find an avatar from the first non-user message
    const nonUserMessage = messages.find(msg => !msg.isSent);
    if (nonUserMessage) {
      return nonUserMessage.sender.avatar;
    }
    
    const defaultAvatars: Record<string, string> = {
      '1': 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah&backgroundColor=c0aede&radius=50',
      '2': 'https://api.dicebear.com/7.x/identicon/svg?seed=DevTeam',
      '3': 'https://api.dicebear.com/7.x/avataaars/svg?seed=PenguinBot&backgroundColor=b6e3f4&radius=50'
    };
    
    return defaultAvatars[chatId] || `https://api.dicebear.com/7.x/avataaars/svg?seed=${chatId}&backgroundColor=b6e3f4&radius=50`;
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
  
    async createNewChat(userAddress: string, chatId: string, chatName: string, chatAvatar: string): Promise<void> {
        try {
        const welcomeMessage: Message = {
            id: Date.now().toString(),
            text: `Started conversation with ${chatName}`,
            timestamp: new Date(),
            isSent: true,
            isRead: true,
            chatId,
            sender: {
            name: 'You',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=You&backgroundColor=b6e3f4&radius=50'
            }
        };
    
        // Save to localStorage (will be backed up later)
        LocalStorageService.saveMessage(welcomeMessage);
        
        console.log(`✅ Created new chat: ${chatName} (${chatId})`);
        } catch (error) {
        console.error('Failed to create new chat:', error);
        throw error;
        }
    }
}