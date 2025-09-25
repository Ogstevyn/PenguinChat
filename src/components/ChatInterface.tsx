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

  useEffect(() => {
    if (!chatService || !user?.id) return;

    const handleNewMessage = (message: Message) => {
      console.log(`📨 ChatInterface received new message:`, message);
      
      // Only add the message if it belongs to the current chat
      if (message.chatId === chatId) {
        console.log(`✅ Message belongs to current chat, adding to UI`);
        setMessages(prev => {
          // Check if message already exists to prevent duplicates
          const exists = prev.some(m => m.id === message.id);
          if (exists) {
            console.log(`⚠️ Message already exists, skipping`);
            return prev;
          }
          
          const updated = [...prev, message];
          console.log(`📝 Updated messages count: ${updated.length}`);
          return updated;
        });
      } else {
        console.log(`⏭️ Message doesn't belong to current chat: ${message.chatId} vs ${chatId}`);
      }
    };

    // Subscribe to message callbacks
    chatService.onMessage(handleNewMessage);
    
    // Cleanup subscription on unmount
    return () => {
      chatService.offMessage(handleNewMessage);
    };
  }, [chatService, user?.id, chatId]);

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

  const getRecipientInfo = () => {
    const parts = chatId.split('_');
    const address1 = parts[1];
    const address2 = parts[2];
    const recipientAddress = user?.id === address1 ? address2 : address1;
    return {
      address: recipientAddress,
      name: chatName
    };
  };


  const recipientInfo = getRecipientInfo();

  const handleSendMessage = async (message: Message) => {
    const newMessage: Message = {
      ...message,
      id: `${Date.now()}_${Math.random()}`,
      text: message.text,
      timestamp: new Date(),
      isSent: true,
      isRead: false,
      status: 'sending',
      chatId, // Use the same chatId, don't change it
      sender: currentUser,
    };
  
    // Update UI immediately
    setMessages((prev) => [...prev, newMessage]);
  
    try {
      // Send via chat service
      await chatService.sendMessage(user.id, newMessage);
      
      // Update status to sent
      setMessages((prev) => prev.map(m => 
        m.id === newMessage.id ? { ...m, status: 'sent' } : m
      ));
    } catch (error) {
      console.error('Failed to send message:', error);
      // Update status to failed
      setMessages((prev) => prev.map(m => 
        m.id === newMessage.id ? { ...m, status: 'failed' } : m
      ));
    }
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

      <ChatInput
        onSendMessage={handleSendMessage}
        disabled={isLoadingMessages}
        recipientAddress={recipientInfo.address}
        recipientName={recipientInfo.name}
        chatId={chatId}
      />
    </div>
  );
};

export default ChatInterface;