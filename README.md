# 🚀 ShardTalk

A **decentralized chat application** built on the **Shardeum Unstablenet** blockchain where all messages are permanently stored on-chain. This dApp demonstrates the power of blockchain technology for censorship-resistant, permanent communication.

![Shardeum Chat](https://img.shields.io/badge/Shardeum-Unstablenet-purple)
![Solidity](https://img.shields.io/badge/Solidity-0.8.19-blue)
![Next.js](https://img.shields.io/badge/Next.js-14.0.4-black)
![Ethers.js](https://img.shields.io/badge/Ethers.js-6.8.1-orange)

## ✨ Features

- 🔐 **Wallet Connect**: MetaMask integration for secure authentication
- 💬 **On-Chain Messages**: All messages stored permanently on the blockchain
- ⏱️ **Anti-Spam Protection**: 10-second cooldown between messages per address
- 📱 **Responsive UI**: Beautiful, modern interface built with TailwindCSS
- 🔄 **Pagination**: Load older messages with "Load More" functionality
- ⚡ **Gas Estimation**: Real-time gas cost estimates before sending messages
- 🎨 **Dynamic Avatars**: Unique avatars generated from wallet addresses
- 🛡️ **Input Sanitization**: Protection against harmful HTML content
- 📊 **Message History**: View all past messages from the blockchain
- 🔒 **Enterprise Security**: JWT authentication, API keys, rate limiting
- 🗄️ **MongoDB Integration**: Secure database with authentication and CORS protection
- 🚦 **Rate Limiting**: Protection against API abuse
- 🔑 **Role-Based Access**: Admin and user permission levels

## 🏗️ Architecture

### Smart Contract (`ShardeumChat.sol`)
- **Storage**: Messages stored in on-chain array with sender, timestamp, content, and ID
- **Anti-Spam**: Cooldown mechanism preventing rapid message posting
- **Events**: Emits events for message posting with full message details
- **Pagination**: Efficient message retrieval with start/count parameters

### Frontend (Next.js + React)
- **Wallet Integration**: MetaMask connection with network detection
- **Real-time Updates**: Live message loading and cooldown timers
- **Responsive Design**: Mobile-first approach with TailwindCSS
- **Type Safety**: Full TypeScript implementation

## 🔒 Security Features

ShardTalk includes enterprise-level security features:

### 🔐 Authentication & Authorization
- **JWT Token Authentication**: Secure token-based authentication for users
- **API Key Authentication**: Admin-level access using secure API keys
- **Role-based Access Control**: Different permission levels (user/admin)

### 🛡️ Protection Mechanisms
- **Rate Limiting**: Per-endpoint rate limits to prevent abuse
- **CORS Protection**: Origin validation for API access
- **Input Validation**: XSS prevention and data sanitization
- **MongoDB Security**: TLS encryption and connection optimization

### 📊 Protected Endpoints
- `GET /api/stats` - Application statistics (Admin only)
- `GET /api/users?page=1` - User listing (Admin only)
- `GET /api/admin/keys` - API key management (Admin only)

### 🔑 Access Methods
```bash
# JWT Token Authentication
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" http://localhost:3000/api/stats

# API Key Authentication
curl -H "X-API-Key: YOUR_API_KEY" http://localhost:3000/api/stats
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm/yarn
- MetaMask wallet extension
- Shardeum testnet SHM tokens for gas fees

### 1. Clone & Install
```bash
git clone <your-repo-url>
cd shardtalk
npm install
```

### 2. Security Setup
```bash
# Generate secure secrets
node scripts/generate-secrets.js

# Test the setup
node scripts/test-setup.js
```

### 3. Environment Setup
```bash
cp env.example .env.local
```

Edit `.env.local` and add your configuration:
```env
# Your wallet private key for contract deployment
PRIVATE_KEY=your_private_key_here

# Contract address (update after deployment)
NEXT_PUBLIC_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000

# Shardeum RPC URL
NEXT_PUBLIC_RPC_URL=https://api-unstable.shardeum.org

# Chain ID
NEXT_PUBLIC_CHAIN_ID=8080

# Explorer URL
NEXT_PUBLIC_EXPLORER_URL=https://explorer-unstable.shardeum.org
```

### 3. Deploy Smart Contract
```bash
# Compile contract
npm run compile

# Deploy to Shardeum Unstablenet
npm run deploy
```

**Important**: After deployment, update the contract address in:
- `.env.local`
- `contexts/ChatContext.tsx` (line 32)
- `components/GasEstimate.tsx` (line 20)

### 4. Run Frontend
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🔧 Configuration

### MetaMask Setup
1. Add Shardeum Unstablenet to MetaMask:
   - **Network Name**: Shardeum Unstablenet
   - **RPC URL**: `https://api-unstable.shardeum.org`
   - **Chain ID**: `8080`
   - **Currency Symbol**: `SHM`
   - **Block Explorer**: `https://explorer-unstable.shardeum.org`

2. Get testnet SHM tokens from the [Shardeum Faucet](https://faucet.shardeum.org/)

### Contract Verification
After deployment, verify your contract on the explorer:
```bash
npm run deploy
```

The deployment script will automatically attempt verification.

## 📱 Usage

### Connecting Wallet
1. Click "Connect Wallet" button
2. Approve MetaMask connection
3. Ensure you're on Shardeum Unstablenet network

### Sending Messages
1. Type your message (max 500 characters)
2. View gas cost estimate
3. Click "Send" and approve MetaMask transaction
4. Wait for blockchain confirmation

### Viewing Messages
- Messages load automatically with newest first
- Use "Load Older Messages" for pagination
- Scroll to bottom button appears when needed

## 🛠️ Development

### Project Structure
```
shardtalk/
├── contracts/           # Smart contracts
│   ├── ShardeumChat.sol
│   └── ShardeumChat.json
├── scripts/            # Deployment scripts
│   └── deploy.js
├── app/               # Next.js app directory
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/        # React components
│   ├── ChatInterface.tsx
│   ├── MessageInput.tsx
│   ├── MessageList.tsx
│   ├── MessageItem.tsx
│   ├── WalletConnect.tsx
│   └── GasEstimate.tsx
├── contexts/          # React contexts
│   └── ChatContext.tsx
├── types/             # TypeScript types
│   └── global.d.ts
└── hardhat.config.js  # Hardhat configuration
```

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run compile      # Compile smart contracts
npm run deploy       # Deploy to Shardeum
npm run test         # Run Hardhat tests
```

### Smart Contract Functions
- `postMessage(string content)`: Send a new message
- `getMessages(uint start, uint count)`: Retrieve paginated messages
- `getTotalMessageCount()`: Get total number of messages
- `getCooldownRemaining(address user)`: Check user's cooldown status

## 🌐 Deployment

### Vercel Deployment
1. Push code to GitHub
2. Connect repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy automatically on push

### Environment Variables for Production
```env
NEXT_PUBLIC_CONTRACT_ADDRESS=your_deployed_contract_address
NEXT_PUBLIC_RPC_URL=https://api-unstable.shardeum.org
NEXT_PUBLIC_CHAIN_ID=8080
NEXT_PUBLIC_EXPLORER_URL=https://explorer-unstable.shardeum.org
```

### Custom Domain
- Add custom domain in Vercel dashboard
- Update DNS records as instructed
- Enable HTTPS automatically

## 🔒 Security Features

- **Input Sanitization**: HTML entities escaped to prevent XSS
- **Anti-Spam**: Rate limiting per wallet address
- **Gas Estimation**: Transparent cost display
- **Wallet Validation**: Network and balance checks
- **Error Handling**: Graceful failure handling

## 🧪 Testing

### Smart Contract Tests
```bash
npm run test
```

### Frontend Testing
```bash
npm run lint
npm run build
```

## 📊 Gas Costs

Typical gas costs on Shardeum Unstablenet:
- **Message Posting**: ~50,000 gas
- **Gas Price**: ~1 Gwei
- **Total Cost**: ~0.00005 SHM per message

*Costs may vary based on network congestion*

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Shardeum Team** for the amazing blockchain infrastructure
- **Ethereum Community** for the Solidity language and tools
- **Next.js Team** for the excellent React framework
- **TailwindCSS** for the beautiful UI components

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/shardtalk/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/shardtalk/discussions)
- **Documentation**: [Project Wiki](https://github.com/yourusername/shardtalk/wiki)

## 🔮 Roadmap

- [ ] **ENS Integration**: Display ENS names instead of addresses
- [ ] **Message Encryption**: End-to-end encryption for private chats
- [ ] **File Sharing**: On-chain file storage and sharing
- [ ] **Chat Rooms**: Multiple themed chat rooms
- [ ] **Mobile App**: React Native mobile application
- [ ] **Push Notifications**: Real-time message notifications
- [ ] **Message Reactions**: Like, love, and react to messages
- [ ] **User Profiles**: Customizable user profiles and avatars

---

**Built with ❤️ for the decentralized future**

*Join the conversation on the blockchain! 🚀*