# Contract Audit: ESG-token

## Preamble

This audit report was undertaken by @adamdossa for the purpose of providing feedback to Sean Hynes. It has been written without any express or implied warranty.

The contract originally reviewed was the verified Solidity code found at:  
https://github.com/EsportsGold/ESG-token  
and was taken as of commit:  
24a101572ee305b480f0e749e2b52af6a8bac996

The audit is now updated to reflect the updated contract as of commit:
44036226db7eded0a30cdc992c01db7ec0f75301

NB - I have not done a full, from-scratch, re-audit of the modified contracts - I have checked that issues identified in the previous audit have been remediated as below.

## Audit

### Summary

This is an update to a previous audit:  
https://github.com/adamdossa/ESG-token/blob/master/Audit.md

I have verified that deployment scripts and test cases have now been added to the repo.

NB - it is not currently possible to compile or run these deployment scripts for the following reasons:

  - there are mismatches between the names of files / contracts. e.g. in `ESG_ICOevent.sol` there is a reference to `./ESGToken.sol` which doesn't exist.
  - the directory structure is incorrect for the truffle framework.
  - there is no truffle.js file to bootstrap truffle with.
  - there is no pragma line in `ESGAssetHolder.sol`.
  - TokenTimelock is not correctly named (missing .sol extension).

If I resolve the above issues, the code compiles. I have added these changes, along with this audit, on this fork of the main repo.

I have verified that with the above fixes, the following test cases all run successfully:  
`truffle test test/ESGToken.js`
`truffle test test/ICOEvent.js`
`test test/TokenTimelock.js`

I have also verified that the deployment script runs successfully.

### ESGToken.sol

#### Summary

I have checked that the issues identified in the previous audit have been remediated. I haven't done a full, from scratch, re-audit of the contract given the number of changes. There is only one remaining issue as below.

#### Issues

In line 93 you have `duration = _duration * 1 days;` which should be done using SafeMath.

### ICOEvent.sol

#### Summary

I have checked that the issues identified in the previous audit have been remediated. I haven't done a full, from scratch, re-audit of the contract given the number of changes.

### ESGAssetHolder.sol and TokenTimelock.sol

No issues were found with these contracts. Since there is no deployment script it isn't possible to check that they are deployed and initialised correctly.

### SafeMath.sol and Owned.sol

These contracts are the usual standardised implementations, and no issues were found.
