'use client'

import { useState, useEffect } from 'react'

interface Message {
  sender: string
  timestamp: number
  content: string
  messageId: number
  isPending?: boolean
}

interface MessageItemProps {
  message: Message
  isOwnMessage: boolean
  usernameMap?: Record<string, string>
}

const MessageItem: React.FC<MessageItemProps> = ({ message, isOwnMessage, usernameMap }) => {
  const [showTimestamp, setShowTimestamp] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  // WhatsApp-style: Fade in animation when message appears
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const getDisplayName = (address: string) => {
    const fromMap = usernameMap?.[address.toLowerCase()]
    if (fromMap && fromMap.length > 0) return fromMap
    return formatAddress(address)
  }

  const getAvatarColor = (address: string) => {
    const colors = [
      'bg-gradient-to-br from-red-500 to-red-600', 
      'bg-gradient-to-br from-blue-500 to-blue-600', 
      'bg-gradient-to-br from-green-500 to-green-600', 
      'bg-gradient-to-br from-yellow-500 to-yellow-600',
      'bg-gradient-to-br from-purple-500 to-purple-600', 
      'bg-gradient-to-br from-pink-500 to-pink-600', 
      'bg-gradient-to-br from-indigo-500 to-indigo-600', 
      'bg-gradient-to-br from-teal-500 to-teal-600'
    ]
    const hash = address.slice(2).toLowerCase()
    const index = parseInt(hash.slice(0, 8), 16) % colors.length
    return colors[index]
  }

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp * 1000)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60)
      if (diffInMinutes < 1) {
        return 'Just now'
      }
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`
    } else if (diffInHours < 24) {
      const hours = Math.floor(diffInHours)
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }

  const sanitizeContent = (content: string) => {
    // Basic HTML sanitization
    return content
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
  }

  return (
    <div 
      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} transition-all duration-300 ease-out ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
    >
      <div className={`flex ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'} items-start space-x-3 max-w-xs lg:max-w-md`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full ${getAvatarColor(message.sender)} flex items-center justify-center text-white text-sm font-bold shadow-lg transition-transform duration-200 hover:scale-110`}>
          {message.sender.slice(2, 4).toUpperCase()}
        </div>

        {/* Message Content */}
        <div className={`${isOwnMessage ? 'text-right' : 'text-left'} flex-1`}>
          {/* Sender Address/Username */}
          <div className="mb-1">
            <span className="text-xs font-medium text-gray-400">
              {getDisplayName(message.sender)}
            </span>
            {isOwnMessage && (
              <span className="ml-2 text-xs text-blue-400 font-medium">(You)</span>
            )}
          </div>

          {/* Message Bubble - WhatsApp-style */}
          <div
            className={`inline-block px-4 py-2 rounded-2xl shadow-lg transition-all duration-200 hover:shadow-xl ${
              isOwnMessage
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-br-md'
                : 'bg-gray-700 text-gray-100 rounded-bl-md'
            } ${message.isPending ? 'opacity-70 animate-pulse' : ''}`}
            onMouseEnter={() => setShowTimestamp(true)}
            onMouseLeave={() => setShowTimestamp(false)}
          >
            <div className="flex items-center space-x-2">
              <div
                className="text-sm break-words leading-relaxed"
                dangerouslySetInnerHTML={{ __html: sanitizeContent(message.content) }}
              />
              {message.isPending && (
                <div className="flex-shrink-0">
                  <svg className="animate-spin h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* Timestamp - WhatsApp-style */}
          <div className={`mt-1 text-xs text-gray-400 ${isOwnMessage ? 'text-right' : 'text-left'} transition-opacity duration-200 ${
            showTimestamp ? 'opacity-100' : 'opacity-60'
          }`}>
            {message.isPending ? (
              <span className="text-yellow-400 font-medium animate-pulse">
                Sending...
              </span>
            ) : (
              formatTimestamp(message.timestamp)
            )}
          </div>

          {/* WhatsApp-style message status indicators */}
          {isOwnMessage && (
            <div className="flex items-center justify-end mt-1 space-x-1">
              {message.isPending ? (
                <div className="flex items-center space-x-1 text-yellow-400">
                  <svg className="w-3 h-3 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs">Sending</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1 text-blue-400">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-xs">Sent</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MessageItem
