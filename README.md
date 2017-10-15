# Esports Gold ("ESG") Token Contracts
Smart contracts for the ESG-ICO contribution

## Summary
This is the ESG github repository for the smart contracts as part of its ICO undertaking.

ESG was established specifically as an esports content aggregator and betting operator,  to create a holistic entertainment platform.

ESG is undertaking an ICO of the ESG Token ("ESG TKN") to integrate and operate the ESG platform.

The code is currently live and can be viewed at the following:
ICOEvent code: https://etherscan.io/address/0x3744942C42451c2B42F43a51eE9bB6c6ad0FDc86#code
The tokens locked for 2 years can be viewed at: https://etherscan.io/address/0xf8bB28EC085F5d7159C2DF0fCb55570cf1520359#code

## Entitlements of the ESG Token
ESG is creating the ESG Token (“ESG TKN”) for a limited time and fixed quantity to be confirmed on the first day of the ICO, with a strike price reflecting the Ethereum price at that date.

ESG TKN holders acquire the following rights:
- The right to participate in the pro-rata share of the ESG Asset Contract, which accrues value from a fee charged to the ESG betting platform.
  - The ESG TKN holder has the right to realise the value of their token at any time by “burning” their token in exchange for their pro-rata share of the ESG Asset Contract. In this process, the ESG TKN is irrevocably destroyed and in exchange, the ESG Asset Contract will transfer the respective value to the holder.
- The right to use the ESG betting platform with an Ethereum wallet without incurring any integrated wallet fee on betting
- The right to use the ESG token as a stake for betting
- The right to access premium content, e.g. reduced delay feeds, premium event streams


## Repository overview
The repository file structure is setup for truffle compilation, migration and testing and includes build jsons, contracts, migration files and tests for truffle.

The migration includes test addresses to allow successful deployment.

There are 7 contracts within the file structure, 3 of which follow the standarised implementations:
- ESGToken.sol        (token functions)
- ICOEvent.sol        (controls ico event)
- TokenTimelock.sol   (locked contract to hold management tokens)
- ESGAssetHolder.sol  (asset holder contract)

Contracts with standarised implementations:
- Owned.sol       (owner control functions)
- SafeMath.sol    (safemath functions)
- Migrations.sol  (standard migrations file)


## Independent audit of code
ESG have contracted an independent review and security audit of the code by a third party to ensure that the code performs as expected without issue or potential risks. This is available under the issues section

Automatic testing files have been provided in the repository which can be run locally.


## Overview of deployment
On deployment, the address of the ICO event controller (ICOEvent.sol), the token contract (ESGToken.sol) and the locked contract for management tokens (TokenTimelock.sol) are all passed between the contracts.

This allows:
- The ICO controller to call the token mint function to mint ESG Tokens to the required address on deposit
- The token contract to mint the required number of tokens to the locked management contract (locked away for 2 years)
- The token contract to know the address of the ICO controller and timelock to avoid unauthorised calls

