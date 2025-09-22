import React, { useState, useEffect, useRef } from 'react';
import ChatHeader from './ChatHeader';
import MessageBubble, { Message } from './MessageBubble';
import ChatInput from './ChatInput';
import { useBackup } from '../contexts/BackupContext';
import { useAuth } from '@/contexts/AuthContext';

interface ChatInterfaceProps {
  chatId: string;
  chatName: string;
  chatAvatar: string;
  onBack: () => void;
}

const currentUser = {
  name: 'You',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=You&backgroundColor=b6e3f4&radius=50',
};

const ChatInterface: React.FC<ChatInterfaceProps> = ({ chatId, chatName, chatAvatar, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  
  const { chatService } = useBackup();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load messages when component mounts or chatId changes
  useEffect(() => {
    const loadMessages = async () => {
      if (!chatService || !user?.id) {
        setIsLoadingMessages(false);
        return;
      }

      setIsLoadingMessages(true);
      try {
        const chatMessages = await chatService.getChatMessages(user.id, chatId);
        setMessages(chatMessages);
      } catch (error) {
        console.error('Failed to load messages:', error);
        setMessages([]);
      } finally {
        setIsLoadingMessages(false);
      }
    };

    loadMessages();
  }, [chatService, user?.id, chatId]);

  const handleSendMessage = async (text: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      timestamp: new Date(),
      isSent: true,
      isRead: false,
      chatId,
      sender: currentUser,
    };

    setMessages((prev) => [...prev, newMessage]);
    setIsTyping(true);

    // Simulate typing delay (you can remove this if you want instant responses)
    setTimeout(() => {
      setIsTyping(false);
      // No demo responses - just stop typing
    }, 1500 + Math.random() * 2000);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-background">
      {/* Use ChatHeader's back control */}
      <ChatHeader
        chatName={chatName}
        chatAvatar={chatAvatar}
        isOnline={true}
        onBack={onBack}
      />

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-4"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'hsl(var(--muted-foreground)) transparent',
        }}
      >
        {isLoadingMessages ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex flex-col items-center gap-4">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-muted-foreground text-sm">Loading messages...</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-center mb-6">
              <div className="bg-secondary/80 text-muted-foreground text-xs px-3 py-1 rounded-full">
                Today
              </div>
            </div>

            {/* Filter out welcome messages */}
            {messages
              .filter(message => !message.text.includes('Started conversation with'))
              .map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}

            {isTyping && (
              <div className="flex justify-start mb-4">
                <div className="bg-chat-bubble-received text-chat-bubble-received-foreground px-4 py-3 rounded-2xl rounded-bl-md">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse"></div>
                    <div
                      className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse"
                      style={{ animationDelay: '0.2s' }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse"
                      style={{ animationDelay: '0.4s' }}
                    ></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} className="h-4" />
          </>
        )}
      </div>

      <ChatInput onSendMessage={handleSendMessage} disabled={isTyping} />
    </div>
  );
};

export default ChatInterface;