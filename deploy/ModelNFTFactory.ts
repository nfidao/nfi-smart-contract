import { DeployFunction } from "hardhat-deploy/types";
import { ModelNFTFactory } from "../typechain";

const func: DeployFunction = async ({
  deployments: { deploy },
  getNamedAccounts,
  network,
}) => {
  const { deployer } = await getNamedAccounts();
  const royaltyRegistry = "0xC6eA8da563A0eC2CD2A0deEe3dcaB51632b2CCd3";

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
