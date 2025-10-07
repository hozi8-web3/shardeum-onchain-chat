'use client'

import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import contractABI from '../contracts/ShardeumChat.json'

interface GasEstimateProps {
  provider: ethers.BrowserProvider
}

const GasEstimate: React.FC<GasEstimateProps> = ({ provider }) => {
  const [gasEstimate, setGasEstimate] = useState<string>('0')
  const [gasPrice, setGasPrice] = useState<string>('0')
  const [totalCost, setTotalCost] = useState<string>('0')
  const [loading, setLoading] = useState(false)

  // Contract address - update this after deployment
  const CONTRACT_ADDRESS = '0x9b137bde888021ca8174ac2621a59b14afa4fee6'

  useEffect(() => {
    estimateGas()
  }, [provider])

  const estimateGas = async () => {
    try {
      setLoading(true)
      
      // Get gas price
      const feeData = await provider.getFeeData()
      const currentGasPrice = feeData.gasPrice || ethers.parseUnits('1', 'gwei')
      setGasPrice(ethers.formatUnits(currentGasPrice, 'gwei'))

      // Estimate gas for postMessage function
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI.abi, provider)
      const gasLimit = await contract.postMessage.estimateGas('Hello World!')
      
      setGasEstimate(gasLimit.toString())

      // Calculate total cost in SHM
      const totalCostWei = gasLimit * currentGasPrice
      const totalCostSHM = ethers.formatEther(totalCostWei)
      setTotalCost(totalCostSHM)

    } catch (error) {
      console.error('Error estimating gas:', error)
      // Set default values if estimation fails
      setGasEstimate('50000')
      setGasPrice('1')
      setTotalCost('0.00005')
    } finally {
      setLoading(false)
    }
  }

  const refreshEstimate = () => {
    estimateGas()
  }

  return (
    <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-4 backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 space-y-2 sm:space-y-0">
        <h3 className="text-sm font-medium text-blue-200 text-center sm:text-left">Gas Cost Estimate</h3>
        <button
          onClick={refreshEstimate}
          disabled={loading}
          className="text-blue-300 hover:text-blue-200 text-sm font-medium w-full sm:w-auto transition-colors"
        >
          {loading ? (
            <div className="flex items-center space-x-1">
              <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Updating...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh</span>
            </div>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-center">
        <div>
          <div className="text-xs text-blue-300 mb-1">Gas Limit</div>
          <div className="text-base sm:text-lg font-semibold text-blue-100">
            {loading ? '...' : Number(gasEstimate).toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-xs text-blue-300 mb-1">Gas Price</div>
          <div className="text-base sm:text-lg font-semibold text-blue-100">
            {loading ? '...' : `${gasPrice} Gwei`}
          </div>
        </div>
        <div>
          <div className="text-xs text-blue-300 mb-1">Total Cost</div>
          <div className="text-base sm:text-lg font-semibold text-blue-100">
            {loading ? '...' : `${totalCost} SHM`}
          </div>
        </div>
      </div>

      <div className="mt-3 text-xs text-blue-200 text-center px-2">
        💡 Estimated cost for sending a message • 
        ⚡ Actual cost may vary based on network conditions
      </div>
    </div>
  )
}

export default GasEstimate
