pragma solidity ^0.4.23;

import "./Case.sol";
import "./Initializable.sol";
import './Registry.sol';
import './RegistryLookup.sol';
import './DelegateTarget.sol';

import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "zeppelin-solidity/contracts/token/ERC20/ERC20.sol";

contract CasePaymentManager is Ownable, Initializable, DelegateTarget {
  using RegistryLookup for Registry;
  using SafeMath for uint256;

  uint256 public baseCaseFeeUsdWei;
  mapping (address => address) caseTokenContract;
  Registry registry;

  modifier onlyCaseManager() {
    require(msg.sender == address(registry.caseManager()), 'Only the CaseManager can send');
    _;
  }

  function initializeTarget(address _registry, bytes32) public notInitialized {
    require(_registry != 0x0);
    setInitialized();
    owner = msg.sender;
    registry = Registry(_registry);
  }

  function getCaseTokenContract(Case _case) public view returns (ERC20) {
    return ERC20(caseTokenContract[_case]);
  }

  function caseFeeTokenWei(address _tokenContract) public view returns (uint256) {
    if (_tokenContract == address(registry.dai())) {
      return baseCaseFeeUsdWei;
    } else if (_tokenContract == address(registry.weth9())){
      return weiPerCase();
    } else {
      revert('Unknown token contract');
    }
  }

  function initializeCase(Case _case, address _tokenContract) external payable {
    require(_case != address(0), 'the case contract is not defined');
    require(caseTokenContract[_case] == address(0), 'the case token contract has already been initialized');
    caseTokenContract[_case] = _tokenContract;
    ERC20 dai = registry.dai();
    require(dai != address(0), 'dai is not defined');
    uint256 depositWei = requiredDepositTokenWei(_tokenContract);
    if (_tokenContract == address(registry.weth9())) {
      require(msg.value >= depositWei, 'not enough ether');
      _case.deposit.value(msg.value)();
    } else if (_tokenContract == address(dai)) {
      uint256 allowance = dai.allowance(_case.patient(), address(this));
      require(allowance >= depositWei, 'not enough deposit');
      dai.transferFrom(_case.patient(), _case, depositWei);
    } else {
      revert('Unknown token contract');
    }
  }

  function dai() public view returns (address) {
    return address(registry.dai());
  }

  function addr() public view returns (address) {
    return address(this);
  }

  function requiredDepositTokenWei(address _tokenContract) public view returns (uint256) {
    uint256 caseFeeWei = caseFeeTokenWei(_tokenContract);
    return caseFeeWei.add(caseFeeWei.mul(50).div(100));
  }

  /**
   * @dev - sets the base case fee - only affects new cases
   */
  function setBaseCaseFeeUsdWei(uint256 _baseCaseFeeUsdWei) public onlyOwner {
    require(_baseCaseFeeUsdWei > 0);
    baseCaseFeeUsdWei = _baseCaseFeeUsdWei;
  }

  function weiPerCase() public view returns (uint256) {
    uint256 usdPerKwei = usdWeiPerEther().div(1000000000000000);
    uint256 kweiPerCase = baseCaseFeeUsdWei.div(usdPerKwei);

    return kweiPerCase.mul(1000);
  }

  function usdWeiPerEther() public view returns (uint256) {
    return uint256(registry.etherPriceFeed().read());
  }

}
