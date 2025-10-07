'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react'
import { ethers } from 'ethers'
import contractABI from '../contracts/ShardeumChat.json'

interface Message {
  sender: string
  timestamp: number
  content: string
  messageId: number
  isPending?: boolean
}

interface ChatContextType {
  messages: Message[]
  loading: boolean
  error: string | null
  sendMessage: (content: string) => Promise<void>
  loadMessages: (start?: number, count?: number) => Promise<void>
  loadMoreMessages: () => Promise<void>
  totalMessageCount: number
  hasMoreMessages: boolean
  cooldownRemaining: number
  checkCooldown: (address: string) => Promise<void>
  switchToShardeum: () => Promise<void>
  networkStatus: 'connected' | 'wrong-network' | 'disconnected' | 'checking'
  clearPendingMessages: () => void
  checkPendingMessages: () => Promise<void>
  refreshEventListeners: () => Promise<void>
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

// Contract address - you'll need to update this after deployment
const CONTRACT_ADDRESS = '0x9b137bde888021ca8174ac2621a59b14afa4fee6'

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalMessageCount, setTotalMessageCount] = useState(0)
  const [hasMoreMessages, setHasMoreMessages] = useState(true)
  const [cooldownRemaining, setCooldownRemaining] = useState(0)
  const [networkStatus, setNetworkStatus] = useState<'connected' | 'wrong-network' | 'disconnected' | 'checking'>('checking')
  
  // Refs to store event listeners and intervals for cleanup
  const eventListenerRef = useRef<any>(null)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const pendingCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const contractRef = useRef<ethers.Contract | null>(null)
  const providerRef = useRef<ethers.BrowserProvider | null>(null)

  const loadMessages = async (start: number = 0, count: number = 15, skipLoadingState: boolean = false) => {
    try {
      if (!skipLoadingState) {
        setLoading(true)
      }
      setError(null)

      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('MetaMask not installed')
      }

      const provider = new ethers.BrowserProvider(window.ethereum)
      providerRef.current = provider
      
      // Check network connection
      try {
        const network = await provider.getNetwork()
        if (network.chainId !== 8119n) {
          setNetworkStatus('wrong-network')
          throw new Error(`Please switch to Shardeum EVM Testnet (Chain ID: 8119). Current chain: ${network.chainId}`)
        }
        setNetworkStatus('connected')
      } catch (networkError) {
        setNetworkStatus('disconnected')
        throw new Error('Failed to connect to network. Please check your MetaMask connection.')
      }
      
      // Validate contract address
      if (!ethers.isAddress(CONTRACT_ADDRESS)) {
        throw new Error('Invalid contract address')
      }
      
      // Validate ABI
      if (!contractABI.abi || !Array.isArray(contractABI.abi)) {
        throw new Error('Invalid contract ABI')
      }
      
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI.abi, provider)
      contractRef.current = contract
      
      // Check if contract exists by calling a simple view function
      try {
        await contract.getTotalMessageCount()
      } catch (contractError: any) {
        if (contractError.code === 'CALL_EXCEPTION') {
          throw new Error('Contract not found at this address. Please check if the contract is deployed or if you\'re on the correct network.')
        }
        throw contractError
      }

      const messageCount = await contract.getTotalMessageCount()
      setTotalMessageCount(Number(messageCount))

      if (messageCount === 0) {
        setMessages([])
        setHasMoreMessages(false)
        return
      }

      // Calculate start index for newest messages first
      const actualStart = Math.max(0, Number(messageCount) - start - count)
      const actualCount = Math.min(count, Number(messageCount) - actualStart)

      if (actualCount <= 0) {
        setHasMoreMessages(false)
        return
      }

      const fetchedMessages = await contract.getMessages(actualStart, actualCount)
      
      const formattedMessages: Message[] = fetchedMessages.map((msg: any) => ({
        sender: msg.sender,
        timestamp: Number(msg.timestamp),
        content: msg.content,
        messageId: Number(msg.messageId)
      }))

      // Keep original order to show oldest first (like WhatsApp)
      const orderedMessages = formattedMessages

      if (start === 0) {
        // When loading fresh messages, clear any pending messages to prevent stuck loading states
        setMessages(orderedMessages)
      } else {
        // When loading more messages, append to existing messages but filter out pending ones
        setMessages(prev => {
          const nonPendingMessages = prev.filter(msg => !msg.isPending)
          return [...nonPendingMessages, ...orderedMessages]
        })
      }

      setHasMoreMessages(actualStart > 0)
    } catch (err: any) {
      console.error('Error loading messages:', err)
      
      // Handle specific RPC errors
      let errorMessage = 'Failed to load messages'
      
      if (err.code === 'NETWORK_ERROR' || err.message?.includes('network')) {
        errorMessage = 'Network error. Please check your internet connection and try again.'
      } else if (err.code === 'TIMEOUT') {
        errorMessage = 'Request timeout. The network may be congested. Please try again.'
      } else if (err.code === 'CALL_EXCEPTION') {
        errorMessage = 'Contract call failed. Please check if the contract is deployed and accessible.'
      } else if (err.message) {
        errorMessage = err.message
      }
      
      setError(errorMessage)
      // Clear any pending messages on error to prevent stuck states
      setMessages(prev => prev.filter(msg => !msg.isPending))
    } finally {
      setLoading(false)
    }
  }

  const loadMoreMessages = async () => {
    if (messages.length > 0 && !loading) {
      await loadMessages(messages.length, 15, false) // Use loading state for "load more"
    }
  }

  const sendMessage = async (content: string) => {
    let signerAddress: string = ''
    
    try {
      setLoading(true)
      setError(null)

      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('MetaMask not installed')
      }

      const provider = new ethers.BrowserProvider(window.ethereum)
      
      // Check network connection
      try {
        const network = await provider.getNetwork()
        if (network.chainId !== 8119n) {
          throw new Error(`Please switch to Shardeum EVM Testnet (Chain ID: 8119). Current chain: ${network.chainId}`)
        }
      } catch (networkError) {
        throw new Error('Failed to connect to network. Please check your MetaMask connection.')
      }
      
      const signer = await provider.getSigner()
      
      // Check if signer is connected
      if (!signer) {
        throw new Error('Failed to get signer. Please ensure your wallet is connected.')
      }
      
      // Get signer address to verify connection
      signerAddress = await signer.getAddress()
      if (!signerAddress || signerAddress === ethers.ZeroAddress) {
        throw new Error('Invalid signer address. Please reconnect your wallet.')
      }
      
      // Validate contract address
      if (!ethers.isAddress(CONTRACT_ADDRESS)) {
        throw new Error('Invalid contract address')
      }
      
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI.abi, signer)
      
      // Check if contract exists
      try {
        await contract.getTotalMessageCount()
      } catch (contractError: any) {
        if (contractError.code === 'CALL_EXCEPTION') {
          throw new Error('Contract not found at this address. Please check if the contract is deployed or if you\'re on the correct network.')
        }
        throw contractError
      }
      
      // Check if user has enough balance for gas fees
      const balance = await provider.getBalance(signerAddress)
      if (balance === 0n) {
        throw new Error('Insufficient balance for gas fees. Please ensure you have SHM tokens in your wallet.')
      }

      // Check cooldown before sending
      try {
        const cooldown = await contract.getCooldownRemaining(signerAddress)
        if (Number(cooldown) > 0) {
          throw new Error(`Please wait ${Number(cooldown)} seconds before sending another message`)
        }
      } catch (cooldownError: any) {
        if (cooldownError.code === 'CALL_EXCEPTION') {
          console.log('Cooldown check failed, assuming new user')
        } else {
          throw cooldownError
        }
      }

      // Optimistic update - add message immediately
      const optimisticMessage = {
        sender: signerAddress,
        timestamp: Math.floor(Date.now() / 1000),
        content: content,
        messageId: messages.length + totalMessageCount,
        isPending: true
      }
      
      setMessages(prev => [...prev, optimisticMessage])

      console.log('Sending message to contract:', CONTRACT_ADDRESS)
      console.log('Message content:', content)
      console.log('Signer address:', signerAddress)
      
      // Send transaction
      let tx
      try {
        tx = await contract.postMessage(content)
        console.log('Transaction hash:', tx.hash)
        // Log activity best-effort
        fetch('/api/activity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: signerAddress, type: 'send_message', metadata: { length: content.length } })
        }).catch(() => {})
      } catch (contractCallError: any) {
        console.error('Contract call failed:', contractCallError)
        
        // CRITICAL: Clear loading immediately on contract call failure
        setLoading(false)
        
        // Check if it's a user rejection
        if (contractCallError.code === 'USER_REJECTED_REQUEST' || contractCallError.code === 4001) {
          throw new Error('Transaction was rejected by user')
        }
        
        // Check if it's a network error
        if (contractCallError.code === 'NETWORK_ERROR' || contractCallError.message?.includes('network')) {
          throw new Error('Network error. Please check your connection and try again.')
        }
        
        // Check if it's a contract error
        if (contractCallError.code === 'CALL_EXCEPTION') {
          throw new Error('Contract call failed. Please check if the contract is deployed and accessible.')
        }
        
        throw contractCallError
      }
      
      // Wait for confirmation with timeout
      const receipt = await Promise.race([
        tx.wait(1),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Transaction confirmation timeout')), 60000)
        )
      ])
      console.log('Transaction receipt:', receipt)
      
      // CRITICAL FIX: Clear loading immediately after confirmation - BEFORE any other operations
      setLoading(false)
      
      // Update the optimistic message to confirmed immediately for instant feedback
      setMessages(prev => prev.map(msg => {
        if (msg.isPending && msg.sender === signerAddress && msg.content === content) {
          return { ...msg, isPending: false }
        }
        return msg
      }))
      
      // Get the actual message data from the blockchain after confirmation
      try {
        const newCount = await contract.getTotalMessageCount()
        setTotalMessageCount(Number(newCount))
        
        // Get the actual message from blockchain to update with correct messageId and timestamp
        const latestMessages = await contract.getMessages(Number(newCount) - 1, 1)
        if (latestMessages.length > 0) {
          const confirmedMsg = latestMessages[0]
          setMessages(prev => prev.map(msg => {
            if (!msg.isPending && msg.sender === signerAddress && msg.content === content) {
              return {
                sender: confirmedMsg.sender,
                timestamp: Number(confirmedMsg.timestamp),
                content: confirmedMsg.content,
                messageId: Number(confirmedMsg.messageId)
              }
            }
            return msg
          }))
        }
      } catch (updateError) {
        console.error('Error updating message details after confirmation:', updateError)
        // Don't throw error here, message is already confirmed and showing
      }
      
      console.log('✅ Message confirmed and loading state cleared!')
      
      // Don't reload messages here - let event listeners handle new messages
      // This prevents the "Loading messages..." spinner from appearing
      
    } catch (err: any) {
      console.error('Error sending message:', err)
      
      // CRITICAL: Always clear loading state on any error
      setLoading(false)
      
      let errorMessage = 'Failed to send message'
      
      if (err.message === 'Transaction confirmation timeout') {
        errorMessage = 'Transaction is taking longer than expected. Your message may still be processing.'
        // Keep the message visible but mark as unconfirmed for timeout cases
        setMessages(prev => prev.map(msg => {
          if (msg.isPending && msg.sender === signerAddress && msg.content === content) {
            return { ...msg, isPending: false } // Show as sent but unconfirmed
          }
          return msg
        }))
      } else {
        // For other errors, remove the optimistic message
        setMessages(prev => prev.filter(msg => !(msg.isPending && msg.sender === signerAddress && msg.content === content)))
      }
      
      if (err.code === 'CALL_EXCEPTION') {
        if (err.data) {
          try {
            const iface = new ethers.Interface(contractABI.abi)
            const decodedError = iface.parseError(err.data)
            if (decodedError) {
              if (decodedError.name === 'CooldownNotMet') {
                errorMessage = 'Please wait 10 seconds between messages (anti-spam protection)'
              } else {
                errorMessage = `Contract error: ${decodedError.name}`
              }
            } else {
              errorMessage = 'Contract call reverted. Please check if the contract is deployed and accessible.'
            }
          } catch (decodeError) {
            errorMessage = 'Contract call reverted. Please check if the contract is deployed and accessible.'
          }
        } else {
          errorMessage = 'Contract call reverted. This usually means the contract is not deployed at this address or there is a network issue.'
        }
      } else if (err.message) {
        errorMessage = err.message
      } else if (err.reason) {
        errorMessage = err.reason
      }
      
      setError(errorMessage)
    }
  }

  const checkCooldown = async (address: string) => {
    try {
      if (typeof window === 'undefined' || !window.ethereum) {
        return
      }

      const provider = new ethers.BrowserProvider(window.ethereum)
      
      // Check network connection
      try {
        const network = await provider.getNetwork()
        if (network.chainId !== 8119n) {
          return
        }
      } catch (networkError) {
        return
      }
      
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI.abi, provider)
      
      try {
        const cooldown = await contract.getCooldownRemaining(address)
        setCooldownRemaining(Number(cooldown))
      } catch (contractError: any) {
        if (contractError.code === 'CALL_EXCEPTION') {
          console.log('Cooldown check failed, user may be new or contract not accessible')
          setCooldownRemaining(0)
        } else if (contractError.code === 'NETWORK_ERROR' || contractError.code === 'TIMEOUT') {
          console.log('Network error during cooldown check, skipping')
          setCooldownRemaining(0)
        } else {
          console.error('Error checking cooldown:', contractError)
          setCooldownRemaining(0)
        }
      }
    } catch (err) {
      console.error('Error checking cooldown:', err)
      setCooldownRemaining(0)
    }
  }

  const switchToShardeum = async () => {
    try {
      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('MetaMask not installed')
      }

      // Request to switch to Shardeum EVM Testnet (Mezame)
      await window.ethereum!.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x1fbf' }], // 8119 in hex
      })
      
      setNetworkStatus('connected')
      setMessages(prev => prev.filter(msg => !msg.isPending))
      await loadMessages(0, 15, false) // Show loading for network switch
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        // Chain not added, add it
        try {
          await window.ethereum!.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x1fbf', // 8119 in hex
              chainName: 'Shardeum EVM Testnet',
              nativeCurrency: {
                name: 'SHM',
                symbol: 'SHM',
                decimals: 18,
              },
              rpcUrls: ['https://api-mezame.shardeum.org'],
              blockExplorerUrls: ['https://explorer-mezame.shardeum.org'],
            }],
          })
          setNetworkStatus('connected')
          setMessages(prev => prev.filter(msg => !msg.isPending))
          await loadMessages(0, 15, false) // Show loading for network add
        } catch (addError) {
          console.error('Failed to add Shardeum network:', addError)
          setNetworkStatus('wrong-network')
        }
      } else if (switchError.code === 'USER_REJECTED_REQUEST') {
        console.log('User rejected network switch request')
        setNetworkStatus('wrong-network')
      } else {
        console.error('Failed to switch to Shardeum network:', switchError)
        setNetworkStatus('wrong-network')
      }
    }
  }

  const clearPendingMessages = () => {
    setMessages(prev => prev.filter(msg => !msg.isPending))
  }

  const refreshEventListeners = async () => {
    console.log('Manually refreshing event listeners')
    await setupEventListeners()
  }

  const checkPendingMessages = async () => {
    try {
      if (typeof window === 'undefined' || !window.ethereum) {
        return
      }

      const provider = new ethers.BrowserProvider(window.ethereum)
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI.abi, provider)
      
      const totalCount = await contract.getTotalMessageCount()
      if (totalCount === 0) return
      
      const lastMessages = await contract.getMessages(Math.max(0, Number(totalCount) - 10), 10)
      
      setMessages(prev => {
        const updatedMessages = prev.map(msg => {
          if (msg.isPending) {
            const confirmedMessage = lastMessages.find(
              (blockchainMsg: any) => 
                blockchainMsg.sender.toLowerCase() === msg.sender.toLowerCase() &&
                blockchainMsg.content === msg.content
            )
            
            if (confirmedMessage) {
              return {
                ...msg,
                isPending: false,
                messageId: Number(confirmedMessage.messageId),
                timestamp: Number(confirmedMessage.timestamp)
              }
            }
          }
          return msg
        })
        
        return updatedMessages.filter(msg => {
          if (msg.isPending) {
            const messageAge = Math.floor(Date.now() / 1000) - msg.timestamp
            return messageAge < 300
          }
          return true
        })
      })
    } catch (error) {
      console.error('Error checking pending messages:', error)
    }
  }

  // CRITICAL FIX: Improved event listener setup for real-time updates
  const setupEventListeners = async () => {
    try {
      if (typeof window === 'undefined' || !window.ethereum) {
        console.log('Window or ethereum not available, skipping event listener setup')
        return
      }

      const provider = new ethers.BrowserProvider(window.ethereum)
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI.abi, provider)
      
      // Clear any existing event listeners
      if (eventListenerRef.current && contractRef.current) {
        try {
          contractRef.current.off('MessagePosted', eventListenerRef.current)
          console.log('Cleared existing event listener')
        } catch (error) {
          console.log('Error clearing existing event listener:', error)
        }
      }
      
      // Set up MessagePosted event listener with improved handling
      const handleMessagePosted = (sender: string, messageId: number, timestamp: number, content: string) => {
        console.log('🔥 MessagePosted event received:', { sender, messageId: Number(messageId), timestamp: Number(timestamp), content })
        
        const newMessage: Message = {
          sender: sender,
          timestamp: Number(timestamp),
          content: content,
          messageId: Number(messageId),
          isPending: false
        }
        
        setMessages(prev => {
          // Check if message already exists (avoid duplicates)
          const exists = prev.some(msg => 
            msg.messageId === Number(messageId) ||
            (msg.sender.toLowerCase() === sender.toLowerCase() && 
             msg.content === content && 
             Math.abs(msg.timestamp - Number(timestamp)) < 5)
          )
          
          if (!exists) {
            console.log('✅ Adding new message via event:', newMessage)
            // Update total count
            setTotalMessageCount(prevCount => Math.max(prevCount, Number(messageId) + 1))
            
            // Add new message and sort by messageId to maintain order
            const updatedMessages = [...prev, newMessage].sort((a, b) => a.messageId - b.messageId)
            return updatedMessages
          } else {
            console.log('⚠️ Message already exists, skipping:', newMessage)
          }
          
          return prev
        })
      }
      
      // Listen for MessagePosted events
      contract.on('MessagePosted', handleMessagePosted)
      eventListenerRef.current = handleMessagePosted
      contractRef.current = contract
      
      console.log('🚀 Event listener set up successfully for MessagePosted events')
      
      // Verify the event listener is properly attached
      const eventCount = contract.listenerCount('MessagePosted')
      console.log('📡 Current MessagePosted event listeners:', eventCount)
      
    } catch (error) {
      console.error('❌ Error setting up event listeners:', error)
    }
  }

  // CRITICAL FIX: Enhanced polling for new users and backup
  const setupPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
    }
    
    console.log('⏰ Setting up enhanced polling every 3 seconds')
    
    pollingIntervalRef.current = setInterval(async () => {
      try {
        if (typeof window === 'undefined' || !window.ethereum || networkStatus !== 'connected') {
          return
        }

        const provider = new ethers.BrowserProvider(window.ethereum)
        const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI.abi, provider)
        
        // Get current message count
        const currentCount = await contract.getTotalMessageCount()
        
        // If we have new messages, fetch and add them
        if (Number(currentCount) > totalMessageCount) {
          const newMessageCount = Number(currentCount) - totalMessageCount
          console.log(`📥 Polling found ${newMessageCount} new messages`)
          
          // Get the new messages without showing loading spinner
          try {
            const provider = new ethers.BrowserProvider(window.ethereum)
            const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI.abi, provider)
            const newMessages = await contract.getMessages(totalMessageCount, newMessageCount)
            
            const formattedNewMessages: Message[] = newMessages.map((msg: any) => ({
              sender: msg.sender,
              timestamp: Number(msg.timestamp),
              content: msg.content,
              messageId: Number(msg.messageId)
            }))
            
            setMessages(prev => {
              // Filter out messages we already have
              const existingMessageIds = new Set(prev.map(msg => msg.messageId))
              const trulyNewMessages = formattedNewMessages.filter(msg => !existingMessageIds.has(msg.messageId))
              
              if (trulyNewMessages.length > 0) {
                console.log('✅ New messages added via polling:', trulyNewMessages.length)
                // Sort messages by messageId to maintain order
                const updatedMessages = [...prev, ...trulyNewMessages].sort((a, b) => a.messageId - b.messageId)
                return updatedMessages
              }
              
              return prev
            })
            
            // Update total count
            setTotalMessageCount(Number(currentCount))
          } catch (pollingError) {
            console.error('Error fetching new messages via polling:', pollingError)
          }
        }
      } catch (error) {
        console.error('❌ Error during polling:', error)
      }
    }, 3000) // Poll every 3 seconds for faster updates
  }

  // Initialize chat with improved real-time capabilities
  useEffect(() => {
    const initializeChat = async () => {
      console.log('🚀 Initializing chat with real-time capabilities...')
      
      // Load initial messages
      await loadMessages()
      
      // Set up event listeners for real-time updates (priority #1)
      await setupEventListeners()
      
      // Set up polling as backup (priority #2)
      setupPolling()
      
      // Check for any pending messages
      await checkPendingMessages()
      
      // Set up periodic check for pending messages
      pendingCheckIntervalRef.current = setInterval(() => {
        checkPendingMessages()
      }, 10000)
      
      console.log('✅ Chat initialization complete!')
    }
    
    initializeChat()

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up chat context...')
      
      // Clear event listeners
      if (eventListenerRef.current && contractRef.current) {
        try {
          contractRef.current.off('MessagePosted', eventListenerRef.current)
          console.log('✅ Event listeners cleared')
        } catch (error) {
          console.error('❌ Error clearing event listeners:', error)
        }
      }
      
      // Clear intervals
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        console.log('✅ Polling interval cleared')
      }
      if (pendingCheckIntervalRef.current) {
        clearInterval(pendingCheckIntervalRef.current)
        console.log('✅ Pending check interval cleared')
      }
      
      clearPendingMessages()
    }
  }, [])

  // Handle network status changes
  useEffect(() => {
    if (networkStatus === 'wrong-network' || networkStatus === 'disconnected') {
      clearPendingMessages()
      // Clear event listeners when network is wrong/disconnected
      if (eventListenerRef.current && contractRef.current) {
        try {
          contractRef.current.off('MessagePosted', eventListenerRef.current)
          eventListenerRef.current = null
          contractRef.current = null
        } catch (error) {
          console.error('Error clearing event listeners on network change:', error)
        }
      }
    } else if (networkStatus === 'connected') {
      // Re-setup event listeners when network is connected
      console.log('🌐 Network connected, setting up event listeners')
      setTimeout(() => setupEventListeners(), 1000) // Small delay to ensure connection is stable
      // Don't reload messages here - let the initial load handle it
    }
  }, [networkStatus])

  const value: ChatContextType = {
    messages,
    loading,
    error,
    sendMessage,
    loadMessages,
    loadMoreMessages,
    totalMessageCount,
    hasMoreMessages,
    cooldownRemaining,
    checkCooldown,
    switchToShardeum,
    networkStatus,
    clearPendingMessages,
    checkPendingMessages,
    refreshEventListeners,
  }

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  )
}

export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext)
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider')
  }
  return context
}