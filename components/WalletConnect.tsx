'use client'

import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import Profile from './Profile'

interface WalletConnectProps {
  isConnected: boolean
  account: string | null
  onConnect: () => void
  onDisconnect: () => void
  networkStatus?: 'connected' | 'wrong-network' | 'disconnected' | 'checking'
  onSwitchNetwork?: () => void
}

const WalletConnect: React.FC<WalletConnectProps> = ({
  isConnected,
  account,
  onConnect,
  onDisconnect,
  networkStatus,
  onSwitchNetwork,
}) => {
  const [balance, setBalance] = useState<string>('0')
  const [networkName, setNetworkName] = useState<string>('')
  const [username, setUsername] = useState<string>('')

  useEffect(() => {
    if (isConnected && account) {
      fetchBalance()
      fetchNetworkInfo()
      // Load username from localStorage
      const savedUsername = localStorage.getItem(`username_${account.toLowerCase()}`)
      if (savedUsername) {
        setUsername(savedUsername)
      }
    }
  }, [isConnected, account])

  const fetchBalance = async () => {
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum)
        const balance = await provider.getBalance(account!)
        setBalance(ethers.formatEther(balance))
      }
    } catch (error) {
      console.error('Error fetching balance:', error)
    }
  }

  const fetchNetworkInfo = async () => {
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum)
        const network = await provider.getNetwork()
        
        if (network.chainId === 8080n) {
          setNetworkName('Shardeum Unstablenet')
        } else {
          setNetworkName(`Chain ID: ${network.chainId}`)
        }
      }
    } catch (error) {
      console.error('Error fetching network info:', error)
    }
  }

  const handleUsernameChange = (newUsername: string) => {
    setUsername(newUsername)
  }

  // Format balance to show only 3 decimal places
  const formatBalance = (balance: string) => {
    const num = parseFloat(balance)
    if (isNaN(num)) return '0.000'
    return num.toFixed(3)
  }

  if (!isConnected) {
    return (
      <button
        onClick={onConnect}
        className="btn-primary flex items-center justify-center space-x-2 px-3 py-1.5 text-xs"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <span>Connect Wallet</span>
      </button>
    )
  }

  return (
    <div className="flex items-center space-x-3 wallet-component-mobile">
      {/* Unified Profile Component - Single Line Layout */}
      <div className="bg-gray-800/40 backdrop-blur-sm rounded-lg px-2 py-1.5 border border-gray-600/30 shadow-lg hover:bg-gray-800/60 transition-all duration-200">
        <div className="flex items-center space-x-2">
          {/* Avatar */}
          <div className={`w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-lg`}>
            {account?.slice(2, 4).toUpperCase() || '47'}
          </div>
          
          {/* Profile Info - Username and Address */}
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-gray-200 truncate">
              {username || 'Hozi'}
            </div>
            <div className="text-xs text-gray-500 font-mono truncate">
              {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : '0x4758...f59b'}
            </div>
          </div>
          
          {/* Network Status and Balance - Below Address */}
          <div className="text-right min-w-0">
            <div className="text-xs text-gray-400 font-medium truncate">
              Unstablenet
            </div>
            <div className="text-xs text-gray-200 font-semibold truncate">
              {formatBalance(balance)} SHM
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center space-x-1 ml-1">
            <button
              onClick={() => {
                // Trigger username edit
                const event = new CustomEvent('editUsername', { detail: { account, username } })
                window.dispatchEvent(event)
              }}
              className="text-gray-400 hover:text-blue-400 transition-colors p-0.5 rounded hover:bg-gray-700/50"
              title="Edit Username"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            
            {onDisconnect && (
              <button
                onClick={onDisconnect}
                className="text-gray-400 hover:text-red-400 transition-colors p-0.5 rounded hover:bg-gray-700/50"
                title="Disconnect"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            )}
          </div>
        </div>
        
        {/* Network Switch Button - Only shown when needed */}
        {networkStatus === 'wrong-network' && onSwitchNetwork && (
          <div className="mt-1 pt-1 border-t border-gray-600/20">
            <button
              onClick={onSwitchNetwork}
              className="text-xs text-yellow-400 hover:text-yellow-300 underline transition-colors w-full text-center"
            >
              Switch to Shardeum
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default WalletConnect
