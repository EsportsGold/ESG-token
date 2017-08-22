# Contract Audit: ESG-token

## Preamble

This audit report was undertaken by @adamdossa for the purpose of providing feedback to Sean Hynes. It has been written without any express or implied warranty.

The contract reviewed was the verified Solidity code found at:  
https://github.com/EsportsGold/ESG-token  
and was taken as of commit:  
24a101572ee305b480f0e749e2b52af6a8bac996

## Classification

### Defect Severity

* **Minor** - A defect that does not have a material impact on the contract execution and is likely to be subjective.
* **Moderate** - A defect that could impact the desired outcome of the contract execution in a specific scenario.
* **Major** - A defect that impacts the desired outcome of the contract execution or introduces a weakness that may be exploited.
* **Critical** - A defect that presents a significant security vulnerability or failure of the contract across a range of scenarios.

## Preparing Files For Audit

In order to ensure .sol files compiled, and to normalise their structure, I took a fork from the above commit and modified the structure of the files as follows.

Fork:  
https://github.com/adamdossa/ESG-token

Modifications made in commit:  
https://github.com/adamdossa/ESG-token/commit/0e992dd118ad3920114e6b505fc74557bca25939

  - filenames modified to match contract names.
  - `import` and `pragma` lines added to all contracts as appropriate.
  - `TokenTimelock` renamed to `TokenTimelock.sol`.
  - basic truffle framework added sufficient for compiling (but not deploying).

With the above changes, all .sol files compile within the truffle framework.

All line numbers below refer to the versions of the contract as modified above.

## Audit

### Summary

The most important point to mention is that no test cases were provided as part of this audit. Before this contract is relied on to hold value there should be a comprehensive set of test cases built (e.g. in the truffle framework) that exercise all of the relevant functionality of this contract. Without this it is very hard to be confident in the correct behaviour of these contracts.

In addition, as noted below there are a number of issues that should be addressed before the this contract is relied upon in a production environment, or to hold value.

I would also suggest that variables are given more consistent names to reflect their purpose, and units. For example `icoCapInWei` is fairly clear, but it is less clear whether `baseTarget` is in token units, Wei or Ether from the variable name.

There should also be a deployment script which generates the token, ico and token timelock contracts, and distributes the relevant amount of tokens to the timelock contract.

