// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
  constructor(uint256 _tokenSupply) ERC20("Mock Token", "Mock Symbol") {
    _mint(msg.sender, _tokenSupply);
  }
}