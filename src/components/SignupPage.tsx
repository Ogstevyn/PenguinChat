import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";
import InteractiveBackground from "./InteractiveBackground";
import ThemeToggle from "./ThemeToggle";

import {
  useConnectWallet,
  useCurrentAccount,
  useWallets,
  ConnectModal,
} from "@mysten/dapp-kit";
import {
  isEnokiWallet,
  type EnokiWallet,
  type AuthProvider,
} from "@mysten/enoki";
import { useNavigate } from "react-router-dom";
import { FaGoogle, FaWallet, FaChevronLeft } from 'react-icons/fa';
import UsernameSelectPage from "./UsernameSelectPage";

const SignupPage: React.FC = () => {
  const { theme } = useTheme();
  
  const currentAccount = useCurrentAccount();
  const [open, setOpen] = useState(false);
  const { mutate: connect } = useConnectWallet();
  const navigate = useNavigate();

  const wallets = useWallets().filter(isEnokiWallet);
  const walletsByProvider = wallets.reduce(
    (map, wallet) => map.set(wallet.provider, wallet),
    new Map<AuthProvider, EnokiWallet>()
  );

  const googleWallet = walletsByProvider.get("google");

  useEffect(() => {
    if (currentAccount) {
      if (localStorage.getItem("username") === null) {
        localStorage.setItem("username", "null");
      }
      navigate("/");
    }
  }, [currentAccount, navigate]);
  

  if (currentAccount) {
    return <UsernameSelectPage/>;
  }


  return (
    <div className="min-h-screen max-w-screen relative overflow-hidden bg-gradient-to-br from-background via-background to-primary/10">
      {/* Interactive 3D Background */}
      <InteractiveBackground />

      {/* Theme Toggle */}
      <motion.div
        className="absolute top-6 right-6 z-20"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
      >
        <ThemeToggle />
      </motion.div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          {/* Hero Section */}
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            {/* Chat Bubble Logo Container */}
            <motion.div
              className="relative mb-6"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4, duration: 1, ease: "easeOut" }}
            >
              <motion.div
                className="relative inline-block px-8 py-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-3xl backdrop-blur-sm border border-primary/10"
                animate={{
                  scale: [1, 1.02, 1],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                style={{
                  boxShadow:
                    theme === "dark"
                      ? "0 0 10px rgba(144, 144, 144, 0.3)"
                      : "0 0 10px rgba(26, 26, 26, 0.2)",
                }}
              >
                <motion.h1
                  className="text-5xl font-bold text-primary font-mono mb-2"
                  style={{
                    textShadow:
                      theme === "dark"
                        ? "0 0 20px rgba(229, 229, 229, 0.3)"
                        : "0 0 15px rgba(26, 26, 26, 0.2)",
                    transform: "perspective(500px) rotateX(10deg)",
                  }}
                >
                  PenguinChat
                </motion.h1>
              </motion.div>
            </motion.div>

            <motion.p
              className="text-lg text-muted-foreground font-light font-mono text-sm italic"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.8 }}
            >
              the future is here
            </motion.p>

            <motion.div
              className="w-16 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent mx-auto mt-4"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.8, duration: 1 }}
            />
          </motion.div>

          {/* Glassmorphism Signup Card */}
          <motion.div
            className="relative backdrop-blur-xl border border-border/10 rounded-2xl p-8 shadow-2xl"
            initial={{ opacity: 0, scale: 0.9, rotateX: 20 }}
            animate={{ opacity: 1, scale: 1, rotateX: 0 }}
            transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
          >
            <h2 className="text-2xl font-mono font-semibold text-foreground mb-6 text-center">
              Join the Experience
            </h2>

            <ConnectModal
              trigger={
                <button className="w-full flex items-center justify-center gap-3 bg-primary/20 hover:bg-primary/30 text-foreground px-6 py-4 rounded-md transition">
                  <FaWallet />
                  {currentAccount ? "CONNECTED" : "CONNECT WALLET"}
                </button>
              }
              open={open}
              onOpenChange={setOpen}
            />
            
            <div className="my-6 flex items-center">
              <div className="flex-1 border-t border-white/20 dark:border-white/40"></div>
              <span className="px-4 text-muted-foreground opacity-50 font-['Space_Mono'] text-xs tracking-[0.5px]">
                OR
              </span>
              <div className="flex-1 border-t border-white/20 dark:border-white/40"></div>
            </div>
            {googleWallet && (
              <button
                onClick={() => connect({ wallet: googleWallet })}
                className="w-full mt-4 flex items-center justify-center gap-3 bg-primary/20 hover:bg-primary/30 text-foreground px-6 py-4 rounded-md transition"
              >
                <FaGoogle />
                SIGN IN WITH GOOGLE
              </button>
            )}

            <p className="mt-6 text-xs text-muted-foreground text-center">
              By signing up, you agree to our Terms of Service and Privacy Policy.
            </p>
          </motion.div>

          {/* Floating particles */}
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-primary/60 rounded-full"
                style={{
                  left: `${20 + i * 15}%`,
                  top: `${30 + i * 10}%`,
                }}
                animate={{
                  y: [-10, -30, -10],
                  opacity: [0.3, 0.8, 0.3],
                  scale: [0.8, 1.2, 0.8],
                }}
                transition={{
                  duration: 3 + i * 0.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SignupPage;
