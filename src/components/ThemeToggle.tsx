import React from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <motion.button
      onClick={toggleTheme}
      className="relative w-14 h-14 rounded-full backdrop-blur-xl bg-card/80 border border-border/50 shadow-lg overflow-hidden group"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      style={{
        boxShadow: theme === 'dark' 
          ? '0 10px 25px -5px rgba(229, 229, 229, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
          : '0 10px 25px -5px rgba(26, 26, 26, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
      }}
    >
      {/* Animated background */}
      <motion.div
        className="absolute inset-0 rounded-full"
        animate={{
          background: theme === 'dark'
            ? 'radial-gradient(circle, rgba(229, 229, 229, 0.1) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(26, 26, 26, 0.1) 0%, transparent 70%)'
        }}
        transition={{ duration: 0.5 }}
      />

      {/* Sun Icon */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        initial={false}
        animate={{
          rotate: theme === 'light' ? 0 : 180,
          scale: theme === 'light' ? 1 : 0,
          opacity: theme === 'light' ? 1 : 0,
        }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
      >
        <Sun size={20} className="text-primary" />
      </motion.div>

      {/* Moon Icon */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        initial={false}
        animate={{
          rotate: theme === 'dark' ? 0 : -180,
          scale: theme === 'dark' ? 1 : 0,
          opacity: theme === 'dark' ? 1 : 0,
        }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
      >
        <Moon size={20} className="text-primary" />
      </motion.div>

      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 rounded-full"
        animate={{
          boxShadow: theme === 'dark'
            ? '0 0 20px rgba(229, 229, 229, 0.3)'
            : '0 0 20px rgba(26, 26, 26, 0.3)'
        }}
        transition={{ duration: 0.5 }}
      />

      {/* Ripple effect on click */}
      <motion.div
        className="absolute inset-0 rounded-full bg-primary/20"
        initial={{ scale: 0, opacity: 0 }}
        whileTap={{ scale: 2, opacity: [0, 0.3, 0] }}
        transition={{ duration: 0.4 }}
      />
    </motion.button>
  );
};

export default ThemeToggle;