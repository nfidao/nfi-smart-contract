import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers, upgrades, waffle } from "hardhat";
// eslint-disable-next-line node/no-missing-import
import { ModelNFT, RoyaltyRegistry } from "../typechain";

const {
  constants: { AddressZero },
  getContractFactory,
} = ethers;

const royaltyFeeDenominator = BigNumber.from(10000);

describe("ModelNFTFactory", async () => {
  let deployer: SignerWithAddress;
  let designer: SignerWithAddress;
  let manager: SignerWithAddress;
  let signer: SignerWithAddress;
  let bob: SignerWithAddress;
  let royaltyReceiver: SignerWithAddress;
  let royaltyRegistry: RoyaltyRegistry;
  let mockModel: ModelNFT;

  const MODEL_NAME = "TEST";
  const MODEL_ID = "ID";
  const MODEL_LIMIT = BigNumber.from(100);
  const RATE = BigNumber.from(100);

  const fixture = async (): Promise<[RoyaltyRegistry, ModelNFT]> => {
    [deployer, designer, manager, signer, royaltyReceiver, bob] =
      await ethers.getSigners();

    royaltyRegistry = (await upgrades.deployProxy(
      await getContractFactory("RoyaltyRegistry", deployer),
      [royaltyReceiver.address, RATE],
      {
        initializer: "initialize",
      }
    )) as RoyaltyRegistry;

    mockModel = (await (
      await getContractFactory("ModelNFT", deployer)
    ).deploy(
      MODEL_NAME,
      MODEL_ID,
      MODEL_LIMIT,
      designer.address,
      manager.address,
      signer.address,
      royaltyRegistry.address
    )) as ModelNFT;

    return [royaltyRegistry, mockModel];
  };

  beforeEach(async () => {
    [royaltyRegistry, mockModel] = await waffle.loadFixture(fixture);
  });

  describe("creation", () => {
    it("should be deployed & initialized", async () => {
      expect(await royaltyRegistry.deployed());
      expect(await royaltyRegistry.owner()).to.equal(deployer.address);
      expect(await royaltyRegistry.defaultRoyaltyRatePercentage()).to.equal(
        RATE
      );
      expect(await royaltyRegistry.receiver()).to.equal(
        royaltyReceiver.address
      );
    });

    it("should return correct default royalty info", async () => {
      const [receiver, rate] = await royaltyRegistry.getRoyaltyInfo(
        mockModel.address
      );
      expect(receiver).to.equal(royaltyReceiver.address);
      expect(rate).to.equal(RATE);
    });

    describe("revert", () => {
      it("should revert if tried to re-initialize", async () => {
        await expect(
          royaltyRegistry.initialize(royaltyReceiver.address, RATE)
        ).to.be.revertedWith("Initializable: contract is already initialized");
      });
    });
  });

  describe("update config", () => {
    it("update receiver", async () => {
      const tx = await royaltyRegistry.changeReceiver(bob.address);

      await expect(tx)
        .to.emit(royaltyRegistry, "ReceiverUpdated")
        .withArgs(royaltyReceiver.address, bob.address);

      expect(await royaltyRegistry.receiver()).to.equal(bob.address);
    });

    it("update default royalty rate", async () => {
      const NEW_RATE = BigNumber.from(200);
      const tx = await royaltyRegistry.changeDefaultRoyaltyRatePercentage(
        NEW_RATE
      );

      await expect(tx)
        .to.emit(royaltyRegistry, "DefaultRoyaltyRatePercentageUpdated")
        .withArgs(RATE, NEW_RATE);

      expect(await royaltyRegistry.defaultRoyaltyRatePercentage()).to.equal(
        NEW_RATE
      );
    });

    it("update model factory address", async () => {
      const tx = await royaltyRegistry.changeModelFactory(bob.address);

      await expect(tx)
        .to.emit(royaltyRegistry, "ModelFactoryUpdated")
        .withArgs(AddressZero, bob.address);

      expect(await royaltyRegistry.modelFactory()).to.equal(bob.address);
    });

    it("update default royalty rate to the max", async () => {
      const MAX_RATE = await royaltyRegistry.MAX_RATE_ROYALTY();
      const tx = await royaltyRegistry.changeDefaultRoyaltyRatePercentage(
        MAX_RATE
      );

      await expect(tx)
        .to.emit(royaltyRegistry, "DefaultRoyaltyRatePercentageUpdated")
        .withArgs(RATE, MAX_RATE);

      expect(await royaltyRegistry.defaultRoyaltyRatePercentage()).to.equal(
        MAX_RATE
      );
    });

    describe("revert", () => {
      it("should revert if try to change receiver with zero address", async () => {
        await expect(
          royaltyRegistry.changeReceiver(AddressZero)
        ).to.be.revertedWith("Invalid address");
      });

      it("should revert if try to change default rate greater that the upper limit", async () => {
        const MAX_RATE = await royaltyRegistry.MAX_RATE_ROYALTY();
        await expect(
          royaltyRegistry.changeDefaultRoyaltyRatePercentage(MAX_RATE.add(1))
        ).to.be.revertedWith("Invalid Rate");
      });

      it("should revert try to update model factory to zero address", async () => {
        await expect(
          royaltyRegistry.changeModelFactory(AddressZero)
        ).to.be.revertedWith("Invalid address");
      });

      it("should revert try to update model factory with non-authorized account", async () => {
        await expect(
          royaltyRegistry.connect(bob).changeModelFactory(AddressZero)
        ).to.be.revertedWith("Ownable: caller is not the owner");
      });
    });
  });

  describe("set royalty for collections", () => {
    it("should be able to set royalty for specific collection", async () => {
      const salePrice = BigNumber.from(2000);
      let [receiverRoyalty, amountRoyalty] = await mockModel.royaltyInfo(
        0,
        salePrice
      );
      await expect(receiverRoyalty).to.equal(royaltyReceiver.address);
      await expect(amountRoyalty).to.equal(
        salePrice.mul(RATE).div(royaltyFeeDenominator)
      );

      const NEW_RATE = BigNumber.from(200);
      const tx = await royaltyRegistry.setRoyaltyRateForCollections(
        [mockModel.address],
        [NEW_RATE]
      );

      await expect(tx)
        .to.emit(royaltyRegistry, "RoyaltySetForCollection")
        .withArgs(mockModel.address, NEW_RATE);

      const [receiver, rate] = await royaltyRegistry.getRoyaltyInfo(
        mockModel.address
      );

      await expect(receiver).to.equal(royaltyReceiver.address);
      await expect(rate).to.equal(NEW_RATE);

      [receiverRoyalty, amountRoyalty] = await mockModel.royaltyInfo(
        0,
        salePrice
      );

      await expect(receiverRoyalty).to.equal(royaltyReceiver.address);
      await expect(amountRoyalty).to.equal(
        salePrice.mul(NEW_RATE).div(royaltyFeeDenominator)
      );
    });

    it("should be able to set royalty for specific collection with 0 rate", async () => {
      const salePrice = BigNumber.from(2000);
      let [receiverRoyalty, amountRoyalty] = await mockModel.royaltyInfo(
        0,
        salePrice
      );
      await expect(receiverRoyalty).to.equal(royaltyReceiver.address);
      await expect(amountRoyalty).to.equal(
        salePrice.mul(RATE).div(royaltyFeeDenominator)
      );

      let royaltySet = await royaltyRegistry.royaltiesSet(mockModel.address);
      let royaltyInfoFromRegistry = await royaltyRegistry.getRoyaltyInfo(
        mockModel.address
      );
      expect(royaltySet[0]).to.equal(false);
      expect(royaltySet[1]).to.equal(0);
      expect(royaltyInfoFromRegistry[0]).to.equal(royaltyReceiver.address);
      expect(royaltyInfoFromRegistry[1]).to.equal(RATE);

      const NEW_RATE = BigNumber.from(0);
      const tx = await royaltyRegistry.setRoyaltyRateForCollections(
        [mockModel.address],
        [NEW_RATE]
      );

      await expect(tx)
        .to.emit(royaltyRegistry, "RoyaltySetForCollection")
        .withArgs(mockModel.address, NEW_RATE);

      const [receiver, rate] = await royaltyRegistry.getRoyaltyInfo(
        mockModel.address
      );

      await expect(receiver).to.equal(royaltyReceiver.address);
      await expect(rate).to.equal(NEW_RATE);

      [receiverRoyalty, amountRoyalty] = await mockModel.royaltyInfo(
        0,
        salePrice
      );

      await expect(receiverRoyalty).to.equal(royaltyReceiver.address);
      await expect(amountRoyalty).to.equal(
        salePrice.mul(NEW_RATE).div(royaltyFeeDenominator)
      );

      royaltySet = await royaltyRegistry.royaltiesSet(mockModel.address);
      royaltyInfoFromRegistry = await royaltyRegistry.getRoyaltyInfo(
        mockModel.address
      );
      expect(royaltySet[0]).to.equal(true);
      expect(royaltySet[1]).to.equal(NEW_RATE);
      expect(royaltyInfoFromRegistry[0]).to.equal(royaltyReceiver.address);
      expect(royaltyInfoFromRegistry[1]).to.equal(NEW_RATE);
    });

    it("should be able to set royalty for multiple collection", async () => {
      const NEW_RATE = BigNumber.from(200);
      const NEW_RATE2 = BigNumber.from(300);
      const mockModel2 = (await (
        await getContractFactory("ModelNFT", deployer)
      ).deploy(
        MODEL_NAME,
        MODEL_ID,
        MODEL_LIMIT,
        designer.address,
        manager.address,
        signer.address,
        royaltyRegistry.address
      )) as ModelNFT;

      const tx = await royaltyRegistry.setRoyaltyRateForCollections(
        [mockModel.address, mockModel2.address],
        [NEW_RATE, NEW_RATE2]
      );

      await expect(tx)
        .to.emit(royaltyRegistry, "RoyaltySetForCollection")
        .withArgs(mockModel.address, NEW_RATE);

      await expect(tx)
        .to.emit(royaltyRegistry, "RoyaltySetForCollection")
        .withArgs(mockModel2.address, NEW_RATE2);

      let [receiver, rate] = await royaltyRegistry.getRoyaltyInfo(
        mockModel.address
      );

      await expect(receiver).to.equal(royaltyReceiver.address);
      await expect(rate).to.equal(NEW_RATE);

      [receiver, rate] = await royaltyRegistry.getRoyaltyInfo(
        mockModel2.address
      );

      await expect(receiver).to.equal(royaltyReceiver.address);
      await expect(rate).to.equal(NEW_RATE2);
    });

    it("royalty info should return correct receiver after update", async () => {
      const NEW_RATE = BigNumber.from(200);
      await royaltyRegistry.changeReceiver(bob.address);
      await royaltyRegistry.setRoyaltyRateForCollections(
        [mockModel.address],
        [NEW_RATE]
      );

      const [receiver, rate] = await royaltyRegistry.getRoyaltyInfo(
        mockModel.address
      );

      await expect(receiver).to.equal(bob.address);
      await expect(rate).to.equal(NEW_RATE);
    });

    describe("revert", () => {
      it("should revert if tokens length mismatch with the rate length", async () => {
        await expect(
          royaltyRegistry.setRoyaltyRateForCollections(
            [mockModel.address],
            [RATE, RATE]
          )
        ).to.be.revertedWith("Mismatch arguments length");
      });

      it("should revert if try to set royalty for zero address", async () => {
        await expect(
          royaltyRegistry.setRoyaltyRateForCollections([AddressZero], [RATE])
        ).to.be.revertedWith("Invalid token");
      });

      it("should revert if try to set royalty rate greater than the limit", async () => {
        const MAX_RATE = await royaltyRegistry.MAX_RATE_ROYALTY();
        await expect(
          royaltyRegistry.setRoyaltyRateForCollections(
            [mockModel.address],
            [MAX_RATE.add(1)]
          )
        ).to.be.revertedWith("Invalid Rate");
      });

      it("should revert for non-authorized call", async () => {
        await expect(
          royaltyRegistry
            .connect(bob)
            .setRoyaltyRateForCollection(mockModel.address, RATE)
        ).to.be.revertedWith("Unauthorized");
      });
    });
  });

  describe("upgrade logic", () => {
    it("upgrade logic implementation of royalty registry", async () => {
      const NewRoyaltyRegistry = await getContractFactory(
        "MockRoyaltyRegistry",
        deployer
      );

      await upgrades.upgradeProxy(royaltyRegistry.address, NewRoyaltyRegistry);

      const newRoyaltyRegistry = await NewRoyaltyRegistry.attach(
        royaltyRegistry.address
      );
      expect(royaltyRegistry.address).to.equal(newRoyaltyRegistry.address);
      expect(await newRoyaltyRegistry.customFunction()).to.equal(true);
      expect(await newRoyaltyRegistry.owner()).to.equal(deployer.address);
    });
  });
});
