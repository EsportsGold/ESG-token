var Owner = artifacts.require("./Owned.sol");
var Maths = artifacts.require("./SafeMath.sol");
var Token = artifacts.require("./ESGToken.sol");
var Assets = artifacts.require("./ESGAssetHolder.sol");
var Timelock = artifacts.require("./TokenTimelock.sol");
var ICOEvent = artifacts.require("./ICOEvent.sol");

module.exports = async (deployer) => {
  var beneficiaryAddr = "0x2caab4034d976b5748d6e1c6dd3fd999da693713";
  var holdingAddr = "0x36AfFc5d3D02173559aa4ce90dab2EF4A7E77DFD";

  deployer.deploy(Owner);
  deployer.deploy(Maths);
  deployer.link(Maths, [Token, ICOEvent]);
  await deployer.deploy(Token);
  await deployer.deploy(Timelock, Token.address, beneficiaryAddr);
  await deployer.deploy(ICOEvent);
  await Token.at(Token.address).setICOController(ICOEvent.address);
  await Token.at(Token.address).setParameters(Timelock.address);
  await ICOEvent.at(ICOEvent.address).ICO_setParameters(Token.address, 300, 100, 18620, 172414, holdingAddr, 31);
  await ICOEvent.at(ICOEvent.address).ICO_token_supplyCap();
  console.log("Contracts Deployed");

};
