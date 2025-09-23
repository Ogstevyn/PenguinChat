import { Message } from '../types/backup';
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
  private messageUpdateCallbacks: ((messages: Message[]) => void)[] = [];

  constructor(privateKey: string) {
    this.recoveryService = new MessageRecoveryService(privateKey);
  }

  async getUserChats(userAddress: string): Promise<ChatSummary[]> {
    try {
      const pendingMessages = LocalStorageService.getPendingMessages();
      
      this.recoveryService.recoverUserMessagesStream(userAddress, (newMessages) => {
        newMessages.forEach(message => {
          LocalStorageService.saveMessage(message);
        });
        this.notifyMessagesUpdated(newMessages);
      });
      
      if (pendingMessages.length === 0) {
        return [];
      }
  
      const messagesByChat = this.groupMessagesByChat(pendingMessages);
      
      const chatSummaries: ChatSummary[] = Object.entries(messagesByChat).map(([chatId, messages]) => {
        const sortedMessages = messages.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        const lastMessage = sortedMessages[0];
        
        return {
          id: chatId,
          name: this.getChatName(chatId, messages),
          avatar: this.getChatAvatar(chatId, messages),
          lastMessage: lastMessage.text,
          timestamp: this.formatTimestamp(lastMessage.timestamp),
          lastMessageTimestamp: lastMessage.timestamp,
          unreadCount: 0
        };
      });
  
      chatSummaries.sort((a, b) => b.lastMessageTimestamp.getTime() - a.lastMessageTimestamp.getTime());
      return chatSummaries;
      
    } catch (error) {
      console.error('Failed to load user chats:', error);
      return [];
    }
  }

  async getChatMessages(userAddress: string, chatId: string): Promise<Message[]> {
    try {
      const allMessages = await this.recoveryService.recoverUserMessages(userAddress);
      const pendingMessages = LocalStorageService.getPendingMessages();
      
      const chatMessages = [...allMessages, ...pendingMessages]
        .filter(msg => msg.chatId === chatId)
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      return chatMessages;
    } catch (error) {
      console.error(`Failed to load messages for chat ${chatId}:`, error);
      return [];
    }
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

      LocalStorageService.saveMessage(welcomeMessage);
    } catch (error) {
      console.error('Failed to create new chat:', error);
      throw error;
    }
  }

  onMessagesUpdated(callback: (messages: Message[]) => void) {
    this.messageUpdateCallbacks.push(callback);
  }

  private notifyMessagesUpdated(messages: Message[]) {
    this.messageUpdateCallbacks.forEach(callback => callback(messages));
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
      return parts[2];
    }
    
    return chatId;
  }

  private getChatAvatar(chatId: string, messages: Message[]): string {
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
}
