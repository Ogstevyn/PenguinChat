import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from './ui/button';
import { FaChevronLeft } from 'react-icons/fa';


interface ChatHeaderProps {
  isOnline?: boolean;
  onBack?: () => void;
  chatName: string;
  chatAvatar: string;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ isOnline = true, onBack, chatName, chatAvatar}) => {
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="glass-effect border-b border-border sticky top-0 z-10">
      <div className="flex items-center justify-between p-4">
        {/* Left side: Back + User info */}
        <div className="flex items-center space-x-3">
          {onBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="mr-2 w-10 h-10 rounded-xl hover:bg-secondary/80 smooth-transition"
              aria-label="Back"
            >
              <FaChevronLeft className="w-5 h-5" />
            </Button>
          )}

          <div className="relative">
            <img
              src={chatAvatar}
              alt={chatName}
              className="w-10 h-10 rounded-full border-2 border-accent shadow-sm"
            />
            <div
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-chat-header ${
                isOnline ? 'bg-green-500' : 'bg-gray-400'
              }`}
            />
          </div>

          <div>
            <h1 className="font-semibold text-foreground text-lg">{chatName}</h1>
            <p className="text-xs text-muted-foreground">
              {isOnline ? 'Online' : 'Last seen recently'}
            </p>
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex items-center space-x-2">
          {/* Theme toggle */}
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

          {/* More options */}
          <Button
            variant="ghost"
            size="sm"
            className="w-10 h-10 rounded-xl hover:bg-secondary/80 smooth-transition"
            aria-label="More options"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </Button>

          {/* Logout */}
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
      </div>
    </header>
  );
};

export default ChatHeader;
