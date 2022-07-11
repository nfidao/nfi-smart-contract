import { task } from "hardhat/config";

task(
  "getProxyAdminAndImpl",
  "Get Proxy Admin from transparent upgradeable proxy EIP 1967"
)
  .addParam("proxyAddress", "The Proxy Address")
  .setAction(async (taskArgs, hre) => {
    const upgrades = hre.upgrades;
    const proxyAddress = taskArgs.proxyAddress;
    const impl = await upgrades.erc1967.getImplementationAddress(proxyAddress);
    const admin = await upgrades.erc1967.getAdminAddress(proxyAddress);
    console.log("Proxy admin: ", admin);
    console.log("Proxy impl: ", impl);
  });
