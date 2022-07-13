// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract RoyaltyStorage is OwnableUpgradeable {
    /// @dev storing royalty amount percentages for particular collection.
    mapping(address => uint96) public royaltyRateForCollection;

    /// @dev default royalty percentage;
    uint96 public defaultRoyaltyRatePercentage;

    /// @dev receiver address of royalty.
    address public receiver;

    uint96 public constant MAX_RATE_ROYALTY = 1000;
}