With regards to some of the optimisation comments below, whilst these may not be functionally important (e.g. checking the same condition twice won't lead to an error), given that there is a cost in gas to anyone contributing to the contract, unnecessary calculations should ideally be removed to reduce these costs.

### ESGToken.sol

#### Summary

No major or critical issues were found in the ESGToken contract. There were some stylistic suggestions and optimisation comments as detailed below, and a couple of simple moderate issues.

#### Issues

**Moderate**

On [line 93](https://github.com/adamdossa/ESG-token/blob/master/contracts/ESGToken.sol#L93) the supplyCap is multiplied by `10**decimals`. This operation is subject to overflow issues, so it is recommended to use the `SafeMath.safeMul` function instead (which throws on overflow).

**Moderate**

On [line 121](https://github.com/adamdossa/ESG-token/blob/master/contracts/ESGToken.sol#L121) the amount is multiplied by `10**decimals`. This operation is subject to overflow issues, so it is recommended to use the `SafeMath.safeMul` function instead (which throws on overflow).

**Minor**

On [line 25](https://github.com/adamdossa/ESG-token/blob/master/contracts/ESGToken.sol#L35) the name of the modifier should be changed to `onlyControllerOrOwner` to reflect its functionality.

**Minor**

On [line 62](https://github.com/adamdossa/ESG-token/blob/master/contracts/ESGToken.sol#L62) the token symbol should follow the convention of only capital letters, e.g. ESG or ESGT

**Minor**

On [line 59](https://github.com/adamdossa/ESG-token/blob/master/contracts/ESGToken.sol#L59) there is no need for this assignment as it is already executed in the Owned contract at [line 14](https://github.com/adamdossa/ESG-token/blob/master/contracts/Owned.sol#L14)

**Minor**

Stylistically it is more common to assign values for variables in the contract header where these values are fixed on construction, rather than its constructor. So for example `name = "ESG Token";` could be removed in favour of changing `string public name;` to `string public name = "ESG Token";`.

**Minor**

It is possible that the controller address is not set (so has the default value of `0x0`). This may not be an issue as anything that the controller can do, the owner can do (and the owner is always set on construction of the contract).

### ICOEvent.sol

#### Summary

There are some Critical and Major issues as identified below, which could allow the contract to enter an unexpected state and potentially lock Ether in the contract. If the intention is to not make sure of the minimum cap / refund functionality, my suggestion would be to remove this from the code to reduce complexity and address these issues.

#### Issues

**Moderate**

In [line 33](https://github.com/adamdossa/ESG-token/blob/master/contracts/ICOEvent.sol#L33) you define a variable `minWeiContribution` which implies a minimum level for ICO contributions. However this variable is never used and this level is therefore not enforced. Either this variable should be removed for clarity, or checked in the `validPurchase` modifier.

**Minor**

In [line 42](https://github.com/adamdossa/ESG-token/blob/master/contracts/ICOEvent.sol#L42) you define an event `tokensSent`. However this event is never used. The event should be used or removed for clarity.

**Minor**

On [line 59](https://github.com/adamdossa/ESG-token/blob/master/contracts/ICOEvent.sol#L59) there is no need for this assignment as it is already executed in the Owned contract at [line 14](https://github.com/adamdossa/ESG-token/blob/master/contracts/Owned.sol#L14)

**Minor**

On [line 80](https://github.com/adamdossa/ESG-token/blob/master/contracts/ICOEvent.sol#L80) the type of `_tokenAddress` should be address not ESGToken.

**Major**

In the function `ICO_setParameters` there seems to be a mismatch between the units used for `_cap` and `_minTarget`. `_minTarget` is multiplied by `weiEtherConversion` whereas `_minTarget` is not. I would strongly suggest standardising on the units used (i.e. Wei or Ether) for clarity here. This would involve multiplying `_minTarget` by `weiEtherConversion` in [line 87](https://github.com/adamdossa/ESG-token/blob/master/contracts/ICOEvent.sol#L89).

**Minor**

In the function `ICO_setParameters` you may wish to add a check that the addresses supplied as `_holdingAccount` and `_tokenAddress` are not the default values of `0x0`.

**Moderate**

In [line 91, 92 and 94](https://github.com/adamdossa/ESG-token/blob/master/contracts/ICOEvent.sol#L91) you multiple variables by `weiEtherConversion`. This multiplication is subject to an overflow, and you shiould use `SafeMath.safeMul` instead.

**Moderate**

In [line 104](https://github.com/adamdossa/ESG-token/blob/master/contracts/ICOEvent.sol#L104) you add `duration` to `startTime`. This addition is subject to an overflow, and you should use `SafeMath.safeAdd` instead.

**Minor**

In the function `deposit` you have:  
```
require(validPurchase());           // Checks time, value purchase is within Cap and address != 0x0
require(state == State.Active);     // IE not in refund or closed
require(!ICO_Ended());              // Checks time closed or cap reached
```

The `validPurchase` function checks that `now >= startTime && now < endTime` so it seems unnecessary to also check this in `ICO_Ended`. The bounds check between these functions is slightly inconsistent as `validPurchase` checks that `now < endTime` whereas `ICO_Ended` considers the ICO ended if `now > endTime` (i.e. this should perhaps be modified to `now >= endTime`). The check on whether the `icoCapInWei` has been met in `ICO_Ended` is also part of `validPurchase` implicitly since it checks `SafeMath.safeAdd(totalWeiContributed, msg.value) <= icoCapInWei`.

**Moderate**

In [line 211](https://github.com/adamdossa/ESG-token/blob/master/contracts/ICOEvent.sol#L211) the addition should use `SafeMath.safeAdd` to avoid overflow issues.

**Minor**

The `validPurchase` function should be marked payable since it expects a non-zero `msg.value`. This will generate a compiler warning if omitted, although still work.

**Critical**

The function `closeTransfer` in [line 294](https://github.com/adamdossa/ESG-token/blob/master/contracts/ICOEvent.sol#L294) should be marked as `internal` rather then `onlyOwner`.

Without this, it is possible for the owner to call this function to transfer some portion of the held Ether into the holdingAccount, without updating the `state` variable of the contract.

Should a refund later be enabled (e.g. by calling `enableRefunds` which is possible as the state could still be `State.Active`) there may therefore not be enough funds in the contract to allow all depositors to get a refund.

**Critical**

The function `enableRefunds` in [line 312](https://github.com/adamdossa/ESG-token/blob/master/contracts/ICOEvent.sol#L312) should require that `require(!minTargetReached());`.

Without this it is possible for the owner to set the state of the contract to `State.Refunding` using this function even though the minimum cap has been met. In this case Ether will be locked in the contract as it will not be possible for contributors to call `refund` (since this function does require that the minimum cap has not been met) and also not possible for the owner to call `close` or `closePartial` since these both require that the state be `State.Active`.

It would be possible for the owner to use the function `closeTransfer` as it currently stands, but as per issue above this function should be modified.

**Major**

The functions `close` and `closePartial` should only be callable if the minimum cap has been met. Otherwise it is possible for the owner to drain the balance of the contract into the holdingAccount even though the minimum cap has not been met.

**Critical**

The function `closePartial` sets the state to `State.Closed` but allows the owner to only withdraw a portion of the Ether held by the smart contract. Once this has occurred the remaining balance in the contract may become locked since `close` and `closePartial` both require that the state is `State.Active`.

It would be possible for the owner to use the function `closeTransfer` as it currently stands, but as per issue above this function should be modified.

**Critical**

The contract should check that the `ICO_setParameters` function has been called to set all relevant parameters before allowing the `ICO_start` function to be called to start the sale. Otherwise the sale may be started with these parameters uninitialised leading to unexpected behaviour.

**Minor**

You may wish to think about how the sale is started in general. For most ICOs a starting block number (or timestamp, but ideally block number) is usually set in advance as marking the start of the ICO. This allows participants to prepare for the ICO.

The current approach relies on the owner manually starting the ICO so will be harder to manage from a contributors perspective.

**Minor**

In [line 252](https://github.com/adamdossa/ESG-token/blob/master/contracts/ICOEvent.sol#L252) the comment is incorrect.

**Critical**

I may have misunderstood the intention, but the maths in the function `ICO_token_supplyCap` looks incorrect to me.

For example, in [line 109](https://github.com/adamdossa/ESG-token/blob/master/contracts/ICOEvent.sol#L109) you multiply the `baseTarget` by the `rate_toTarget` which is the number of tokens issued per Ether during the bonus period. Since your intention is to calculate the number of tokens needed in order to reach the `baseTarget`, should this not be divided instead of multiplied?

i.e. suppose that the `baseTarget` is 100 ether, and the `rate_toTarget` is 5. So for every ether, you will generate 5 tokens. Then the number of tokens required in order to meet the `baseTarget` is 100 / 5 = 20, not 100 * 5 = 500.

### ESGAssetHolder.sol and TokenTimelock.sol

No issues were found with these contracts. Since there is no deployment script it isn't possible to check that they are deployed and initialised correctly.

### SafeMath.sol and Owned.sol

These contracts are the usual standardised implementations, and no issues were found.

come back to ICO_token_supplyCap
