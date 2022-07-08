import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, waffle } from "hardhat";
import { ModelNFTFactory } from "../typechain";

describe("ModelNFTFactory", async () => {
  let modelNFTFactory: ModelNFTFactory;
  let deployer: SignerWithAddress;
  let alice: SignerWithAddress;
  // const ownerRole = ethers.utils.id("OWNER_ROLE");

  const MOCK_ADDRESS = ethers.utils.getAddress(
    "0x1400D86fFdB14f6dc821412Fbb7bCa3d6205493b"
  );

  const ZERO_ADDRESS = ethers.utils.getAddress(
    "0x0000000000000000000000000000000000000000"
  );
  const fixture = async () => {
    const modelNFTFactory = await ethers.getContractFactory("ModelNFTFactory");
    return (await modelNFTFactory.deploy(MOCK_ADDRESS)) as ModelNFTFactory;
  };

  beforeEach(async () => {
    modelNFTFactory = await waffle.loadFixture(fixture);
    [deployer, alice] = await ethers.getSigners();
  });

  it("should construct", async () => {
    expect(await modelNFTFactory.getRoyaltyReceiver()).to.equal(MOCK_ADDRESS);
  });

  describe("#createModelNFT", () => {
    const MODEL_NAME = "test";
    const MODEL_ID = "id";

    const MODEL_LIMIT = "100";

    it("should emit an event", async () => {
      await expect(
        modelNFTFactory
          .connect(alice)
          .createModelNFT(MODEL_NAME, MODEL_ID, MODEL_LIMIT)
      ).to.emit(modelNFTFactory, "NFTCreated");
    });
  });

  describe("#setRoyaltyRate", () => {
    const RATE = 100;

    it("should set royalty rate", async () => {
      await modelNFTFactory.connect(deployer).setRoyaltyRate(RATE);

      expect(await modelNFTFactory.connect(deployer).getRoyaltyRate()).to.equal(
        RATE
      );
    });

    it("should revert if rate is greater than 1000", async () => {
      await expect(modelNFTFactory.connect(deployer).setRoyaltyRate(1000)).to.be
        .reverted;
    });

    it("should allow only owner", async () => {
      await expect(modelNFTFactory.connect(alice).setRoyaltyRate(RATE)).to.be
        .reverted;
    });
  });

  describe("#setRoyaltyReceiver", () => {
    it("should set royalty receiver", async () => {
      await modelNFTFactory.connect(deployer).setRoyaltyReceiver(alice.address);

      expect(
        await modelNFTFactory.connect(deployer).getRoyaltyReceiver()
      ).to.equal(alice.address);
    });

    it("should set royalty receiver", async () => {
      await expect(
        modelNFTFactory.connect(deployer).setRoyaltyReceiver(ZERO_ADDRESS)
      ).to.be.reverted;
    });
  });
});
