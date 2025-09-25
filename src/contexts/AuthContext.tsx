import React, { createContext, useContext, useEffect, useState } from 'react';
import { useCurrentAccount, useDisconnectWallet } from '@mysten/dapp-kit';
import { LocalStorageService } from '@/services/localStorageService';

interface User {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const currentAccount = useCurrentAccount();
  const { mutate: disconnect } = useDisconnectWallet();

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (currentAccount) {
      const address = currentAccount.address;
      const short = `${address.slice(0, 6)}...${address.slice(-4)}`;
      setUser({
        id: address,
        name: short,
        avatar: LocalStorageService.getAvatarUrl(address, short),
      });
    } else {
      setUser(null);
    }
    setIsLoading(false);
  }, [currentAccount]);

  const logout = () => {
    disconnect();
    setUser(null); 
    localStorage.removeItem("username");
  };

  return (
    <AuthContext.Provider value={{ user, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
