const hre = require("hardhat");

async function main() {
  console.log("Deploying ShardeumChat contract...");
  
  // Check if we have a private key
  if (!process.env.PRIVATE_KEY) {
    throw new Error("Please set PRIVATE_KEY in your .env.local file");
  }
  
  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  
  if (!deployer) {
    throw new Error("No deployer account found. Check your Hardhat configuration.");
  }
  
  console.log("Deploying contracts with account:", deployer.address);
  
  // Check balance
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");
  
  if (balance === 0n) {
    throw new Error("Account has no balance. Please fund your account with some SHM tokens.");
  }
  
  const ShardeumChat = await hre.ethers.getContractFactory("ShardeumChat");
  const chatContract = await ShardeumChat.deploy();
  
  await chatContract.waitForDeployment();
  
  const contractAddress = await chatContract.getAddress();
  
  console.log("ShardeumChat deployed to:", contractAddress);
  console.log("Network:", hre.network.name);
  console.log("Explorer URL:", `https://explorer-mezame.shardeum.org/address/${contractAddress}`);
  
  // Verify the contract on explorer
  if (hre.network.name === "shardeum") {
    console.log("Waiting for block confirmations...");
    await chatContract.deploymentTransaction().wait(2); // Reduced from 6 to 2 confirmations
    
    try {
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [],
      });
      console.log("Contract verified on explorer");
    } catch (error) {
      console.log("Verification failed:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
