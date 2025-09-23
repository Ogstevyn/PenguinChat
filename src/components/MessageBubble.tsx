import React from 'react';
import { motion } from 'framer-motion';

export interface Message {
  id: string;
  text: string;
  timestamp: Date;
  isSent: boolean;
  isRead?: boolean;
  sender: {
    name: string;
    avatar: string;
  };
  chatId: string;
}

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex ${message.isSent ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
        message.isSent 
          ? 'bg-chat-bubble-sent text-chat-bubble-sent-foreground rounded-br-md' 
          : 'bg-chat-bubble-received text-chat-bubble-received-foreground rounded-bl-md'
      }`}>
        <p className="text-sm break-words">{message.text}</p>
        <div className={`flex items-center mt-1 text-xs ${
          message.isSent ? 'justify-end' : 'justify-start'
        }`}>
          <span className="opacity-70">{formatTime(message.timestamp)}</span>
          {message.isSent && (
            <span className="ml-1 opacity-70">
              {message.isRead ? '✓✓' : '✓'}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default MessageBubble;