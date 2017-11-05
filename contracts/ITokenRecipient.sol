pragma solidity 0.4.15;


/**
 * Abstract function defining the receiveApproval function
 */
contract ITokenRecipient {
    function receiveApproval(address _from, uint _value, address _token, bytes _extraData);
}
