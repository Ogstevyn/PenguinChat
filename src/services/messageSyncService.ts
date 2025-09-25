import { io, Socket } from 'socket.io-client';
import { Message } from '../types/backup';
import { LocalStorageService } from './localStorageService';
import { LITE_SERVER } from '@/config';

export class MessageSyncService {
  private userAddress: string;
  private ws: Socket | null = null;
  private reconnectInterval: NodeJS.Timeout | null = null;
  private messageCallbacks: ((message: Message) => void)[] = [];

  constructor(userAddress: string) {
    this.userAddress = userAddress;
  }

  async connect(): Promise<void> {
    try {
      this.ws = io(LITE_SERVER, { 
        transports: ['websocket', 'polling'], // Add polling as fallback
        upgrade: true,
        rememberUpgrade: true,
        timeout: 20000,
        forceNew: true
      });
      
      this.ws.on('connect', () => {
        console.log('WebSocket connected');
        this.clearReconnectInterval();
        // Join the user's room
        this.ws?.emit('join', { userAddress: this.userAddress });
      });
  
      this.ws.on('messages', (messages) => {
        try {
          console.log(`📨 Received ${messages.length} queued messages:`, messages);
          // Handle bulk messages (when user comes online)
          messages.forEach((msg: any, index: number) => {
            const message: Message = {
              ...msg,
              timestamp: new Date(msg.timestamp),
              // Ensure received messages have proper sender info
              sender: msg.sender || {
                name: `${msg.chatId.split('_')[1].slice(0, 6)}...${msg.chatId.split('_')[1].slice(-4)}`,
                avatar: LocalStorageService.getAvatarUrl(msg.chatId.split('_')[1], `${msg.chatId.split('_')[1].slice(0, 6)}...${msg.chatId.split('_')[1].slice(-4)}`)
              }
            };
            console.log(`�� Processing queued message ${index + 1}/${messages.length}:`, message);
            this.handleIncomingMessage(message);
          });
        } catch (error) {
          console.error('Failed to parse bulk messages:', error);
        }
      });
      
      this.ws.on('message', (data) => {
        try {
          if (data.type === 'message') {
            const message: Message = {
              ...data.message,
              timestamp: new Date(data.message.timestamp),
              // Ensure received messages have proper sender info
              sender: data.message.sender || {
                name: `${data.message.chatId.split('_')[1].slice(0, 6)}...${data.message.chatId.split('_')[1].slice(-4)}`,
                avatar: LocalStorageService.getAvatarUrl(data.message.chatId.split('_')[1], `${data.message.chatId.split('_')[1].slice(0, 6)}...${data.message.chatId.split('_')[1].slice(-4)}`)
              }
            };
            this.handleIncomingMessage(message);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      });
  
      this.ws.on('disconnect', () => {
        console.log('WebSocket disconnected, attempting to reconnect...');
        this.scheduleReconnect();
      });
  
      this.ws.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
      });
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  }

  async sendMessage(message: Message, skipSave: boolean = false): Promise<void> {
    console.log("🚀 MessageSyncService.sendMessage called", { 
      skipSave, 
      messageId: message.id, 
      text: message.text,
      userAddress: this.userAddress 
    });
    console.log("WebSocket connected?", this.ws?.connected);
    console.log("WebSocket exists?", !!this.ws);
    
    try {
      if (!skipSave) {
        LocalStorageService.saveMessage(this.userAddress, message);
      }
      
      // Send via WebSocket
      if (this.ws && this.ws.connected) {
        console.log("📤 Sending message via WebSocket emit");
        console.log("�� Complete message object being sent:", JSON.stringify(message, null, 2));
        console.log("📤 Message type:", message.type);
        console.log("📤 Message giftData:", message.giftData);
        this.ws.emit('send_message', {
            message: message
        });
        console.log("✅ WebSocket emit completed");
      } else {
        console.log("❌ WebSocket not connected, trying HTTP fallback");
        await this.sendMessageViaHTTP(message);
      }
      console.log('✅ Message sent to WebSocket');
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      LocalStorageService.updateMessageStatus(this.userAddress, message.id, 'failed');
    }
  }

  async markMessageAsRead(messageId: string): Promise<void> {
    try {
      if (this.ws && this.ws.connected) {
        this.ws.send(JSON.stringify({
          type: 'mark_read',
          messageId: messageId
        }));
      }
    } catch (error) {
      console.error('Failed to mark message as read:', error);
    }
  }

  async syncInBackground(): Promise<void> {
    try {
      const lastSync = LocalStorageService.getLastSyncTimestamp(this.userAddress);
      const response = await fetch(`${LITE_SERVER}/api/messages/${this.userAddress}/sync?since=${lastSync}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.messages && data.messages.length > 0) {
          data.messages.forEach((message: Message) => {
            this.handleIncomingMessage(message);
          });
          LocalStorageService.updateLastSyncTimestamp(this.userAddress, Date.now());
        }
      }
    } catch (error) {
      console.error('Failed to sync messages:', error);
    }
  }

  onMessage(callback: (message: Message) => void): void {
    this.messageCallbacks.push(callback);
  }
  
  offMessage(callback: (message: Message) => void): void {
    const index = this.messageCallbacks.indexOf(callback);
    if (index > -1) {
      this.messageCallbacks.splice(index, 1);
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.disconnect();
      this.ws = null;
    }
    this.clearReconnectInterval();
  }

  private handleIncomingMessage(message: Message): void {
    console.log(`➡️ handleIncomingMessage called with:`, message);
    console.log(` Current user address: ${this.userAddress}`);
    console.log(`🔍 Message chatId: ${message.chatId}`);
    console.log(`🔍 Message type: ${message.type}`);
    console.log(`🔍 Message text: ${message.text}`);
    console.log(`�� Message senderAddress: ${message.senderAddress}`);
    console.log(`🔍 Message giftData:`, message.giftData);
    
    // Check if the message has sender information
    if (message.senderAddress) {
      console.log(`🔍 Message sender address: ${message.senderAddress}`);
      console.log(`🔍 Is message from self? ${message.senderAddress === this.userAddress}`);
      
      if (message.senderAddress === this.userAddress) {
        console.log('⏭️ Skipping message from self (same user)');
        return;
      }
    } else {
      // Fallback to old logic if no sender info
      const messageSenderAddress = message.chatId.split('_')[1];
      console.log(`🔍 Fallback sender address from chatId: ${messageSenderAddress}`);
      if (messageSenderAddress === this.userAddress) {
        console.log('⏭️ Skipping message from self (same user) - fallback');
        return;
      }
    }
    
    // Create a new message object for the recipient (don't modify the original)
    let receivedMessage = {
      ...message,
      isSent: false,
      isRead: false
    };
    
    console.log(`🔍 Original message text: ${message.text}`);
    console.log(`🔍 Received message text before update: ${receivedMessage.text}`);
    
    // Update gift message text for the recipient
    if (message.type === 'gift' && message.giftData) {
      console.log(`🎁 Processing gift message`);
      console.log(`🔍 Gift data:`, message.giftData);
      console.log(`🔍 Sender address for gift: ${message.senderAddress}`);
      
      const senderName = LocalStorageService.getDisplayName(message.senderAddress || '');
      console.log(`�� Sender display name: ${senderName}`);
      
      const newText = `${senderName} gifted you ${message.giftData.amount} ${message.giftData.asset}`;
      console.log(`🔍 New gift message text: ${newText}`);
      
      receivedMessage.text = newText;
      console.log(`🔍 Updated received message text: ${receivedMessage.text}`);
    }
    
    console.log(`🔄 Final received message:`, receivedMessage);
    
    // Save to localStorage
    console.log(`💾 Saving message to localStorage for user: ${this.userAddress}`);
    LocalStorageService.saveMessage(this.userAddress, receivedMessage);
    
    // Notify callbacks
    console.log(`📢 Notifying ${this.messageCallbacks.length} callbacks`);
    this.messageCallbacks.forEach(callback => callback(receivedMessage));
  }

  private async sendMessageViaHTTP(message: Message): Promise<void> {
    try {
      const response = await fetch(`${LITE_SERVER}/api/messages/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          userAddress: this.userAddress
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message via HTTP');
      }
    } catch (error) {
      console.error('Failed to send message via HTTP:', error);
      throw error;
    }
  }

  private scheduleReconnect(): void {
    this.clearReconnectInterval();
    this.reconnectInterval = setTimeout(() => {
      this.connect();
    }, 5000);
  }

  private clearReconnectInterval(): void {
    if (this.reconnectInterval) {
      clearTimeout(this.reconnectInterval);
      this.reconnectInterval = null;
    }
  }
}