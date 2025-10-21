import React, { useRef, useEffect, useState } from "react";
import { DotsVerticalIcon, FaceIcon, PaperPlaneIcon, Cross2Icon } from '@radix-ui/react-icons';
import { FaPaperclip, FaChevronLeft, FaImage, FaFile } from 'react-icons/fa';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { useMessaging } from '../hooks/useMessaging';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { formatTimestamp } from '../utils/formatter';

export function ChatWindow({
  channelId,
  isMobile,
  handleBackToChatList,
}: {
  channelId: string;
  isMobile: boolean;
  handleBackToChatList?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isLoadingOlderRef = useRef(false);
  
  const currentAccount = useCurrentAccount();
  const {
    currentChannel,
    messages,
    getChannelById,
    fetchMessages,
    sendMessage,
    isFetchingMessages,
    isSendingMessage,
    messagesCursor,
    hasMoreMessages,
    channelError,
    isReady,
  } = useMessaging();


  const [messageText, setMessageText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviewUrls, setFilePreviewUrls] = useState<string[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [resolvedMessages, setResolvedMessages] = useState<any[]>([]);
  //const [attachmentErrors, setAttachmentErrors] = useState<{ [key: string]: string }>({});
  //const [globalError, setGlobalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_FILE_TYPES = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain', 'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    const validFiles: File[] = [];
    const errors: string[] = [];
    
    files.forEach(file => {
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name} is too large (max 5MB)`);
        return;
      }
      
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        errors.push(`${file.name} is not a supported file type`);
        return;
      }
      
      validFiles.push(file);
    });
    
    if (errors.length > 0) {
      alert(errors.join('\n'));
    }
    
    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
      
      // create preview URLs for images
      validFiles.forEach(file => {
        if (file.type.startsWith('image/')) {
          const url = URL.createObjectURL(file);
          setFilePreviewUrls(prev => [...prev, url]);
        }
      });
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    
    // clean up preview URL if it's an image
    if (filePreviewUrls[index]) {
      URL.revokeObjectURL(filePreviewUrls[index]);
      setFilePreviewUrls(prev => prev.filter((_, i) => i !== index));
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  useEffect(() => {
    if (isReady && channelId) {
      getChannelById(channelId).then(() => {
        fetchMessages(channelId);
      });

      // Auto-refresh messages every 10 seconds
      const interval = setInterval(() => {
        fetchMessages(channelId);
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [isReady, channelId, getChannelById, fetchMessages]);

  useEffect(() => {
    if (!isLoadingOlderRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    isLoadingOlderRef.current = false;
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if ((!messageText.trim() && selectedFiles.length === 0) || isSendingMessage) {
      return;
    }

    const result = await sendMessage(channelId, messageText, selectedFiles.length > 0 ? selectedFiles : undefined);
    if (result) {
      setMessageText('');
      selectedFiles.forEach((_, index) => {
        if (filePreviewUrls[index]) {
          URL.revokeObjectURL(filePreviewUrls[index]);
        }
      });
      setSelectedFiles([]);
      setFilePreviewUrls([]);
    }
  };

  useEffect(() => {
    const resolveMessages = async () => {
      try {
        const resolved = await Promise.all(
          messages.map(async (message, index) => {
            const attachments: any = []
            /**await Promise.all(
              (message.attachments || []).map(async (attachment, attIndex) => {
                try {
                  const data = attachment.data instanceof Promise ? await attachment.data : attachment.data || '';
                  return {
                    name: attachment.fileName || 'Unknown File',
                    type: attachment.mimeType || 'application/octet-stream',
                    size: typeof attachment.fileSize === 'number' ? attachment.fileSize : 0,
                    data,
                  };
                } catch (err) {
                  const errorMsg = err instanceof Error ? err.message.includes('502') ? 'Aggregator unavailable (502 Bad Gateway)' : err.message : 'Failed to fetch attachment';
                  setAttachmentErrors(prev => ({
                    ...prev,
                    [`${message.createdAtMs}-${index}-${attIndex}`]: errorMsg,
                  }));
                  return {
                    name: attachment.fileName || 'Unknown File',
                    type: attachment.mimeType || 'application/octet-stream',
                    size: typeof attachment.fileSize === 'number' ? attachment.fileSize : 0,
                    data: '',
                  };
                }
              })
            );*/
            return {
              id: `${message.createdAtMs}-${index}`,
              text: message.text,
              time: formatTimestamp(message.createdAtMs),
              fromMe: message.sender === currentAccount?.address,
              attachments,
            };
          })
        );
        setResolvedMessages(resolved);
      } catch (err) {
        console.error('Failed to resolve messages:', err);
        setResolvedMessages([]); // Fallback to empty array to prevent crash
        //setAttachmentErrors(prev => ({
          //...prev,
          //global: 'Chat failed to load due to server error. Please try again.',
        //}));
      }
    };
    resolveMessages();
  }, [messages, currentAccount]);


  const handleLoadMore = () => {
    if (messagesCursor && !isFetchingMessages) {
      isLoadingOlderRef.current = true;
      fetchMessages(channelId, messagesCursor);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const contactName = currentChannel 
    ? `${currentChannel.id.id.slice(0, 5)}...${currentChannel.id.id.slice(-5)}`
    : 'Unknown Chat';

  return (
    <div className="w-full h-full text-gray-100 bg-gray-900 flex flex-col">
      <div className="px-6 py-4 bg-gray-800/50 flex items-center gap-4 shrink-0 border-b border-gray-700/30">
        {isMobile && (
          <button
              onClick={handleBackToChatList}
              className="p-2 rounded-full flex justify-center items-center cursor-pointer bg-gray-800/50 hover:bg-indigo-500/20 transition-colors opacity-50"
            >
              <FaChevronLeft className="w-4 h-4 text-gray-400" />
            </button>
        )}
        <div className="h-10 w-10 rounded-full bg-gray-700 flex items-center justify-center border border-gray-600">
          <span className="text-sm font-medium text-indigo-400">{contactName.slice(0, 1).toUpperCase()}</span>
        </div>
        <div className="flex-1">
          <div className="font-semibold text-gray-100">{contactName}</div>
          <div className="text-xs text-gray-400">
            {currentChannel ? `${currentChannel.messages_count} messages` : 'Loading...'}
          </div>
        </div>
        <div className="flex gap-2">
          {/*
          <button className="p-2 rounded-full cursor-pointer bg-gray-800/50 hover:bg-indigo-500/20 transition-colors">
            <FaPhone className="w-4 h-4 text-gray-400" />
          </button>
          <button className="p-2 rounded-full cursor-pointer bg-gray-800/50 hover:bg-indigo-500/20 transition-colors">
            <FaVideo className="w-4 h-4 text-gray-400" />
          </button>
          */}
          <button className="p-2 rounded-full cursor-pointer bg-gray-800/50 hover:bg-indigo-500/20 transition-colors">
            <DotsVerticalIcon className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 bg-gray-900"
        style={{
          backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60">
              <defs>
                <pattern id="chat-pattern" width="60" height="60" patternUnits="userSpaceOnUse">
                  <circle cx="15" cy="15" r="1" fill="rgba(99,102,241,0.06)"/>
                  <circle cx="45" cy="15" r="1" fill="rgba(99,102,241,0.06)"/>
                  <circle cx="15" cy="45" r="1" fill="rgba(99,102,241,0.06)"/>
                  <circle cx="45" cy="45" r="1" fill="rgba(99,102,241,0.06)"/>
                  <circle cx="30" cy="30" r="0.5" fill="rgba(99,102,241,0.04)"/>
                </pattern>
              </defs>
              <rect width="60" height="60" fill="url(#chat-pattern)"/>
            </svg>
          `)}")`,
          backgroundSize: "60px 60px"
        }}
        >
        {hasMoreMessages && (
          <div className="text-center mb-4">
            <button
              onClick={handleLoadMore}
              disabled={isFetchingMessages}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isFetchingMessages ? 'Loading...' : 'Load older messages'}
            </button>
          </div>
        )}

        <div className="mx-auto max-w-4xl space-y-4">
          {resolvedMessages.length === 0 && !isFetchingMessages ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-lg text-gray-400">💬</span>
              </div>
              <p className="text-gray-400 text-sm">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            resolvedMessages.map((m) => (
              <div key={m.id} className={`flex ${m.fromMe ? "justify-end" : "justify-start"}`}>
                <div
                  className={`${m.fromMe 
                    ? "bg-indigo-500 text-white" 
                    : "bg-gray-700 text-gray-100"
                  } rounded-2xl px-4 py-3 max-w-[70%] text-sm shadow-sm`}
                >

                  {/**{m.attachments && m.attachments.length > 0 && (
                    <div className="mb-2 space-y-2">
                      {m.attachments.map((attachment: any, index: number) => {
                        const errorKey = `${m.id}-${index}`;
                        const hasError = attachmentErrors[errorKey];
                        return (
                          <div key={index} className="bg-black/20 rounded-lg p-2">
                            {hasError ? (
                              <div className="flex items-center gap-2 text-xs text-red-400">
                                <FaFile className="text-red-400" />
                                <span className="truncate">{attachment.name}</span>
                                <span>({hasError})</span>
                              </div>
                            ) : attachment.type?.startsWith('image/') && attachment.data ? (
                              <a
                                href={`data:${attachment.type};base64,${attachment.data}`}
                                download={attachment.name}
                                className="inline-block"
                              >
                                <img 
                                  src={`data:${attachment.type};base64,${attachment.data}`}
                                  alt={attachment.name}
                                  className="max-w-full max-h-48 rounded-lg object-contain cursor-pointer"
                                  onError={() => setAttachmentErrors(prev => ({
                                    ...prev,
                                    [errorKey]: 'Image failed to load',
                                  }))}
                                />
                              </a>
                            ) : (
                              <a
                                href={attachment.data ? `data:${attachment.type};base64,${attachment.data}` : '#'}
                                download={attachment.name}
                                className="flex items-center gap-2 text-xs text-gray-400 hover:text-indigo-400 transition-colors"
                              >
                                <FaFile className="text-gray-400" />
                                <span className="truncate">{attachment.name}</span>
                                <span className="text-gray-500">({formatFileSize(attachment.size)})</span>
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}*/}
                  
                  {m.text && (
                    <div className="font-medium">{m.text}</div>
                  )}
                  
                  <div className={`text-xs mt-1 ${m.fromMe ? "text-indigo-100" : "text-gray-400"}`}>{m.time}</div>
                  {m.fromMe && (
                    <div className="flex justify-end mt-1">
                      <span className="text-xs text-indigo-200">✓✓</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div ref={messagesEndRef} />

        {isFetchingMessages && resolvedMessages.length === 0 && (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400 text-sm">Loading messages...</p>
          </div>
        )}
      </div>
      
      {selectedFiles.length > 0 && (
        <div className="px-4 py-2 bg-gray-800/30 border-t border-gray-700/30">
          <div className="flex flex-wrap gap-2">
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center gap-2 bg-gray-700 rounded-lg p-2 text-sm">
                {file.type.startsWith('image/') ? (
                  <FaImage className="text-indigo-400" />
                ) : (
                  <FaFile className="text-gray-400" />
                )}
                <span className="text-gray-200 truncate max-w-32">{file.name}</span>
                <span className="text-gray-500 text-xs">({formatFileSize(file.size)})</span>
                <button
                  onClick={() => removeFile(index)}
                  className="bg-gray-800 text-gray-400 hover:text-white transition-colors rounded-full py-1 px-2 cursor-pointer"
                >
                  <Cross2Icon className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="px-4 py-4 bg-gray-800/50 flex items-center gap-3 shrink-0 border-t border-gray-700/30">
        <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-2 rounded-full cursor-pointer bg-gray-800/50 hover:bg-indigo-500/20 transition-colors">
          <FaceIcon className="w-4 h-4 text-gray-400" />
        </button>
        {showEmojiPicker && (
          <div className="absolute bottom-20 left-0 z-10">
            <EmojiPicker
              onEmojiClick={(emojiObject) => {
                setMessageText(prev => prev + emojiObject.emoji);
                setShowEmojiPicker(false);
              }}
              theme={Theme.DARK}
              skinTonesDisabled
              width={window.innerWidth}
            />
          </div>
        )}
        <button 
          className="p-2 rounded-full cursor-pointer bg-gray-800/50 hover:bg-indigo-500/20 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <FaPaperclip className="w-4 h-4 text-gray-400" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,application/pdf,text/plain,.doc,.docx"
          onChange={handleFileSelect}
          className="hidden"
        />
        <form onSubmit={handleSendMessage} className="flex-1 flex items-center gap-3">
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a message..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSendingMessage || !isReady}
            className="flex-1 rounded-full titillium-web-bold bg-gray-700 text-gray-100 placeholder-gray-400 px-4 py-3 outline-none border border-gray-600 focus:border-indigo-500/50 focus:bg-gray-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button 
            type="submit"
            disabled={(!messageText.trim() && selectedFiles.length === 0) || isSendingMessage || !isReady}
            className="p-3 cursor-pointer rounded-full bg-indigo-500 hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PaperPlaneIcon className="w-4 h-4 text-white" />
          </button>
        </form>
      </div>

      {channelError && (
        <div className="px-4 py-2 bg-red-900/20 border-t border-red-500/30">
          <p className="text-red-400 text-sm">Error: {channelError}</p>
        </div>
      )}
    </div>
  );
}

export default ChatWindow;