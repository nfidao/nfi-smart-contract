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
    event NFTCreated(string modelID, address modelNFTAddress);

    function initialize(address receiver) public initializer {
        _royaltyReceiver = payable(receiver);
    }

    /**
     * @dev Create new model NFT smart contract with parameters.
     * @param _modelName name of model.
     * @param _modelID ID of model.
     * @param _rate royalty fee rate.
     * @param _designer Address of designer.
     * @param _manager Address of manager.
     * @param _signer Address of signer for minting.
     * @param _mintLimit upper limit of minting.
     */
    function createModelNFT(
        string memory _modelName,
        string memory _modelID,
        uint96 _rate,
        address _designer,
        address _manager,
        address _signer,
        uint256 _mintLimit
    ) external {
        require(_mintLimit > 0, "Incorrect mint limit.");
        require(_rate < 1000, "Rate should be less than 1000.");

        _modelNFT = new ModelNFT(
            _modelName,
            _modelID,
            _mintLimit,
            _rate,
            _designer,
            _manager,
            _signer,
            _royaltyReceiver
        );
        // modelNFTArray.push(modelNFT);
        emit NFTCreated(_modelID, address(_modelNFT));
    }

    /**
    @dev Change platform account
    @param account wallet address or smart contract
    */
    function setRoyaltyReceiver(address account) external onlyOwner {
        require(account != address(0), "Address can't be zero.");

        _royaltyReceiver = payable(account);
    }

    function getRoyaltyReceiver() public view returns (address) {
        return _royaltyReceiver;
    }

    /**
    @dev test function for upgradeability
     */
    function customFunction() public pure returns (bool) {
        return true;
    }
}
