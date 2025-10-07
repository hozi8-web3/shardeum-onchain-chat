'use client'

import { useEffect } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { ethers } from 'ethers'
import ChatInterface from '../components/ChatInterface'
import Header from '../components/Header'
import { ChatProvider } from '../contexts/ChatContext'

export default function Home() {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()

  useEffect(() => {
    if (isConnected && address) {
      // Log activity and ensure user exists
      fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: address.toLowerCase() }),
      }).catch(() => {})

      fetch('/api/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: address.toLowerCase(), type: 'connect' }),
      }).catch(() => {})
    }
  }, [isConnected, address])

  // Get provider from window.ethereum
  const getProvider = () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      return new ethers.BrowserProvider(window.ethereum)
    }
    return null
  }

  return (
    <ChatProvider>
      <div className="min-h-screen">
        {/* ✅ Header now receives props as expected */}
        <Header />

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {isConnected && address ? (
            <ChatInterface account={address} provider={getProvider()} />
          ) : (
            <div className="text-center py-20">
              <div className="max-w-md mx-auto">
                <div className="mb-8">
                  <div className="mx-auto h-24 w-24 bg-gradient-to-r from-primary-500 to-shardeum-500 rounded-full flex items-center justify-center">
                    <svg
                      className="h-12 w-12 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                  </div>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Welcome to ShardTalk
                </h2>
                <p className="text-lg text-gray-600 mb-8">
                  Connect your wallet to join the decentralized chatroom where all messages are stored on the blockchain.
                </p>

                {/* Connect Button - Same as Header */}
                <ConnectButton.Custom>
                  {({ openConnectModal }) => (
                    <button
                      onClick={openConnectModal}
                      className="btn-primary text-lg px-8 py-3 flex items-center justify-center space-x-2 mx-auto"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                      <span>Connect Wallet</span>
                    </button>
                  )}
                </ConnectButton.Custom>

                <div className="mt-6 text-sm text-gray-500">
                  <p>Network: Shardeum EVM Testnet (Chain ID: 8119)</p>
                  <p>RPC: api-mezame.shardeum.org</p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </ChatProvider>
  )
}
