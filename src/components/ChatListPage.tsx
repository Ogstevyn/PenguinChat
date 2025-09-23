import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useBackup } from '../contexts/BackupContext';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import ChatInterface from './ChatInterface';
import { isValidSuiAddress } from '@mysten/sui/utils';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { CloudUpload, Settings } from 'lucide-react';
import { BackupSettings } from './BackupSettings';

type ChatSummary = {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  unreadCount?: number;
};

const sampleChats: ChatSummary[] = [
  {
    id: '1',
    name: 'Sarah Chen',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah&backgroundColor=c0aede&radius=50',
    lastMessage: 'See you at 5 PM!',
    timestamp: '2m ago',
    unreadCount: 2,
  },
  {
    id: '2',
    name: 'Dev Team',
    avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=DevTeam',
    lastMessage: 'Build passed ✔️',
    timestamp: '1h ago',
  },
  {
    id: '3',
    name: 'Penguin Bot',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=PenguinBot&backgroundColor=b6e3f4&radius=50',
    lastMessage: 'Welcome to PenguinChat!',
    timestamp: 'Yesterday',
  },
];

const ChatListPage: React.FC = () => {
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [query, setQuery] = useState<string>('');
  const [validStatus, setValidStatus] = useState<'idle' | 'resolving' | 'valid' | 'invalid'>('idle');
  const [resolvedAddress, setResolvedAddress] = useState('');
  const [showBackupSettings, setShowBackupSettings] = useState(false);
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { pendingMessageCount, isInitialized } = useBackup();

  const filteredChats = sampleChats.filter(c =>
    c.name.toLowerCase().includes(query.toLowerCase())
  );

  // Validate/resolve whenever query changes
  useEffect(() => {
    const validate = async () => {
      const input = query.trim().toLowerCase();
      if (!input) {
        setValidStatus('idle');
        setResolvedAddress('');
        return;
      }

      // Direct Sui address
      if (isValidSuiAddress(input)) {
        setValidStatus('valid');
        setResolvedAddress(input);
        return;
      }

      if (!input.endsWith('.sui')) {
        setValidStatus('invalid');
        setResolvedAddress('');
        return;
      }

      // Try SuiNS resolution
      setValidStatus('resolving');
      try {
        const client = new SuiClient({ url: getFullnodeUrl('mainnet') });
        const resolved = await client.resolveNameServiceAddress({ name: input });
        if (resolved) {
          setValidStatus('valid');
          setResolvedAddress(resolved);
        } else {
          setValidStatus('invalid');
          setResolvedAddress('');
        }
      } catch (e) {
        setValidStatus('invalid');
        setResolvedAddress('');
      }
    };

    validate();
  }, [query]);

  if (showBackupSettings) {
    return (
      <div className="h-screen w-screen bg-gradient-to-br from-background via-background to-primary/10 flex flex-col">
        <div className="pt-10 pb-6 text-center flex">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowBackupSettings(false)}
            className="mr-4 w-10 h-10 rounded-xl hover:bg-secondary/80 smooth-transition"
          >
            ←
          </Button>
          <h1 className="text-3xl font-mono font-bold text-foreground grow">Backup Settings</h1>
        </div>
        <div className="flex-1 px-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            {/* Import BackupSettings component here */}
            <BackupSettings />
            {/* <div className="text-center py-8">
              <p className="text-muted-foreground">Backup settings component will be rendered here</p>
              <p className="text-sm text-muted-foreground mt-2">
                Pending messages: {pendingMessageCount}
              </p>
            </div> */}
          </div>
        </div>
      </div>
    );
  }

  if (activeChat) {
    const chat = sampleChats.find(c => c.id === activeChat)!;
    return (
      <ChatInterface
        chatId={chat.id}
        chatName={chat.name}
        chatAvatar={chat.avatar}
        onBack={() => setActiveChat(null)}
      />
    );
  }

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-background via-background to-primary/10 flex flex-col">
      {/* Header */}
      <motion.div
        className="pt-10 pb-6 text-center flex"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-3xl font-mono font-bold text-foreground grow">Chats</h1>
        <div className="flex items-center space-x-2 px-4">
          {/* Backup Status Indicator */}
          {isInitialized && (
            <div className="flex items-center space-x-2">
              <Badge 
                variant={pendingMessageCount > 0 ? "destructive" : "secondary"}
                className="text-xs"
              >
                <CloudUpload className="w-3 h-3 mr-1" />
                {pendingMessageCount}
              </Badge>
            </div>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowBackupSettings(true)}
            className="w-10 h-10 rounded-xl hover:bg-secondary/80 smooth-transition"
            aria-label="Backup Settings"
          >
            <Settings className="w-5 h-5" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="w-10 h-10 rounded-xl hover:bg-secondary/80 smooth-transition"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="w-10 h-10 rounded-xl hover:bg-destructive/10 hover:text-destructive smooth-transition"
            aria-label="Logout"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z"
                clipRule="evenodd"
              />
            </svg>
          </Button>
        </div>
      </motion.div>

      {/* 🔍 Search + Validation */}
      <div className="px-6 pb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search chats or enter Sui address/SuiNS name"
          className="w-full rounded-xl border border-border/20 font-mono bg-background/70 px-4 py-3 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        {query && (
          <div className="mt-1 text-xs font-mono">
            {validStatus === 'resolving' && <span className="text-muted-foreground">🔄 Resolving…</span>}
            {validStatus === 'valid' && (
              <span className="text-green-400">
                ✓ Valid&nbsp;
                {resolvedAddress && resolvedAddress !== query && (
                  <span className="opacity-70">({resolvedAddress.slice(0, 6)}…{resolvedAddress.slice(-4)})</span>
                )}
              </span>
            )}
            {validStatus === 'invalid' && <span className="text-red-400">✗ Invalid Sui address / name</span>}
          </div>
        )}
      </div>

      {/* Chat List */}
      <motion.div
        className="flex-1 mx-auto w-full max-w-screen px-4 pb-10 overflow-y-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
      >
        <div className="backdrop-blur-xl border border-border/10 rounded-2xl shadow-2xl divide-y divide-border/10 overflow-hidden">
          {filteredChats.map(chat => (
            <button
              key={chat.id}
              onClick={() => setActiveChat(chat.id)}
              className="w-full flex items-center gap-4 px-4 py-5 hover:bg-primary/10 transition text-left"
            >
              <img
                src={chat.avatar}
                alt={chat.name}
                className="w-12 h-12 rounded-full border border-border/20"
              />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <p className="text-foreground font-medium truncate">{chat.name}</p>
                  <span className="text-xs text-muted-foreground">{chat.timestamp}</span>
                </div>
                <p className="text-sm text-muted-foreground truncate mt-1">{chat.lastMessage}</p>
              </div>
              {chat.unreadCount && (
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-primary/20 text-primary">
                  {chat.unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default ChatListPage;
