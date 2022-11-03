import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async ({
  deployments: { deploy },
  getNamedAccounts,
  network,
}) => {
  const { deployer } = await getNamedAccounts();

  await deploy("NFTPriceFormula", {
    proxy: {
      owner: deployer,
      proxyContract: "OpenZeppelinTransparentProxy",
      viaAdminContract: {
        name: "DefaultProxyAdmin",
        artifact: "ObjxProxyAdmin",
      },
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

func.tags = ["NFTPriceFormula"];

export default func;
