import React from 'react';
import {
  createNetworkConfig,
  SuiClientProvider,
  WalletProvider,
} from "@mysten/dapp-kit";
import { getFullnodeUrl } from "@mysten/sui/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import RegisterEnokiWallets from "./components/RegisterEnokiWallets";

import "@mysten/dapp-kit/dist/index.css";
import { darkTheme } from './themes/darkTheme';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import { BackupProvider } from "./contexts/BackupContext";
import { useAuth } from "./contexts/AuthContext";
import SignupPage from "./components/SignupPage";
import ChatListPage from './components/ChatListPage';
import UsernameSelectPage from "./components/UsernameSelectPage";


const { networkConfig } = createNetworkConfig({
  testnet: { url: getFullnodeUrl("testnet") },
});

const queryClient = new QueryClient();


const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-accent/30 border-t-accent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const storedUsername = localStorage.getItem("username");

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            !user ? (
              <SignupPage />
            ) : storedUsername === null || storedUsername === "null" ? (
              <UsernameSelectPage />
            ) : (
              <ChatListPage />
            )
          }
        />
        <Route path="/login" element={<SignupPage />} />
      </Routes>
    </BrowserRouter>
  );
};



const App = () => (
  <QueryClientProvider client={queryClient}>
    <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
      <RegisterEnokiWallets />
      <WalletProvider 
        autoConnect
        theme={[
          { variables: darkTheme },
        ]}
      >
        <ThemeProvider>
          <AuthProvider>
            <BackupProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <AppContent />
              </TooltipProvider>
            </BackupProvider>
          </AuthProvider>
        </ThemeProvider>
      </WalletProvider>
    </SuiClientProvider>
  </QueryClientProvider>
);

export default App;
