import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers, waffle } from "hardhat";
import type {
  MockModelNFT,
  RoyaltyRegistry,
  MockERC20,
  NFTPriceFormula,
  // eslint-disable-next-line node/no-missing-import
} from "../typechain";

const provider = waffle.provider;
const {
  constants: { AddressZero },
  getContractFactory,
} = ethers;

const royaltyFeeDenominator = BigNumber.from(10000);

const formulaType = 1;

const defaultTotalMint = 1;

const getMintSignature = async function (
  signerAccount: SignerWithAddress,
  nftContract: MockModelNFT,
  senderAccount: SignerWithAddress,
  uri: string[],
  formulaType?: number | undefined,
  totalMint?: number | undefined
) {
  if (!formulaType) formulaType = 1;
  if (!totalMint) totalMint = defaultTotalMint;
  const messageDigest = ethers.utils.solidityKeccak256(
    ["address", "string", "uint256", "uint256", "address"],
    [senderAccount.address, uri[0], formulaType, totalMint, nftContract.address]
  );
  const signature = await signerAccount.signMessage(
    ethers.utils.arrayify(messageDigest)
  );

  return signature;
};

describe("ModelNFT", () => {
  let deployer: SignerWithAddress;
  let designer: SignerWithAddress;
  let manager: SignerWithAddress;
  let signer: SignerWithAddress;
  let owner: SignerWithAddress;
  let royaltyReceiver: SignerWithAddress;
  let bob: SignerWithAddress;
  let sarah: SignerWithAddress;
  let modelNFT: MockModelNFT;
  let royaltyRegistry: RoyaltyRegistry;
  let mockPaymentToken: MockERC20;
  let nftFormula: NFTPriceFormula;

  const MODEL_NAME = "TEST";
  const MODEL_ID = "ID";
  const MODEL_LIMIT = BigNumber.from(100);
  const RATE = BigNumber.from(100);
  const TOKEN_PAYMENT = AddressZero;
  const TOKEN_PRICE = BigNumber.from(0);

  const fixture = async (): Promise<[MockModelNFT, RoyaltyRegistry]> => {
    [deployer, designer, manager, signer, owner, royaltyReceiver, bob, sarah] =
      await ethers.getSigners();

    /** NFT FORMULA */
    const NFTFormula = await getContractFactory("NFTPriceFormula", deployer);

    nftFormula = (await NFTFormula.deploy()) as NFTPriceFormula;

    await nftFormula.initialize();

    await nftFormula.setFormulaPrices(1, TOKEN_PRICE);

    /** ROYALTY REGISTRY */
    const RoyaltyRegistry = await getContractFactory(
      "RoyaltyRegistry",
      deployer
    );

    royaltyRegistry = (await RoyaltyRegistry.deploy()) as RoyaltyRegistry;

    await royaltyRegistry.initialize(
      royaltyReceiver.address,
      RATE,
      owner.address,
      manager.address,
      signer.address
    );

    await royaltyRegistry.changeNFTFormula(nftFormula.address);

    modelNFT = (await (
      await getContractFactory("MockModelNFT", deployer)
    ).deploy(
      MODEL_NAME,
      MODEL_ID,
      MODEL_LIMIT,
      TOKEN_PAYMENT,
      designer.address,
      royaltyRegistry.address
    )) as MockModelNFT;

    const totalSupply = ethers.utils.parseEther("2000000");
    const MockERC20 = await getContractFactory("MockERC20", deployer);
    mockPaymentToken = (await MockERC20.deploy(totalSupply)) as MockERC20;

    return [modelNFT, royaltyRegistry];
  };

  before("populate accs", async () => {
    [deployer, designer, manager, signer, royaltyReceiver] =
      await ethers.getSigners();
  });

  beforeEach("deploy instances", async () => {
    [modelNFT, royaltyRegistry] = await waffle.loadFixture(fixture);
  });

  describe("creation", () => {
    it("state after creation should be correct", async () => {
      expect(await modelNFT.mintLimit()).to.equal(MODEL_LIMIT);
      expect(await modelNFT.designer()).to.equal(designer.address);
      expect(await modelNFT.manager()).to.equal(manager.address);
      expect(await modelNFT.owner()).to.equal(owner.address);
      expect(await modelNFT.contractURI()).to.equal(
        modelNFT.address.toLowerCase()
      );
      expect(await modelNFT.authorizedSignerAddress()).to.equal(signer.address);
      expect(await modelNFT.royaltyRegistry()).to.equal(
        royaltyRegistry.address
      );
    });

    it("royalty info should return correct value", async () => {
      const saleAmount = RATE;
      const royaltyInfo = await modelNFT.royaltyInfo(0, saleAmount);
      expect(royaltyInfo[0]).to.equal(royaltyReceiver.address);
      expect(royaltyInfo[1].toString()).to.equal(
        saleAmount.mul(RATE).div(royaltyFeeDenominator)
      );
    });

    it("royalty info should return correct value after changed", async () => {
      const saleAmount = RATE;
      await royaltyRegistry.setRoyaltyRateForCollection(
        modelNFT.address,
        RATE,
        bob.address
      );
      const royaltyInfo = await modelNFT.royaltyInfo(0, saleAmount);
      expect(royaltyInfo[0]).to.equal(bob.address);
      expect(royaltyInfo[1].toString()).to.equal(
        saleAmount.mul(RATE).div(royaltyFeeDenominator)
      );
    });

    it("base uri should be empty", async () => {
      expect(await modelNFT.baseURI()).to.equal("");
    });

    it("set base uri", async () => {
      const newBaseURI = "https://";
      const tx = await modelNFT.connect(manager).setBaseURI(newBaseURI);
      expect(await modelNFT.baseURI()).to.equal(newBaseURI);

      await expect(tx)
        .to.emit(modelNFT, "BaseUriUpdated")
        .withArgs(manager.address, "", newBaseURI);
    });

    it("supports interface", async () => {
      const interfaces = [
        "0x01ffc9a7", // ERC165 interface ID for ERC165.
        "0x80ac58cd", // ERC165 interface ID for ERC721.
        "0x5b5e139f", // ERC165 interface ID for ERC721Metadata.
        "0x2a55205a", // ERC165 interface ID for ERC2981
      ];

      for (let i = 0; i < interfaces.length; i++) {
        expect(await modelNFT.supportsInterface(interfaces[i])).to.equal(true);
      }

      expect(await modelNFT.supportsInterface("0x11111111")).to.equal(false);
    });

    describe("revert", () => {
      it("should revert if royalty registry is not a contract address", async () => {
        const ModelNFT = await getContractFactory("ModelNFT", deployer);
        await expect(
          ModelNFT.deploy(
            MODEL_NAME,
            MODEL_ID,
            MODEL_LIMIT,
            TOKEN_PAYMENT,
            designer.address,
            deployer.address /** non-contract address for royalty registry */
          )
        ).to.be.revertedWith("Invalid royalty registry address");
      });

      it("token uri should revert since token does not exist", async () => {
        await expect(modelNFT.tokenURI(0)).to.be.revertedWith(
          "Token does not exist"
        );
      });

      it("set base uri should failed if set by non-manager account", async () => {
        const newBaseURI = "https://";
        await expect(
          modelNFT.connect(designer).setBaseURI(newBaseURI)
        ).to.be.revertedWith(
          "Unauthorized"
        ); /** try to send tx from designer account */
      });
    });
  });

  describe("role & addresses", () => {
    it("change designer address", async () => {
      expect(await modelNFT.designer()).to.equal(designer.address);
      const tx = await modelNFT.connect(designer).setDesigner(bob.address);
      expect(await modelNFT.designer()).to.equal(bob.address);

      await expect(tx)
        .to.emit(modelNFT, "DesignerUpdated")
        .withArgs(designer.address, bob.address);
    });

    it("change collection manager address", async () => {
      expect(await modelNFT.manager()).to.equal(manager.address);
      const tx = await royaltyRegistry
        .connect(deployer)
        .changeCollectionManager(bob.address);
      expect(await modelNFT.manager()).to.equal(bob.address);

      await expect(tx)
        .to.emit(royaltyRegistry, "CollectionManagerUpdated")
        .withArgs(manager.address, bob.address);
    });

    it("change collection signer address", async () => {
      expect(await modelNFT.authorizedSignerAddress()).to.equal(signer.address);
      const tx = await royaltyRegistry
        .connect(deployer)
        .changeCollectionAuthorizedSignerAddress(bob.address);
      expect(await modelNFT.authorizedSignerAddress()).to.equal(bob.address);

      await expect(tx)
        .to.emit(royaltyRegistry, "CollectionAuthorizedSignerAddressUpdated")
        .withArgs(signer.address, bob.address);
    });

    it("change collection owner address", async () => {
      expect(await modelNFT.authorizedSignerAddress()).to.equal(signer.address);
      const tx = await royaltyRegistry
        .connect(deployer)
        .changeCollectionOwner(bob.address);
      expect(await modelNFT.owner()).to.equal(bob.address);

      await expect(tx)
        .to.emit(royaltyRegistry, "CollectionOwnerUpdated")
        .withArgs(owner.address, bob.address);
    });

    it("change royalty registry address", async () => {
      expect(await modelNFT.royaltyRegistry()).to.equal(
        royaltyRegistry.address
      );
      const tx = await modelNFT
        .connect(manager)
        .changeRoyaltyRegistry(modelNFT.address);
      expect(await modelNFT.royaltyRegistry()).to.equal(modelNFT.address);

      await expect(tx)
        .to.emit(modelNFT, "RoyaltyRegistryUpdated")
        .withArgs(manager.address, royaltyRegistry.address, modelNFT.address);
    });

    describe("revert", () => {
      it("should revert if set designer from non-designer account", async () => {
        await expect(
          modelNFT.connect(manager).setDesigner(bob.address)
        ).to.be.revertedWith(
          "Unauthorized"
        ); /** try to send tx from manager account */
      });

      it("should revert if set royalty registry from non-manager account", async () => {
        await expect(
          modelNFT.connect(designer).changeRoyaltyRegistry(bob.address)
        ).to.be.revertedWith(
          "Unauthorized"
        ); /** try to send tx from designer account */
      });

      it("should revert if try to set designer with zero address", async () => {
        await expect(
          modelNFT.connect(designer).setDesigner(AddressZero)
        ).to.be.revertedWith("Invalid address");
      });

      it("should revert if try to set collection manager with zero address", async () => {
        await expect(
          royaltyRegistry.connect(deployer).changeCollectionManager(AddressZero)
        ).to.be.revertedWith("Invalid address");
      });

      it("should revert if try to set collection signer with zero address", async () => {
        await expect(
          royaltyRegistry
            .connect(deployer)
            .changeCollectionAuthorizedSignerAddress(AddressZero)
        ).to.be.revertedWith("Invalid address");
      });

      it("should revert if try to set collection owner with zero address", async () => {
        await expect(
          royaltyRegistry.connect(deployer).changeCollectionOwner(AddressZero)
        ).to.be.revertedWith("Invalid address");
      });

      it("should revert if try to set royalty registry with non-contract address", async () => {
        await expect(
          modelNFT.connect(manager).changeRoyaltyRegistry(AddressZero)
        ).to.be.revertedWith("Invalid address");

        await expect(
          modelNFT.connect(manager).changeRoyaltyRegistry(bob.address)
        ).to.be.revertedWith("Invalid address");
      });
    });
  });

  describe("mint", () => {
    it("mint nft", async () => {
      const uri = ["https://1"];
      const nftReceiver = sarah.address;
      const signature = await getMintSignature(signer, modelNFT, bob, uri);
      await modelNFT
        .connect(bob)
        .mint(nftReceiver, uri, formulaType, defaultTotalMint, signature);

      expect(await modelNFT.totalSupply()).to.equal(1);
      expect(await modelNFT.ownerOf(0)).to.equal(sarah.address);
      expect(await modelNFT.balanceOf(sarah.address)).to.equal(1);
      expect(await modelNFT.tokenURI(0)).to.equal(uri[0]);
    });

    it("mint nft with empty uri", async () => {
      const uri = [""];
      const nftReceiver = sarah.address;
      const signature = await getMintSignature(signer, modelNFT, bob, uri);
      await modelNFT
        .connect(bob)
        .mint(nftReceiver, uri, formulaType, defaultTotalMint, signature);

      expect(await modelNFT.totalSupply()).to.equal(1);
      expect(await modelNFT.ownerOf(0)).to.equal(sarah.address);
      expect(await modelNFT.balanceOf(sarah.address)).to.equal(1);
      expect(await modelNFT.tokenURI(0)).to.equal(uri[0]);
    });

    it("mint nft with baseURI is set", async () => {
      const newBaseURI = "https://";
      await modelNFT.connect(manager).setBaseURI(newBaseURI);
      expect(await modelNFT.baseURI()).to.equal(newBaseURI);

      const uri = ["1"];
      const nftReceiver = sarah.address;
      const signature = await getMintSignature(signer, modelNFT, bob, uri);
      await modelNFT
        .connect(bob)
        .mint(nftReceiver, uri, formulaType, defaultTotalMint, signature);

      expect(await modelNFT.totalSupply()).to.equal(1);
      expect(await modelNFT.ownerOf(0)).to.equal(sarah.address);
      expect(await modelNFT.balanceOf(sarah.address)).to.equal(1);
      expect(await modelNFT.tokenURI(0)).to.equal(newBaseURI + uri);
    });

    it("mint nft with baseURI is set but with empty uri", async () => {
      const newBaseURI = "https://";
      await modelNFT.connect(manager).setBaseURI(newBaseURI);
      expect(await modelNFT.baseURI()).to.equal(newBaseURI);

      const uri = [""];
      const nftReceiver = sarah.address;
      const signature = await getMintSignature(signer, modelNFT, bob, uri);
      await modelNFT
        .connect(bob)
        .mint(nftReceiver, uri, formulaType, defaultTotalMint, signature);

      expect(await modelNFT.totalSupply()).to.equal(1);
      expect(await modelNFT.ownerOf(0)).to.equal(sarah.address);
      expect(await modelNFT.balanceOf(sarah.address)).to.equal(1);
      expect(await modelNFT.tokenURI(0)).to.equal(newBaseURI + 0);
    });

    it("mint nft by multiple users", async () => {
      const nftReceiver = sarah.address;
      const iterations = 5;
      let uri, signature, sender, tx;
      const accounts = await ethers.getSigners();

      for (let i = 0; i < iterations; i++) {
        uri = [`https://${i}`];
        sender = accounts[i];
        signature = await getMintSignature(signer, modelNFT, sender, uri);
        tx = await modelNFT
          .connect(sender)
          .mint(nftReceiver, uri, formulaType, defaultTotalMint, signature);
        expect(await modelNFT.totalSupply()).to.equal(i + 1);
        expect(await modelNFT.balanceOf(sarah.address)).to.equal(i + 1);
        expect(await modelNFT.ownerOf(i)).to.equal(sarah.address);
        expect(await modelNFT.tokenURI(i)).to.equal(uri[0]);
        await expect(tx)
          .to.emit(modelNFT, "Transfer")
          .withArgs(AddressZero, sarah.address, i);
      }

      expect(await modelNFT.totalSupply()).to.equal(iterations);
      expect(await modelNFT.balanceOf(sarah.address)).to.equal(iterations);
    });

    describe("revert common mint", () => {
      it("mint should revert if invalid signature", async () => {
        const uri = ["https://1"];
        const nftReceiver = sarah.address;
        const signature = await getMintSignature(signer, modelNFT, sarah, uri);
        await expect(
          modelNFT
            .connect(bob)
            .mint(nftReceiver, uri, formulaType, defaultTotalMint, signature)
        ).to.be.revertedWith("Invalid signature");
      });

      it("mint multiple nft should not revert", async () => {
        const nftReceiver = sarah.address;
        const iterations = 5;
        let uri, signature;

        for (let i = 0; i < iterations; i++) {
          uri = [`https://${i}`];
          signature = await getMintSignature(signer, modelNFT, bob, uri);
          await modelNFT
            .connect(bob)
            .mint(nftReceiver, uri, formulaType, defaultTotalMint, signature);
          expect(await modelNFT.totalSupply()).to.equal(i + 1);
          expect(await modelNFT.balanceOf(sarah.address)).to.equal(i + 1);
          expect(await modelNFT.ownerOf(i)).to.equal(sarah.address);
          expect(await modelNFT.tokenURI(i)).to.equal(uri[0]);
        }

        expect(await modelNFT.totalSupply()).to.equal(iterations);
        expect(await modelNFT.ownerOf(0)).to.equal(sarah.address);
        expect(await modelNFT.balanceOf(sarah.address)).to.equal(iterations);
      });
    });

    describe("revert mint limit reached", () => {
      beforeEach(async () => {
        const ModelNFT = await getContractFactory("MockModelNFT", deployer);
        modelNFT = await ModelNFT.deploy(
          MODEL_NAME,
          MODEL_ID,
          1,
          TOKEN_PAYMENT,
          designer.address,
          royaltyRegistry.address
        );
      });

      it("should revert if mint limit has been reached", async () => {
        const uri1 = ["https://1"];
        const uri2 = ["https://2"];
        const nftReceiver = sarah.address;
        let signature = await getMintSignature(signer, modelNFT, bob, uri1);
        await modelNFT
          .connect(bob)
          .mint(nftReceiver, uri1, formulaType, defaultTotalMint, signature);

        signature = await getMintSignature(signer, modelNFT, sarah, uri2);
        await expect(
          modelNFT
            .connect(sarah)
            .mint(nftReceiver, uri2, formulaType, defaultTotalMint, signature)
        ).to.be.revertedWith("Maximum limit has been reached");
      });
    });
  });

  describe("mint with payment", () => {
    context("with eth as payment should revert", async () => {
      it("if eth amount is not valid", async () => {
        const newPrice = ethers.utils.parseEther("1");
        await nftFormula.setFormulaPrices(formulaType, newPrice);
        const uri = ["https://1"];
        const nftReceiver = sarah.address;
        const signature = await getMintSignature(signer, modelNFT, bob, uri);
        await expect(
          modelNFT
            .connect(bob)
            .mint(nftReceiver, uri, formulaType, defaultTotalMint, signature, {
              value: newPrice.mul(2),
            })
        ).to.be.revertedWith("Invalid eth for purchasing"); // invalid eth as payment
      });

      it("if failed to forward eth to manager", async () => {
        const newPrice = ethers.utils.parseEther("1");
        await nftFormula.setFormulaPrices(formulaType, newPrice);
        const uri = ["https://1"];
        const nftReceiver = sarah.address;
        const signature = await getMintSignature(signer, modelNFT, bob, uri);
        const NewManager = await getContractFactory("MockManager", deployer);
        const newManager = await NewManager.deploy();

        await expect(
          deployer.sendTransaction({
            to: newManager.address,
            value: newPrice,
          })
        ).to.be.reverted;

        await royaltyRegistry.changeCollectionManager(newManager.address);
        await expect(
          modelNFT
            .connect(bob)
            .mint(nftReceiver, uri, formulaType, defaultTotalMint, signature, {
              value: newPrice,
            })
        ).to.be.reverted;
      });
    });

    context("with eth as payment", async () => {
      it("should return correct token payment & price", async () => {
        const [tokenPayment, tokenPrice] = await Promise.all([
          modelNFT.tokenPayment(),
          modelNFT.tokenPrice(formulaType),
        ]);

        expect(tokenPayment).to.equal(AddressZero);
        expect(tokenPrice.toString()).to.equal("0");
      });

      it("mint nft with eth ", async () => {
        const newPrice = ethers.utils.parseEther("1");
        await nftFormula.setFormulaPrices(formulaType, newPrice);
        const uri = ["https://1"];
        const nftReceiver = sarah.address;
        const signature = await getMintSignature(signer, modelNFT, bob, uri);

        const previousTreasuryBalance = await provider.getBalance(
          manager.address
        );
        const previousBobBalance = await provider.getBalance(bob.address);

        await modelNFT
          .connect(bob)
          .mint(nftReceiver, uri, formulaType, defaultTotalMint, signature, {
            value: newPrice,
          });

        expect(await modelNFT.totalSupply()).to.equal(1);
        expect(await modelNFT.ownerOf(0)).to.equal(sarah.address);
        expect(await modelNFT.balanceOf(sarah.address)).to.equal(1);
        expect(await modelNFT.tokenURI(0)).to.equal(uri[0]);

        const latestTreasuryBalance = await provider.getBalance(
          manager.address
        );
        const latestBobBalance = await provider.getBalance(bob.address);

        expect(latestTreasuryBalance).to.equal(
          previousTreasuryBalance.add(newPrice)
        );

        expect(latestBobBalance.lt(previousBobBalance)).to.equal(true);
      });
    });

    context("with token as payment should revert", async () => {
      it("if token amount approved insufficient", async () => {
        const newPrice = ethers.utils.parseEther("1");
        await nftFormula.setFormulaPrices(formulaType, newPrice);
        await modelNFT
          .connect(manager)
          .setTokenPayment(mockPaymentToken.address);

        const supply = ethers.utils.parseEther("1000");
        // supply bob with erc20 token
        await mockPaymentToken.transfer(bob.address, supply);

        const uri = ["https://1"];
        const nftReceiver = sarah.address;
        const signature = await getMintSignature(signer, modelNFT, bob, uri);

        await expect(
          modelNFT
            .connect(bob)
            .mint(nftReceiver, uri, formulaType, defaultTotalMint, signature)
        ).to.be.revertedWith("ERC20: insufficient allowance");
      });

      it("if send eth for erc20 as token payment", async () => {
        const newPrice = ethers.utils.parseEther("1");
        await nftFormula.setFormulaPrices(formulaType, newPrice);
        await modelNFT
          .connect(manager)
          .setTokenPayment(mockPaymentToken.address);

        const supply = ethers.utils.parseEther("1000");
        // supply bob with erc20 token
        await mockPaymentToken.transfer(bob.address, supply);

        // let bob approve the token to the nft contract
        await mockPaymentToken.connect(bob).approve(modelNFT.address, supply);

        const uri = ["https://1"];
        const nftReceiver = sarah.address;
        const signature = await getMintSignature(signer, modelNFT, bob, uri);

        await expect(
          modelNFT
            .connect(bob)
            .mint(nftReceiver, uri, formulaType, defaultTotalMint, signature, {
              value: 1,
            })
        ).to.be.revertedWith("ETH_NOT_ALLOWED");
      });
    });

    context("with token as payment", async () => {
      it("should return correct token payment & price", async () => {
        const newPrice = ethers.utils.parseEther("1");
        await nftFormula.setFormulaPrices(formulaType, newPrice);
        await modelNFT
          .connect(manager)
          .setTokenPayment(mockPaymentToken.address);

        const [tokenPayment, tokenPrice] = await Promise.all([
          modelNFT.tokenPayment(),
          modelNFT.tokenPrice(formulaType),
        ]);

        expect(tokenPayment).to.equal(mockPaymentToken.address);
        expect(tokenPrice.toString()).to.equal(newPrice.toString());
      });

      it("mint nft with erc20 token ", async () => {
        const newPrice = ethers.utils.parseEther("1");
        await nftFormula.setFormulaPrices(formulaType, newPrice);
        await modelNFT
          .connect(manager)
          .setTokenPayment(mockPaymentToken.address);

        const supply = ethers.utils.parseEther("1000");
        // supply bob with erc20 token
        await mockPaymentToken.transfer(bob.address, supply);

        // let bob approve the token to the nft contract
        await mockPaymentToken.connect(bob).approve(modelNFT.address, supply);
        const uri = ["https://1"];
        const nftReceiver = sarah.address;
        const signature = await getMintSignature(signer, modelNFT, bob, uri);

        const previousTreasuryBalance = await mockPaymentToken.balanceOf(
          manager.address
        );
        const previousBobBalance = await mockPaymentToken.balanceOf(
          bob.address
        );

        await modelNFT
          .connect(bob)
          .mint(nftReceiver, uri, formulaType, defaultTotalMint, signature);

        expect(await modelNFT.totalSupply()).to.equal(1);
        expect(await modelNFT.ownerOf(0)).to.equal(sarah.address);
        expect(await modelNFT.balanceOf(sarah.address)).to.equal(1);
        expect(await modelNFT.tokenURI(0)).to.equal(uri[0]);

        const latestTreasuryBalance = await mockPaymentToken.balanceOf(
          manager.address
        );
        const latestBobBalance = await mockPaymentToken.balanceOf(bob.address);

        expect(latestTreasuryBalance).to.equal(
          previousTreasuryBalance.add(newPrice)
        );

        expect(latestBobBalance.lt(previousBobBalance)).to.equal(true);
      });
    });
  });

  describe("Multiple mint within 1 transaction", async () => {
    it("should revert if invalid eth with total mint", async () => {
      const newPrice = ethers.utils.parseEther("1");
      await nftFormula.setFormulaPrices(formulaType, newPrice);
      const uri = [];
      const nftReceiver = sarah.address;
      const totalMint = 10;
      const localFormulaType = 1;

      for (let i = 0; i < totalMint; i++) {
        uri.push("https://" + i);
      }

      const signature = await getMintSignature(
        signer,
        modelNFT,
        bob,
        uri,
        localFormulaType,
        totalMint
      );

      await expect(
        modelNFT
          .connect(bob)
          .mint(nftReceiver, uri, formulaType, totalMint, signature, {
            value: BigNumber.from(newPrice).toString(),
          })
      ).to.be.revertedWith("Invalid eth for purchasing");
    });

    it("should revert using the old signature", async () => {
      const newPrice = ethers.utils.parseEther("1");
      await nftFormula.setFormulaPrices(formulaType, newPrice);
      const uri = [];
      const nftReceiver = sarah.address;
      const totalMint = 10;
      const localFormulaType = 1;

      for (let i = 0; i < totalMint; i++) {
        uri.push("https://" + i);
      }

      const signature = await getMintSignature(
        signer,
        modelNFT,
        bob,
        uri,
        localFormulaType,
        totalMint
      );

      await modelNFT
        .connect(bob)
        .mint(nftReceiver, uri, formulaType, totalMint, signature, {
          value: BigNumber.from(newPrice)
            .mul(BigNumber.from(totalMint))
            .toString(),
        });

      await expect(
        modelNFT
          .connect(bob)
          .mint(nftReceiver, uri, formulaType, totalMint, signature, {
            value: BigNumber.from(newPrice)
              .mul(BigNumber.from(totalMint))
              .toString(),
          })
      ).to.be.revertedWith("Signature has been used");
    });

    it("revert if mismatch length for token uri", async () => {
      const newPrice = ethers.utils.parseEther("1");
      await nftFormula.setFormulaPrices(formulaType, newPrice);
      const uri = [];
      const nftReceiver = sarah.address;
      const totalMint = 10;
      const localFormulaType = 1;

      for (let i = 0; i < totalMint; i++) {
        uri.push("https://" + i);
      }

      uri.push("malicious uri");

      const signature = await getMintSignature(
        signer,
        modelNFT,
        bob,
        uri,
        localFormulaType,
        totalMint
      );

      await expect(
        modelNFT
          .connect(bob)
          .mint(nftReceiver, uri, formulaType, totalMint, signature, {
            value: BigNumber.from(newPrice)
              .mul(BigNumber.from(totalMint))
              .toString(),
          })
      ).to.be.revertedWith("Mismatch length of token uri");
    });

    it("should be able to multiple mint with eth as payment", async () => {
      const newPrice = ethers.utils.parseEther("1");
      await nftFormula.setFormulaPrices(formulaType, newPrice);
      const uri = [];
      const nftReceiver = sarah.address;
      const totalMint = 10;
      const localFormulaType = 1;

      for (let i = 0; i < totalMint; i++) {
        uri.push("https://" + i);
      }

      const signature = await getMintSignature(
        signer,
        modelNFT,
        bob,
        uri,
        localFormulaType,
        totalMint
      );

      const previousTreasuryBalance = await provider.getBalance(
        manager.address
      );
      const previousBobBalance = await provider.getBalance(bob.address);

      await modelNFT
        .connect(bob)
        .mint(nftReceiver, uri, formulaType, totalMint, signature, {
          value: BigNumber.from(newPrice)
            .mul(BigNumber.from(totalMint))
            .toString(),
        });

      expect(await modelNFT.totalSupply()).to.equal(totalMint);
      expect(await modelNFT.balanceOf(sarah.address)).to.equal(totalMint);

      for (let i = 0; i < totalMint; i++) {
        expect(await modelNFT.ownerOf(i)).to.equal(sarah.address);
        expect(await modelNFT.tokenURI(i)).to.equal(uri[i]);
      }

      const latestTreasuryBalance = await provider.getBalance(manager.address);
      const latestBobBalance = await provider.getBalance(bob.address);

      expect(latestTreasuryBalance).to.equal(
        previousTreasuryBalance.add(
          BigNumber.from(newPrice).mul(BigNumber.from(totalMint))
        )
      );

      expect(latestBobBalance.lt(previousBobBalance)).to.equal(true);
    });
  });
});
