import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers, waffle } from "hardhat";
import { ModelNFT } from "../typechain";

describe("modelNFT", () => {
  let modelNFT: ModelNFT;
  let deployer: SignerWithAddress;
  let receiver: SignerWithAddress;
  let user: SignerWithAddress;

  const MODEL_NAME = "TEST";
  const MODEL_ID = "ID";
  const MODEL_LIMIT = 100;
  const RATE = 100;

  const ZERO_ADDRESS = ethers.utils.getAddress(
    "0x0000000000000000000000000000000000000000"
  );
  const fixture = async () => {
    [deployer, receiver, user] = await ethers.getSigners();

    const modelNFT = await ethers.getContractFactory("ModelNFT");

    return (await modelNFT.deploy(
      MODEL_NAME,
      MODEL_ID,
      MODEL_LIMIT,
      RATE,
      receiver.address
    )) as ModelNFT;
  };

  beforeEach(async () => {
    modelNFT = await waffle.loadFixture(fixture);
  });

  it("should construct", async () => {
    expect(await modelNFT.name()).to.be.equal(MODEL_NAME);
    expect(await modelNFT.symbol()).to.be.equal(MODEL_ID);
  });

  describe("#mint", async () => {
    const TEST_URI = "test";
    // const tokenId = BigNumber.from(0);

    it("should mint", async () => {
      await modelNFT.connect(user).mint(user.address, TEST_URI);

      expect(await modelNFT.balanceOf(user.address)).to.equal(1);
    });

    it("should have token URI", async () => {
      const tokenId = BigNumber.from(0);

      await modelNFT.connect(user).mint(user.address, TEST_URI);

      expect(await modelNFT.tokenURI(tokenId)).to.equal(TEST_URI);
    });
  });
});
