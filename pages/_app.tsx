import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { Toaster } from 'react-hot-toast'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Component {...pageProps} />
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 5000,
          style: {
            background: '#363636',
            color: '#fff',
            fontSize: '14px',
            fontWeight: '500',
            maxWidth: '500px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          },
          success: {
            duration: 3000,
            style: {
              background: '#10B981',
              color: '#ffffff',
            },
            iconTheme: {
              primary: '#ffffff',
              secondary: '#10B981',
            },
          },
          error: {
            duration: 8000,
            style: {
              background: '#EF4444',
              color: '#ffffff',
              fontWeight: '600',
              border: '2px solid #DC2626',
            },
            iconTheme: {
              primary: '#ffffff',
              secondary: '#EF4444',
            },
          },
          loading: {
            style: {
              background: '#3B82F6',
              color: '#ffffff',
            },
            iconTheme: {
              primary: '#ffffff',
              secondary: '#3B82F6',
            },
          },
        }}
        containerStyle={{
          top: 20,
          right: 20,
        }}
      />
    </>
  )
}