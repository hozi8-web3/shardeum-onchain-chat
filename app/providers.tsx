'use client'

import { WagmiProvider, http } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  RainbowKitProvider,
  getDefaultConfig,
  darkTheme,
} from '@rainbow-me/rainbowkit'
import { mainnet, polygon, optimism, arbitrum } from 'wagmi/chains'
import '@rainbow-me/rainbowkit/styles.css'

// Define Shardeum Unstablenet custom chain
const shardeumUnstablenet = {
  id: 8080,
  name: 'Shardeum Unstablenet',
  network: 'shardeum-unstablenet',
  nativeCurrency: {
    decimals: 18,
    name: 'Shardeum',
    symbol: 'SHM',
  },
  rpcUrls: {
    default: {
      http: ['https://api-unstable.shardeum.org'],
    },
    public: {
      http: ['https://api-unstable.shardeum.org'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Shardeum Explorer',
      url: 'https://explorer-unstable.shardeum.org',
    },
  },
  testnet: true,
} as const

// Create wagmi config with RainbowKit
const config = getDefaultConfig({
  appName: 'ShardTalk',
  projectId:
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID_HERE',
  chains: [shardeumUnstablenet as any, mainnet, polygon, optimism, arbitrum],
  ssr: true, // Enable SSR support
})

// Create query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
})

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          modalSize="compact"
          showRecentTransactions
          theme={darkTheme({
            accentColor: '#6366f1', // indigo-500
            accentColorForeground: 'white',
            borderRadius: 'large',
            fontStack: 'rounded',
            overlayBlur: 'small', // ✅ gives blurred modal background
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
