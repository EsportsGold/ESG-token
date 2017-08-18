/*  ----------------------------------------------------------------------------------------

    Dev:    The Esports Gold Token:  ERC20 standard token with MINT and BURN functions

    Func:   Mint, Approve, Transfer, TransferFrom  

    Note:   Mint function takes UNITS of tokens to mint as ICO event is set to have a minimum
            contribution of 1 token. All other functions (transfer etc), the value to transfer
            is the FULL DECIMAL value
            The user is only ever presented with the latter option, therefore should avoid
            any confusion.

    ---------------------------------------------------------------------------------------- */
contract ESGToken is Owned {
        
    string public name;                     // Name of token
    string public symbol;                   // Token symbol
    uint256 public decimals;                // Decimals for the token
    uint256 public currentSupply;           // Current supply of tokens
    uint256 public supplyCap;               // Hard cap on supply of tokens
    address public ICOcontroller;           // Controlling contract from ICO


    mapping (address => uint256) public balanceOf;                      // Balances of addresses
    mapping (address => mapping (address => uint)) public allowance;    // Allowances from addresses
    mapping (address => bool) public frozenAccount;                     // Safety mechanism


    modifier onlyControllers() {            // Ensures that only contracts can manage key functions
        require(msg.sender == ICOcontroller || msg.sender == owner);
        _;
    }

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Mint(address owner, uint amount);
    event FrozenFunds(address target, bool frozen);
    event Burn(address coinholder, uint amount);
    
    /*  ----------------------------------------------------------------------------------------

    Dev:    Constructor

    param:  Owner:  Address of owner
            Name:   Esports Gold Token
            Sym:    ESG_TKN
            Dec:    3
            Cap:    Cap initially set to 0. Set cap function is called by ICO once rates have been
                    initialised.

    ---------------------------------------------------------------------------------------- */
    function ESGToken() {
        owner = msg.sender;
        name = "ESG Token";
        decimals = 3;
        symbol = "ESG_TKN";
        
        currentSupply = 0;                      // Starting supply is zero
        supplyCap = 0;                          // Hard cap supply in Tokens set by ICO
    }

    /*  ----------------------------------------------------------------------------------------

    Dev:    Key parameters to setup for ICO event

    Param:  _ico    Address of the ICO Event contract to ensure the ICO event can control
                    the minting function
    
    ---------------------------------------------------------------------------------------- */
    function setICOController(address _ico) onlyOwner {     // ICO event address is locked in
        require(_ico != 0x0);

        ICOcontroller = _ico;
    }

    /*  ----------------------------------------------------------------------------------------

    Dev:    Set the total number of Tokens that can be minted

    Param:  _supplyCap  The number of tokens (in whole units) that can be minted. This number then
                        gets increased by the decimal number
    
    ---------------------------------------------------------------------------------------- */
    function setTokenCapInUnits(uint256 _supplyCap) onlyControllers {   // Supply cap in UNITS
        assert(_supplyCap > 0);
        
        supplyCap = _supplyCap * (10**decimals);
    }

    /*  ----------------------------------------------------------------------------------------

    Dev:    Gets the balance of the address owner

    Param:  _owner  Address of the owner querying their balance
    
    ---------------------------------------------------------------------------------------- */
    function balanceOf(address _owner) constant returns (uint256 balance) {
        return balanceOf[_owner];
    }

    /*  ----------------------------------------------------------------------------------------

    Dev:    Mint ESG Tokens by controller

    Control:            OnlyControllers. ICO event needs to be able to control the minting
                        function

    Param:  Address     Address for tokens to be minted to
            Amount      Number of tokens to be minted (in whole UNITS. Min minting is 1 token)
                        Minimum ETH contribution in ICO event is 0.01ETH at 100 tokens per ETH
    
    ---------------------------------------------------------------------------------------- */
    function mint(address _address, uint _amount) onlyControllers {

        uint256 amount = _amount * (10**decimals);             // Tokens minted using unit parameter supplied

        // Ensure that supplyCap is set and that new tokens don't breach cap
        assert(supplyCap > 0 && amount > 0 && SafeMath.safeAdd(currentSupply, amount) <= supplyCap);
        
        balanceOf[_address] = SafeMath.safeAdd(balanceOf[_address], amount);    // Add tokens to address
        currentSupply = SafeMath.safeAdd(currentSupply, amount);                // Add to supply
        
        Mint(_address, amount);
    }
    
    /*  ----------------------------------------------------------------------------------------

    Dev:    ERC20 standard transfer function

    Param:  _to         Address to send to
            _value      Number of tokens to be sent - in FULL decimal length
    
    Ref:    https://github.com/OpenZeppelin/zeppelin-solidity/blob/master/contracts/token/BasicToken.sol
    ---------------------------------------------------------------------------------------- */
    function transfer(address _to, uint _value) returns (bool success) {
        require(!frozenAccount[msg.sender]);        // Ensure account is not frozen

        /* 
            Update balances from "from" and "to" addresses with the tokens transferred
            safeSub method ensures that address sender has enough tokens to send
        */
        balanceOf[msg.sender] = SafeMath.safeSub(balanceOf[msg.sender], _value);    
        balanceOf[_to] = SafeMath.safeAdd(balanceOf[_to], _value);                  
        Transfer(msg.sender, _to, _value);
        
        return true;
    }
    
    /*  ----------------------------------------------------------------------------------------

    Dev:    ERC20 standard transferFrom function

    Param:  _from       Address to send from
            _to         Address to send to
            Amount      Number of tokens to be sent - in FULL decimal length

    ---------------------------------------------------------------------------------------- */
    function transferFrom(address _from, address _to, uint256 _value) returns (bool success) {   
        require(!frozenAccount[_from]);                         // Check account is not frozen
        
        /* 
            Ensure sender has been authorised to send the required number of tokens
        */
        if (allowance[_from][msg.sender] < _value)
            return false;

        /* 
            Update allowance of sender to reflect tokens sent
        */
        allowance[_from][msg.sender] = SafeMath.safeSub(allowance[_from][msg.sender], _value); 

        /* 
            Update balances from "from" and "to" addresses with the tokens transferred
            safeSub method ensures that address sender has enough tokens to send
        */
        balanceOf[_from] = SafeMath.safeSub(balanceOf[_from], _value);
        balanceOf[_to] = SafeMath.safeAdd(balanceOf[_to], _value);

        Transfer(_from, _to, _value);
        return true;
    }
    
    /*  ----------------------------------------------------------------------------------------

    Dev:    ERC20 standard approve function

    Param:  _spender        Address of sender who is approved
            _value          The number of tokens (full decimals) that are approved

    ---------------------------------------------------------------------------------------- */
    function approve(address _spender, uint256 _value)      // FULL DECIMALS OF TOKENS
        returns (bool success)
    {
        require(!frozenAccount[msg.sender]);                // Check account is not frozen

        /* Requiring the user to set to zero before resetting to nonzero */
        if ((_value != 0) && (allowance[msg.sender][_spender] != 0)) {
           return false;
        }

        allowance[msg.sender][_spender] = _value;
        
        Approval(msg.sender, _spender, _value);
        return true;
    }

    /*  ----------------------------------------------------------------------------------------

    Dev:    Function to check the amount of tokens that the owner has allowed the "spender" to
            transfer

    Param:  _owner          Address of the authoriser who owns the tokens
            _spender        Address of sender who will be authorised to spend the tokens
            _value          The number of tokens (full decimals) that are approved

    ---------------------------------------------------------------------------------------- */

    function allowance(address _owner, address _spender) constant returns (uint256 remaining) {
        return allowance[_owner][_spender];
    }
    
    /*  ----------------------------------------------------------------------------------------

    Dev:    As ESG is aiming to be a regulated betting operator. Regulatory hurdles may require
            this function if an account on the betting platform, using the token, breaches
            a regulatory requirement.

            ESG can then engage with the account holder to get it unlocked

            This does not stop the token accruing value from its share of the Asset Contract

    Param:  _target         Address of account
            _freeze         Boolean to lock/unlock account

    Ref:    This is a replica of the code as per https://ethereum.org/token
    ---------------------------------------------------------------------------------------- */
    function freezeAccount(address target, bool freeze) onlyOwner {
        frozenAccount[target] = freeze;
        FrozenFunds(target, freeze);
    }

    /*  ----------------------------------------------------------------------------------------

    Dev:    Burn function: User is able to burn their token for a share of the ESG Asset Contract

    Note:   Deployed with the ESG Asset Contract set to false to ensure token holders cannot
            accidentally burn their tokens for zero value

    Param:  _amount         Number of tokens (full decimals) that should be burnt

    Ref:    Based on the open source TokenCard Burn function. A copy can be found at
            https://github.com/bokkypoobah/TokenCardICOAnalysis
    ---------------------------------------------------------------------------------------- */
    function burn(uint _amount) returns (bool result) {

        if (_amount > balanceOf[msg.sender])
            return false;       // If owner has enough to burn

        /* 
            Remove tokens from circulation
            Update sender's balance of tokens
        */
        balanceOf[msg.sender] = SafeMath.safeSub(balanceOf[msg.sender], _amount);
        currentSupply = SafeMath.safeSub(currentSupply, _amount);

        // Call burn function
        result = esgAssetHolder.burn(msg.sender, _amount);
        require(result);

        Burn(msg.sender, _amount);
    }

    /*  ----------------------------------------------------------------------------------------

    Dev:    Section of the contract that links to the ESG Asset Contract

    Note:   Deployed with the ESG Asset Contract set to false to ensure token holders cannot
            accidentally burn their tokens for zero value

    Param:  _amount         Number of tokens (full decimals) that should be burnt

    Ref:    Based on the open source TokenCard Burn function. A copy can be found at
            https://github.com/bokkypoobah/TokenCardICOAnalysis
    ---------------------------------------------------------------------------------------- */

    ESGAssetHolder esgAssetHolder;              // Holds the accumulated asset contract
    bool lockedAssetHolder;                     // Will be locked to stop tokenholder to be upgraded

    function lockAssetHolder() onlyOwner {      // Locked once deployed
        lockedAssetHolder = true;
    }

    function setAssetHolder(address _assetAdress) onlyOwner {   // Used to lock in the Asset Contract
        assert(!lockedAssetHolder);             // Check that we haven't locked the asset holder yet
        esgAssetHolder = ESGAssetHolder(_assetAdress);
    }    
}
