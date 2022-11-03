import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers, waffle } from "hardhat";

import {
  NFTPriceFormula,
  // eslint-disable-next-line node/no-missing-import
} from "../typechain";

const {
  constants: { AddressZero },
  getContractFactory,
} = ethers;

describe("ModelNFTFactory", async () => {
  let deployer: SignerWithAddress;
  let bob: SignerWithAddress;
  let nftFormula: NFTPriceFormula;

  const TOKEN_PRICE = BigNumber.from(0);

  const fixture = async (): Promise<[NFTPriceFormula]> => {
    [deployer, bob] = await ethers.getSigners();

    /** NFT FORMULA */
    const NFTFormula = await getContractFactory("NFTPriceFormula", deployer);

    nftFormula = (await NFTFormula.deploy()) as NFTPriceFormula;

    await nftFormula.initialize();

    await nftFormula.setFormulaPrices(1, TOKEN_PRICE);

    return [nftFormula];
  };

  beforeEach(async () => {
    [nftFormula] = await waffle.loadFixture(fixture);
  });

  describe("creation", () => {
    it("should be deployed & initialized", async () => {
      expect(await nftFormula.deployed());
      expect(await nftFormula.owner()).to.equal(deployer.address);
    });
  });

  describe("fallback", () => {
    it("should revert if try to send eth", async () => {
      await expect(
        deployer.sendTransaction({
          to: nftFormula.address,
          value: 1,
        })
      ).to.be.reverted;
    });

    it("should be able with 0 ether", async () => {
      await deployer.sendTransaction({
        to: nftFormula.address,
        value: 0,
      });
    });
  });

  describe("set formula prices", () => {
    it("should revert if try to set formula type with non-authorized address", async () => {
      await expect(
        nftFormula.connect(bob).setFormulaPrices(1, 1)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should revert if try to set 0 formula type", async () => {
      await expect(nftFormula.setFormulaPrices(0, 1)).to.be.revertedWith(
        "formula: zero formula type"
      );
    });

    it("correct value", async () => {
      await nftFormula.setFormulaPrices(1, 1);
      expect(await nftFormula.getTokenPrice(1, bob.address)).to.equal(1);
    });
  });

  describe("get token price", () => {
    it("should revert if 0 collection address", async () => {
      await expect(nftFormula.getTokenPrice(1, AddressZero)).to.be.revertedWith(
        "formula: zero collection address"
      );
    });

    it("should revert if unsupported formulay type", async () => {
      await expect(nftFormula.getTokenPrice(0, bob.address)).to.be.revertedWith(
        "formula: unsupported formula type"
      );
    });
  });
});
