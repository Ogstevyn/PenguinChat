import { motion } from 'framer-motion';
import { MagnifyingGlassIcon, PlusIcon } from '@radix-ui/react-icons';
import { FaComments, FaUser, FaUsers, FaSpinner } from 'react-icons/fa';
import { FaDoorOpen } from "react-icons/fa6";
import { useDisconnectWallet, useCurrentAccount } from "@mysten/dapp-kit";
import { useState, useRef, useEffect } from 'react';
import { useMessaging } from '../hooks/useMessaging';
import { isValidSuiAddress } from '@mysten/sui/utils';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { formatTimestamp } from '../utils/formatter';

export function ChatList({ onSelect, selectedChatId }: { onSelect?: (id: string) => void; selectedChatId?: string }) {
  const { mutate: disconnect } = useDisconnectWallet();
  const currentAccount = useCurrentAccount();
  const { 
    channels, 
    createChannel, 
    isCreatingChannel, 
    channelError, 
    isReady 
  } = useMessaging();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'groups'>('all');
  const [addressTags, setAddressTags] = useState<string[]>([]);
  const [currentAddressInput, setCurrentAddressInput] = useState('');
  const [validStatus, setValidStatus] = useState<'idle' | 'resolving' | 'valid' | 'invalid'>('idle');
  const [resolvedAddress, setResolvedAddress] = useState('');
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }

    const validate = async () => {
      const input = searchQuery.trim();
      
      if (!input) {
        setValidStatus('idle');
        setResolvedAddress('');
        return;
      }

      const inputLower = input.toLowerCase();

      if (isValidSuiAddress(input)) {
        setValidStatus('valid');
        setResolvedAddress(input);
        return;
      }

      if (!inputLower.endsWith('.sui')) {
        setValidStatus('invalid');
        setResolvedAddress('');
        return;
      }

      setValidStatus('resolving');
      try {
        const client = new SuiClient({ url: getFullnodeUrl('mainnet') });
        const resolved = await client.resolveNameServiceAddress({ name: inputLower });
        
        if (isMountedRef.current) {
          if (resolved) {
            setValidStatus('valid');
            setResolvedAddress(resolved);
          } else {
            setValidStatus('invalid');
            setResolvedAddress('');
          }
        }
      } catch (e) {
        if (isMountedRef.current) {
          setValidStatus('invalid');
          setResolvedAddress('');
        }
      }
    };

    validationTimeoutRef.current = setTimeout(validate, 300);
  }, [searchQuery]);

  const handleAddAddress = async () => {
    const input = currentAddressInput.trim();
    
    if (!input) return;
    
    let address = input;
    
    if (input.toLowerCase().endsWith('.sui')) {
      try {
        const client = new SuiClient({ url: getFullnodeUrl('mainnet') });
        const resolved = await client.resolveNameServiceAddress({ name: input.toLowerCase() });
        if (!resolved) {
          setValidationError('Invalid SuiNS name');
          return;
        }
        address = resolved;
      } catch (e) {
        setValidationError('Failed to resolve SuiNS name');
        return;
      }
    }
    
    if (!isValidSuiAddress(address)) {
      setValidationError('Invalid Sui address');
      return;
    }
    
    if (currentAccount && address.toLowerCase() === currentAccount.address.toLowerCase()) {
      setValidationError('You cannot add your own address');
      return;
    }
    
    if (addressTags.includes(address)) {
      setValidationError('Address already added');
      return;
    }
    
    setAddressTags([...addressTags, address]);
    setCurrentAddressInput('');
    setValidationError(null);
  };

  const handleRemoveAddress = (addressToRemove: string) => {
    setAddressTags(addressTags.filter(addr => addr !== addressToRemove));
  };

  const handleCreateGroupWithTags = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (addressTags.length < 2) {
      setValidationError('Please add at least 2 addresses to create a group');
      return;
    }

    const result = await createChannel(addressTags);
    if (result?.channelId) {
      setAddressTags([]);
      setCurrentAddressInput('');
      setShowCreateGroup(false);
      setSearchQuery('');
    }
  };

  const handleCreateSingleChat = async (input: string) => {
    setValidationError(null);
    let address = input;
    
    if (input.toLowerCase().endsWith('.sui')) {
      try {
        const client = new SuiClient({ url: getFullnodeUrl('mainnet') });
        const resolved = await client.resolveNameServiceAddress({ name: input.toLowerCase() });
        if (!resolved) {
          setValidationError('Invalid SuiNS name');
          return;
        }
        address = resolved;
      } catch (e) {
        setValidationError('Failed to resolve SuiNS name');
        return;
      }
    }
    
    if (!isValidSuiAddress(address)) {
      setValidationError('Invalid Sui address');
      return;
    }

    if (currentAccount && address.toLowerCase() === currentAccount.address.toLowerCase()) {
      setValidationError('You cannot chat with yourself');
      return;
    }

    const result = await createChannel([address]);
    if (result?.channelId) {
      setSearchQuery('');
      setValidStatus('idle');
      setResolvedAddress('');
    }
  };

  const filteredChannels = channels.filter(channel => {
    if (activeFilter === 'groups') {
      return channel.auth.member_permissions.contents.length > 2;
    }

    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    const channelId = channel.id.id.toLowerCase();
    const lastMessage = channel.last_message?.text.toLowerCase() || '';
    
    return channelId.includes(query) || lastMessage.includes(query);
  });

  const isNewAddress = searchQuery.trim() && 
  (isValidSuiAddress(searchQuery.trim()) || searchQuery.trim().toLowerCase().endsWith('.sui')) && 
  !channels.some(channel => 
    channel.auth.member_permissions.contents.some((member: any) => {
      const memberAddress = typeof member === 'string' ? member : member?.address || member?.id || member;
      return memberAddress && typeof memberAddress === 'string' && 
        memberAddress.toLowerCase() === (resolvedAddress || searchQuery.trim()).toLowerCase();
    })
  );


  const chatItems = filteredChannels
    .sort((a, b) => {
      const aTime = a.last_message ? a.last_message.createdAtMs : a.created_at_ms;
      const bTime = b.last_message ? b.last_message.createdAtMs : b.created_at_ms;
      return bTime - aTime; 
    })
    .map(channel => {
      const channelId = channel.id.id;
      const memberCount = channel.auth.member_permissions.contents.length;
      const isGroup = memberCount > 2;
      
      const displayName = isGroup 
        ? `Group ${channelId.slice(0, 5)}...${channelId.slice(-5)}`
        : `${channelId.slice(0, 5)}...${channelId.slice(-5)}`;
      
      return {
        id: channel.id.id,
        name: displayName,
        lastMessage: channel.last_message?.text || 'No messages yet',
        time: channel.last_message 
          ? formatTimestamp(channel.last_message.createdAtMs)
          : formatTimestamp(channel.created_at_ms),
        unread: 0,
        avatarUrl: undefined,
        isGroup,
        memberCount
      };
    });

  return (
    <div className="w-full h-full text-gray-100 bg-gray-900 border-r border-gray-700/30">
      <div className="px-6 py-4 sticky top-0 z-10 bg-gray-900/95 border-b border-gray-700/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FaComments className="w-5 h-5 text-indigo-400" />
            <div className="text-lg font-semibold text-gray-200 tracking-tight">Chats</div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowCreateGroup(true)}
              className="p-2 rounded-full cursor-pointer bg-gray-800/50 hover:bg-indigo-500/20 transition-colors"
            >
              <PlusIcon className="w-4 h-4 text-gray-400" />
            </button>
            <button onClick={()=>disconnect()} className="p-2 rounded-full cursor-pointer bg-gray-800/50 hover:bg-indigo-500/20 transition-colors">
              <FaDoorOpen className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>
        <div className="relative my-4">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <MagnifyingGlassIcon className="w-4 h-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search chats or enter Sui address/SuiNS name"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setValidationError(""); setValidStatus("idle")}}
            className="w-full p-2 titillium-web-bold pl-10 rounded-2xl bg-gray-800/50 text-gray-100 placeholder-gray-400 border border-gray-700/30 focus:bg-indigo-500/20 hover:bg-indigo-500/10 focus:bg-gray-700 transition-colors outline-none"
          />
        </div>
          {searchQuery && (
            <div className="mt-1 text-xs font-mono">
              {validStatus === 'resolving' && 
                <span className="text-gray-400">
                  <FaSpinner className="w-3 h-3 animate-spin" /> Resolving…
                </span>
              }
              {validStatus === 'valid' && (
                <div className="flex items-center justify-between">
                  <span className="text-green-400">
                    ✓ Valid&nbsp;
                    {resolvedAddress && resolvedAddress !== searchQuery && (
                      <span className="opacity-70">({resolvedAddress.slice(0, 6)}…{resolvedAddress.slice(-4)})</span>
                    )}
                  </span>
                  <button
                    onClick={() => handleCreateSingleChat(searchQuery.trim())}
                    disabled={!isReady || isCreatingChannel || validStatus !== 'valid'}
                    className="px-3 py-1 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Start Chat
                  </button>
                </div>
              )}
              {validStatus === 'invalid' && <span className="text-red-400">✗ Invalid Sui address / name</span>}
              {validationError && (
                <div className="mt-1 text-xs text-red-400">✗ {validationError}</div>
              )}
            </div>
          )}
        <div className="mt-4">
          <div className="flex gap-1">
            <button 
              className={`px-4 py-2 cursor-pointer text-xs font-medium rounded-full transition-colors ${
                activeFilter === 'all' 
                  ? 'bg-indigo-500/20 text-indigo-200' 
                  : 'bg-gray-800 text-gray-400 hover:bg-indigo-500/20'
              }`}
              onClick={() => setActiveFilter('all')}
            >
              All
            </button>
            <button 
              className={`px-4 py-2 cursor-pointer text-xs font-medium rounded-full transition-colors ${
                activeFilter === 'groups' 
                  ? 'bg-indigo-500/20 text-indigo-200' 
                  : 'bg-gray-800 text-gray-400 hover:bg-indigo-500/20'
              }`}
              onClick={() => setActiveFilter('groups')}
            >
              Groups
            </button>
          </div>
        </div>

        {showCreateGroup && (
          <div className="mt-4 p-4 bg-gray-800/30 rounded-xl border border-gray-700/30">
            <form onSubmit={handleCreateGroupWithTags}>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-300 mb-2 text-center">
                  Create a group by adding at least 2 addresses
                </label>
                
                {addressTags.length > 0 && (
                  <div className="mb-3 flex justify-center flex-wrap gap-2">
                    {addressTags.map((address, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 bg-indigo-500/20 text-indigo-200 px-3 py-1 rounded-full text-sm"
                      >
                        <span className="font-mono">{address.slice(0, 5)}...{address.slice(-5)}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAddress(address)}
                          className="bg-gray-700 text-indigo-300 hover:text-white transition-colors rounded-full py-1 px-2 cursor-pointer"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter Sui address or SuiNS name..."
                    value={currentAddressInput}
                    onChange={(e) => {
                      setCurrentAddressInput(e.target.value);
                      setValidationError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddAddress();
                      }
                    }}
                    className="flex-1 p-2 rounded-lg bg-gray-700 text-gray-100 placeholder-gray-400 border border-gray-600 focus:border-indigo-500 focus:outline-none"
                    disabled={!isReady || isCreatingChannel}
                  />
                  <button
                    type="button"
                    onClick={handleAddAddress}
                    disabled={!currentAddressInput.trim() || !isReady || isCreatingChannel}
                    className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                </div>
                {validationError && (
                  <div className="mt-2 text-sm text-red-400 text-center">{validationError}</div>
                )}
              </div>
              
              {channelError && (
                <div className="mb-3 text-sm text-red-400 text-center">Error: {channelError}</div>
              )}
              
              <div className="flex gap-2 justify-center">
                <button
                  type="submit"
                  disabled={!isReady || isCreatingChannel || addressTags.length < 2}
                  className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreatingChannel ? 'Creating...' : `Create Group (${addressTags.length} members)`}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateGroup(false);
                    setAddressTags([]);
                    setCurrentAddressInput('');
                    setValidationError(null);
                  }}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-gray-200 text-sm font-medium rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
      <ul className="list-none m-0 p-0 divide-y divide-gray-700/20">
        {chatItems.map((chat) => (
          <motion.li
            key={chat.id}
            className={`flex items-center gap-4 px-6 py-4 hover:bg-gray-800/30 cursor-pointer transition-all duration-200 ease-out group ${
              selectedChatId === chat.id ? 'bg-gray-800/50 border-r-2 border-indigo-500' : ''
            }`}
            onClick={() => onSelect?.(chat.id)}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <div className="h-12 w-12 rounded-full bg-gray-800 flex items-center justify-center overflow-hidden border border-gray-700/30 group-hover:border-indigo-400/50 transition-colors">
              {chat.avatarUrl ? (
                <img src={chat.avatarUrl} alt={chat.name} className="h-full w-full object-cover" />
              ) : chat.isGroup ? (
                <FaUsers className="w-6 h-6 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
              ) : (
                <FaUser className="w-4 h-4 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-semibold text-gray-100 truncate text-base tracking-tight">{chat.name}</span>
                <span className="text-xs text-gray-400 ml-2 shrink-0 font-medium">{chat.time}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-300 truncate font-light">{chat.lastMessage}</span>
                  {chat.isGroup && (
                    <span className="text-xs text-gray-500 bg-gray-700 px-2 py-1 rounded-full">
                      {chat.memberCount} members
                    </span>
                  )}
                </div>
                {chat.unread ? (
                  <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-500 px-2 text-xs font-semibold text-white">
                    {chat.unread}
                  </span>
                ) : null}
              </div>
            </div>
          </motion.li>
        ))}
        
        {/* empty state */}
        {chatItems.length === 0 && !showCreateGroup && !isNewAddress && (
          <div className="px-6 py-8 text-center">
            <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaComments className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-gray-400 text-sm">
              {searchQuery ? 'No chats found matching your search.' : 'No chats yet. Create one to start messaging!'}
            </p>
          </div>
        )}
      </ul>
    </div>
  );
}

export default ChatList;