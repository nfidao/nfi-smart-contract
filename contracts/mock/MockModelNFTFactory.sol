// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "../ModelNFT.sol";

contract MockModelNFTFactory is OwnableUpgradeable {
    // Instantiate NFT contract
    ModelNFT private _modelNFT;

    // treasury account
    address payable private _royaltyReceiver;
    
    // Event 
    event NFTCreated(
        string modelID,
        address modelNFTAddress
    );

    function initialize(address receiver) public initializer {
        _royaltyReceiver = payable(receiver);
    }

    /**
    @dev Create new model NFT smart contract with parameters
    @param modelName name of model
    @param modelID ID of model
    @param designer Address of designer
    @param rate royalty fee rate
    @param mintLimit upper limit of minting
     */
    function createModelNFT(string memory modelName, string memory modelID, address designer, uint16 rate, uint256 mintLimit) external {
        require(mintLimit > 0,  "Incorrect mint limit.");
        require(rate < 1000, "Rate should be less than 1000.");

        _modelNFT = new ModelNFT(modelName, modelID, mintLimit, rate, designer, msg.sender, _royaltyReceiver);
        // modelNFTArray.push(modelNFT);
        emit NFTCreated(modelID, address(_modelNFT));
    }

    /**
    @dev Change platform account
    @param account wallet address or smart contract
    */
    function setRoyaltyReceiver(address account) external onlyOwner {
        require(account != address(0), "Address can't be zero.");

        _royaltyReceiver = payable(account);
    }

    function getRoyaltyReceiver() public view returns(address) {
        return _royaltyReceiver;
    }

    /**
    @dev test function for upgradeability
     */
    function customFunction ()
        public
        pure
        returns  (bool)
    {
        return true;
    }
}

