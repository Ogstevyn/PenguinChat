import React, { useState } from 'react';
import { Button } from './ui/button';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { Message } from './MessageBubble';
import { LocalStorageService } from '@/services/localStorageService';

interface GiftButtonProps {
  recipientAddress: string;
  recipientName: string;
  onGiftSent: (message: Message) => void;
  disabled?: boolean;
  chatId: string;
}

const GiftButton: React.FC<GiftButtonProps> = ({ 
  recipientAddress, 
  recipientName, 
  onGiftSent, 
  disabled,
  chatId
}) => {
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<string>('SUI');
  const [amount, setAmount] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [userAssets, setUserAssets] = useState<any[]>([]);

  const account = useCurrentAccount();
  const client = useSuiClient();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

  // Load user's assets
const loadUserAssets = async () => {
    if (!account) return;
    
    try {
      // Get SUI balance
      const suiBalance = await client.getBalance({
        owner: account.address,
        coinType: '0x2::sui::SUI'
      });
  
      // Get all coin types owned by the user
      const allCoins = await client.getAllCoins({
        owner: account.address
      });
  
      // Group coins by type and calculate total balances
      const coinBalances = new Map();
      
      // Add SUI first
      coinBalances.set('0x2::sui::SUI', {
        type: 'SUI',
        symbol: 'SUI',
        balance: suiBalance.totalBalance,
        coinType: '0x2::sui::SUI',
        decimals: 9
      });
  
      // Process other coins
      for (const coin of allCoins.data) {
        if (coin.coinType === '0x2::sui::SUI') continue; // Skip SUI as we already added it
        
        const existing = coinBalances.get(coin.coinType);
        if (existing) {
          existing.balance = (BigInt(existing.balance) + BigInt(coin.balance)).toString();
        } else {
          // Try to get coin metadata
          let symbol = 'Unknown';
          let decimals = 9; // Default decimals
          
          try {
            const metadata = await client.getCoinMetadata({ coinType: coin.coinType });
            if (metadata) {
              symbol = metadata.symbol || symbol;
              decimals = metadata.decimals || decimals;
            }
          } catch (error) {
            console.log(`Could not get metadata for ${coin.coinType}, using defaults`);
          }
  
          coinBalances.set(coin.coinType, {
            type: symbol,
            symbol: symbol,
            balance: coin.balance,
            coinType: coin.coinType,
            decimals: decimals
          });
        }
      }
  
      // Convert to array and filter out zero balances
      const assets = Array.from(coinBalances.values()).filter(asset => 
        BigInt(asset.balance) > 0
      );
  
      console.log(`🎁 Loaded ${assets.length} assets for gifting:`, assets);
      setUserAssets(assets);
    } catch (error) {
      console.error('Failed to load assets:', error);
      setUserAssets([{
        type: 'SUI',
        symbol: 'SUI',
        balance: '0',
        coinType: '0x2::sui::SUI',
        decimals: 9
      }]);
    }
  };

  const handleGiftClick = () => {
    setShowGiftModal(true);
    loadUserAssets();
  };

  const sendGift = async () => {
    if (!account || !amount) return;
  
    setIsSending(true);
    try {
      const selectedAssetData = userAssets.find(a => a.type === selectedAsset);
      if (!selectedAssetData) return;
  
      // Convert amount to proper units
      const amountInMist = BigInt(parseFloat(amount) * Math.pow(10, selectedAssetData.decimals));
      const isSui = selectedAssetData.coinType === '0x2::sui::SUI';
  
      // Find coins for transfer
      const coins = await client.getCoins({ 
        owner: account.address, 
        coinType: selectedAssetData.coinType 
      });
      
      if (coins.data.length === 0) {
        alert(`No ${isSui ? 'SUI' : selectedAssetData.coinType} coins found`);
        return;
      }
  
      // Find a coin with sufficient balance
      const transferCoin = coins.data.find(c => BigInt(c.balance) >= amountInMist);
      if (!transferCoin) {
        alert('Insufficient balance for gift');
        return;
      }
  
      // Create transaction
      const txb = new Transaction();
  
      if (isSui) {
        txb.setGasPayment([{
          objectId: transferCoin.coinObjectId,
          version: transferCoin.version,
          digest: transferCoin.digest,
        }]);
  
        const [coinToTransfer] = txb.splitCoins(txb.gas, [amountInMist]);
        txb.transferObjects([coinToTransfer], recipientAddress);
      } else {
        const suiCoins = await client.getCoins({ 
          owner: account.address, 
          coinType: '0x2::sui::SUI' 
        });
        
        if (suiCoins.data.length === 0) {
          alert('No SUI found to pay gas for gift');
          return;
        }
        
        const gasCoin = suiCoins.data[0];
        txb.setGasPayment([{
          objectId: gasCoin.coinObjectId,
          version: gasCoin.version,
          digest: gasCoin.digest,
        }]);
  
        const [coinToTransfer] = txb.splitCoins(
          txb.object(transferCoin.coinObjectId),
          [amountInMist]
        );
        txb.transferObjects([coinToTransfer], recipientAddress);
      }
  
      txb.setSender(account.address);
  
      // Dry run first
      const sim = await client.devInspectTransactionBlock({
        sender: account.address,
        transactionBlock: txb as any,
      });
  
      if (sim.effects.status.status !== 'success') {
        throw new Error(sim.effects.status.error || 'Gift simulation failed');
      }
  
      // Sign and execute
      const result = await signAndExecute({ transaction: txb as any });
      
      // Create gift message
      const giftMessage: Message = {
        id: `${Date.now()}_${Math.random()}`,
        text: `You gifted ${recipientName} ${amount} ${selectedAsset}`,
        timestamp: new Date(),
        isSent: true,
        isRead: false,
        status: 'sent',
        chatId: chatId,
        sender: {
          name: 'You',
          avatar: LocalStorageService.getAvatarUrl("0x1", "You"),
        },
        type: 'gift',
        senderAddress: account.address,
        giftData: {
          amount: amount,
          asset: selectedAsset,
          transactionDigest: result.digest,
          recipient: recipientAddress
        }
      };
  
      console.log(`🎁 Created gift message:`, giftMessage);
      console.log(`�� Gift message type:`, giftMessage.type);
      console.log(`�� Gift message giftData:`, giftMessage.giftData);
      onGiftSent(giftMessage);
      setShowGiftModal(false);
      setAmount('');
      
    } catch (error) {
      console.error('Failed to send gift:', error);
      alert('Failed to send gift. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <button
      onClick={handleGiftClick}
      disabled={disabled}
      className="m-2 w-8 h-8 rounded-lg hover:bg-secondary/80 smooth-transition inline-flex items-center justify-center"
      title="Send Gift"
    >
      <span className="text-lg">🎁</span>
    </button>
        {/* Gift Modal */}
        {showGiftModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="glass-effect rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden smooth-transition">
            {/* Header */}
            <div className="p-6 border-b border-border">
                <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-secondary/50 rounded-xl flex items-center justify-center border border-border">
                    <span className="text-2xl">🎁</span>
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-foreground">Send Gift</h3>
                    <p className="text-sm text-muted-foreground">to {recipientName}</p>
                </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
                {/* Asset Selection */}
                <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">Select Asset</label>
                <select 
                    value={selectedAsset} 
                    onChange={(e) => setSelectedAsset(e.target.value)}
                    className="w-full p-3 bg-secondary/50 border border-border rounded-xl focus:ring-2 focus:ring-accent/50 focus:border-accent smooth-transition appearance-none cursor-pointer"
                >
                    {userAssets.map((asset) => (
                    <option key={asset.type} value={asset.type}>
                        {asset.symbol} (Balance: {(parseFloat(asset.balance) / Math.pow(10, asset.decimals)).toFixed(4)})
                    </option>
                    ))}
                </select>
                </div>

                {/* Amount Input */}
                <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">Amount</label>
                <div className="relative">
                    <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.0"
                    step="0.0001"
                    className="w-full p-3 bg-secondary/50 border border-border rounded-xl focus:ring-2 focus:ring-accent/50 focus:border-accent smooth-transition"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <span className="text-sm text-muted-foreground">{selectedAsset}</span>
                    </div>
                </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3 pt-2">
                <Button
                    onClick={() => setShowGiftModal(false)}
                    variant="outline"
                    className="flex-1 h-12 rounded-xl border-border hover:bg-secondary/80 smooth-transition"
                    disabled={isSending}
                >
                    Cancel
                </Button>
                <Button
                    onClick={sendGift}
                    disabled={!amount || isSending}
                    className="flex-1 h-12 bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl shadow-lg hover:shadow-xl smooth-transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSending ? (
                    <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin" />
                        <span>Sending...</span>
                    </div>
                    ) : (
                    <div className="flex items-center space-x-2">
                        <span>🎁</span>
                        <span>Send Gift</span>
                    </div>
                    )}
                </Button>
                </div>
            </div>
            </div>
        </div>
        )}
    </>
  );
};

