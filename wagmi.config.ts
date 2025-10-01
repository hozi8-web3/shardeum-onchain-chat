import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { http } from 'wagmi'
import { defineChain } from 'viem'

// Define Shardeum Unstablenet chain
export const shardeumUnstablenet = defineChain({
  id: 8080,
  name: 'Shardeum Unstablenet',
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
})

export const config = getDefaultConfig({
  appName: 'ShardTalk', // Change this
  projectId: '1cacc2cbc86107f43a4fa6216c654e73', // Get from https://cloud.walletconnect.com
  chains: [shardeumUnstablenet],
  transports: {
    [shardeumUnstablenet.id]: http(),
  },
  ssr: true, // Set to true if using Next.js App Router
})