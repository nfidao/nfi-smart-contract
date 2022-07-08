import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers, waffle } from "hardhat";
import { ModelNFT } from "../typechain";

describe("modelNFT", () => {
  let modelNFT: ModelNFT;
  let deployer: SignerWithAddress;
  let manager: SignerWithAddress;
  let designer: SignerWithAddress;
  let receiver: SignerWithAddress;
  let user: SignerWithAddress;

  const designerRole = ethers.utils.id("DESIGNER_ROLE");
  const managerRole = ethers.utils.id("MANAGER_ROLE");

  const MODEL_NAME = "TEST";
  const MODEL_ID = "ID";
  const MODEL_LIMIT = 100;
  const RATE = 100;

  const fixture = async () => {
    [deployer, manager, designer, receiver, user] = await ethers.getSigners();

    const modelNFT = await ethers.getContractFactory("ModelNFT");

    return (await modelNFT.deploy(
      MODEL_NAME,
      MODEL_ID,
      MODEL_LIMIT,
      RATE,
      designer.address,
      manager.address,
      receiver.address
    )) as ModelNFT;
  };

  beforeEach(async () => {
    modelNFT = await waffle.loadFixture(fixture);
  });

  it("should construct", async () => {
    expect(await modelNFT.name()).to.be.equal(MODEL_NAME);
    expect(await modelNFT.symbol()).to.be.equal(MODEL_ID);
    expect(await modelNFT.hasRole(designerRole, designer.address)).to.equal(
      true
    );
    expect(await modelNFT.hasRole(managerRole, manager.address)).to.equal(true);
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

  describe("#setDesigner", async () => {
    it("should set new designer", async () => {
      await modelNFT.connect(designer).setDesigner(user.address);
      expect(await modelNFT.getDesigner()).to.be.equal(user.address);
    });

    it("should be done by designer", async () => {
      await expect(modelNFT.connect(user).setDesigner(user.address)).to.be
        .reverted;
      await modelNFT.connect(deployer).grantRole(designerRole, user.address);

      await modelNFT.connect(user).setDesigner(user.address);
    });
  });
});
