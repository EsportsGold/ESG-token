pragma solidity >=0.4.10;

/*  ----------------------------------------------------------------------------------------

    Dev:    SafeMath library

            Identical to https://github.com/OpenZeppelin/zeppelin-solidity/blob/master/contracts/math/SafeMath.sol

    ---------------------------------------------------------------------------------------- */
library SafeMath {
  function safeMul(uint256 a, uint256 b) internal constant returns (uint256) {
    uint256 c = a * b;
    assert(a == 0 || c / a == b);
    return c;
  }

  function safeDiv(uint256 a, uint256 b) internal constant returns (uint256) {
    // assert(b > 0); // Solidity automatically throws when dividing by 0
    uint256 c = a / b;
    // assert(a == b * c + a % b); // There is no case in which this doesn't hold
    return c;
  }

  function safeSub(uint256 a, uint256 b) internal constant returns (uint256) {
    assert(b <= a); // Ensuring no negatives
    return a - b;
  }

  function safeAdd(uint256 a, uint256 b) internal constant returns (uint256) {
    uint256 c = a + b;
    assert(c >= a && c>=b);
    return c;
  }
}
