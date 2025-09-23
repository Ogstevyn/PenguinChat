import { createClient } from '@supabase/supabase-js';
import { UserBackupRecord } from '../types/backup';

export class SupabaseService {
  private supabase;

  constructor() {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL and key must be provided in environment variables');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Get the latest blob ID for a user
   */
  async getLatestBlobId(userAddress: string): Promise<string | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_backups')
        .select('latest_blob_id')
        .eq('user_address', userAddress)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows found - user hasn't backed up yet
          return null;
        }
        throw error;
      }

      return data?.latest_blob_id || null;
    } catch (error) {
      console.error('Failed to get latest blob ID:', error);
      throw error;
    }
  }

  /**
   * Update the latest blob ID for a user
   */
  async updateLatestBlobId(userAddress: string, blobId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('user_backups')
        .upsert({
          user_address: userAddress,
          latest_blob_id: blobId,
          last_backup_timestamp: Date.now(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Failed to update latest blob ID:', error);
      throw error;
    }
  }

  /**
   * Get user backup record
   */
  async getUserBackupRecord(userAddress: string): Promise<UserBackupRecord | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_backups')
        .select('*')
        .eq('user_address', userAddress)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to get user backup record:', error);
      throw error;
    }
  }

  /**
   * Update backup frequency for a user
   */
  async updateBackupFrequency(userAddress: string, frequencyMinutes: number): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('user_backups')
        .upsert({
          user_address: userAddress,
          backup_frequency_minutes: frequencyMinutes,
          updated_at: new Date().toISOString()
        });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Failed to update backup frequency:', error);
      throw error;
    }
  }

  /**
   * Create or update user backup record
   */
  async createUserBackupRecord(userAddress: string, frequencyMinutes: number = 5): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('user_backups')
        .upsert({
          user_address: userAddress,
          latest_blob_id: '',
          last_backup_timestamp: 0,
          backup_frequency_minutes: frequencyMinutes,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        throw error;
      }
      
      console.log('✅ User backup record created/updated:', userAddress);
    } catch (error) {
      console.error('Failed to create user backup record:', error);
      throw error;
    }
  }

  /**
   * Delete user backup record (for cleanup)
   */
  async deleteUserBackupRecord(userAddress: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('user_backups')
        .delete()
        .eq('user_address', userAddress);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Failed to delete user backup record:', error);
      throw error;
    }
  }
}
