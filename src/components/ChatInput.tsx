import React, { useState, useRef } from 'react';
import { GiftButton } from './GiftButton';
import { Button } from './ui/button';
import { Message } from './MessageBubble';

interface ChatInputProps {
  onSendMessage: (message: Message) => void;
  disabled?: boolean;
  recipientAddress?: string;
  recipientName?: string;
  chatId?: string;
}

const ChatInput: React.FC<ChatInputProps> = ({ 
  onSendMessage, 
  disabled = false, 
  recipientAddress = '',
  recipientName = '',
  chatId = ''
}) => {
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const emojis = ['😀', '😂', '❤️', '👍', '👎', '😢', '😡', '🎉', '💧', '💰', '💚', '💙', '💜', '😅', '🥳', '🙌'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      // Create Message object for text messages
      const textMessage: Message = {
        id: `${Date.now()}_${Math.random()}`,
        text: message.trim(),
        timestamp: new Date(),
        isSent: true,
        isRead: false,
        status: 'sending',
        chatId: chatId,
        sender: {
          name: 'You',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=You&backgroundColor=b6e3f4&radius=50'
        },
        type: 'text'
      };
      
      onSendMessage(textMessage);
      setMessage('');
      setShowEmojiPicker(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const insertEmoji = (emoji: string) => {
    const textarea = inputRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = message.slice(0, start) + emoji + message.slice(end);
      setMessage(newValue);
      
      // Reset cursor position after emoji
      setTimeout(() => {
        textarea.setSelectionRange(start + emoji.length, start + emoji.length);
        textarea.focus();
      }, 0);
    }
    setShowEmojiPicker(false);
  };

  return (
    <div className="border-t border-border bg-chat-input p-4 sticky bottom-0">
      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="absolute bottom-20 left-4 right-4 glass-effect rounded-2xl p-4 shadow-lg mb-2 z-20">
          <div className="grid grid-cols-8 gap-2">
            {emojis.map((emoji, index) => (
              <button
                key={index}
                onClick={() => insertEmoji(emoji)}
                className="text-xl hover:bg-secondary/80 rounded-lg p-2 smooth-transition"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-end space-x-3">
        {/* Input Container */}
        <div className="flex-1 relative">
          <div className="flex items-end bg-secondary/50 rounded-2xl border border-border focus-within:border-accent smooth-transition">
            {/* Emoji Button */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="m-2 w-8 h-8 rounded-lg hover:bg-secondary/80 smooth-transition"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-.464 5.535a1 1 0 10-1.415-1.414 3 3 0 01-4.242 0 1 1 0 00-1.415 1.414 5 5 0 007.072 0z" clipRule="evenodd" />
              </svg>
            </Button>

            {/* Text Area */}
            <textarea
              ref={inputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              disabled={disabled}
              className="flex-1 bg-transparent border-none outline-none resize-none py-3 px-2 text-foreground placeholder-muted-foreground min-h-[20px] max-h-32 leading-relaxed"
              rows={1}
              style={{
                height: 'auto',
                minHeight: '20px',
                maxHeight: '128px',
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 128) + 'px';
              }}
            />

              <GiftButton
                recipientAddress={recipientAddress}
                recipientName={recipientName}
                onGiftSent={onSendMessage}
                disabled={disabled}
                chatId={chatId}
              />
          </div>
        </div>

        {/* Send Button */}
        <Button
          type="submit"
          disabled={!message.trim() || disabled}
          className="w-12 h-12 rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg hover:shadow-xl smooth-transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {disabled ? (
            <div className="w-5 h-5 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin" />
          ) : (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          )}
        </Button>
      </form>
    </div>
  );
};

export default ChatInput;