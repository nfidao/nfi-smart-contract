import { DeployFunction } from "hardhat-deploy/types";
import { RoyaltyRegistry } from "../typechain";

const func: DeployFunction = async ({
  deployments: { deploy },
  getNamedAccounts,
  network,
}) => {
  const { deployer } = await getNamedAccounts();
  const receiver = deployer;
  const defaultRate = 100;

  await deploy("RoyaltyRegistry", {
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
          args: [receiver, defaultRate],
        },
      },
    },
    from: deployer,
    log: true,
  });
};

func.tags = ["RoyaltyRegistry"];

export default func;
