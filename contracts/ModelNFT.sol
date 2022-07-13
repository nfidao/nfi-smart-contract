// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "erc721a/contracts/ERC721A.sol";

// @author DeDe
contract ModelNFT is ERC721A, ERC2981 {
    using ECDSA for bytes32;

    /// @notice max limit of minting.
    uint256 public mintLimit;

    // Override the base token URI
    string private _baseURIPrefix;

    /// @notice the attached designer address to this collection.
    address public designer;

    /// @notice the authorized address who can change some configuration.
    address public manager;

    /// @dev authorized address who can sign the arbitrary data to allow minting.
    address public authorizedSignerAddress;

    /// @dev dedicated to restrict one time minting per address.
    mapping(address => bool) public isAddressMinted;

    /// @dev dedicated to store the token URI if base URI is not defined.
    mapping(uint256 => string) public tokenURIs;

    event AuthorizedSignerAddressUpdated(address indexed _sender, address _oldAddress, address _newAddress);
    event URIUpdated(address indexed _sender, string _oldURI, string _newURI);
    event DesignerUpdated(address indexed _sender, address _oldAddress, address _newAddress);
    event ManagerUpdated(address indexed _sender, address _oldAddress, address _newAddress);

    modifier onlyDesigner() {
        require(msg.sender == designer, "Unathorized");
        _;
    }

    modifier onlyManager() {
        require(msg.sender == manager, "Unauthorized");
        _;
    }

    /**
     * @dev _rate is put in the 4th position to optimize the gas limit, as in its slot will be packed to the _designer address'
     *
     * @param _name token Name.
     * @param _symbol token Symbol.
     * @param _limit max mint limit.
     * @param _rate royalty amount percentages.
     * @param _designer designer address.
     * @param _manager manager address.
     * @param _authorizedSignerAddress signer address.
     * @param _royaltyReceiver royalty receiver address.
     */
    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _limit,
        uint96 _rate,
        address _designer,
        address _manager,
        address _authorizedSignerAddress,
        address payable _royaltyReceiver
    ) ERC721A(_name, _symbol) {
        mintLimit = _limit;
        designer = _designer;
        manager = _manager;
        authorizedSignerAddress = _authorizedSignerAddress;

        _setDefaultRoyalty(_royaltyReceiver, _rate);
    }

    /**
     * @dev override ERC721A tokenURI() function.
     *
     * @param _tokenId token id.
     *
     * @return uri string.
     */
    function tokenURI(uint256 _tokenId) public view virtual override returns (string memory) {
        require(_exists(_tokenId), "Token does not exist");

        string memory _tokenURI = tokenURIs[_tokenId];
        string memory _base = _baseURI();

        // If there is no base URI, return the token URI.
        if (bytes(_base).length == 0) {
            return _tokenURI;
        }

        // If both are set, concatenate the baseURI and associated tokenURI.
        if (bytes(_tokenURI).length > 0) {
            return string(abi.encodePacked(_base, _tokenURI));
        }

        return super.tokenURI(_tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721A, ERC2981) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @dev Getter for the base URI.
     *
     * @return base URI of the NFT.
     */
    function baseURI() external view returns (string memory) {
        return _baseURI();
    }

    /**
     * @dev Only owner can migrate base URI
     *
     * @param _newBaseURI new base URi
     */
    function setBaseURI(string memory _newBaseURI) external onlyManager {
        string memory _oldUri = _baseURIPrefix;
        _baseURIPrefix = _newBaseURI;
        emit URIUpdated(msg.sender, _oldUri, _baseURIPrefix);
    }

    /**
     * @dev Update the authorized signer address.
     *
     * @param _signerAddress new authorized signer address.
     */
    function changeAuthorizedSignerAddress(address _signerAddress) external onlyManager {
        require(_signerAddress != address(0), "Invalid address");
        address oldSignerAddress = authorizedSignerAddress;
        authorizedSignerAddress = _signerAddress;
        emit AuthorizedSignerAddressUpdated(msg.sender, oldSignerAddress, authorizedSignerAddress);
    }

    /**
     * @dev Everybody who has the match salt & signature from signer address, can mint the NFT.
     *
     * @param _to receiver address of minted token.
     * @param _uri uri that will be associated to the minted token id.
     * @param _signature signature from authorized signer address.
     */
    function mint(
        address _to,
        string memory _uri,
        bytes calldata _signature
    ) external {
        require(!isAddressMinted[msg.sender], "Address has been used");

        require(
            _isValidSignature(keccak256(abi.encodePacked(msg.sender, _uri, address(this))), _signature),
            "Invalid signature"
        );

        uint256 _totalSupply = totalSupply();

        // check if minting is possible
        require(_totalSupply < mintLimit, "Maximum limit has been reached");

        // Mark address for minting
        isAddressMinted[msg.sender] = true;

        // set token uri
        _setTokenURI(_totalSupply, _uri);

        // mint a token using erc721a
        _safeMint(_to, 1);
    }

    /**
     * @notice Setter for designer address.
     * @dev Can be called only by the current designer.
     *
     * @param _designer new designer address.
     */
    function setDesigner(address _designer) external onlyDesigner {
        require(_designer != address(0), "Invalid address");
        address oldDesignerAddress = designer;
        designer = _designer;

        emit DesignerUpdated(msg.sender, oldDesignerAddress, designer);
    }

    /**
     * @notice Setter for manager address.
     * @dev Can be called only by the current manager.
     *
     * @param _manager new manager address.
     */
    function setManager(address _manager) external onlyManager {
        require(_manager != address(0), "Invalid address");
        address oldManagerAddress = manager;
        manager = _manager;

        emit ManagerUpdated(msg.sender, oldManagerAddress, manager);
    }

    /// @todo need to remove this and implement the royalty registry.
    /**
    @notice Sets the contract-wide royalty info.
     */
    function setRoyaltyInfo(address _receiver, uint96 _feeBasisPoints) external onlyManager {
        _setDefaultRoyalty(_receiver, _feeBasisPoints);
    }

    /**
     * @dev Verify hashed data.
     * @param _hash Hashed data bundle
     * @param _signature Signature to check hash against
     * @return bool Is signature valid or not
     */
    function _isValidSignature(bytes32 _hash, bytes memory _signature) internal view returns (bool) {
        require(authorizedSignerAddress != address(0), "Invalid signer addr");
        bytes32 signedHash = _hash.toEthSignedMessageHash();
        return signedHash.recover(_signature) == authorizedSignerAddress;
    }

    /**
     * @return base uri that is set in the storage.
     */
    function _baseURI() internal view override returns (string memory) {
        return _baseURIPrefix;
    }

    /**
     * @dev Define _setTokenURI() function similar to ERC721URIStorage
     *
     * @param _tokenId token id.
     * @param _tokenURI token uri that will be associated to the token id.
     */
    function _setTokenURI(uint256 _tokenId, string memory _tokenURI) private {
        require(_exists(_tokenId), "Token does not exist");
        tokenURIs[_tokenId] = _tokenURI;
    }
}
