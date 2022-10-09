import { DeployFunction } from "hardhat-deploy/types";
import { ModelNFTFactory } from "../typechain";

const func: DeployFunction = async ({
  deployments: { deploy },
  getNamedAccounts,
  network,
}) => {
  const { deployer } = await getNamedAccounts();
  const royaltyRegistry = "0x7F4cDF911Ab92778Bf2B043fE6459c8CC3d2c6A2";

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
