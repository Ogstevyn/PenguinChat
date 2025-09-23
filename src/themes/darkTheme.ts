import type { ThemeVars } from '@mysten/dapp-kit';

export const darkTheme: ThemeVars = {
  blurs: {
    modalOverlay: 'blur(10px)',
  },
  backgroundColors: {
    primaryButton: 'rgba(255,255,255,0.08)',
    primaryButtonHover: 'rgba(255,255,255,0.12)',
    outlineButtonHover: 'rgba(255,255,255,0.12)',
    modalOverlay: 'rgba(0,0,0,0.75)',
    modalPrimary: 'rgba(15,15,20,0.6)',
    modalSecondary: 'rgba(25,25,30,0.5)',
    iconButton: 'transparent',
    iconButtonHover: 'rgba(255,255,255,0.1)',
    dropdownMenu: 'rgba(15,15,20,0.8)',
    dropdownMenuSeparator: 'rgba(255,255,255,0.1)',
    walletItemSelected: 'rgba(255,255,255,0.1)',
    walletItemHover: 'rgba(255,255,255,0.08)',
  },
  borderColors: {
    outlineButton: 'rgba(255,255,255,0.2)',
  },
  colors: {
    primaryButton: '#FFFFFF',
    outlineButton: '#FFFFFF',
    iconButton: '#FFFFFF',
    body: '#FFFFFF',
    bodyMuted: 'rgba(255,255,255,0.5)',
    bodyDanger: '#FF6B6B',
  },
  radii: {
    small: '8px',
    medium: '12px',
    large: '16px',
    xlarge: '20px',
  },
  shadows: {
    primaryButton: '0 0 10px rgba(0,0,0,0.4)',
    walletItemSelected: '0 0 8px rgba(0,0,0,0.4)',
  },
  fontWeights: {
    normal: '400',
    medium: '500',
    bold: '600',
  },
  fontSizes: {
    small: '12px',
    medium: '14px',
    large: '16px',
    xlarge: '18px',
  },
  typography: {
    fontFamily: 'Space Mono, monospace',
    fontStyle: 'normal',
    lineHeight: '1.3',
    letterSpacing: '0.5px',
  },
};
