pragma solidity >=0.4.10;
import "./ESG_Token.sol";

    /*  ----------------------------------------------------------------------------------------

    Dev:    Vested token option for management - locking in account holders for 2 years

    Ref:    Identical to OpenZeppelin open source contract except releaseTime is locked in
            https://github.com/OpenZeppelin/zeppelin-solidity/blob/master/contracts/token/TokenTimelock.sol

    ---------------------------------------------------------------------------------------- */
contract TokenTimelock {

    // ERC20 basic token contract being held
    ESGToken token;

    // beneficiary of tokens after they are released
    address public beneficiary;

    // timestamp when token release is enabled
    uint256 public releaseTime;

    function TokenTimelock(address _token, address _beneficiary) {
        require(_token != 0x0);
        require(_beneficiary != 0x0);

        token = ESGToken(_token);
        //token = _token;
        beneficiary = _beneficiary;
        releaseTime = now + 2 years;
    }

    /*
        Show the balance in the timelock for transparency
        Therefore transparent view of the whitepaper allotted management tokens
    */
    function lockedBalance() public constant returns (uint256) {
        return token.balanceOf(this);
    }

    /*
        Transfers tokens held by timelock to beneficiary
    */
    function release() {
        require(now >= releaseTime);

        uint256 amount = token.balanceOf(this);
        require(amount > 0);

        token.transfer(beneficiary, amount);
    }
}
