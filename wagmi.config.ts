import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { http } from 'wagmi'
import { defineChain } from 'viem'

// Define Shardeum EVM Testnet (Mezame)
export const shardeumEvmTestnet = defineChain({
  id: 8119,
  name: 'Shardeum EVM Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Shardeum',
    symbol: 'SHM',
  },
  rpcUrls: {
    default: {
      http: ['https://api-mezame.shardeum.org'],
    },
    public: {
      http: ['https://api-mezame.shardeum.org'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Shardeum Explorer',
      url: 'https://explorer-mezame.shardeum.org',
    },
  },
  testnet: true,
})

export const config = getDefaultConfig({
  appName: 'ShardTalk', // Change this
  projectId: '1cacc2cbc86107f43a4fa6216c654e73', // Get from https://cloud.walletconnect.com
  chains: [shardeumEvmTestnet],
  transports: {
    [shardeumEvmTestnet.id]: http(),
  },
  ssr: true, // Set to true if using Next.js App Router
})