// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./ModelNFT.sol";
import "./interfaces/IRoyaltyRegistry.sol";

contract ModelNFTFactory is OwnableUpgradeable {
    // Instantiate NFT contract
    ModelNFT private _modelNFT;

    mapping(string => address) public modelNFTs;

    /// @dev royalty registry address that store the royalty info.
    IRoyaltyRegistry public factoryRoyaltyRegistry;

    // Event
    event NFTCreated(string indexed modelID, address modelNFTAddress);
    event RoyaltyRegistryUpdated(address indexed _sender, address _oldAddress, address _newAddress);

    /**
     * @dev initialization function for proxy.
     *
     * @param _royaltyRegistry royalty registry address.
     */
    function initialize(address _royaltyRegistry) public initializer {
        require(_royaltyRegistry != address(0), "Invalid royalty address");
        factoryRoyaltyRegistry = IRoyaltyRegistry(_royaltyRegistry);
        __Ownable_init_unchained();
    }

    /**
     * @dev Update the royalty registry address.
     *
     * @param _royaltyRegistry new royalty registry address.
     */
    function changeFactoryRoyaltyRegistry(address _royaltyRegistry) external onlyOwner {
        require(_royaltyRegistry != address(0), "Invalid address");
        address oldRoyaltyRegistry = address(factoryRoyaltyRegistry);
        factoryRoyaltyRegistry = IRoyaltyRegistry(_royaltyRegistry);
        emit RoyaltyRegistryUpdated(msg.sender, oldRoyaltyRegistry, address(factoryRoyaltyRegistry));
    }

    /**
     * @dev Create new model NFT smart contract with parameters.
     * @param _modelName name of model.
     * @param _modelID ID of model.
     * @param _designer Address of designer.
     * @param _manager Address of manager.
     * @param _signer Address of signer for minting.
     * @param _royaltyReceiver Address of royalty receiver.
     * @param _royaltyRate royalty Rate
     * @param _mintLimit upper limit of minting.
     */
    function createModelNFT(
        string memory _modelName,
        string memory _modelID,
        address _designer,
        address _manager,
        address _signer,
        address _royaltyReceiver,
        uint96 _royaltyRate,
        uint256 _mintLimit
    ) external {
        require(_mintLimit > 0, "Invalid mint limit");
        require(modelNFTs[_modelID] == address(0), "Model ID has been used");

        _modelNFT = new ModelNFT(
            _modelName,
            _modelID,
            _mintLimit,
            _designer,
            _manager,
            _signer,
            address(factoryRoyaltyRegistry)
        );

        factoryRoyaltyRegistry.setRoyaltyRateForCollection(address(_modelNFT), _royaltyRate, _royaltyReceiver);

        modelNFTs[_modelID] = address(_modelNFT);

        emit NFTCreated(_modelID, address(_modelNFT));
    }
}
