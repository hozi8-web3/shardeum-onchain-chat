'use client'

import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import ChatInterface from '../components/ChatInterface'
import Header from '../components/Header'
import { ChatProvider } from '../contexts/ChatContext'

export default function Home() {
  const [isConnected, setIsConnected] = useState(false)
  const [account, setAccount] = useState<string | null>(null)
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null)

  useEffect(() => {
    checkConnection()
  }, [])

  const checkConnection = async () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' })
        if (accounts.length > 0) {
          setIsConnected(true)
          setAccount(accounts[0])
          const provider = new ethers.BrowserProvider(window.ethereum)
          setProvider(provider)
        }
      } catch (error) {
        console.error('Error checking connection:', error)
      }
    }
  }

  const connectWallet = async () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
        if (accounts.length > 0) {
          setIsConnected(true)
          setAccount(accounts[0])
          const provider = new ethers.BrowserProvider(window.ethereum)
          setProvider(provider)
          // log activity and ensure user exists
          fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address: accounts[0] }) }).catch(() => {})
          fetch('/api/activity', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address: accounts[0], type: 'connect' }) }).catch(() => {})
        }
      } catch (error) {
        console.error('Error connecting wallet:', error)
      }
    } else {
      alert('Please install MetaMask!')
    }
  }

  const disconnectWallet = () => {
    setIsConnected(false)
    setAccount(null)
    setProvider(null)
    // best-effort log
    try {
      fetch('/api/activity', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address: account, type: 'disconnect' }) })
    } catch {}
  }

  return (
    <ChatProvider>
      <div className="min-h-screen">
        {/* Header */}
        <Header
          isConnected={isConnected}
          account={account}
          onConnect={connectWallet}
          onDisconnect={disconnectWallet}
        />

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {isConnected && provider ? (
            <ChatInterface account={account!} provider={provider} />
          ) : (
            <div className="text-center py-20">
              <div className="max-w-md mx-auto">
                <div className="mb-8">
                  <div className="mx-auto h-24 w-24 bg-gradient-to-r from-primary-500 to-shardeum-500 rounded-full flex items-center justify-center">
                    <svg className="h-12 w-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Welcome to ShardTalk
                </h2>
                <p className="text-lg text-gray-600 mb-8">
                  Connect your wallet to join the decentralized chatroom where all messages are stored on the blockchain.
                </p>
                <button
                  onClick={connectWallet}
                  className="btn-primary text-lg px-8 py-3"
                >
                  Connect Wallet
                </button>
                <div className="mt-6 text-sm text-gray-500">
                  <p>Network: Shardeum Unstablenet (Chain ID: 8080)</p>
                  <p>RPC: api-unstable.shardeum.org</p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </ChatProvider>
  )
}
