# NFT Token (ERC721) Factory

Factory Smart Contract to create Non-Fungible Token (NFTs) corresponding to 3D model utilizing ERC-721A Standards and EIP2981.

## Token

- It is a NFT template with input values.

## Factory

- Generate a new smart contract
- Often used for generating new token contracts

## Example

```js
contract ModelNFTFactory {
  ...
  function createModleNFT(PARAMS){}
  ...

}
contract ModelNFT is ERC721A {
  ...
  constructor(PARAMS)
  ...
}
```

## Run the tests with Hardhat

```bash
npx hardhat compile
npx hardhat run scripts/deploy.ts
npx hardhat test
```

## Author

- [@donald20](https://www.gitlab.com/donald20)

# License

Copyright (c) 2022 Decentralized Design