export { GiftButton };






















/**
 * 
 import React, { useState } from 'react';
import { Button } from './ui/button';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { Message } from './MessageBubble';

interface GiftButtonProps {
  recipientAddress: string;
  recipientName: string;
  onGiftSent: (message: Message) => void;
  disabled?: boolean;
}

const GiftButton: React.FC<GiftButtonProps> = ({ 
  recipientAddress, 
  recipientName, 
  onGiftSent, 
  disabled 
}) => {
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<string>('SUI');
  const [amount, setAmount] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [userAssets, setUserAssets] = useState<any[]>([]);

  const account = useCurrentAccount();
  const client = useSuiClient();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

  // Load user's assets
  const loadUserAssets = async () => {
    if (!account) return;
    
    try {
      // Get SUI balance
      const suiBalance = await client.getBalance({
        owner: account.address,
        coinType: '0x2::sui::SUI'
      });

      // Get other tokens (you can expand this to get NFTs, etc.)
      const assets = [
        {
          type: 'SUI',
          symbol: 'SUI',
          balance: suiBalance.totalBalance,
          coinType: '0x2::sui::SUI',
          decimals: 9
        }
      ];

      setUserAssets(assets);
    } catch (error) {
      console.error('Failed to load assets:', error);
    }
  };

  const handleGiftClick = () => {
    setShowGiftModal(true);
    loadUserAssets();
  };

  const sendGift = async () => {
    if (!account || !amount) return;

    setIsSending(true);
    try {
      const selectedAssetData = userAssets.find(a => a.type === selectedAsset);
      if (!selectedAssetData) return;

      // Convert amount to proper units
      const amountInMist = BigInt(parseFloat(amount) * Math.pow(10, selectedAssetData.decimals));

      // Get coins for the selected asset
      let coins: { coinObjectId: string; balance: string }[] = [];
      let cursor: string | null | undefined = undefined;
      
      do {
        const res = await client.getCoins({ 
          owner: account.address, 
          coinType: selectedAssetData.coinType, 
          cursor, 
          limit: 200 
        });
        coins = coins.concat(res.data.map((d) => ({ 
          coinObjectId: d.coinObjectId, 
          balance: d.balance 
        })));
        cursor = res.hasNextPage ? res.nextCursor : null;
      } while (cursor);

      if (coins.length === 0) {
        alert('No coins available for gifting');
        return;
      }

      const balances = coins.map((c) => BigInt(c.balance));
      const total = balances.reduce((a, b) => a + b, 0n);
      const gasBudget = 3_000_000n;

      if (total < amountInMist + gasBudget) {
        alert('Insufficient balance including gas');
        return;
      }

      // Create transaction
      const tx = new Transaction();
      tx.setGasBudget(gasBudget);

      if (coins.length === 1) {
        const [sendCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(amountInMist)]);
        tx.transferObjects([sendCoin], tx.pure.address(recipientAddress));
      } else {
        const sorted = coins.sort((a, b) => (BigInt(b.balance) > BigInt(a.balance) ? 1 : -1));
        /** 
        const sorted = coins.sort((a, b) => (BigInt(b.balance) > BigInt(a.balance) ? 1 : -1));
        const gasCoinId = sorted[0].coinObjectId;
        const nonGas = sorted.slice(1).map((c) => c.coinObjectId);
        const primaryId = nonGas[0];
        const primary = tx.object(primaryId);
        
        for (const cid of nonGas.slice(1)) {
            console.log(`🔍 Merging coins:`, cid);
            tx.mergeCoins(primary, [tx.object(cid)]);
        }
        
        try {
          console.log(`🔍 Setting gas payment:`, gasCoinId);
          // @ts-ignore
          tx.setGasPayment([tx.object(gasCoinId)]);
        } catch {}
        
        const [sendCoin] = tx.splitCoins(primary, [tx.pure.u64(amountInMist)]);
        console.log(`🔍 Sending coin:`, sendCoin);
        tx.transferObjects([sendCoin], tx.pure.address(recipientAddress));
    }
      

    try {
      const result = await signAndExecute({ transaction: tx as any });
    } catch (error) {
      console.error('Failed to send gift:', error);
      alert('Failed to send gift. Please try again.');
    }
    
    // Create gift message
    const giftMessage: Message = {
      id: `${Date.now()}_${Math.random()}`,
      text: `You gifted ${recipientName} ${amount} ${selectedAsset}`,
      timestamp: new Date(),
      isSent: true,
      isRead: false,
      status: 'sent',
      chatId: '', // Will be set by parent
      sender: {
        name: 'You',
        avatar: LocalStorageService.getAvatarUrl("0x1", "You")
      },
      type: 'gift',
      giftData: {
        amount: amount,
        asset: selectedAsset,
        transactionDigest: result.digest,
        recipient: recipientAddress
      }
    };

    console.log(`🎁 Created gift message:`, giftMessage);
    onGiftSent(giftMessage);
    setShowGiftModal(false);
    setAmount('');
    
  } catch (error) {
    console.error('Failed to send gift:', error);
    alert('Failed to send gift. Please try again.');
  } finally {
    setIsSending(false);
  }
};

return (
  <>
    <Button
      variant="ghost"
      size="sm"
      onClick={handleGiftClick}
      disabled={disabled}
      className="w-8 h-8 p-0"
      title="Send Gift"
    >
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    </Button>

    {showGiftModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-background p-6 rounded-lg max-w-md w-full mx-4">
          <h3 className="text-lg font-semibold mb-4">Send Gift to {recipientName}</h3>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Select Asset</label>
            <select 
              value={selectedAsset} 
              onChange={(e) => setSelectedAsset(e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              {userAssets.map((asset) => (
                <option key={asset.type} value={asset.type}>
                  {asset.symbol} (Balance: {(parseFloat(asset.balance) / Math.pow(10, asset.decimals)).toFixed(4)})
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              step="0.0001"
              className="w-full p-2 border rounded-md"
            />
          </div>

          <div className="flex space-x-2">
            <Button
              onClick={() => setShowGiftModal(false)}
              variant="outline"
              className="flex-1"
              disabled={isSending}
            >
              Cancel
            </Button>
            <Button
              onClick={sendGift}
              disabled={!amount || isSending}
              className="flex-1"
            >
              {isSending ? 'Sending...' : 'Send Gift'}
            </Button>
          </div>
        </div>
      </div>
    )}
  </>
);
};

export default GiftButton;
 */