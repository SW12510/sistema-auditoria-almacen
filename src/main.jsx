import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

import './styles/App.css';
import './styles/Layout.css';
import './styles/Login.css';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, 
      refetchOnWindowFocus: true, 
      retry: 1 
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
)
