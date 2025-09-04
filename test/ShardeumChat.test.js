const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ShardeumChat", function () {
  let ShardeumChat;
  let shardeumChat;
  let owner;
  let user1;
  let user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    
    ShardeumChat = await ethers.getContractFactory("ShardeumChat");
    shardeumChat = await ShardeumChat.deploy();
    await shardeumChat.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      expect(await shardeumChat.getAddress()).to.not.equal(ethers.ZeroAddress);
    });

    it("Should start with 0 messages", async function () {
      expect(await shardeumChat.getTotalMessageCount()).to.equal(0);
    });
  });

  describe("Message Posting", function () {
    it("Should allow posting a message", async function () {
      const message = "Hello, Shardeum!";
      
      await expect(shardeumChat.connect(user1).postMessage(message))
        .to.emit(shardeumChat, "MessagePosted")
        .withArgs(user1.address, 0, await time(), message);
      
      expect(await shardeumChat.getTotalMessageCount()).to.equal(1);
    });

    it("Should prevent empty messages", async function () {
      await expect(shardeumChat.connect(user1).postMessage(""))
        .to.be.revertedWithCustomError(shardeumChat, "EmptyMessage");
    });

    it("Should prevent messages longer than 500 characters", async function () {
      const longMessage = "a".repeat(501);
      
      await expect(shardeumChat.connect(user1).postMessage(longMessage))
        .to.be.revertedWithCustomError(shardeumChat, "MessageTooLong");
    });

    it("Should enforce cooldown period", async function () {
      const message1 = "First message";
      const message2 = "Second message";
      
      // Post first message
      await shardeumChat.connect(user1).postMessage(message1);
      
      // Try to post second message immediately (should fail)
      await expect(shardeumChat.connect(user1).postMessage(message2))
        .to.be.revertedWithCustomError(shardeumChat, "CooldownNotMet");
    });
  });

  describe("Message Retrieval", function () {
    beforeEach(async function () {
      // Post some test messages
      await shardeumChat.connect(user1).postMessage("Message 1");
      await shardeumChat.connect(user2).postMessage("Message 2");
      await shardeumChat.connect(user1).postMessage("Message 3");
    });

    it("Should return correct total message count", async function () {
      expect(await shardeumChat.getTotalMessageCount()).to.equal(3);
    });

    it("Should retrieve messages with pagination", async function () {
      const messages = await shardeumChat.getMessages(0, 2);
      expect(messages.length).to.equal(2);
      expect(messages[0].content).to.equal("Message 1");
      expect(messages[1].content).to.equal("Message 2");
    });

    it("Should handle pagination boundaries", async function () {
      const messages = await shardeumChat.getMessages(2, 5);
      expect(messages.length).to.equal(1);
      expect(messages[0].content).to.equal("Message 3");
    });
  });

  describe("Cooldown Management", function () {
    it("Should track last message time", async function () {
      const message = "Test message";
      await shardeumChat.connect(user1).postMessage(message);
      
      const lastMessageTime = await shardeumChat.getLastMessageTime(user1.address);
      expect(lastMessageTime).to.be.gt(0);
    });

    it("Should calculate cooldown remaining", async function () {
      const message = "Test message";
      await shardeumChat.connect(user1).postMessage(message);
      
      const cooldownRemaining = await shardeumChat.getCooldownRemaining(user1.address);
      expect(cooldownRemaining).to.be.gt(0);
      expect(cooldownRemaining).to.be.lte(10);
    });

    it("Should return 0 cooldown after waiting", async function () {
      const message = "Test message";
      await shardeumChat.connect(user1).postMessage(message);
      
      // Fast forward time by 11 seconds
      await ethers.provider.send("evm_increaseTime", [11]);
      await ethers.provider.send("evm_mine");
      
      const cooldownRemaining = await shardeumChat.getCooldownRemaining(user1.address);
      expect(cooldownRemaining).to.equal(0);
    });
  });
});

// Helper function to get current block timestamp
async function time() {
  const blockNum = await ethers.provider.getBlockNumber();
  const block = await ethers.provider.getBlock(blockNum);
  return block.timestamp;
}
