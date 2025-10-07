'use client'

import { useState, useEffect, useRef } from 'react'
import { useChat } from '../contexts/ChatContext'
import MessageList from './MessageList'
import MessageInput from './MessageInput'
import GasEstimate from './GasEstimate'

interface ChatInterfaceProps {
  account: string
  provider: any
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ account, provider }) => {
  const { messages, loading, error, sendMessage, loadMoreMessages, hasMoreMessages, checkCooldown, networkStatus, switchToShardeum } = useChat()
  const [isTyping, setIsTyping] = useState(false)
  const [showNewMessagesButton, setShowNewMessagesButton] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [lastMessageCount, setLastMessageCount] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    checkCooldown(account)
    const interval = setInterval(() => {
      checkCooldown(account)
    }, 2000)
    return () => clearInterval(interval)
  }, [account, checkCooldown])

  // Enhanced real-time message handling like WhatsApp
  useEffect(() => {
    if (messages.length > 0) {
      const currentMessageCount = messages.length
      const hasNewMessages = currentMessageCount > lastMessageCount
      
      // Only auto-scroll if this is a genuinely new message (not on page refresh)
      if (hasNewMessages && !isInitialLoad) {
        const lastMessage = messages[messages.length - 1]
        const currentTime = Math.floor(Date.now() / 1000)
        
        // Check if this is a new message by looking at the timestamp
        // If the message is from the last 30 seconds, it's likely a new message
        const isNewMessage = lastMessage && !lastMessage.isPending && 
          lastMessage.timestamp > currentTime - 30
        
        if (isNewMessage) {
          // WhatsApp-style: only auto-scroll if user is already near the bottom
          const isNearBottom = () => {
            const container = document.getElementById('messages-container')
            if (!container) return true
            const { scrollTop, scrollHeight, clientHeight } = container
            return scrollTop + clientHeight >= scrollHeight - 150 // Within 150px of bottom
          }
          
          if (isNearBottom()) {
            // Smooth scroll to bottom with WhatsApp-like behavior
            setTimeout(() => {
              scrollToBottom()
            }, 100) // Small delay for smooth animation
          } else {
            // Show new messages indicator like WhatsApp
            setShowNewMessagesButton(true)
          }
        }
      }
      
      // Mark initial load as complete after first messages load
      if (isInitialLoad && messages.length > 0) {
        setIsInitialLoad(false)
      }
      
      // Update last message count for next comparison
      setLastMessageCount(currentMessageCount)
      
      // Check scroll position to show/hide new messages button
      setTimeout(checkScrollPosition, 100)
    }
  }, [messages, isInitialLoad, lastMessageCount])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'end'
    })
    setShowNewMessagesButton(false)
  }

  const checkScrollPosition = () => {
    const container = document.getElementById('messages-container')
    if (container) {
      const { scrollTop, scrollHeight, clientHeight } = container
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10
      const currentTime = Math.floor(Date.now() / 1000)
      const hasRecentMessages = messages.some(msg => 
        !msg.isPending && msg.timestamp > currentTime - 300 // Last 5 minutes
      )
      setShowNewMessagesButton(!isAtBottom && hasRecentMessages)
    }
  }

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return
    
    setIsTyping(true)
    try {
      await sendMessage(content.trim())
      // WhatsApp-style: scroll to bottom immediately after sending
      setTimeout(() => {
        scrollToBottom()
      }, 200)
    } finally {
      setIsTyping(false)
    }
  }

  const handleLoadMore = async () => {
    if (hasMoreMessages && !loading) {
      await loadMoreMessages()
    }
  }

  return (
    <>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Chat Header */}
        <div className="card mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-100">On-Chain Chatroom</h2>
              <p className="text-xs sm:text-sm text-gray-300 mt-1">
                All messages are permanently stored on the Shardeum blockchain
              </p>
            </div>
            <div className="text-center sm:text-right">
              <div className="text-xs sm:text-sm text-gray-300">Total Messages</div>
              <div className="text-xl sm:text-2xl font-bold text-blue-400">{messages.length}</div>
              {messages.some(msg => msg.isPending) && (
                <div className="text-xs text-yellow-400 mt-1 animate-pulse">
                  {messages.filter(msg => msg.isPending).length} sending...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Network Status */}
        {networkStatus === 'wrong-network' && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-yellow-900/30 border border-yellow-700/50 rounded-lg backdrop-blur-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-yellow-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span className="text-yellow-200 text-sm">
                  You're not connected to Shardeum EVM Testnet. Please switch networks to continue.
                </span>
              </div>
              <button
                onClick={switchToShardeum}
                className="btn-primary text-sm px-4 py-2 w-full sm:w-auto"
              >
                Switch to Shardeum
              </button>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-900/30 border border-red-700/50 rounded-lg backdrop-blur-sm">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-red-400 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-red-200 text-sm">{error}</div>
            </div>
            {error.includes('timeout') && (
              <div className="mt-2 text-xs text-yellow-300">
                💡 Please wait a moment and refresh the page to see if your message was actually sent.
              </div>
            )}
          </div>
        )}

        {/* Messages Container */}
        <div className="card mb-4 sm:mb-6">
          <MessageList
            messages={messages}
            currentUser={account}
            onLoadMore={handleLoadMore}
            hasMore={hasMoreMessages}
            loading={loading}
            onScrollChange={checkScrollPosition}
          />
          <div ref={messagesEndRef} />
          
          {/* WhatsApp-style New Messages Indicator */}
          {showNewMessagesButton && (
            <div className="mt-4 text-center">
              <button
                onClick={scrollToBottom}
                className="btn-secondary text-sm px-4 py-2 flex items-center justify-center mx-auto space-x-2 hover:scale-105 transition-all duration-200 bg-blue-600 hover:bg-blue-700 border-blue-500"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                <span>New Messages ↓</span>
              </button>
            </div>
          )}
        </div>

        {/* Message Input */}
        <div className="card">
          <MessageInput
            onSendMessage={handleSendMessage}
            disabled={loading || isTyping}
            placeholder="Type your message..."
          />
          
          {/* Gas Estimate */}
          <div className="mt-4">
            <GasEstimate provider={provider} />
          </div>
        </div>

        {/* Info Footer */}
        <div className="mt-4 sm:mt-6 text-center text-xs sm:text-sm text-gray-300 px-2">
          <p className="leading-relaxed">
            💬 Messages are stored permanently on the blockchain • 
            ⏱️ 10-second cooldown between messages • 
            🔗 View on explorer: <a 
              href="https://explorer-mezame.shardeum.org" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline transition-colors"
            >
              Shardeum Explorer
            </a>
          </p>
        </div>
      </div>
      
      {/* Main Footer */}
      <footer className="mt-8 sm:mt-12 py-6 sm:py-8 bg-gray-900/90 backdrop-blur-md border-t border-gray-700/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-4 text-sm text-gray-300">
              <span>Made with ❤️ by</span>
              <a 
                href="https://twitter.com/yourusername" 
                target="_blank" 
                rel="noopener noreferrer"
                className="font-semibold text-blue-400"
              >
              HOZI
            </a>

              <span>•</span>
              <span>Powered by Shardeum</span>
            </div>
            <div className="mt-3 text-xs text-gray-400">
              <p>Decentralized chat on the blockchain</p>
            </div>
          </div>
        </div>
      </footer>
    </>
  )
}

export default ChatInterface
