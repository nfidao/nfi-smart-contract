// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "../royalty/RoyaltyRegistry.sol";

contract MockRoyaltyRegistry is RoyaltyRegistry {
    /**
    @dev test function for upgradeability
     */
    function customFunction() public pure returns (bool) {
        return true;
    }
}
