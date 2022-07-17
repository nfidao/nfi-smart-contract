import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers, upgrades, waffle } from "hardhat";
// eslint-disable-next-line node/no-missing-import
import { ModelNFTFactory, RoyaltyRegistry } from "../typechain";

const {
  constants: { AddressZero },
  getContractFactory,
} = ethers;

describe("ModelNFTFactory", async () => {
  let deployer: SignerWithAddress;
  let designer: SignerWithAddress;
  let manager: SignerWithAddress;
  let signer: SignerWithAddress;
  let bob: SignerWithAddress;
  let royaltyReceiver: SignerWithAddress;
  let royaltyRegistry: RoyaltyRegistry;
  let modelNFTFactory: ModelNFTFactory;

  const MODEL_NAME = "TEST";
  const MODEL_ID = "ID";
  const MODEL_LIMIT = BigNumber.from(100);
  const RATE = BigNumber.from(100);

  const fixture = async (): Promise<[ModelNFTFactory, RoyaltyRegistry]> => {
    [deployer, designer, manager, signer, royaltyReceiver, bob] =
      await ethers.getSigners();

    const RoyaltyRegistry = await getContractFactory(
      "RoyaltyRegistry",
      deployer
    );

    royaltyRegistry = (await RoyaltyRegistry.deploy()) as RoyaltyRegistry;

    await royaltyRegistry.initialize(royaltyReceiver.address, RATE);

    modelNFTFactory = (await upgrades.deployProxy(
      await getContractFactory("ModelNFTFactory", deployer),
      [royaltyRegistry.address],
      {
        initializer: "initialize",
      }
    )) as ModelNFTFactory;

    await royaltyRegistry.changeModelFactory(modelNFTFactory.address);

    return [modelNFTFactory, royaltyRegistry];
  };

  beforeEach(async () => {
    [modelNFTFactory, royaltyRegistry] = await waffle.loadFixture(fixture);
  });

  describe("creation", () => {
    it("should be deployed & initialized", async () => {
      expect(await modelNFTFactory.deployed());
      expect(await modelNFTFactory.owner()).to.equal(deployer.address);
    });
  });

  describe("create modelNFT", () => {
    it("should create modelNFT", async () => {
      const tx = await modelNFTFactory
        .connect(bob)
        .createModelNFT(
          MODEL_NAME,
          MODEL_ID,
          designer.address,
          manager.address,
          signer.address,
          royaltyRegistry.address,
          RATE,
          MODEL_LIMIT
        );

      const modelNFTAddress = await modelNFTFactory.modelNFTs(MODEL_ID);
      await expect(tx)
        .to.emit(modelNFTFactory, "NFTCreated")
        .withArgs(MODEL_ID, modelNFTAddress);
    });

    it("should be able to create modelNFT with 0 royalty rate", async () => {
      const tx = await modelNFTFactory
        .connect(bob)
        .createModelNFT(
          MODEL_NAME,
          MODEL_ID,
          designer.address,
          manager.address,
          signer.address,
          royaltyRegistry.address,
          0,
          MODEL_LIMIT
        );

      const modelNFTAddress = await modelNFTFactory.modelNFTs(MODEL_ID);
      await expect(tx)
        .to.emit(modelNFTFactory, "NFTCreated")
        .withArgs(MODEL_ID, modelNFTAddress);

      const ModelNFT = await getContractFactory("ModelNFT");
      const modelNFT = await ModelNFT.attach(modelNFTAddress);
      expect(await modelNFT.symbol()).to.equal(MODEL_ID);

      const royaltyInfo = await modelNFT.royaltyInfo(0, 10);
      expect(royaltyInfo[1]).to.equal(0);
    });

    describe("revert", () => {
      it("should revert if royalty registry is zero address", async () => {
        await expect(
          upgrades.deployProxy(
            await getContractFactory("ModelNFTFactory", deployer),
            [AddressZero],
            {
              initializer: "initialize",
            }
          )
        ).to.been.revertedWith("Invalid royalty address");
      });

      it("should revert if limit is zero", async () => {
        await expect(
          modelNFTFactory
            .connect(bob)
            .createModelNFT(
              MODEL_NAME,
              MODEL_ID,
              designer.address,
              manager.address,
              signer.address,
              royaltyRegistry.address,
              RATE,
              0
            )
        ).to.been.revertedWith("Invalid mint limit");
      });

      it("should revert if model id is exist already", async () => {
        await modelNFTFactory
          .connect(bob)
          .createModelNFT(
            MODEL_NAME,
            MODEL_ID,
            designer.address,
            manager.address,
            signer.address,
            royaltyRegistry.address,
            RATE,
            MODEL_LIMIT
          );
        await expect(
          modelNFTFactory
            .connect(bob)
            .createModelNFT(
              MODEL_NAME,
              MODEL_ID,
              designer.address,
              manager.address,
              signer.address,
              royaltyRegistry.address,
              RATE,
              MODEL_LIMIT
            )
        ).to.been.revertedWith("Model ID has been used");
      });
    });
  });

  describe("upgrade logic", () => {
    it("upgrade logic implementation of model factory", async () => {
      const NewModelFactory = await getContractFactory(
        "MockModelNFTFactory",
        deployer
      );

      await upgrades.upgradeProxy(modelNFTFactory.address, NewModelFactory);

      const newModelNFTFactory = await NewModelFactory.attach(
        modelNFTFactory.address
      );
      expect(modelNFTFactory.address).to.equal(newModelNFTFactory.address);
      expect(await newModelNFTFactory.customFunction()).to.equal(true);
      expect(await newModelNFTFactory.owner()).to.equal(deployer.address);
    });
  });
});
