import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async ({
  deployments: { deploy },
  getNamedAccounts,
}) => {
  const { deployer } = await getNamedAccounts();
  await deploy("RoyaltyRegistryProxyAdmin", {
    skipIfAlreadyDeployed: true,
    contract: "ObjxProxyAdmin",
    from: deployer,
    log: true,
  });
};

func.tags = ["RoyaltyRegistryProxyAdmin"];

export default func;
