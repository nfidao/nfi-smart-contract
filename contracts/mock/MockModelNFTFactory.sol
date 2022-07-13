// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "../ModelNFT.sol";

contract MockModelNFTFactory is OwnableUpgradeable {
    // Instantiate NFT contract
    ModelNFT private _modelNFT;

    // Event
    event NFTCreated(string modelID, address modelNFTAddress);

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
        uint96 _rate,
        address _designer,
        address _manager,
        address _signer,
        address _royaltyRegistry,
        uint256 _mintLimit
    ) external {
        require(_mintLimit > 0, "Incorrect mint limit.");
        require(_rate < 1000, "Rate should be less than 1000.");

        _modelNFT = new ModelNFT(_modelName, _modelID, _mintLimit, _designer, _manager, _signer, _royaltyRegistry);
        // modelNFTArray.push(modelNFT);
        emit NFTCreated(_modelID, address(_modelNFT));
    }

    /**
    @dev test function for upgradeability
     */
    function customFunction() public pure returns (bool) {
        return true;
    }
}
