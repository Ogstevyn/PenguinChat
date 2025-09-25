import { Message, BackupSettings, ChatSummary } from '../types/backup';

export class LocalStorageService {
  // Wallet-specific keys
  private static getMessagesKey(userAddress: string): string {
    return `messages_${userAddress}`;
  }
  
  private static getChatsKey(userAddress: string): string {
    return `chats_${userAddress}`;
  }
  
  private static getLastSyncKey(userAddress: string): string {
    return `lastSync_${userAddress}`;
  }
  
  private static getBackupSettingsKey(userAddress: string): string {
    return `backup_settings_${userAddress}`;
  }

  private static updateChatSummary(userAddress: string, message: Message): void {
    try {
      console.log(`🔍 updateChatSummary called with chatId: ${message.chatId}`);
      console.log(`🔍 Current user address: ${userAddress}`);
      
      if (!message.chatId) {
        console.log(`⚠️ No chatId found in message, skipping chat summary update`);
        return;
      }
      
      // Extract participants from chatId (format: chat_address1_address2)
      const parts = message.chatId.split('_');
      console.log(`🔍 ChatId parts:`, parts);
      
      if (parts.length < 3) {
        console.log(`⚠️ Invalid chatId format: ${message.chatId}`);
        return;
      }
      
      const address1 = parts[1];
      const address2 = parts[2];
      
      // Check if we already have a chat with this ID
      const existingChats = this.getUserChats(userAddress);
      const existingChat = existingChats.find(c => c.id === message.chatId);
      
      let chatSummary: ChatSummary;
      
      if (existingChat) {
        // Update existing chat - preserve name and avatar, only update message info
        chatSummary = {
          ...existingChat,
          lastMessage: message.text,
          lastMessageTimestamp: message.timestamp,
          timestamp: this.formatTimestamp(message.timestamp)
        };
        console.log(` Updating existing chat, preserving name: ${existingChat.name}`);
      } else {
        // New chat - create with participants list
        const otherParticipantAddress = userAddress === address1 ? address2 : address1;
        
        chatSummary = {
          id: message.chatId,
          name: this.getDisplayName(otherParticipantAddress), // Use display name
          avatar: LocalStorageService.getAvatarUrl(otherParticipantAddress, this.getDisplayName(otherParticipantAddress)),
          lastMessage: message.text,
          timestamp: this.formatTimestamp(message.timestamp),
          unreadCount: 0,
          lastMessageTimestamp: message.timestamp,
          participants: [userAddress, otherParticipantAddress]
        };
        console.log(`🆕 Creating new chat with participants:`, chatSummary.participants);
      }
      
      console.log(`💬 Final chat summary:`, chatSummary);
      
      // Save the updated chat summary
      console.log(`💾 Calling saveChat...`);
      this.saveChat(userAddress, chatSummary);
      console.log(`✅ Chat summary updated for ${message.chatId}`);
    } catch (error) {
      console.error('❌ Failed to update chat summary:', error);
    }
  }


static generateLocalAvatar(address: string, size: number = 40): string {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'
  ];
  
