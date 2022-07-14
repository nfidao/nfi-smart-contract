// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "../ModelNFTFactory.sol";

contract MockModelNFTFactory is ModelNFTFactory {
    /**
    @dev test function for upgradeability
     */
    function customFunction() public pure returns (bool) {
        return true;
    }
}
