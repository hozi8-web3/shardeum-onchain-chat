'use client'

import { useState, useEffect, useRef } from 'react'
import MessageItem from './MessageItem'

interface Message {
  sender: string
  timestamp: number
  content: string
  messageId: number
  isPending?: boolean
}

interface MessageListProps {
  messages: Message[]
  currentUser: string
  onLoadMore: () => void
  hasMore: boolean
  loading: boolean
  onScrollChange?: () => void
}

const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUser,
  onLoadMore,
  hasMore,
  loading,
  onScrollChange,
}) => {
  const [autoScroll, setAutoScroll] = useState(true)
  const [isNearBottom, setIsNearBottom] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const lastScrollTop = useRef(0)
  const [addressToUsername, setAddressToUsername] = useState<Record<string, string>>({})

  // WhatsApp-style scroll handling
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    const currentScrollTop = scrollTop
    
    // Determine if we're near the bottom (within 100px)
    const nearBottom = scrollTop + clientHeight >= scrollHeight - 100
    setIsNearBottom(nearBottom)
    
    // Auto-scroll behavior like WhatsApp
    if (nearBottom) {
      setAutoScroll(true)
    } else {
      // Only disable auto-scroll if user is actively scrolling up
      if (currentScrollTop < lastScrollTop.current) {
        setAutoScroll(false)
      }
    }
    
    lastScrollTop.current = currentScrollTop
    
    // Notify parent component about scroll change
    if (onScrollChange) {
      onScrollChange()
    }
  }

  const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
      setAutoScroll(true)
    }
  }

  // WhatsApp-style: Auto-scroll to bottom for new messages if user is near bottom
  useEffect(() => {
    if (autoScroll && messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      const currentTime = Math.floor(Date.now() / 1000)
      
      // Only auto-scroll for very recent messages (last 10 seconds)
      if (lastMessage && !lastMessage.isPending && 
          lastMessage.timestamp > currentTime - 10) {
        setTimeout(() => {
          scrollToBottom()
        }, 50) // Small delay for smooth animation
      }
    }
  }, [messages, autoScroll])

  // Fetch usernames for unique senders from backend and cache locally
  useEffect(() => {
    const uniqueAddresses = Array.from(new Set(messages.map(m => m.sender.toLowerCase())))
    const missing = uniqueAddresses.filter(a => !addressToUsername[a])
    if (missing.length === 0) return
    ;(async () => {
      try {
        const results = await Promise.all(
          missing.map(addr => 
            fetch(`/api/users?address=${addr}`, { cache: 'no-store' })
              .then(r => r.ok ? r.json() : null)
              .catch(() => null)
          )
        )
        const map: Record<string, string> = {}
        results.forEach((res, idx) => {
          const addr = missing[idx]
          const u = res?.user
          if (u?.username) {
            map[addr] = u.username as string
          }
        })
        if (Object.keys(map).length > 0) {
          setAddressToUsername(prev => ({ ...prev, ...map }))
        }
      } catch (e) {
        // ignore
      }
    })()
  }, [messages])

  if (messages.length === 0 && !loading) {
    return (
      <div className="text-center py-8 sm:py-12">
        <div className="mx-auto h-12 w-12 sm:h-16 sm:w-16 bg-gray-700 rounded-full flex items-center justify-center mb-3 sm:mb-4">
          <svg className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <h3 className="text-base sm:text-lg font-medium text-gray-100 mb-2">No messages yet</h3>
        <p className="text-sm sm:text-base text-gray-300 px-4">Be the first to send a message to the blockchain!</p>
      </div>
    )
  }

  // Sort messages by messageId to ensure proper order (like WhatsApp)
  const sortedMessages = [...messages].sort((a, b) => a.messageId - b.messageId)

  return (
    <div className="space-y-4">
      {/* Load More Button - WhatsApp-style */}
      {hasMore && (
        <div className="text-center">
          <button
            onClick={onLoadMore}
            disabled={loading}
            className="btn-secondary text-xs sm:text-sm px-3 sm:px-4 py-2 w-full sm:w-auto hover:scale-105 transition-all duration-200"
          >
            {loading ? (
              <div className="flex items-center justify-center space-x-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Loading...</span>
              </div>
            ) : (
              'Load More Messages'
            )}
          </button>
        </div>
      )}

      {/* Messages Container - WhatsApp-style */}
      <div
        ref={containerRef}
        id="messages-container"
        className="max-h-64 sm:max-h-96 overflow-y-auto space-y-3 sm:space-y-4 pr-2 scroll-smooth messages-scrollbar"
        onScroll={handleScroll}
        style={{
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {sortedMessages.map((message, index) => (
          <div
            key={`${message.messageId}-${message.sender}-${message.timestamp}`}
            className={`transition-all duration-300 ease-out ${
              message.isPending 
                ? 'animate-pulse opacity-80' 
                : 'animate-fade-in'
            }`}
            style={{
              animationDelay: `${index * 50}ms`
            }}
          >
            <MessageItem
              message={message}
              isOwnMessage={message.sender.toLowerCase() === currentUser.toLowerCase()}
              usernameMap={addressToUsername}
            />
          </div>
        ))}
      </div>

      {/* WhatsApp-style Scroll to Bottom Button */}
      {!isNearBottom && (
        <div className="text-center">
          <button
            onClick={scrollToBottom}
            className="btn-secondary text-xs sm:text-sm px-3 py-1 w-full sm:w-auto hover:scale-105 transition-all duration-200 bg-blue-600 hover:bg-blue-700 border-blue-500"
          >
            <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            Scroll to Latest
          </button>
        </div>
      )}

      {/* Loading Indicator - WhatsApp-style */}
      {loading && (
        <div className="text-center py-3 sm:py-4">
          <div className="flex items-center justify-center space-x-2">
            <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5 text-blue-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-sm sm:text-base text-gray-300">Loading messages...</span>
          </div>
        </div>
      )}
      
      {/* Performance Info */}
      <div className="text-center text-xs text-gray-400 mt-2 px-2">
        ⚡ Real-time updates • Optimized for speed • WhatsApp-style experience
      </div>
    </div>
  )
}

export default MessageList
