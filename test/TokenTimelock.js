var ESGToken = artifacts.require("./ESGToken.sol");
var TokenTimelock = artifacts.require("./TokenTimelock.sol");
var Owned = artifacts.require("./Owned.sol");

contract('TokenTimelock', function(accounts) {
    it('1: verifies the balance of the timelock on construction is 0', async () => {

        // Create token for token address (Token functionality tested in ESGToken.js)
        let token = await ESGToken.new();
        let tokenAddress = await token.address;

        // Create new timelock contract
        let timelock = await TokenTimelock.new(tokenAddress, accounts[1]);
        let timelockAddress = await timelock.address;

        // Check that the balance of the timelock created is 0
        let balance = await token.balanceOf(timelockAddress);

        assert.equal(balance, 0);
    });

    it('2: should throw when attempting to construct a timelock with missing parameter', async () => {
        let token = await ESGToken.new();
        let tokenAddress = await token.address;

        try {
            let timelock = await TokenTimelock.new(tokenAddress,);
            assert(false, "didnt' throw");
        }
        catch (error) {
            let strError = error.toString();
            assert(strError.includes('invalid opcode') || strError.includes('invalid JUMP'), error.toString());
        }
        try {
            let timelock = await TokenTimelock.new(0x0, accounts[1]);
            assert(false, "didnt' throw");
        }
        catch (error) {
            let strError = error.toString();
            assert(strError.includes('invalid opcode') || strError.includes('invalid JUMP'), error.toString());
        }
    });

});
