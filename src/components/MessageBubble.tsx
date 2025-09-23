import React from 'react';
import { LocalStorageService } from '../services/localStorageService';

export interface Message {
  id: string;
  text: string;
  timestamp: Date;
  isSent: boolean;           // true = current user
  isRead?: boolean;
  sender: {                  // now required so we always have a name & avatar
    name: string;
    avatar: string;
  };
  chatId: string;            // Add chatId for backup system
}

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const formatTime = (date: Date) =>
    date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

  // Save sent messages to localStorage for backup
  React.useEffect(() => {
    if (message.isSent) {
      LocalStorageService.saveMessage(message);
    }
  }, [message]);

  return (
    <div
      className={`flex mb-4 chat-bubble-animation ${
        message.isSent ? 'justify-end' : 'justify-start'
      }`}
    >
      <div
        className={`flex max-w-[80%] ${
          message.isSent ? 'flex-row-reverse' : 'flex-row'
        }`}
      >
        {/* ✅ Always show avatar */}
        <div
          className={`flex-shrink-0 ${
            message.isSent ? 'ml-3' : 'mr-3'
          }`}
        >
          <img
            src={message.sender.avatar}
            alt={message.sender.name}
            className="w-8 h-8 rounded-full border-2 border-border shadow-sm"
          />
        </div>

        {/* Message content */}
        <div
          className={`relative px-4 py-3 rounded-2xl shadow-sm smooth-transition ${
            message.isSent
              ? 'bg-chat-bubble-sent text-chat-bubble-sent-foreground rounded-br-md'
              : 'bg-chat-bubble-received text-chat-bubble-received-foreground rounded-bl-md'
          }`}
        >
          {/* ✅ Always show sender name */}
          <div
            className={`text-xs font-medium mb-1 ${
              message.isSent ? 'text-chat-bubble-sent-foreground/80' : 'text-accent'
            }`}
          >
            {message.sender.name}
          </div>

          {/* Text */}
          <div className="text-sm leading-relaxed break-words">
            {message.text}
          </div>

          {/* Timestamp + read receipt */}
          <div
            className={`flex items-center mt-2 text-xs ${
              message.isSent
                ? 'text-chat-bubble-sent-foreground/70 justify-end'
                : 'text-chat-bubble-received-foreground/70 justify-start'
            }`}
          >
            <span>{formatTime(message.timestamp)}</span>

            {message.isSent && (
              <div className="ml-2 flex">
                {message.isRead ? (
                  <svg
                    className="w-4 h-4 text-accent"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-4 h-4 text-muted-foreground"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
            )}
          </div>

          {/* Tail */}
          <div
            className={`absolute top-4 w-0 h-0 ${
              message.isSent
                ? 'right-0 translate-x-2 border-l-8 border-l-chat-bubble-sent border-y-4 border-y-transparent'
                : 'left-0 -translate-x-2 border-r-8 border-r-chat-bubble-received border-y-4 border-y-transparent'
            }`}
          />
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
