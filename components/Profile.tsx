'use client'

import { useState, useEffect } from 'react'
import { ethers } from 'ethers'

interface ProfileProps {
  account: string
  onUsernameChange: (username: string) => void
  onDisconnect?: () => void
  forceEdit?: boolean
  onClose?: () => void
}

const Profile: React.FC<ProfileProps> = ({ account, onUsernameChange, onDisconnect, forceEdit, onClose }) => {
  const [username, setUsername] = useState('')
  const [isEditing, setIsEditing] = useState(!!forceEdit)
  const [tempUsername, setTempUsername] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Load username from backend on mount
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/users?address=${account.toLowerCase()}`, { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          const u = data?.user
          if (u?.username) {
            setUsername(u.username)
            onUsernameChange(u.username)
          }
        }
      } catch (e) {
        console.error('Failed to load username', e)
      }
    }
    load()
    // Listen for edit requests from parent UI
    const handleEdit = (e: Event) => {
      const detail = (e as CustomEvent).detail as { username?: string }
      setTempUsername(detail?.username || username)
      setIsEditing(true)
    }
    window.addEventListener('editUsername', handleEdit as EventListener)
    return () => window.removeEventListener('editUsername', handleEdit as EventListener)
  }, [account, onUsernameChange])

  const handleSaveUsername = async () => {
    if (!tempUsername.trim()) return
    
    setIsLoading(true)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: account, username: tempUsername.trim() })
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'Failed to save username')
      }
      setUsername(tempUsername.trim())
      onUsernameChange(tempUsername.trim())
      setIsEditing(false)
      setTempUsername('')
      if (onClose) onClose()
      // log activity
      fetch('/api/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: account, type: 'update_username', metadata: { username: tempUsername.trim() } })
      }).catch(() => {})
    } catch (error) {
      console.error('Error saving username:', error)
      alert((error as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setTempUsername('')
    if (onClose) onClose()
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
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

  if (isEditing) {
    return (
      <div className="bg-gray-800/60 backdrop-blur-sm rounded-lg p-3 border border-gray-600/50 shadow-lg absolute top-full right-0 mt-2 z-50 min-w-64">
        <div className="space-y-3">
          <div className="text-center">
            <h3 className="text-sm font-medium text-gray-200 mb-2">Set Your Username</h3>
            <p className="text-xs text-gray-400">Choose a unique username to display in chat</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className={`w-8 h-8 rounded-full ${getAvatarColor(account)} flex items-center justify-center text-white text-xs font-bold shadow-lg`}>
              {account.slice(2, 4).toUpperCase()}
            </div>
            
            <div className="flex-1">
              <input
                type="text"
                value={tempUsername}
                onChange={(e) => setTempUsername(e.target.value)}
                placeholder="Enter username..."
                className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-100 placeholder-gray-400 text-sm"
                maxLength={20}
                autoFocus
              />
              <div className="text-xs text-gray-400 mt-1">
                {tempUsername.length}/20 characters
              </div>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={handleSaveUsername}
              disabled={!tempUsername.trim() || isLoading}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-xs font-medium py-1.5 px-2 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Saving...' : 'Save Username'}
            </button>
            <button
              onClick={handleCancel}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-medium py-1.5 px-2 rounded-lg transition-colors duration-200"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-800/40 backdrop-blur-sm rounded-lg px-3 py-2 border border-gray-600/30 shadow-lg hover:bg-gray-800/60 transition-all duration-200 relative">
      <div className="flex items-center space-x-2">
        <div className={`w-8 h-8 rounded-full ${getAvatarColor(account)} flex items-center justify-center text-white text-xs font-bold shadow-lg`}>
          {account.slice(2, 4).toUpperCase()}
        </div>
        
        <div>
          {username ? (
            <div className="text-sm font-medium text-gray-200">{username}</div>
          ) : (
            <div className="text-sm font-medium text-gray-400">No username</div>
          )}
          <div className="text-xs text-gray-500 font-mono">
            {formatAddress(account)}
          </div>
        </div>
        
        <div className="flex items-center space-x-1">
          <button
            onClick={() => {
              setTempUsername(username)
              setIsEditing(true)
            }}
            className="text-blue-400 hover:text-blue-300 transition-colors p-1 rounded hover:bg-gray-700/50"
            title="Edit Username"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          
          {onDisconnect && (
            <button
              onClick={onDisconnect}
              className="text-gray-400 hover:text-red-400 transition-colors p-1 rounded hover:bg-gray-700/50"
              title="Disconnect"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default Profile
