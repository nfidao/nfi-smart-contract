// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./ModelNFT.sol";

contract ModelNFTFactory is Ownable {
    // Instantiate NFT contract
    ModelNFT private _modelNFT;

    // Commission rate of platform
    uint96 private _royaltyRate = 500;    

    // platform account
    address payable private _royaltyReceiver;
    
    // Event 
    event NFTCreated(
        string modelID,
        address modelNFTAddress
    );

    constructor (address receiver) {
        _royaltyReceiver = payable(receiver);
    }

    /**
    @dev Create new model NFT smart contract with parameters
    @param modelName name of model
    @param modelID ID of model
    @param mintLimit upper limit of minting
     */
    function createModelNFT(string memory modelName, string memory modelID, uint256 mintLimit) external {
        require(mintLimit > 0,  "Incorrect mint limit.");

        _modelNFT = new ModelNFT(modelName, modelID, mintLimit, _royaltyRate, _royaltyReceiver);
        // modelNFTArray.push(modelNFT);
        emit NFTCreated(modelID, address(_modelNFT));
    }

    /**
    @dev Change platform service fee rate
    @param rate integer less than 1000
    */
    function setRoyaltyRate(uint96 rate) external onlyOwner {
        require(rate < 1000, "Rate should be less than 1000.");

        _royaltyRate = rate;
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

    function getRoyaltyRate() public view returns(uint96) {
        return _royaltyRate;
    }
}

