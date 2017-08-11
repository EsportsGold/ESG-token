/*  ----------------------------------------------------------------------------------------

    Dev:    Only for testing versions - selfdestruct function

    ---------------------------------------------------------------------------------------- */
contract Mortal is Owned {
    function kill() onlyOwner {
        selfdestruct(owner);
    }
}