  const colorIndex = parseInt(address.slice(2, 8), 16) % colors.length;
  const initials = address.slice(2, 4).toUpperCase();
  const bgColor = colors[colorIndex];
  
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad-${address.slice(2, 8)}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${bgColor};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${bgColor}CC;stop-opacity:1" />
        </linearGradient>
      </defs>
      <circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="url(#grad-${address.slice(2, 8)})"/>
      <text x="${size/2}" y="${size/2 + 6}" text-anchor="middle" fill="white" font-size="${size/3}" font-weight="bold" font-family="system-ui">${initials}</text>
    </svg>
  `;
  
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

  static async getAvatarUrlAsync(address: string, name?: string): Promise<string> {
    // Try UI Avatars first (if we have a name)
    if (name) {
      try {
        const uiAvatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=40&background=random&color=fff&bold=true`;
        // Test if the URL is accessible
        const response = await fetch(uiAvatarUrl, { method: 'HEAD' });
        if (response.ok) {
          return uiAvatarUrl;
        }
      } catch (error) {
        console.log('UI Avatars failed, trying next service...');
      }
    }
    
    // Try Multiavatar
    try {
      const multiavatarUrl = `https://api.multiavatar.com/${address}.svg`;
      const response = await fetch(multiavatarUrl, { method: 'HEAD' });
      if (response.ok) {
        return multiavatarUrl;
      }
    } catch (error) {
      console.log('Multiavatar failed, using local generation...');
    }
    
    // Final fallback to local generation
    return this.generateLocalAvatar(address);
  }

  // Synchronous version (for immediate use)
  static getAvatarUrl(address: string, name?: string): string {
    if (name) {
      return `https://robohash.org/${address}?size=200x200&set=set1`;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=40&background=random&color=fff&bold=true`;
  }

  static saveUserMapping(userAddress: string, displayName: string): void {
    try {
      const key = `user_mapping_${userAddress}`;
      localStorage.setItem(key, displayName);
      console.log(`💾 Saved user mapping: ${userAddress} -> ${displayName}`);
    } catch (error) {
      console.error('❌ Failed to save user mapping:', error);
    }
  }

  static getUserMapping(userAddress: string): string | null {
    try {
      const key = `user_mapping_${userAddress}`;
      return localStorage.getItem(key);
    } catch (error) {
      console.error('❌ Failed to get user mapping:', error);
      return null;
    }
  }

  static getAllUserMappings(): Record<string, string> {
    try {
      const mappings: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('user_mapping_')) {
          const address = key.replace('user_mapping_', '');
          const displayName = localStorage.getItem(key);
          if (displayName) {
            mappings[address] = displayName;
          }
        }
      }
      return mappings;
    } catch (error) {
      console.error('❌ Failed to get all user mappings:', error);
      return {};
    }
  }

  static getDisplayName(userAddress: string): string {
    console.log(`🔍 getDisplayName called for: ${userAddress}`);
    
    // First check for saved user mapping
    const mapping = this.getUserMapping(userAddress);
    if (mapping) {
      console.log(`✅ Found mapping: ${userAddress} -> ${mapping}`);
      return mapping;
    }
    
    // Check if it's already a SUI domain (ends with .sui)
    if (userAddress.endsWith('.sui')) {
      console.log(`✅ SUI domain detected: ${userAddress}`);
      return userAddress;
    }
    
    // Fallback to shortened address
    const shortAddress = `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
    console.log(`⚠️ Using fallback short address: ${shortAddress}`);
    return shortAddress;
  }

  static saveMessage(userAddress: string, message: Message): void {
    try {
      console.log(`🚀 saveMessage called for user: ${userAddress}`, message);
      
      const key = this.getMessagesKey(userAddress);
      console.log(`💾 Saving message to key: ${key}`, message);
      
      const existingMessages = this.getAllMessages(userAddress);
      const updatedMessages = [...existingMessages, message];
      localStorage.setItem(key, JSON.stringify(updatedMessages));
      
      console.log(`✅ Message saved. Total messages for ${userAddress}: ${updatedMessages.length}`);
      
      // Update chat summary after saving message
      console.log(`🔄 Calling updateChatSummary for chatId: ${message.chatId}`);
      this.updateChatSummary(userAddress, message);
    } catch (error) {
      console.error('❌ Failed to save message to localStorage:', error);
    }
  }

  static getAllMessages(userAddress: string): Message[] {
    try {
      const key = this.getMessagesKey(userAddress);
      
      const messagesJson = localStorage.getItem(key);
      if (!messagesJson) {
        return [];
      }
      
      const messages = JSON.parse(messagesJson);
      const formattedMessages = messages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));
      
      return formattedMessages;
    } catch (error) {
      console.error('❌ Failed to get messages from localStorage:', error);
      return [];
    }
  }
  

  static generateChatSummaries(userAddress: string): ChatSummary[] {
    try {
      const messages = this.getAllMessages(userAddress);
      const chatMap = new Map<string, ChatSummary>();
      
      messages.forEach(message => {
        if (!message.chatId) return;
        
        const chatId = message.chatId;
        const existingChat = chatMap.get(chatId);
        
        if (!existingChat || message.timestamp > existingChat.lastMessageTimestamp) {
          // Extract recipient address from chatId (format: chat_sender_recipient)
          const parts = chatId.split('_');
          const recipientAddress = parts[2];
          const recipientShort = `${recipientAddress.slice(0, 6)}...${recipientAddress.slice(-4)}`;
          
          chatMap.set(chatId, {
            id: chatId,
            name: recipientShort,
            avatar: LocalStorageService.getAvatarUrl(recipientAddress, recipientShort),
            lastMessage: message.text,
            timestamp: this.formatTimestamp(message.timestamp),
            unreadCount: 0,
            lastMessageTimestamp: message.timestamp,
            participants: [userAddress, recipientAddress]
          });
        }
      });
      
      const chats = Array.from(chatMap.values());
      
      // Sort by lastMessageTimestamp (most recent first)
      const sortedChats = chats.sort((a, b) => 
        b.lastMessageTimestamp.getTime() - a.lastMessageTimestamp.getTime()
      );
      
      console.log(`�� Generated ${sortedChats.length} chat summaries from messages`);
      return sortedChats;
    } catch (error) {
      console.error('❌ Failed to generate chat summaries:', error);
      return [];
    }
  }

  private static formatTimestamp(timestamp: Date): string {
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


  static getMessagesByChat(userAddress: string, chatId: string): Message[] {
    const allMessages = this.getAllMessages(userAddress);
    return allMessages.filter(msg => msg.chatId === chatId);
  }

  static updateMessageStatus(userAddress: string, messageId: string, status: Message['status']): void {
    try {
      const messages = this.getAllMessages(userAddress);
      const updatedMessages = messages.map(msg => 
        msg.id === messageId ? { ...msg, status } : msg
      );
      const key = this.getMessagesKey(userAddress);
      localStorage.setItem(key, JSON.stringify(updatedMessages));
    } catch (error) {
      console.error('Failed to update message status:', error);
    }
  }

  static saveChat(userAddress: string, chat: ChatSummary): void {
    try {
      console.log(`💾 saveChat called for user: ${userAddress}`, chat);
      
      const key = this.getChatsKey(userAddress);
      console.log(`🔍 Chat key: ${key}`);
      
      const existingChats = this.getUserChats(userAddress);
      console.log(` Existing chats:`, existingChats);
      
      const updatedChats = existingChats.filter(c => c.id !== chat.id);
      updatedChats.push(chat);
      
      console.log(`🔍 Updated chats:`, updatedChats);
      
      localStorage.setItem(key, JSON.stringify(updatedChats));
      console.log(`✅ Chat saved to localStorage`);
      
      // Dispatch custom event to notify components
      window.dispatchEvent(new CustomEvent('chatUpdated', { 
        detail: { userAddress, chat } 
      }));
    } catch (error) {
      console.error('❌ Failed to save chat to localStorage:', error);
    }
  }

  static getUserChats(userAddress: string): ChatSummary[] {
    try {
      const key = this.getChatsKey(userAddress);
      console.log(`🔍 Getting chats for key: ${key}`);
      
      const chatsJson = localStorage.getItem(key);
      if (!chatsJson) {
        console.log(`📭 No chats found, generating from messages`);
        return this.generateChatSummaries(userAddress);
      }
      
      const chats = JSON.parse(chatsJson);
      const formattedChats = chats.map((chat: any) => ({
        ...chat,
        lastMessageTimestamp: new Date(chat.lastMessageTimestamp)
      }));
      
      // Sort by lastMessageTimestamp (most recent first)
      const sortedChats = formattedChats.sort((a, b) => 
        b.lastMessageTimestamp.getTime() - a.lastMessageTimestamp.getTime()
      );
      
      // Update chat names and avatars based on participants
      const updatedChats = sortedChats.map(chat => {
        const otherParticipant = chat.participants.find((p: string) => p !== userAddress);
        if (otherParticipant) {
          const displayName = this.getDisplayName(otherParticipant);
          const avatar = LocalStorageService.getAvatarUrl(otherParticipant, displayName);
          
          return {
            ...chat,
            name: displayName,
            avatar: avatar
          };
        }
        return chat;
      });
      
      console.log(`💬 Retrieved ${updatedChats.length} chats for user: ${userAddress}`, updatedChats);
      return updatedChats;
    } catch (error) {
      console.error('❌ Failed to get chats from localStorage:', error);
      return this.generateChatSummaries(userAddress);
    }
  }

  // Sync management
  static getLastSyncTimestamp(userAddress: string): number {
    try {
      const key = this.getLastSyncKey(userAddress);
      const timestamp = localStorage.getItem(key);
      return timestamp ? parseInt(timestamp) : 0;
    } catch (error) {
      console.error('Failed to get last sync timestamp:', error);
      return 0;
    }
  }

  static updateLastSyncTimestamp(userAddress: string, timestamp: number): void {
    try {
      const key = this.getLastSyncKey(userAddress);
      localStorage.setItem(key, timestamp.toString());
    } catch (error) {
      console.error('Failed to update last sync timestamp:', error);
    }
  }

  // Backup settings (wallet-specific)
  static saveBackupSettings(userAddress: string, settings: BackupSettings): void {
    try {
      const key = this.getBackupSettingsKey(userAddress);
      localStorage.setItem(key, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save backup settings:', error);
    }
  }

  static getBackupSettings(userAddress: string): BackupSettings {
    try {
      const key = this.getBackupSettingsKey(userAddress);
      const settingsJson = localStorage.getItem(key);
      if (!settingsJson) {
        return {
          frequencyMinutes: 5,
          autoBackup: true
        };
      }
      return JSON.parse(settingsJson);
    } catch (error) {
      console.error('Failed to get backup settings:', error);
      return {
        frequencyMinutes: 5,
        autoBackup: true
      };
    }
  }




  // Legacy
  
  static getPendingMessages(): Message[] {
    // This is a fallback - should use wallet-specific version
    console.warn('Using legacy getPendingMessages - please use getAllMessages(userAddress)');
    return this.getAllMessages('default');
  }

  static clearPendingMessages(): void {
    // This is a fallback - should use wallet-specific version
    console.warn('Using legacy clearPendingMessages - please use clearAllMessages(userAddress)');
    this.clearAllMessages('default');
  }

  static getPendingMessageCount(): number {
    // This is a fallback - should use wallet-specific version
    console.warn('Using legacy getPendingMessageCount - please use getAllMessages(userAddress).length');
    return this.getAllMessages('default').length;
  }

  static clearAllMessages(userAddress: string): void {
    try {
      const key = this.getMessagesKey(userAddress);
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to clear messages:', error);
    }
  }
}