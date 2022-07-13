import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers, waffle } from "hardhat";
import type { ModelNFT, RoyaltyRegistry } from "../typechain";

const {
  constants: { AddressZero },
  getContractFactory,
} = ethers;

const getMintSignature = async function (
  signerAccount: SignerWithAddress,
  nftContract: ModelNFT,
  senderAccount: SignerWithAddress,
  uri: string
) {
  const messageDigest = ethers.utils.solidityKeccak256(
    ["address", "string", "address"],
    [senderAccount.address, uri, nftContract.address]
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
  let royaltyReceiver: SignerWithAddress;
  let bob: SignerWithAddress;
  let sarah: SignerWithAddress;
  let modelNFT: ModelNFT;
  let royaltyRegistry: RoyaltyRegistry;

  const MODEL_NAME = "TEST";
  const MODEL_ID = "ID";
  const MODEL_LIMIT = BigNumber.from(100);
  const RATE = BigNumber.from(100);

  const fixture = async (): Promise<[ModelNFT, RoyaltyRegistry]> => {
    [deployer, designer, manager, signer, royaltyReceiver, bob, sarah] =
      await ethers.getSigners();

    const RoyaltyRegistry = await getContractFactory(
      "RoyaltyRegistry",
      deployer
    );

    royaltyRegistry = (await RoyaltyRegistry.deploy()) as RoyaltyRegistry;

    await royaltyRegistry.initialize(royaltyReceiver.address, RATE);

    modelNFT = (await (
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
      expect(await modelNFT.authorizedSignerAddress()).to.equal(signer.address);
      expect(await modelNFT.royaltyRegistry()).to.equal(
        royaltyRegistry.address
      );
    });

    it("royalty info should return correct value", async () => {
      const saleAmount = RATE;
      const royaltyInfo = await modelNFT.royaltyInfo(0, saleAmount);
      expect(royaltyInfo[0]).to.equal(royaltyReceiver.address);
      expect(royaltyInfo[1].toString()).to.equal(saleAmount.div(RATE));
    });

    it("base uri should be empty", async () => {
      expect(await modelNFT.baseURI()).to.equal("");
    });

    it("set base uri", async () => {
      const newBaseURI = "https://";
      const tx = await modelNFT.connect(manager).setBaseURI(newBaseURI);
      expect(await modelNFT.baseURI()).to.equal(newBaseURI);

      expect(tx)
        .to.emit(modelNFT, "BaseUriUpdated")
        .withArgs(manager.address, "", newBaseURI);
    });

    it("supports interface", async() => {
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
            designer.address,
            manager.address,
            signer.address,
            deployer.address /** non-contract address for royalty registry */
          )
        ).to.be.revertedWith("Invalid royalty registry address");
      });

      it("should revert for zero signer address", async () => {
        const ModelNFT = await getContractFactory("ModelNFT", deployer);
        await expect(
          ModelNFT.deploy(
            MODEL_NAME,
            MODEL_ID,
            MODEL_LIMIT,
            designer.address,
            manager.address,
            AddressZero /** Zero signer address */,
            royaltyRegistry.address
          )
        ).to.be.revertedWith("Invalid signer address");
      });

      it("token uri should revert since token does not exist", async() => {
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

      expect(tx)
        .to.emit(modelNFT, "DesignerUpdated")
        .withArgs(designer.address, bob.address);
    });

    it("change manager address", async () => {
      expect(await modelNFT.manager()).to.equal(manager.address);
      const tx = await modelNFT.connect(manager).setManager(bob.address);
      expect(await modelNFT.manager()).to.equal(bob.address);

      expect(tx)
        .to.emit(modelNFT, "ManagerUpdated")
        .withArgs(manager.address, bob.address);
    });

    it("change signer address", async () => {
      expect(await modelNFT.authorizedSignerAddress()).to.equal(signer.address);
      const tx = await modelNFT
        .connect(manager)
        .changeAuthorizedSignerAddress(bob.address);
      expect(await modelNFT.authorizedSignerAddress()).to.equal(bob.address);

      expect(tx)
        .to.emit(modelNFT, "AuthorizedSignerAddressUpdated")
        .withArgs(manager.address, signer.address, bob.address);
    });

    it("change royalty registry address", async () => {
      expect(await modelNFT.royaltyRegistry()).to.equal(
        royaltyRegistry.address
      );
      const tx = await modelNFT
        .connect(manager)
        .changeRoyaltyRegistry(modelNFT.address);
      expect(await modelNFT.royaltyRegistry()).to.equal(modelNFT.address);

      expect(tx)
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

      it("should revert if set manager from non-manager account", async () => {
        await expect(
          modelNFT.connect(designer).setManager(bob.address)
        ).to.be.revertedWith(
          "Unauthorized"
        ); /** try to send tx from designer account */
      });

      it("should revert if set signer from non-manager account", async () => {
        await expect(
          modelNFT.connect(designer).changeAuthorizedSignerAddress(bob.address)
        ).to.be.revertedWith(
          "Unauthorized"
        ); /** try to send tx from designer account */
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

      it("should revert if try to set manager with zero address", async () => {
        await expect(
          modelNFT.connect(manager).setManager(AddressZero)
        ).to.be.revertedWith("Invalid address");
      });

      it("should revert if try to set signer with zero address", async () => {
        await expect(
          modelNFT.connect(manager).changeAuthorizedSignerAddress(AddressZero)
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
      const uri = "https://1";
      const nftReceiver = sarah.address;
      const signature = await getMintSignature(signer, modelNFT, bob, uri);
      await modelNFT.connect(bob).mint(nftReceiver, uri, signature);

      expect(await modelNFT.totalSupply()).to.equal(1);
      expect(await modelNFT.ownerOf(0)).to.equal(sarah.address);
      expect(await modelNFT.balanceOf(sarah.address)).to.equal(1);
      expect(await modelNFT.tokenURI(0)).to.equal(uri);
    });

    it("mint nft with empty uri", async () => {
      const uri = "";
      const nftReceiver = sarah.address;
      const signature = await getMintSignature(signer, modelNFT, bob, uri);
      await modelNFT.connect(bob).mint(nftReceiver, uri, signature);

      expect(await modelNFT.totalSupply()).to.equal(1);
      expect(await modelNFT.ownerOf(0)).to.equal(sarah.address);
      expect(await modelNFT.balanceOf(sarah.address)).to.equal(1);
      expect(await modelNFT.tokenURI(0)).to.equal(uri);
    });

    it("mint nft with baseURI is set", async () => {
      const newBaseURI = "https://";
      await modelNFT.connect(manager).setBaseURI(newBaseURI);
      expect(await modelNFT.baseURI()).to.equal(newBaseURI);

      const uri = "1";
      const nftReceiver = sarah.address;
      const signature = await getMintSignature(signer, modelNFT, bob, uri);
      await modelNFT.connect(bob).mint(nftReceiver, uri, signature);

      expect(await modelNFT.totalSupply()).to.equal(1);
      expect(await modelNFT.ownerOf(0)).to.equal(sarah.address);
      expect(await modelNFT.balanceOf(sarah.address)).to.equal(1);
      expect(await modelNFT.tokenURI(0)).to.equal(newBaseURI + uri);
    });

    it("mint nft with baseURI is set but with empty uri", async () => {
      const newBaseURI = "https://";
      await modelNFT.connect(manager).setBaseURI(newBaseURI);
      expect(await modelNFT.baseURI()).to.equal(newBaseURI);

      const uri = "";
      const nftReceiver = sarah.address;
      const signature = await getMintSignature(signer, modelNFT, bob, uri);
      await modelNFT.connect(bob).mint(nftReceiver, uri, signature);

      expect(await modelNFT.totalSupply()).to.equal(1);
      expect(await modelNFT.ownerOf(0)).to.equal(sarah.address);
      expect(await modelNFT.balanceOf(sarah.address)).to.equal(1);
      expect(await modelNFT.tokenURI(0)).to.equal(newBaseURI + 0);
    });

    it("mint nft by multiple users", async () => {
      const nftReceiver = sarah.address;
      const iterations = 5;
      let uri, signature, sender;
      const accounts = await ethers.getSigners();

      for (let i = 0; i < iterations; i++) {
        uri = `https://${i}`;
        sender = accounts[i];
        signature = await getMintSignature(signer, modelNFT, sender, uri);
        await modelNFT.connect(sender).mint(nftReceiver, uri, signature);
        expect(await modelNFT.totalSupply()).to.equal(i + 1);
        expect(await modelNFT.balanceOf(sarah.address)).to.equal(i + 1);
        expect(await modelNFT.ownerOf(i)).to.equal(sarah.address);
        expect(await modelNFT.tokenURI(i)).to.equal(uri);
      }

      expect(await modelNFT.totalSupply()).to.equal(iterations);
      expect(await modelNFT.balanceOf(sarah.address)).to.equal(iterations);
    });

    describe("revert common mint", () => {
      it("mint should revert if invalid signature", async () => {
        const uri = "https://1";
        const nftReceiver = sarah.address;
        const signature = await getMintSignature(signer, modelNFT, sarah, uri);
        await expect(modelNFT.connect(bob).mint(nftReceiver, uri, signature)).to.be.revertedWith("Invalid signature");
      })

      it("mint multiple nft should revert", async () => {
        const nftReceiver = sarah.address;
        const iterations = 5;
        let uri, signature;

        for (let i = 0; i < iterations; i++) {
          uri = `https://${i}`;
          signature = await getMintSignature(signer, modelNFT, bob, uri);
          if (i === 0) {
            await modelNFT.connect(bob).mint(nftReceiver, uri, signature);
            expect(await modelNFT.totalSupply()).to.equal(i + 1);
            expect(await modelNFT.balanceOf(sarah.address)).to.equal(i + 1);
            expect(await modelNFT.ownerOf(i)).to.equal(sarah.address);
            expect(await modelNFT.tokenURI(i)).to.equal(uri);
          } else {
            await expect(
              modelNFT.connect(bob).mint(nftReceiver, uri, signature)
            ).to.be.revertedWith("Address has been used");
          }
        }

        expect(await modelNFT.totalSupply()).to.equal(1);
        expect(await modelNFT.ownerOf(0)).to.equal(sarah.address);
        expect(await modelNFT.balanceOf(sarah.address)).to.equal(1);
      });
    });

    describe("revert mint limit reached", () => {
      beforeEach(async () => {
        const ModelNFT = await getContractFactory("ModelNFT", deployer);
        modelNFT = await ModelNFT.deploy(
          MODEL_NAME,
          MODEL_ID,
          1,
          designer.address,
          manager.address,
          signer.address,
          royaltyRegistry.address
        );
      });

      it("should revert if mint limit has been reached", async () => {
        const uri1 = "https://1";
        const uri2 = "https://2";
        const nftReceiver = sarah.address;
        let signature = await getMintSignature(signer, modelNFT, bob, uri1);
        await modelNFT.connect(bob).mint(nftReceiver, uri1, signature);

        signature = await getMintSignature(signer, modelNFT, sarah, uri2);
        await expect(
          modelNFT.connect(sarah).mint(nftReceiver, uri2, signature)
        ).to.be.revertedWith("Maximum limit has been reached");
      });
    });
  });
});
