pragma solidity >=0.4.10;
import "./SafeMath.sol";
import "./Owned.sol";
import "./ESGToken.sol";

    /*  ----------------------------------------------------------------------------------------

    Dev:    ICO Controller event

            ICO Controller manages the ICO event including payable functions that trigger mint,
            Refund collections, Base target and ICO discount rates for deposits before Base
            Target

    Ref:    Modified version of crowdsale contract with refund option (if base target not reached)
            https://github.com/OpenZeppelin/zeppelin-solidity/blob/master/contracts/crowdsale/Crowdsale.sol
            https://github.com/OpenZeppelin/zeppelin-solidity/blob/master/contracts/crowdsale/RefundVault.sol           
    ---------------------------------------------------------------------------------------- */
contract ICOEvent is Owned {

    ESGToken public token;                              // ESG TOKEN used for Deposit, Claims, Set Address

    uint256 public startTime = 0;                       // StartTime default
    uint256 public endTime;                             // End time is start + duration
    uint256 duration;                                   // Duration in days for ICO
    bool parametersSet;                                 // Ensure paramaters are locked in before starting ICO
    bool supplySet;                                     // Ensure token supply set

    address holdingAccount = 0x0;                       // Address for successful closing of ICO
    uint256 public totalTokensMinted;                   // To record total number of tokens minted

    // For purchasing tokens
    uint256 public rate_toTarget;                       // Rate of tokens per 1 ETH contributed to the base target
    uint256 public rate_toCap;                          // Rate of tokens from base target to cap per 1 ETH
    uint256 public totalWeiContributed = 0;             // Tracks total Ether contributed in WEI
    uint256 public minWeiContribution = 0.01 ether;     // At 100:1ETH means 1 token = the minimum contribution
    uint256 constant weiEtherConversion = 10**18;       // To allow inputs for setup in ETH for simplicity

    // Cap parameters
    uint256 public baseTargetInWei;                     // Target for bonus rate of tokens
    uint256 public icoCapInWei;                         // Max cap of the ICO in Wei

    event logPurchase (address indexed purchaser, uint value, uint256 tokens);

    enum State { Active, Refunding, Closed }            // Allows control of the ICO state
    State public state;
    mapping (address => uint256) public deposited;      // Mapping for address deposit amounts
    mapping (address => uint256) public tokensIssued;   // Mapping for address token amounts

    /*  ----------------------------------------------------------------------------------------

    Dev:    Constructor

    param:  Parameters are set individually after construction to lower initial deployment gas
            State:  set default state to active

    ---------------------------------------------------------------------------------------- */
    function ICOEvent() {
        state = State.Active;
        totalTokensMinted = 0;
        parametersSet = false;
        supplySet = false;
    }

    /*  ----------------------------------------------------------------------------------------

    Dev:    This section is to set parameters for the ICO control by the owner

    Param:  _tokenAddress   Address of the ESG Token contract that has been deployed
            _target_rate    Number of tokens (in units, excl token decimals) per 1 ETH contribution
                            up to the ETH base target
            _cap_rate       Number of tokens (in units, excl token decimals) per 1 ETH contribution
                            from the base target to the ICO cap
            _baseTarget     Number of ETH to reach the base target. ETH is refunded if base target
                            is not reached
            _cap            Total ICO cap in ETH. No further ETH can be deposited beyond this
            _holdingAccount Address of the beneficiary account on a successful ICO
            _duration       Duration of ICO in days
    ---------------------------------------------------------------------------------------- */ 
    function ICO_setParameters(address _tokenAddress, uint256 _target_rate, uint256 _cap_rate, uint256 _baseTarget, uint256 _cap, address _holdingAccount, uint256 _duration) onlyOwner {
        require(_target_rate > 0 && _cap_rate > 0);
        require(_baseTarget >= 0);
        require(_cap > 0);
        require(_duration > 0);
        require(_holdingAccount != 0x0);
        require(_tokenAddress != 0x0);

        rate_toTarget = _target_rate;
        rate_toCap = _cap_rate;
        token = ESGToken(_tokenAddress);
        baseTargetInWei = SafeMath.safeMul(_baseTarget, weiEtherConversion);
        icoCapInWei = SafeMath.safeMul(_cap, weiEtherConversion);
        holdingAccount = _holdingAccount;
        duration = SafeMath.safeMul(_duration, 1 days);
        parametersSet = true;
    }

    /*  ----------------------------------------------------------------------------------------

    Dev:    Ensure the ICO parameters are set before initialising start of ICO

    ---------------------------------------------------------------------------------------- */
    function eventConfigured() internal constant returns (bool) {
        return parametersSet && supplySet;
    }

    /*  ----------------------------------------------------------------------------------------

    Dev:    Starts the ICO. Initialises starttime at now - current block timestamp

    ---------------------------------------------------------------------------------------- */ 
    function ICO_start() onlyOwner {
        assert (eventConfigured());
        startTime = now;
        endTime = SafeMath.safeAdd(startTime, duration);
    }

    function ICO_token_supplyCap() onlyOwner {
        require(token.parametersAreSet());                          // Ensure parameters are set in the token

        // Method to calculate number of tokens required to base target
        uint256 targetTokens = SafeMath.safeMul(baseTargetInWei, rate_toTarget);         
        targetTokens = SafeMath.safeDiv(targetTokens, weiEtherConversion);

        // Method to calculate number of tokens required between base target and cap
        uint256 capTokens = SafeMath.safeSub(icoCapInWei, baseTargetInWei);
        capTokens = SafeMath.safeMul(capTokens, rate_toCap);
        capTokens = SafeMath.safeDiv(capTokens, weiEtherConversion);

        /*
            Hard setting for 10% of base target tokens as per Whitepaper as M'ment incentive
            This is set to only a percentage of the base target, not overall cap
            Don't need to divide by weiEtherConversion as already in tokens
        */
        uint256 mmentTokens = SafeMath.safeMul(targetTokens, 10);
        mmentTokens = SafeMath.safeDiv(mmentTokens, 100);

        // Total supply for the ICO will be available tokens + m'ment reserve
        uint256 tokens_available = SafeMath.safeAdd(capTokens, targetTokens); 

        uint256 total_Token_Supply = SafeMath.safeAdd(tokens_available, mmentTokens); // Tokens in UNITS

        token.setTokenCapInUnits(total_Token_Supply);          // Set supply cap and mint to timelock
        token.mintLockedTokens(mmentTokens);                   // Lock in the timelock tokens
        supplySet = true;
    }

    /*  ----------------------------------------------------------------------------------------

    Dev:    Fallback payable function if ETH is transferred to the ICO contract

    param:  No parameters - calls deposit(Address) with msg.sender

    ---------------------------------------------------------------------------------------- */
    function () payable {
        deposit(msg.sender);
    }

    /*  ----------------------------------------------------------------------------------------

    Dev:    Deposit function. User needs to ensure that the purchase is within ICO cap range

            Function checks that the ICO is still active, that the cap hasn't been reached and
            the address provided is != 0x0.

    Calls:  getPreTargetContribution(value)
                This function calculates how much (if any) of the value transferred falls within
                the base target goal and qualifies for the target rate of tokens

            Token.mint(address, number)
                Calls the token mint function in the ESGToken contract

    param: _for     Address of the sender for tokens
            
    ---------------------------------------------------------------------------------------- */
    function deposit(address _for) payable {

        /* 
            Checks to ensure purchase is valid. A purchase that breaches the cap is not allowed
        */
        require(validPurchase(msg.value));           // Checks time, value purchase is within Cap and address != 0x0
        require(state == State.Active);     // IE not in refund or closed
        require(!ICO_Ended());              // Checks time closed or cap reached

        /* 
            Calculates if any of the value falls before the base target so that the correct
            Token : ETH rate can be applied to the value transferred
        */
        uint256 targetContribution = getPreTargetContribution(msg.value);               // Contribution before base target
        uint256 capContribution = SafeMath.safeSub(msg.value, targetContribution);      // Contribution above base target
        totalWeiContributed = SafeMath.safeAdd(totalWeiContributed, msg.value);         // Update total contribution

        /* 
            Calculate total tokens earned by rate * contribution (in Wei)
            Multiplication first ensures that dividing back doesn't truncate/round
        */
        uint256 targetTokensToMint = SafeMath.safeMul(targetContribution, rate_toTarget);   // Discount rate tokens
        uint256 capTokensToMint = SafeMath.safeMul(capContribution, rate_toCap);            // Standard rate tokens
        uint256 tokensToMint = SafeMath.safeAdd(targetTokensToMint, capTokensToMint);       // Total tokens
        
        tokensToMint = SafeMath.safeDiv(tokensToMint, weiEtherConversion);                  // Get tokens in units
        totalTokensMinted = SafeMath.safeAdd(totalTokensMinted, tokensToMint);              // Update total tokens minted

        deposited[_for] = SafeMath.safeAdd(deposited[_for], msg.value);                     // Log deposit and inc of refunds
        tokensIssued[_for] = SafeMath.safeAdd(tokensIssued[_for], tokensToMint);            // Log tokens issued

        token.mint(_for, tokensToMint);                                                     // Mint tokens from Token Mint
        logPurchase(_for, msg.value, tokensToMint);
    }

    /*  ----------------------------------------------------------------------------------------

    Dev:    Calculates how much of the ETH contributed falls before the base target cap to therefore
            calculate the correct rates of Token to be issued

    param:      _valueSent  The value of ETH transferred on the payable function

    returns:    uint256     The value that falls before the base target
            
    ---------------------------------------------------------------------------------------- */
    function getPreTargetContribution(uint256 _valueSent) internal returns (uint256) {
        
        uint256 targetContribution = 0;                                                     // Default return

        if (totalWeiContributed < baseTargetInWei) {                                             
            if (SafeMath.safeAdd(totalWeiContributed, _valueSent) > baseTargetInWei) {           // Contribution straddles baseTarget
                targetContribution = SafeMath.safeSub(baseTargetInWei, totalWeiContributed);     // IF #1 means always +ve
            } else {
                targetContribution = _valueSent;
            }
        }
        return targetContribution;    
    }

    /*  ----------------------------------------------------------------------------------------

    Dev:    Public viewable functions to show key parameters

    ---------------------------------------------------------------------------------------- */

    // Is the ICO Live: time live, state Active
    function ICO_Live() public constant returns (bool) {
        return (now >= startTime && now < endTime && state == State.Active);
    }

    // Time is valid, purchase isn't zero and cap won't be breached
    function validPurchase(uint256 _value) payable returns (bool) {          // Known true
        bool validTime = (now >= startTime && now < endTime);           // Must be true    
        bool validAmount = (_value >= minWeiContribution);
        bool withinCap = SafeMath.safeAdd(totalWeiContributed, _value) <= icoCapInWei;

        return validTime && validAmount && withinCap;
    }

    // ICO has ended
    function ICO_Ended() public constant returns (bool) {
        bool capReached = (totalWeiContributed >= icoCapInWei);
        bool stateValid = state == State.Closed;

        return (now >= endTime) || capReached || stateValid;
    }

    // Wei remaining until ICO is capped
    function Wei_Remaining_To_ICO_Cap() public constant returns (uint256) {
        return (icoCapInWei - totalWeiContributed);
    }

    // Shows if the base target cap has been reached
    function baseTargetReached() public constant returns (bool) {
    
        return totalWeiContributed >= baseTargetInWei;
    }

    // Shows if the cap has been reached
    function capReached() public constant returns (bool) {
    
        return totalWeiContributed == icoCapInWei;
    }

    /*  ----------------------------------------------------------------------------------------

    Dev:    This section controls closing of the ICO. The state is set to closed so that the ICO
            is shown as ended.

            Based on the function from open zeppelin contracts: RefundVault + RefundableCrowdsale

    Ref:    https://github.com/OpenZeppelin/zeppelin-solidity/blob/master/contracts/crowdsale/RefundableCrowdsale.sol
            https://github.com/OpenZeppelin/zeppelin-solidity/blob/master/contracts/crowdsale/RefundVault.sol
    ---------------------------------------------------------------------------------------- */

    event Closed();

    // Set closed ICO and transfer balance to holding account
    function close() onlyOwner {
        require((now >= endTime) || (totalWeiContributed >= icoCapInWei));
        require(state==State.Active);
        state = State.Closed;
        Closed();

        holdingAccount.transfer(this.balance);
    }
} 
