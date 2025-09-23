import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";

interface UsernameSelectPageProps {
  onSelect?: (username: string) => void;
}

const shorten = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`;

const UsernameSelectPage: React.FC<UsernameSelectPageProps> = ({ onSelect }) => {
  const navigate = useNavigate();
  const account = useCurrentAccount();
  const { theme } = useTheme();

  const [names, setNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string>("");

  useEffect(() => {
    if (!account?.address) return;
    const client = new SuiClient({ url: getFullnodeUrl("mainnet") });

    (async () => {
      try {
        const res = await client.resolveNameServiceNames({
          address: account.address,
        });
        const resolved = res?.data ?? [];
        setNames(resolved);
        setSelected(resolved[0] || shorten(account.address));
      } catch (err) {
        console.error("SuiNS resolve error:", err);
        setSelected(shorten(account.address));
      } finally {
        setLoading(false);
      }
    })();
  }, [account?.address]);

  const handleContinue = () => {
    const username = selected || shorten(account!.address);
    onSelect?.(username);
    localStorage.setItem("username", username);
    window.location.href = "/";
  };

  if (!account?.address) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-foreground font-mono">No wallet connected.</p>
      </div>
    );
  }
  
  return (
    <div className="h-screen w-screen bg-gradient-to-br from-background via-background to-primary/10 flex flex-col">
      {/* Header */}
      <motion.div
        className="pt-10 pb-6 text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-3xl font-mono font-bold text-foreground">
          Choose Your Username
        </h1>
      </motion.div>

      {/* Body */}
      <motion.div
        className="flex-1 px-6 overflow-y-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {loading ? (
          <p className="text-center text-muted-foreground">Fetching SuiNS names…</p>
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            {names.length > 0 ? (
              <>
                {names.map((name) => (
                  <label
                    key={name}
                    className={`flex items-center space-x-3 rounded-lg border px-4 py-4 cursor-pointer transition
                      ${
                        selected === name
                          ? "border-primary bg-primary/10"
                          : "border-border/20 hover:bg-primary/5"
                      }`}
                  >
                    <input
                      type="radio"
                      name="username"
                      value={name}
                      checked={selected === name}
                      onChange={() => setSelected(name)}
                      className="form-radio text-primary"
                    />
                    <span className="font-mono">{name}</span>
                  </label>
                ))}

                {/* Wallet address option */}
                <label
                  className={`flex items-center space-x-3 rounded-lg border px-4 py-4 cursor-pointer transition
                    ${
                      selected === shorten(account.address)
                        ? "border-primary bg-primary/10"
                        : "border-border/20 hover:bg-primary/5"
                    }`}
                >
                  <input
                    type="radio"
                    name="username"
                    value={shorten(account.address)}
                    checked={selected === shorten(account.address)}
                    onChange={() => setSelected(shorten(account.address))}
                    className="form-radio text-primary"
                  />
                  <span className="font-mono">{shorten(account.address)}</span>
                </label>
              </>
            ) : (
              <div className="text-center">
                <p className="text-muted-foreground mb-3">
                  No SuiNS names found. Your wallet address will be used.
                </p>
                <p className="font-mono text-primary">{shorten(account.address)}</p>
              </div>
            )}

            <Button className="w-full mt-6" onClick={handleContinue}>
              Continue
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default UsernameSelectPage;
