// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

interface IRoyaltyRegistry {
    function getRoyaltyInfo(address _token) external view returns (address _receiver, uint96 _royaltyRatePercentage);
}
