// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./lib/ERC721A.sol";

// @author DeDe
contract ModelNFT is
    ERC721A,
    ERC2981,
    AccessControl
{
    bytes32 public constant DESIGNER_ROLE = keccak256("DESIGNER_ROLE");
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    uint256 public mintLimit;
    address private _designer;
    address private _manager;
    mapping(uint256 => string) private _tokenURIs;

   
    // Event 
    event NFTMinted(
        uint tokenId
    );

    constructor(
        string memory name,
        string memory symbol,
        uint256 limit, 
        uint96 rate, 
        address designer,
        address manager,
        address payable royaltyReceiver
    )
        ERC721A(name, symbol)        
    {
        mintLimit = limit;
        _designer = designer;

        _setDefaultRoyalty(royaltyReceiver, rate);

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(DESIGNER_ROLE, designer);
        _grantRole(MANAGER_ROLE, manager);
    }

    /**
    @dev Everybody can mint NFT
     */
    function mint(
        address to, string memory uri
    ) public  {
        // check if minting is possible
        require(totalSupply() <= mintLimit, "Can't mint any more!");
        
        // mint a token using erc721a
        _safeMint(to, 1);
        // set token uri
        _setTokenURI(_currentIndex-1, uri);
        
        emit NFTMinted(_currentIndex);
    }

    /**
    @dev Override ERC721A tokenURI() function. We can't use original tokenURI() function.
     */
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        
        require(_exists(tokenId), "Token is not exist!");

        string memory _tokenURI = _tokenURIs[tokenId];
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
    @dev Getter functions
     */
    function getDesigner() public view returns(address) {
        return _designer;
    }

    function getManager() public view returns(address) {
        return _manager;
    }

    /**
    @dev Setter functions
     */
    function setDesigner(address designer) external onlyRole(DESIGNER_ROLE) {
        _designer = designer;
    }

    function setManager(address manager) external onlyRole(MANAGER_ROLE) {
        _manager = manager;
    }
    
    /**
    @dev Define _setTokenURI() function like ERC721URIStorage
     */
    function _setTokenURI(uint256 tokenId, string memory _tokenURI) private {
        require(_exists(tokenId), "Token is not exist!");
        _tokenURIs[tokenId] = _tokenURI;
    }

    /**
    @notice Sets the contract-wide royalty info.
     */
    function setRoyaltyInfo(address receiver, uint96 feeBasisPoints)
        external
        onlyRole(MANAGER_ROLE)
    {
        _setDefaultRoyalty(receiver, feeBasisPoints);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721A, ERC2981, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}