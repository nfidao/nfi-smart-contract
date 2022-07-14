import { DeployFunction } from "hardhat-deploy/types";
import { ModelNFTFactory } from "../typechain";

const func: DeployFunction = async ({
  deployments: { deploy},
  getNamedAccounts,
  network,
}) => {
  const { deployer } = await getNamedAccounts();

  await deploy("ModelNFTFactory", {
    proxy: {
      owner: deployer,
      proxyContract: "OpenZeppelinTransparentProxy",
      viaAdminContract: { name: "RoyaltyRegistryProxyAdmin", artifact: "ObjxProxyAdmin" },
      execute: {
        init: {
          methodName: "initialize",
          args: [],
        },
      },
    },
    from: deployer,
    log: true,
  });
};

func.tags = ["ModelNFTFactory"];

export default func;
