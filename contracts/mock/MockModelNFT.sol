// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "../ModelNFT.sol";

contract MockModelNFT is ModelNFT {
    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _limit,
        address _tokenPayment,
        address _designer,
        address _royaltyRegistry
    ) ModelNFT(_name, _symbol, _limit, _tokenPayment, _designer, _royaltyRegistry) {}

    function setTokenPayment(address _tokenPayment) external {
        tokenPayment = IERC20(_tokenPayment);
    }
}
