'use client'

import { useState, useEffect } from 'react'
import { useChat } from '../contexts/ChatContext'

interface MessageInputProps {
  onSendMessage: (content: string) => void
  disabled: boolean
  placeholder: string
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  disabled,
  placeholder,
}) => {
  const [message, setMessage] = useState('')
  const [cooldownTimer, setCooldownTimer] = useState(0)
  const { cooldownRemaining } = useChat()

  useEffect(() => {
    setCooldownTimer(cooldownRemaining)
  }, [cooldownRemaining])

  useEffect(() => {
    if (cooldownTimer > 0) {
      const interval = setInterval(() => {
        setCooldownTimer(prev => Math.max(0, prev - 1))
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [cooldownTimer])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() && !disabled && cooldownTimer === 0) {
      onSendMessage(message)
      setMessage('')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as any)
    }
  }

  const isDisabled = disabled || cooldownTimer > 0 || !message.trim()

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Cooldown Timer */}
      {cooldownTimer > 0 && (
        <div className="flex items-center justify-center p-3 bg-yellow-900/30 border border-yellow-700/50 rounded-lg backdrop-blur-sm">
          <svg className="w-5 h-5 text-yellow-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-yellow-200 text-sm font-medium">
            Please wait {cooldownTimer} second{cooldownTimer !== 1 ? 's' : ''} before sending another message
          </span>
        </div>
      )}



      {/* Message Input */}
      <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
        <div className="flex-1">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled || cooldownTimer > 0}
            className="input-field resize-none h-24 sm:h-20 w-full"
            maxLength={500}
          />
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs text-gray-400">
              {message.length}/500 characters
            </span>
            {cooldownTimer > 0 && (
              <span className="text-xs text-yellow-400 font-medium">
                Cooldown: {cooldownTimer}s
              </span>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={isDisabled}
          className={`w-full sm:w-auto h-24 sm:h-20 px-4 sm:px-6 rounded-lg font-medium transition-all duration-200 flex items-center justify-center border-2 ${
            isDisabled
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed border-gray-600'
              : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 border-blue-700'
          }`}
        >
          {disabled ? (
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2">
              <svg className="animate-spin h-5 w-5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-sm sm:text-base">Sending...</span>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2">
              <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              <span className="text-sm sm:text-base">Send</span>
            </div>
          )}
        </button>
      </div>

      {/* Info Text */}
      <div className="text-xs text-gray-400 text-center">
        💡 Messages are permanently stored on the blockchain • 
        ⚡ Gas fees apply • 
        🛡️ Anti-spam protection active
      </div>
    </form>
  )
}

export default MessageInput
