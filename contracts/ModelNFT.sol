// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./lib/ERC721A.sol";

// @author DeDe
contract ModelNFT is
    ERC721A,
    ERC2981
{
    uint256 public mintLimit;

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
        address payable royaltyReceiver
    )
        ERC721A(name, symbol)        
    {
        mintLimit = limit;
        _setDefaultRoyalty(royaltyReceiver, rate);
    }

    /**
    @dev Mint tokens
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


    function _setTokenURI(uint256 tokenId, string memory _tokenURI) private {
        require(_exists(tokenId), "Token is not exist!");
        _tokenURIs[tokenId] = _tokenURI;
    }

    /**
    @notice Sets the contract-wide royalty info.
     */
    function setRoyaltyInfo(address receiver, uint96 feeBasisPoints)
        external
    {
        _setDefaultRoyalty(receiver, feeBasisPoints);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721A, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}