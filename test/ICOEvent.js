var ESGToken = artifacts.require("./ESGToken.sol");
var TokenTimelock = artifacts.require("./TokenTimelock.sol");
var ICOEvent = artifacts.require("./ICOEvent.sol");
var Owned = artifacts.require("./Owned.sol");

contract('ICOEvent', function(accounts) {

    it('1: verifies the parameters on constructor of ICOEvent', async () => {

        let icoEvent = await ICOEvent.new();
        let state = await icoEvent.state.call();
        let tokensMinted = await icoEvent.totalTokensMinted.call();

        assert.equal(state, 0);
        assert.equal(tokensMinted, 0);
    });

    it('2: verifies that ICO requires parameters to be set before starting', async () => {
        
        let icoEvent = await ICOEvent.new();
        
        try {
            await icoEvent.ICO_start();
            assert(false, "didnt' throw");
        }
        catch (error) {
            let strError = error.toString();
            assert(strError.includes('invalid opcode') || strError.includes('invalid JUMP'), error.toString());
        }
    });

    it('3: verifies that variables are updated on setting ICO event parameters', async () => {
        let icoEvent = await ICOEvent.new();
        let token = await ESGToken.new();
        let tokenAddress = await token.address;
        let targetRate = 300;
        let capRate = 100;
        let baseTarget = 10000;
        let cap = 150000;
        let duration = 31;

        await icoEvent.ICO_setParameters(tokenAddress, targetRate, capRate, baseTarget, cap, accounts[0], duration);

        targetRate = await icoEvent.rate_toTarget.call();
        capRate = await icoEvent.rate_toCap.call();
        baseTarget = await icoEvent.baseTargetInWei.call();
        cap = await icoEvent.icoCapInWei.call();
        let endTime = await icoEvent.endTime.call();
        let startTime = await icoEvent.startTime.call();

        assert.equal(targetRate, 300);
        assert.equal(capRate, 100);
        assert.equal(baseTarget, 10000 * Math.pow(10, 18));
        assert.equal(cap, 150000 * Math.pow(10, 18));
    });

    it('4: verifies that constructor throws if missing variables on setting ICO event parameters', async () => {
        let icoEvent = await ICOEvent.new();
        let token = await ESGToken.new();
        let tokenAddress = await token.address;
        let targetRate = 300;
        let capRate = 100;
        let baseTarget = 10000;
        let cap = 150000;
        let duration = 31;

        try {
            await icoEvent.ICO_setParameters(0x0, targetRate, capRate, baseTarget, cap, accounts[0], duration);
            assert(false, "didnt' throw");
        }
        catch (error) {
            let strError = error.toString();
            assert(strError.includes('invalid opcode') || strError.includes('invalid JUMP'), error.toString());
        }
        try {
            await icoEvent.ICO_setParameters(tokenAddress, 0, capRate, baseTarget, cap, accounts[0], duration);
            assert(false, "didnt' throw");
        }
        catch (error) {
            let strError = error.toString();
            assert(strError.includes('invalid opcode') || strError.includes('invalid JUMP'), error.toString());
        }
        try {
            await icoEvent.ICO_setParameters(tokenAddress, targetRate, 0, baseTarget, cap, accounts[0], duration);
            assert(false, "didnt' throw");
        }
        catch (error) {
            let strError = error.toString();
            assert(strError.includes('invalid opcode') || strError.includes('invalid JUMP'), error.toString());
        }
        try {
            await icoEvent.ICO_setParameters(tokenAddress, targetRate, capRate, baseTarget, 0, accounts[0], duration);
            assert(false, "didnt' throw");
        }
        catch (error) {
            let strError = error.toString();
            assert(strError.includes('invalid opcode') || strError.includes('invalid JUMP'), error.toString());
        }
        try {
            await icoEvent.ICO_setParameters(tokenAddress, targetRate, capRate, baseTarget, cap, 0x0, duration);
            assert(false, "didnt' throw");
        }
        catch (error) {
            let strError = error.toString();
            assert(strError.includes('invalid opcode') || strError.includes('invalid JUMP'), error.toString());
        }
        try {
            await icoEvent.ICO_setParameters(tokenAddress, targetRate, capRate, baseTarget, cap, accounts[0], 0);
            assert(false, "didnt' throw");
        }
        catch (error) {
            let strError = error.toString();
            assert(strError.includes('invalid opcode') || strError.includes('invalid JUMP'), error.toString());
        }
    });

    it('5: verify calculations on minted tokens according to caps and rates', async () => {
        let icoEvent = await ICOEvent.new();
        let icoAddress = await icoEvent.address;
        let targetRate = 300;
        let capRate = 100;
        let baseTarget = 10000;
        let cap = 150000;
        let duration = 31;

        let token = await ESGToken.new();
        let tokenAddress = await token.address;
        let timelock = await TokenTimelock.new(tokenAddress, accounts[1]);  // Allows locked tokens to be minted to
        let timelockAddress = await timelock.address;
        await token.setICOController(icoAddress);   // Allow ICO to communicate with Token
        await token.setParameters(timelockAddress); // Sets tokenParametersSet to True

        await icoEvent.ICO_setParameters(tokenAddress, targetRate, capRate, baseTarget, cap, accounts[0], duration);
        await icoEvent.ICO_token_supplyCap();   // Run supply cap calculations
        
        let supplyOutput = await token.supplyCap.call();
        let decimals = await token.decimals.call();
        /*
            The expected supply cap is: (1) + (2) + (3)

            (1) ETH to base target * rate per ETH => targetRate * baseTarget
            (2) ETH from base target to cap * rate per ETH => capRate * (cap - baseTarget)
            (3) Tokens to be locked in Timelock contract as per whitepaper => 10% * (1)
            The code multiplies up the ETH in wei and then divides it back down into units to avoid fractional issues with
            any units
        */
        let weiConversion = Math.pow(10,18);
        let expected = ((300 * 10000 * weiConversion) / weiConversion) + ((100 * (150000-10000) * weiConversion) / weiConversion) + ((300 * 10000 * 10 / 100 * weiConversion) / weiConversion);
        // expected should be 17,300,000 tokens to be minted (in full units - not decimals)
        expected = expected * Math.pow(10, decimals);
        assert.equal(supplyOutput, expected);
    });

    it('6: verifies balances and ETH contributed after contribution made', async () => {
        let icoEvent = await ICOEvent.new();
        let icoAddress = await icoEvent.address;
        let token = await ESGToken.new();
        let tokenAddress = await token.address;
        let targetRate = 300;
        let capRate = 100;
        let baseTarget = 10000;
        let cap = 150000;
        let duration = 31;
        let decimals = await token.decimals.call();

        let timelock = await TokenTimelock.new(tokenAddress, accounts[1]);  // Allows locked tokens to be minted to
        let timelockAddress = await timelock.address;
        await token.setICOController(icoAddress);   // Allow ICO to communicate with Token
        await token.setParameters(timelockAddress); // Sets tokenParametersSet to True
        await icoEvent.ICO_setParameters(tokenAddress, targetRate, capRate, baseTarget, cap, accounts[0], duration);
        await icoEvent.ICO_token_supplyCap();
        await icoEvent.ICO_start();

        let startingEtherBalance = await web3.eth.getBalance(accounts[1]);
        let startingTokenBalance = await token.balanceOf(accounts[1]);
        assert.equal(startingTokenBalance, 0);

        let state = await icoEvent.state.call();
        let ended = await icoEvent.ICO_Ended();
        assert.equal(state, 0);
        assert.equal(ended, false);
        
        let contribution = 25 * Math.pow(10, 18); // Convert 25 Eth test value to wei
        await icoEvent.deposit(accounts[1], {value: contribution, from: accounts[1]});
      
        let endEtherBalance = await web3.eth.getBalance(accounts[1]);
        let endTokenBalance = await token.balanceOf(accounts[1]);

        let expectedTokens = 300 * 25 * Math.pow(10, decimals); // Includes decimals
        assert.equal(expectedTokens, endTokenBalance);

        let expectedEther = await web3.eth.getBalance(icoAddress);
        assert.equal(expectedEther, contribution);

        let totalContribution = await icoEvent.totalWeiContributed.call();
        assert.equal(totalContribution, contribution);
        
        let tokenBalance = await icoEvent.totalTokensMinted.call();
        assert.equal(tokenBalance, 300 * 25); // Tokens minted is held in units, not decimals
    });

    it('7: verify that the rate of tokens issued is calculated correctly around base target and cap', async () => {
        let icoEvent = await ICOEvent.new();
        let icoAddress = await icoEvent.address;
        let token = await ESGToken.new();
        let tokenAddress = await token.address;
        let targetRate = 300;
        let capRate = 100;
        let baseTarget = 2;                        // Low ether target of 2 used for test purposes
        let cap = 5;                               // Ether cap of 5
        let duration = 31;
        let decimals = await token.decimals.call();

        let timelock = await TokenTimelock.new(tokenAddress, accounts[1]);  // Allows locked tokens to be minted to
        let timelockAddress = await timelock.address;
        await token.setICOController(icoAddress);   // Allow ICO to communicate with Token
        await token.setParameters(timelockAddress); // Sets tokenParametersSet to True
        await icoEvent.ICO_setParameters(tokenAddress, targetRate, capRate, baseTarget, cap, accounts[0], duration);
        await icoEvent.ICO_token_supplyCap();
        await icoEvent.ICO_start();

        let startingTokenBalance = await token.balanceOf(accounts[1]);
        assert.equal(startingTokenBalance, 0);

        let contribution = 1 * Math.pow(10, 18); // 1 ETH in wei
        await icoEvent.deposit(accounts[1], {value: contribution, from: accounts[1]});
      
        let endTokenBalance = await token.balanceOf(accounts[1]);

        let expectedTokens = 300 * 1 * Math.pow(10, decimals); // Includes decimals
        assert.equal(expectedTokens, endTokenBalance);

        // Contributing 0.5 ether
        contribution = 0.5 * Math.pow(10, 18); // 0.5 ETH in wei
        await icoEvent.deposit(accounts[1], {value: contribution, from: accounts[1]});
        expectedTokens = expectedTokens + 300 * 0.5 * Math.pow(10, decimals); // Includes decimals
        endTokenBalance = await token.balanceOf(accounts[1]);
        assert.equal(expectedTokens, endTokenBalance);

        // Contributing 1.5 ether to take value past base target
        contribution = 1.5 * Math.pow(10, 18); // 0.5 ETH in wei
        await icoEvent.deposit(accounts[1], {value: contribution, from: accounts[1]});
        expectedTokens = expectedTokens + (300 * 0.5 * Math.pow(10, decimals) + 100 * 1 * Math.pow(10, decimals)); // Includes decimals
        endTokenBalance = await token.balanceOf(accounts[1]);
        assert.equal(expectedTokens, endTokenBalance);
    });

    it('8: verifies throw if contribution made before ICO starts', async () => {
        let icoEvent = await ICOEvent.new();
        let icoAddress = await icoEvent.address;
        let token = await ESGToken.new();
        let tokenAddress = await token.address;
        let targetRate = 300;
        let capRate = 100;
        let baseTarget = 2;                        // Low ether target of 2 used for test purposes
        let cap = 5;                               // Ether cap of 5
        let duration = 31;
        let decimals = await token.decimals.call();

        let timelock = await TokenTimelock.new(tokenAddress, accounts[1]);  // Allows locked tokens to be minted to
        let timelockAddress = await timelock.address;
        await token.setICOController(icoAddress);   // Allow ICO to communicate with Token
        await token.setParameters(timelockAddress); // Sets tokenParametersSet to True
        await icoEvent.ICO_setParameters(tokenAddress, targetRate, capRate, baseTarget, cap, accounts[0], duration);
        await icoEvent.ICO_token_supplyCap();
        
        // ICO ready to start
        let contribution = 1 * Math.pow(10, 18); // 1 ETH in wei

        try {
            await icoEvent.deposit(accounts[1], {value: contribution, from: accounts[1]});
            assert(false, "didnt' throw");
        }
        catch (error) {
            let strError = error.toString();
            assert(strError.includes('invalid opcode') || strError.includes('invalid JUMP'), error.toString());
        }
    });

    it('9: verify that functions throw if not owner sends request', async () => {
        let icoEvent = await ICOEvent.new();
        let icoAddress = await icoEvent.address;
        let token = await ESGToken.new();
        let tokenAddress = await token.address;
        let targetRate = 300;
        let capRate = 100;
        let baseTarget = 10000;
        let cap = 150000;
        let duration = 31;

        let timelock = await TokenTimelock.new(tokenAddress, accounts[1]);  // Allows locked tokens to be minted to
        let timelockAddress = await timelock.address;
        await token.setICOController(icoAddress);   // Allow ICO to communicate with Token
        await token.setParameters(timelockAddress); // Sets tokenParametersSet to True

        // Test access to restricted functions
        try {
            await icoEvent.ICO_setParameters(tokenAddress, targetRate, capRate, baseTarget, cap, accounts[0], duration, {from: accounts[1]});
            assert(false, "didnt' throw");
        }
        catch (error) {
            let strError = error.toString();
            assert(strError.includes('invalid opcode') || strError.includes('invalid JUMP'), error.toString());
        }

        await icoEvent.ICO_setParameters(tokenAddress, targetRate, capRate, baseTarget, cap, accounts[0], duration);
        try {
            await icoEvent.ICO_token_supplyCap({from: accounts[1]});
            assert(false, "didnt' throw");
        }
        catch (error) {
            let strError = error.toString();
            assert(strError.includes('invalid opcode') || strError.includes('invalid JUMP'), error.toString());
        }

        await icoEvent.ICO_token_supplyCap();
        try {
            await icoEvent.ICO_start({from: accounts[1]});
            assert(false, "didnt' throw");
        }
        catch (error) {
            let strError = error.toString();
            assert(strError.includes('invalid opcode') || strError.includes('invalid JUMP'), error.toString());
        }

        await icoEvent.ICO_start();
        try {
            await icoEvent.close({from: accounts[1]});
            assert(false, "didnt' throw");
        }
        catch (error) {
            let strError = error.toString();
            assert(strError.includes('invalid opcode') || strError.includes('invalid JUMP'), error.toString());
        }
    });
});
