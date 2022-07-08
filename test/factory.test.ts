import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, upgrades, waffle } from "hardhat";
import { ModelNFTFactory, MockModelNFTFactory } from "../typechain";

describe("ModelNFTFactory", async () => {
  let modelNFTFactory: ModelNFTFactory;
  let deployer: SignerWithAddress;
  let designer: SignerWithAddress;
  let user: SignerWithAddress;
  // const ownerRole = ethers.utils.id("OWNER_ROLE");

  const MOCK_ADDRESS = ethers.utils.getAddress(
    "0x1400D86fFdB14f6dc821412Fbb7bCa3d6205493b"
  );

  const ZERO_ADDRESS = ethers.utils.getAddress(
    "0x0000000000000000000000000000000000000000"
  );
  const fixture = async () => {
    const modelNFTFactory = await ethers.getContractFactory("ModelNFTFactory");
    return (await upgrades.deployProxy(modelNFTFactory, [MOCK_ADDRESS], {
      initializer: "initialize",
    })) as ModelNFTFactory;
  };

  beforeEach(async () => {
    modelNFTFactory = await waffle.loadFixture(fixture);
    [deployer, designer, user] = await ethers.getSigners();
  });

  it("should initialize", async () => {
    expect(await modelNFTFactory.getRoyaltyReceiver()).to.equal(MOCK_ADDRESS);
  });

  describe("#createModelNFT", () => {
    const MODEL_NAME = "test";
    const MODEL_ID = "id";
    const MODEL_LIMIT = "100";
    const MODEL_RATE = "100";

    it("should emit an event", async () => {
      await expect(
        modelNFTFactory
          .connect(user)
          .createModelNFT(
            MODEL_NAME,
            MODEL_ID,
            designer.address,
            MODEL_RATE,
            MODEL_LIMIT
          )
      ).to.emit(modelNFTFactory, "NFTCreated");
    });
  });

  describe("#setRoyaltyReceiver", () => {
    it("should set royalty receiver", async () => {
      await modelNFTFactory.connect(deployer).setRoyaltyReceiver(user.address);

      expect(
        await modelNFTFactory.connect(deployer).getRoyaltyReceiver()
      ).to.equal(user.address);
    });

    it("should set royalty receiver", async () => {
      await expect(
        modelNFTFactory.connect(deployer).setRoyaltyReceiver(ZERO_ADDRESS)
      ).to.be.reverted;
    });
  });

  describe("#upgradablity", () => {
    let mockModelNFTFactory: any;
    let mockModelNFTFactoryAttached: any;

    beforeEach(async () => {
      mockModelNFTFactory = await ethers.getContractFactory(
        "MockModelNFTFactory"
      );

      await upgrades.upgradeProxy(modelNFTFactory.address, mockModelNFTFactory);
      mockModelNFTFactoryAttached = await mockModelNFTFactory.attach(
        modelNFTFactory.address
      );
    });

    it("should add custom function", async () => {
      expect(await mockModelNFTFactoryAttached.customFunction()).to.equal(true);
    });
  });
});
