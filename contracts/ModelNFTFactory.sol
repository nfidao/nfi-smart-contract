// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./ModelNFT.sol";

contract ModelNFTFactory is OwnableUpgradeable {
    // Instantiate NFT contract
    ModelNFT private _modelNFT;

    mapping(string => address) public modelNFTs;

    // Event
    event NFTCreated(string indexed modelID, address modelNFTAddress);

    function initialize() public initializer {
        __Ownable_init_unchained();
    }

    /**
     * @dev Create new model NFT smart contract with parameters.
     * @param _modelName name of model.
     * @param _modelID ID of model.
     * @param _designer Address of designer.
     * @param _manager Address of manager.
     * @param _signer Address of signer for minting.
     * @param _mintLimit upper limit of minting.
     */
    function createModelNFT(
        string memory _modelName,
        string memory _modelID,
        address _designer,
        address _manager,
        address _signer,
        address _royaltyRegistry,
        uint256 _mintLimit
    ) external {
        require(_mintLimit > 0, "Invalid mint limit");
        require(modelNFTs[_modelID] == address(0), "Model ID has been used");

        _modelNFT = new ModelNFT(_modelName, _modelID, _mintLimit, _designer, _manager, _signer, _royaltyRegistry);

        modelNFTs[_modelID] = address(_modelNFT);

        emit NFTCreated(_modelID, address(_modelNFT));
    }
}
