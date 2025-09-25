export const LITE_SERVER = import.meta.env.VITE_ENV === 'production' 
  ? 'https://penguinchat.onrender.com'
  : 'http://localhost:3002';