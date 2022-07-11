// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "erc721a/contracts/ERC721A.sol";

// @author DeDe
contract ModelNFT is ERC721A, ERC2981 {
    uint256 public mintLimit;

    address public designer;

    address public manager;

    mapping(uint256 => string) public tokenURIs;

    modifier onlyDesigner() {
        require(msg.sender == designer, "Unathorized");
        _;
    }

    modifier onlyManager() {
        require(msg.sender == manager, "Unauthorized");
        _;
    }

    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _limit,
        uint96 _rate,
        address _designer,
        address _manager,
        address payable _royaltyReceiver
    ) ERC721A(_name, _symbol) {
        mintLimit = _limit;
        designer = _designer;
        manager = _manager;

        _setDefaultRoyalty(_royaltyReceiver, _rate);
    }

    /**
    @dev Everybody can mint NFT
     */
    function mint(address to, string memory uri) public {
        // check if minting is possible
        require(totalSupply() <= mintLimit, "Maximum limit has been reached");

        // mint a token using erc721a
        _safeMint(to, 1);
        // set token uri
        _setTokenURI(_nextTokenId() - 1, uri);
    }

    /**
    @dev Override ERC721A tokenURI() function. We can't use original tokenURI() function.
     */
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_exists(tokenId), "Token does not exist");

        string memory _tokenURI = tokenURIs[tokenId];
        string memory base = _baseURI();

        // If there is no base URI, return the token URI.
        if (bytes(base).length == 0) {
            return _tokenURI;
        }
        // If both are set, concatenate the baseURI and tokenURI (via abi.encodePacked).
        if (bytes(_tokenURI).length > 0) {
            return string(abi.encodePacked(base, _tokenURI));
        }

        return super.tokenURI(tokenId);
    }

    /**
    @dev Setter functions
     */
    function setDesigner(address _designer) external onlyDesigner {
        require(_designer != address(0), "Invalid address");
        designer = _designer;
    }

    function setManager(address _manager) external onlyManager {
        require(_manager != address(0), "Invalid address");
        manager = _manager;
    }

    /**
    @dev Define _setTokenURI() function like ERC721URIStorage
     */
    function _setTokenURI(uint256 _tokenId, string memory _tokenURI) private {
        require(_exists(_tokenId), "Token does not exist!");
        tokenURIs[_tokenId] = _tokenURI;
    }

    /**
    @notice Sets the contract-wide royalty info.
     */
    function setRoyaltyInfo(address _receiver, uint96 _feeBasisPoints) external onlyManager {
        _setDefaultRoyalty(_receiver, _feeBasisPoints);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721A, ERC2981) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
