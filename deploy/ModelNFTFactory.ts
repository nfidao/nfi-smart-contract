import { DeployFunction } from "hardhat-deploy/types";
import { ModelNFTFactory } from "../typechain";

const func: DeployFunction = async ({
  deployments: { deploy },
  getNamedAccounts,
  network,
}) => {
  const { deployer } = await getNamedAccounts();
  const royaltyRegistry = "0x456371C0bECd61e9F337c166f9B9db4aC0c25255";

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
