import { useState, useEffect } from "react";
import {
  useConnectWallet,
  useCurrentAccount,
  useWallets,
  ConnectModal
} from "@mysten/dapp-kit";
import {
  isEnokiWallet,
  type EnokiWallet,
  type AuthProvider,
} from "@mysten/enoki";
import { motion } from 'framer-motion';
import { FaWallet, FaGoogle, FaSpinner } from 'react-icons/fa';
import DesktopLayout from "./DesktopLayout";
import { useMessaging } from '../hooks/useMessaging';
import { useSessionKey } from '../providers/SessionKeyProvider';

export function Init() {
  const currentAccount = useCurrentAccount();
  const [open, setOpen] = useState(false);
  const { mutate: connect } = useConnectWallet();
  const { sessionKey, isInitializing, initializeManually } = useSessionKey();
  const { isReady } = useMessaging();

  useEffect(() => {
    if ((currentAccount && !sessionKey && !isInitializing) || (currentAccount && sessionKey && sessionKey.isExpired())) {
      initializeManually();
    }
  }, [sessionKey, sessionKey?.isExpired()]);

  const wallets = useWallets().filter(isEnokiWallet);
  const walletsByProvider = wallets.reduce(
    (map, wallet) => map.set(wallet.provider, wallet),
    new Map<AuthProvider, EnokiWallet>()
  );

  const googleWallet = walletsByProvider.get("google");

  if (currentAccount && sessionKey && isReady) {
    return <DesktopLayout />;
  }

  if (currentAccount && !sessionKey && !isInitializing) {
    return (
      <div className="w-full h-full bg-gray-900 flex flex-col items-center justify-center titillium-web-regular">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-700/30">
            <FaWallet className="w-8 h-8 text-indigo-400" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-200 mb-3 titillium-web-bold">Sign Session Key</h2>
          <p className="text-gray-400 text-base mb-8 max-w-md">
            To enable secure messaging, please sign a session key. This allows the app to encrypt and decrypt messages for 30 minutes without repeated confirmations.
          </p>
          <div className="space-y-4 max-w-sm mx-auto">
            <motion.button
              className="w-full flex items-center gap-4 p-4 rounded-xl bg-indigo-500 hover:bg-indigo-600 border border-indigo-400 transition-colors group"
              onClick={initializeManually}
              disabled={isInitializing}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex-shrink-0">
                <FaWallet className="w-5 h-5 text-white" />
              </div>
              <span className="text-white font-medium titillium-web-regular">
                {isInitializing ? 'SIGNING...' : 'SIGN SESSION KEY'}
              </span>
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  // loading when initializing session
  if (currentAccount && isInitializing) {
    return (
      <div className="w-full h-full bg-gray-900 flex flex-col items-center justify-center titillium-web-regular">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <div className="w-full flex justify-center">
            <div className="w-8 h-8 flex items-center justify-center">
              <FaSpinner className="w-6 h-6 text-penguin-primary animate-spin" />
            </div>
          </div>
          <h2 className="text-2xl font-semibold text-gray-200 mb-3 titillium-web-bold">Initializing...</h2>
          <p className="text-gray-400 text-base mb-8 max-w-md">Setting up secure messaging session...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gray-900 flex flex-col items-center justify-center titillium-web-regular">
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-700/30">
          <FaWallet className="w-8 h-8 text-indigo-400" />
        </div>
        <h2 className="text-2xl font-semibold text-gray-200 mb-3 titillium-web-bold">Connect Your Wallet</h2>
        <p className="text-gray-400 text-base mb-8 max-w-md">Unlock secure decentralised messaging with PenguinChat.</p>
        <div className="space-y-4 max-w-sm mx-auto">
          <ConnectModal
            trigger={
              <motion.button
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-gray-800/50 hover:bg-indigo-500/20 border border-gray-700/30 transition-colors group"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex-shrink-0 "><FaWallet/></div>
                <span className="text-gray-100 font-medium titillium-web-regular">CONNECT SUI WALLET</span>
              </motion.button>
            }
            open={open}
            onOpenChange={setOpen}
          />
          {googleWallet && (
            <motion.button
              className="w-full flex items-center gap-4 p-4 rounded-xl bg-gray-800/50 hover:bg-indigo-500/20 border border-gray-700/30 transition-colors group"
              
              onClick={() => connect({ wallet: googleWallet })}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex-shrink-0"><FaGoogle /></div>
              <span className="text-gray-100 font-medium titillium-web-regular">SIGN IN WITH GOOGLE</span>
            </motion.button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default Init;