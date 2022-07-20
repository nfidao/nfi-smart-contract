import { DeployFunction } from "hardhat-deploy/types";
import { ModelNFTFactory } from "../typechain";

const func: DeployFunction = async ({
  deployments: { deploy },
  getNamedAccounts,
  network,
}) => {
  const { deployer } = await getNamedAccounts();
  const royaltyRegistry = "0x855e2Ed9B89B011f75439E6D47bC3924479BbA13";

  await deploy("ModelNFTFactory", {
    proxy: {
      owner: deployer,
      proxyContract: "OpenZeppelinTransparentProxy",
      viaAdminContract: {
        name: "RoyaltyRegistryProxyAdmin",
        artifact: "ObjxProxyAdmin",
      },
      execute: {
        init: {
          methodName: "initialize",
          args: [royaltyRegistry],
        },
      },
    },
    from: deployer,
    log: true,
  });
};

func.tags = ["ModelNFTFactory"];

export default func;
