import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useBackup } from '../contexts/BackupContext';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { 
  CloudUpload, 
  Clock, 
  Database, 
  Settings, 
  CheckCircle, 
  AlertCircle,
  RefreshCw,
  Wallet
} from 'lucide-react';

export const BackupSettings: React.FC = () => {
  const { 
    isInitialized, 
    pendingMessageCount, 
    lastBackupTimestamp, 
    performBackup, 
    updateBackupFrequency,
    getBackupStatus 
  } = useBackup();
  
  const [frequency, setFrequency] = useState(5);
  const [autoBackup, setAutoBackup] = useState(true);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupStatus, setBackupStatus] = useState<any>(null);

  useEffect(() => {
    if (isInitialized) {
      loadBackupStatus();
    }
  }, [isInitialized]);

  const loadBackupStatus = async () => {
    try {
      const status = await getBackupStatus();
      setBackupStatus(status);
    } catch (error) {
      console.error('Failed to load backup status:', error);
    }
  };

  const handleFrequencyChange = async (newFrequency: number) => {
    setFrequency(newFrequency);
    if (isInitialized) {
      try {
        await updateBackupFrequency(newFrequency);
        await loadBackupStatus();
      } catch (error) {
        console.error('Failed to update backup frequency:', error);
      }
    }
  };

  const handleManualBackup = async () => {
    if (!isInitialized) return;
    
    setIsBackingUp(true);
    try {
      const blobId = await performBackup();
      if (blobId) {
        await loadBackupStatus();
        console.log('Manual backup successful:', blobId);
      }
    } catch (error) {
      console.error('Manual backup failed:', error);
    } finally {
      setIsBackingUp(false);
    }
  };

  const formatTimestamp = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString();
  };

  const getTimeSinceLastBackup = (timestamp: number | null) => {
    if (!timestamp) return 'No backups yet';
    
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  if (!isInitialized) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Backup Settings
          </CardTitle>
          <CardDescription>
            Initialize your backup system to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="flex flex-col items-center gap-4">
              <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">Initializing backup system...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Backup Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Wallet Backup Status
          </CardTitle>
          <CardDescription>
            Your messages are backed up to your wallet on Sui's Walrus network
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Badge variant={pendingMessageCount > 0 ? "destructive" : "secondary"}>
                {pendingMessageCount} pending
              </Badge>
              <span className="text-sm text-muted-foreground">Messages</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={backupStatus?.hasBackups ? "default" : "outline"}>
                {backupStatus?.totalBackups || 0} backups
              </Badge>
              <span className="text-sm text-muted-foreground">In Wallet</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Last Backup:</span>
              <span className="text-sm text-muted-foreground">
                {getTimeSinceLastBackup(lastBackupTimestamp)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Total Backups:</span>
              <span className="text-sm text-muted-foreground">
                {backupStatus?.totalBackups || 0} objects in wallet
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Backup Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Backup Settings
          </CardTitle>
          <CardDescription>
            Configure your automatic backup preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Frequency Setting */}
          <div className="space-y-2">
            <Label htmlFor="frequency" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Backup Frequency
            </Label>
            <div className="flex items-center gap-4">
              <Input
                id="frequency"
                type="number"
                min="1"
                max="60"
                value={frequency}
                onChange={(e) => setFrequency(Number(e.target.value))}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">minutes</span>
              <Button
                size="sm"
                onClick={() => handleFrequencyChange(frequency)}
                disabled={frequency < 1 || frequency > 60}
              >
                Update
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Messages will be automatically backed up every {frequency} minute{frequency !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Auto Backup Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="flex items-center gap-2">
                <CloudUpload className="w-4 h-4" />
                Automatic Backup
              </Label>
              <p className="text-sm text-muted-foreground">
                Automatically backup messages at the specified interval
              </p>
            </div>
            <Switch
              checked={autoBackup}
              onCheckedChange={setAutoBackup}
            />
          </div>

          {/* Manual Backup Button */}
          <div className="pt-4 border-t">
            <Button
              onClick={handleManualBackup}
              disabled={isBackingUp || pendingMessageCount === 0}
              className="w-full"
            >
              {isBackingUp ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Backing up...
                </>
              ) : (
                <>
                  <CloudUpload className="w-4 h-4 mr-2" />
                  Backup Now ({pendingMessageCount} messages)
                </>
              )}
            </Button>
            {pendingMessageCount === 0 && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                No pending messages to backup
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            How It Works
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2 text-sm">
            <p>
              • Messages are stored locally until backup
            </p>
            <p>
              • Each backup contains only new messages since the last backup
            </p>
            <p>
              • Backups are stored as objects in your wallet on Sui's Walrus network
            </p>
            <p>
              • Your wallet automatically owns all backup objects
            </p>
            <p>
              • You can recover your complete message history anytime
            </p>
            <p>
              • No external databases needed - everything is on-chain
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
