import { LITE_SERVER } from '@/config';

export class OnlineStatusService {
  private static onlineUsers = new Set<string>();
  private static statusCallbacks = new Map<string, (isOnline: boolean) => void>();

  static async checkUserStatus(address: string): Promise<boolean> {
    try {
      console.log(`�� Checking status for user: ${address}`);
      const response = await fetch(`${LITE_SERVER}/api/user/${address}/status`);
      const data = await response.json();
      console.log(`📊 User ${address} status:`, data);
      return data.isOnline;
    } catch (error) {
      console.error('Failed to check user status:', error);
      return false;
    }
  }

  static async getAllOnlineUsers(): Promise<string[]> {
    try {
      const response = await fetch(`${LITE_SERVER}/api/users/online`);
      const data = await response.json();
      console.log(`📊 All online users:`, data);
      return data.onlineUsers;
    } catch (error) {
      console.error('Failed to get online users:', error);
      return [];
    }
  }

  static subscribeToUserStatus(address: string, callback: (isOnline: boolean) => void): () => void {
    console.log(`🔔 Subscribing to status for user: ${address}`);
    this.statusCallbacks.set(address, callback);
    
    // Check initial status
    this.checkUserStatus(address).then(isOnline => {
      console.log(`�� Initial status for ${address}: ${isOnline}`);
      callback(isOnline);
    });

    // Return unsubscribe function
    return () => {
      console.log(`�� Unsubscribing from status for user: ${address}`);
      this.statusCallbacks.delete(address);
    };
  }

  static updateUserStatus(address: string, isOnline: boolean): void {
    console.log(`�� Updating status for ${address}: ${isOnline}`);
    
    if (isOnline) {
      this.onlineUsers.add(address);
    } else {
      this.onlineUsers.delete(address);
    }

    // Notify subscribers
    const callback = this.statusCallbacks.get(address);
    if (callback) {
      console.log(`📢 Notifying callback for ${address}: ${isOnline}`);
      callback(isOnline);
    } else {
      console.log(`⚠️ No callback found for ${address}`);
    }
  }
}