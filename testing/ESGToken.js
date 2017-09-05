var ESGToken = artifacts.require("./ESGToken.sol");
var TokenTimelock = artifacts.require("./TokenTimelock.sol");
var Owned = artifacts.require("./Owned.sol");

contract('ESGToken', function(accounts) {

    it('1: verifies the token name, symbol and current/cap of supply as 0 on construction', async () => {
        let token = await ESGToken.new();

        let name = await token.name.call();
        let symbol = await token.symbol.call();
        assert.equal(name, 'ESG Token');
        assert.equal(symbol, 'ESG');

        let decimals = await token.decimals.call();
        let supplyCap = await token.supplyCap.call();
        assert.equal(decimals, 3);
        assert.equal(supplyCap, 0);

        let currentSupply = await token.currentSupply.call();
        assert.equal(currentSupply, 0);

        let controller = await token.ICOcontroller.call();
        let timelock = await token.timelockTokens.call();
        assert.equal(controller, 0x0);
        assert.equal(timelock, 0x0);
    });

    it('2: verify that setting the ICO controller address updates correctly', async () => {
        let token = await ESGToken.new();

        await token.setICOController(accounts[1]);
        let icoAddress = await token.ICOcontroller.call();

        assert.equal(icoAddress, accounts[1]);        
    });

    it('3: verify that ICO controller cannot be set with incorrect address', async () => {
        let token = await ESGToken.new();

        try {
            await token.setICOController(0x0);
            assert(false, "didnt' throw");
        }
        catch (error) {
            let strError = error.toString();
            assert(strError.includes('invalid opcode') || strError.includes('invalid JUMP'), error.toString());
        }
    });

    it('4: verify that setting the parameters (timelock address) updates the timelock address correctly', async () => {
        let token = await ESGToken.new();
        let tokenAddress = await token.address;
        let timelock = await TokenTimelock.new(tokenAddress, accounts[1]); // call new timelock with token address and test address
        let testTimelockAddress = await timelock.address;

        await token.setParameters(testTimelockAddress);
        let timelockAddress = await token.timelockTokens.call();

        assert.equal(timelockAddress, testTimelockAddress);
    });

    it('5: verify that setting the supply cap updates the supply cap correctly', async () => {
        let token = await ESGToken.new();
        let supplyCap = await token.supplyCap.call();
        let decimals = await token.decimals.call();
        assert.equal(supplyCap, 0);

        // Set supply cap
        let expected = 123456;
        await token.setTokenCapInUnits(expected);

        supplyCap = await token.supplyCap.call();
        expected = expected * Math.pow(10, decimals); // SupplyCap has been converted to decimals

        assert.equal(supplyCap, expected);
    });

    it('6: verify that minting 1 token fails if supply cap is not set and passes if supply cap is set', async () => {
        let token = await ESGToken.new();

        try {
            await token.mint(accounts[1], 1);
            assert(false, "didnt' throw");
        }
        catch (error) {
            let strError = error.toString();
            assert(strError.includes('invalid opcode') || strError.includes('invalid JUMP'), error.toString());
        }

        // Set supply cap
        let expected = 100; // Will get increased by decimal factor
        await token.setTokenCapInUnits(expected);

        try {
            await token.mint(accounts[1], 1);
        }
        catch (error) {
            let strError = error.toString();
            assert(strError.includes('invalid opcode') || strError.includes('invalid JUMP'), error.toString());
        }        
    });

    it('7: verify that mint function throws with invalid address', async () => {
        let token = await ESGToken.new();
        let expected = 100;
        await token.setTokenCapInUnits(expected);

        try {
            await token.mint(0x0, 1);
            assert(false, "didnt' throw");
        }
        catch (error) {
            let strError = error.toString();
            assert(strError.includes('invalid opcode') || strError.includes('invalid JUMP'), error.toString());
        }      
    });

    it('8: verify that mintLockedTokens function throws without timelock address being set', async () => {
        let token = await ESGToken.new();
        let decimals = await token.decimals.call();
        let supplyCap = 100;
        let tokenAddress = await token.address;
        let tokensToMint = 1;

        // Set the supply cap to ensure not thrown (test 5 and test 6)
        await token.setTokenCapInUnits(supplyCap);
        let timelock = await TokenTimelock.new(tokenAddress, accounts[1]); 
        let testTimelockAddress = await timelock.address;

        // Without timelock being set - minting tokens to the timelock contract should now throw
        try {
            await token.mintLockedTokens(tokensToMint);
            assert(false, "didnt' throw");
        }
        catch (error) {
            let strError = error.toString();
            assert(strError.includes('invalid opcode') || strError.includes('invalid JUMP'), error.toString());
        } 

        // See test 4 for timelock address verification
        await token.setParameters(testTimelockAddress);

        // Mint timelock tokens and check balance is now updated
        await token.mintLockedTokens(tokensToMint);
        let balance = await token.balanceOf(testTimelockAddress);
        let expected = tokensToMint * Math.pow(10, decimals); 
        assert.equal(balance, expected);        
    });

    it('9: verify that starting balance for owner is 0', async () => {
        let token = await ESGToken.new();
        let tokenAddress = await token.address;
        let balance = await token.balanceOf(accounts[0]);
        assert.equal(balance, 0);
    });

    it('10: verify that full supplyCap can be minted and throws if more is issued', async () => {
        let token = await ESGToken.new();
        let supplyCap = 12345;

        // Set supply cap
        await token.setTokenCapInUnits(supplyCap);
        let balance = 0;

        try {
            await token.mint(accounts[1], supplyCap);
        }
        catch (error) {
            let strError = error.toString();
            assert(strError.includes('invalid opcode') || strError.includes('invalid JUMP'), error.toString());
        }
        try {
            supplyCap = supplyCap + 1;
            await token.mint(accounts[2], supplyCap);
            assert(false, "didnt' throw");
        }
        catch (error) {
            let strError = error.toString();
            assert(strError.includes('invalid opcode') || strError.includes('invalid JUMP'), error.toString());
        }
    });

    it('11: verifies the balances after a transfer', async () => {
        let token = await ESGToken.new();
        let decimals = await token.decimals.call();
        let supplyCap = 10000;
        await token.setTokenCapInUnits(supplyCap);

        await token.mint(accounts[0], 2250);            // In full decimals = 2250000
        let balance = await token.balanceOf(accounts[0]);
        let expected = 2250 * Math.pow(10, decimals); 
        assert.equal(balance, expected);

        let transfer = 250 * Math.pow(10, decimals);    // In full decimals = 250000
        await token.transfer(accounts[1], transfer);    // Transfer to account 1
        balance = await token.balanceOf(accounts[0]);
        expected = 2000 * Math.pow(10, decimals);       // Expected left = 2000000
        assert.equal(balance, expected);

        balance = await token.balanceOf(accounts[1]);
        expected = 250 * Math.pow(10, decimals);
        assert.equal(balance, expected);

    });

    it('12: verifies the allowance granted by an approver', async () => {
        let token = await ESGToken.new();
        let decimals = await token.decimals.call();
        let supplyCap = 10000;
        await token.setTokenCapInUnits(supplyCap);

        // Mint 1000 (units) of tokens
        await token.mint(accounts[0], 1000);
        // Approve is in full decimals 
        let testApprove = 300 * Math.pow(10, decimals);           
        await token.approve(accounts[1], testApprove)
        let allowance = await token.allowance(accounts[0], accounts[1]);
        assert.equal(allowance, testApprove);

    });

    it('13: verifies that balances are updated after approved transferFrom token transfer', async () => {
        let token = await ESGToken.new();
        let decimals = await token.decimals.call();
        let supplyCap = 10000;
        await token.setTokenCapInUnits(supplyCap);

        // Mint 1000 (units) of tokens
        await token.mint(accounts[1], 1000);
        // Approve is in full decimals 
        let testValue = 300 * Math.pow(10, decimals);           
        await token.approve(accounts[2], testValue, {from: accounts[1]});
        await token.transferFrom(accounts[1], accounts[2], testValue, {from: accounts[2]});
        let balance = await token.balanceOf(accounts[2]);

        assert.equal(balance, testValue);

    });

    it('14: should throw when attempting to transfer if account is frozen', async () => {
        let token = await ESGToken.new();
        let decimals = await token.decimals.call();
        let supplyCap = 10000;
        await token.setTokenCapInUnits(supplyCap);

        await token.mint(accounts[0], 2250);            // In full decimals = 2250000
        let balance = await token.balanceOf(accounts[0]);
        let expected = 2250 * Math.pow(10, decimals); 
        assert.equal(balance, expected);

        let transfer = 250 * Math.pow(10, decimals);    // In full decimals = 250000

        await token.freezeAccount(accounts[0], true);
        try {
            await token.transfer(accounts[1], transfer);
            assert(false, "didnt' throw");
        }
        catch (error) {
            let strError = error.toString();
            assert(strError.includes('invalid opcode') || strError.includes('invalid JUMP'), error.toString());
        }

        await token.freezeAccount(accounts[0], false);
        await token.transfer(accounts[1], transfer);    
        balance = await token.balanceOf(accounts[0]);
        expected = 2000 * Math.pow(10, decimals);       
        assert.equal(balance, expected);

        balance = await token.balanceOf(accounts[1]);
        expected = 250 * Math.pow(10, decimals);
        assert.equal(balance, expected);

    });

    it('15: verify that parameter booleans start in false and update to true so ICO can start', async () => {
        let token = await ESGToken.new();

        // Test default values
        let boolICOParameters = await token.controllerSet.call();
        let boolTokenParameters = await token.tokenParametersSet.call();
        assert.equal(boolICOParameters, false);
        assert.equal(boolTokenParameters, false);

        // Refer to test 2: set ICO controller
        await token.setICOController(accounts[2]);

        // Refer to test 4: set parameters
        let tokenAddress = await token.address;
        let timelock = await TokenTimelock.new(tokenAddress, accounts[1]); // call new timelock with token address and test address
        let testTimelockAddress = await timelock.address;
        await token.setParameters(testTimelockAddress);

        // Test updated values
        boolICOParameters = await token.controllerSet.call();
        boolTokenParameters = await token.tokenParametersSet.call();
        assert.equal(boolICOParameters, true);
        assert.equal(boolTokenParameters, true);
    });

    it('16: verify that only only owner can control restricted functions', async () => {
        let token = await ESGToken.new();
        let testAddress = '0x2caab4034d976b5748d6e1c6dd3fd999da693713';

        // Set ICO controller
        try {
            await token.setICOController(testAddress, {from: accounts[1]});
            assert(false, "didnt' throw");
        }
        catch (error) {
            let strError = error.toString();
            assert(strError.includes('invalid opcode') || strError.includes('invalid JUMP'), error.toString());
        }
        try {
            await token.setParameters(testAddress, {from: accounts[1]});
            assert(false, "didnt' throw");
        }
        catch (error) {
            let strError = error.toString();
            assert(strError.includes('invalid opcode') || strError.includes('invalid JUMP'), error.toString());
        }

        // Testing onlyControllerOrOwner functions
        await token.setICOController(accounts[1]);
        try {
            await token.setTokenCapInUnits(testAddress, {from: accounts[2]});
            assert(false, "didnt' throw");
        }
        catch (error) {
            let strError = error.toString();
            assert(strError.includes('invalid opcode') || strError.includes('invalid JUMP'), error.toString());
        }
        token.setParameters(testAddress) // To ensure not thrown from parameters
        token.setTokenCapInUnits(100); // To ensure not thrown from supplyCap
        try {
            await token.mint(testAddress, 10, {from: accounts[2]});
            assert(false, "didnt' throw");
        }
        catch (error) {
            let strError = error.toString();
            assert(strError.includes('invalid opcode') || strError.includes('invalid JUMP'), error.toString());
        }
    });
});
