'use client'

import { useChat } from '../contexts/ChatContext'
import WalletConnect from './WalletConnect'

interface HeaderProps {
  isConnected: boolean
  account: string | null
  onConnect: () => void
  onDisconnect: () => void
}

const Header: React.FC<HeaderProps> = ({
  isConnected,
  account,
  onConnect,
  onDisconnect,
}) => {
  const { networkStatus, switchToShardeum } = useChat()

  return (
    <header className="header-glass sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-1">
          {/* Left Side - Title */}
          <div className="flex items-center">
            <img src="/logo.svg" alt="SHARDTALK" className="h-6 w-auto mr-2" />
            <h1 className="text-base sm:text-lg font-bold text-gradient">ShardTalk</h1>
          </div>
          
          {/* Right Side - Wallet Connection with Integrated Network Info */}
          <WalletConnect
            isConnected={isConnected}
            account={account}
            onConnect={onConnect}
            onDisconnect={onDisconnect}
            networkStatus={networkStatus}
            onSwitchNetwork={switchToShardeum}
          />
        </div>
      </div>
    </header>
  )
}

export default Header
