import React from 'react';
import {
  createNetworkConfig,
  SuiClientProvider,
  WalletProvider,
} from "@mysten/dapp-kit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getFullnodeUrl } from "@mysten/sui/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import SignupPage from './SignupPage';
import RegisterEnokiWallets from "./RegisterEnokiWallets";


const { networkConfig } = createNetworkConfig({
  testnet: { url: getFullnodeUrl("testnet") },
});

const queryClient = new QueryClient();

const AppContent: React.FC = () => {

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/" element={<SignupPage />}
        />
      </Routes>
    </BrowserRouter>
  );
};



const App = () => (
    <QueryClientProvider client={queryClient}>
        <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
            <RegisterEnokiWallets />
            <WalletProvider>
                <AppContent />
            </WalletProvider>
        </SuiClientProvider>
    </QueryClientProvider>
);

export default App;
