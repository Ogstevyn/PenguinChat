import React, { useState, useEffect, useRef } from 'react';
import ChatHeader from './ChatHeader';
import MessageBubble, { Message } from './MessageBubble';
import ChatInput from './ChatInput';

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

// Mock conversation data with chatId
const createInitialMessages = (chatId: string): Message[] => [
  {
    id: '1',
    text: 'Hey! How are you doing today?',
    timestamp: new Date(Date.now() - 3600000),
    isSent: false,
    isRead: true,
    chatId,
    sender: {
      name: 'Sarah Chen',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah&backgroundColor=c0aede&radius=50'
    }
  },
  {
    id: '2',
    text: "I'm doing great! Just working on some new features for our messenger app. How about you?",
    timestamp: new Date(Date.now() - 3500000),
    isSent: true,
    isRead: true,
    chatId,
    sender: currentUser
  },
  {
    id: '3',
    text: 'That sounds exciting! I\'d love to hear more about it. What kind of features are you working on?',
    timestamp: new Date(Date.now() - 3400000),
    isSent: false,
    isRead: true,
    chatId,
    sender: {
      name: 'Sarah Chen',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah&backgroundColor=c0aede&radius=50'
    }
  },
  {
    id: '4',
    text: 'We\'re implementing ZKLogin authentication and a beautiful dark/light theme system. The UI is really coming together nicely! 🎨',
    timestamp: new Date(Date.now() - 3200000),
    isSent: true,
    isRead: true,
    chatId,
    sender: currentUser
  },
  {
    id: '5',
    text: 'Wow, ZKLogin sounds really cool! Is that for privacy-focused authentication?',
    timestamp: new Date(Date.now() - 3000000),
    isSent: false,
    isRead: true,
    chatId,
    sender: {
      name: 'Sarah Chen',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah&backgroundColor=c0aede&radius=50'
    }
  },
  {
    id: '6',
    text: 'Exactly! It allows users to authenticate without revealing their private keys. Perfect for a secure messaging app like this one.',
    timestamp: new Date(Date.now() - 2800000),
    isSent: true,
    isRead: false,
    chatId,
    sender: currentUser
  }
];

const ChatInterface: React.FC<ChatInterfaceProps> = ({ chatId, chatName, chatAvatar, onBack }) => {
  const [messages, setMessages] = useState<Message[]>(createInitialMessages(chatId));
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (text: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      timestamp: new Date(),
      isSent: true,
      isRead: false,
      chatId, // Include chatId
      sender: currentUser,
    };

    setMessages((prev) => [...prev, newMessage]);
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      const responses = [
        "That's really interesting!",
        "I totally agree with you.",
        'Tell me more about that!',
        'Sounds like a great idea 💡',
        "I hadn't thought of it that way.",
        'That makes a lot of sense!',
        'Thanks for sharing that with me.',
      ];
      const randomResponse =
        responses[Math.floor(Math.random() * responses.length)];

      const responseMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: randomResponse,
        timestamp: new Date(),
        isSent: false,
        isRead: true,
        chatId, // Include chatId
        sender: {
          name: 'Sarah Chen',
          avatar:
            'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah&backgroundColor=c0aede&radius=50',
        },
      };

      setMessages((prev) => [...prev, responseMessage]);

      setTimeout(() => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === newMessage.id ? { ...msg, isRead: true } : msg
          )
        );
      }, 2000);
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
        <div className="flex justify-center mb-6">
          <div className="bg-secondary/80 text-muted-foreground text-xs px-3 py-1 rounded-full">
            Today
          </div>
        </div>

        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {isTyping && (
          <div className="flex justify-start mb-4">
            <div className="flex items-center space-x-3">
              <img
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah&backgroundColor=c0aede&radius=50"
                alt="Sarah Chen"
                className="w-8 h-8 rounded-full border-2 border-border"
              />
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
          </div>
        )}

        <div ref={messagesEndRef} className="h-4" />
      </div>

      <ChatInput onSendMessage={handleSendMessage} disabled={isTyping} />
    </div>
  );
};

export default ChatInterface;
