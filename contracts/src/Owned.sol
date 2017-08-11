/*  ----------------------------------------------------------------------------------------

    Dev:    "Owned" to ensure control of contracts

            Identical to https://github.com/OpenZeppelin/zeppelin-solidity/blob/master/contracts/ownership/Ownable.sol

    ---------------------------------------------------------------------------------------- */
contract Owned {
    address public owner;

    function Owned() {
        owner = msg.sender;
    }

    modifier onlyOwner {
        require(msg.sender == owner);
        _;
    }

    function transferOwnership(address newOwner) onlyOwner {
        owner = newOwner;
    }
}
