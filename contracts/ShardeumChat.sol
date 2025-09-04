// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract ShardeumChat {
    struct Message {
        address sender;
        uint256 timestamp;
        string content;
        uint256 messageId;
    }
    
    Message[] public messages;
    mapping(address => uint256) public lastMessageTime;
    uint256 public constant COOLDOWN_PERIOD = 10; // 10 seconds between messages
    
    event MessagePosted(
        address indexed sender,
        uint256 indexed messageId,
        uint256 timestamp,
        string content
    );
    
    error CooldownNotMet();
    error EmptyMessage();
    error MessageTooLong();
    
    modifier cooldownCheck() {
        // Check if user has sent a message before
        if (lastMessageTime[msg.sender] != 0) {
            // If they have sent a message before, check cooldown
            if (lastMessageTime[msg.sender] + COOLDOWN_PERIOD > block.timestamp) {
                revert CooldownNotMet();
            }
        }
        // If lastMessageTime is 0, user has never sent a message, so no cooldown
        _;
    }
    
    function postMessage(string calldata _content) external cooldownCheck {
        if (bytes(_content).length == 0) {
            revert EmptyMessage();
        }
        
        if (bytes(_content).length > 500) {
            revert MessageTooLong();
        }
        
        uint256 messageId = messages.length;
        Message memory newMessage = Message({
            sender: msg.sender,
            timestamp: block.timestamp,
            content: _content,
            messageId: messageId
        });
        
        messages.push(newMessage);
        lastMessageTime[msg.sender] = block.timestamp;
        
        emit MessagePosted(msg.sender, messageId, block.timestamp, _content);
    }
    
    function getMessages(uint256 _start, uint256 _count) external view returns (Message[] memory) {
        uint256 totalMessages = messages.length;
        
        if (_start >= totalMessages) {
            return new Message[](0);
        }
        
        uint256 end = _start + _count;
        if (end > totalMessages) {
            end = totalMessages;
        }
        
        uint256 resultCount = end - _start;
        Message[] memory result = new Message[](resultCount);
        
        for (uint256 i = 0; i < resultCount; i++) {
            result[i] = messages[_start + i];
        }
        
        return result;
    }
    
    function getTotalMessageCount() external view returns (uint256) {
        return messages.length;
    }
    
    function getLastMessageTime(address _user) external view returns (uint256) {
        return lastMessageTime[_user];
    }
    
    function getCooldownRemaining(address _user) external view returns (uint256) {
        // If user has never sent a message, lastMessageTime will be 0
        if (lastMessageTime[_user] == 0) {
            return 0; // No cooldown for new users
        }
        
        uint256 timeSinceLastMessage = block.timestamp - lastMessageTime[_user];
        if (timeSinceLastMessage >= COOLDOWN_PERIOD) {
            return 0;
        }
        return COOLDOWN_PERIOD - timeSinceLastMessage;
    }
}
