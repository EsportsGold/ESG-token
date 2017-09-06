pragma solidity >=0.4.10;

/*  ----------------------------------------------------------------------------------------

    Dev:    ESG Asset Holder is called when the token "burn" function is called

    Sum:    Locked to false so users cannot burn their tokens until the Asset Contract is
            put in place with value.

    ---------------------------------------------------------------------------------------- */
contract ESGAssetHolder {
    
    function burn(address _holder, uint _amount) returns (bool result) {

        _holder = 0x0;                              // To avoid variable not used issue on deployment
        _amount = 0;                                // To avoid variable not used issue on deployment
        return false;
    }
}
