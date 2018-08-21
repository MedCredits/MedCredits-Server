pragma solidity ^0.4.23;

import "./ICase.sol";
import "./IMedXToken.sol";
import "./IRegistry.sol";
import "./Initializable.sol";
import "./ICaseManager.sol";
import "./CaseScheduleManager.sol";
import "./CaseStatusManager.sol";

import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";

contract Case is Ownable, Initializable, ICase {
  using SafeMath for uint256;

  uint256 public caseFee;

  address public patient;
  address public diagnosingDoctor;
  address public challengingDoctor;

  bytes public caseDataHash;
  bytes public diagnosisHash;
  bytes public challengeHash;

  IRegistry public registry;
  IMedXToken public medXToken;

  CaseStatus public status;

  bytes public encryptedCaseKey;
  bytes public caseKeySalt;

  mapping(address => bytes) public doctorEncryptedCaseKeys;

  enum CaseStatus {
    None,
    Open,
    Evaluating,
    Evaluated,
    Closed,
    Challenged,
    Challenging,
    ClosedRejected,
    ClosedConfirmed
  }

  event CaseCreated(address indexed patient);

  /**
   * @dev - throws if called by anything not an instance of the lifecycle manager contract
   */
  modifier onlyCaseLifecycleManager() {
    require(
      msg.sender == address(caseLifecycleManager()),
      'Must be an instance of Case lifecycle Manager contract'
    );
    _;
  }

  /**
   * @dev - Creates a new case with the given parameters
   * @param _patient - the patient who created the case
   * @param _caseFee - fee for this particular case
   * @param _token - the MedX token
   * @param _registry - the registry contract
   */
  function initialize (
      address _patient,
      bytes _encryptedCaseKey,
      bytes _caseKeySalt,
      bytes _caseHash,
      uint256 _caseFee,
      address _token,
      address _registry
  ) external notInitialized {
    setInitialized();
    require(_encryptedCaseKey.length != 0, 'encryptedCaseKey required');
    require(_caseKeySalt.length != 0, 'caseKeySalt required');
    require(_caseHash.length != 0, 'caseHash required');
    owner = msg.sender;
    status = CaseStatus.Open;
    encryptedCaseKey = _encryptedCaseKey;
    caseKeySalt = _caseKeySalt;
    patient = _patient;
    caseDataHash = _caseHash;
    caseFee = _caseFee;
    medXToken = IMedXToken(_token);
    registry = IRegistry(_registry);
    emit CaseCreated(patient);
  }

  function setDiagnosingDoctor(address _doctorAddress) external onlyCaseLifecycleManager {
    diagnosingDoctor = _doctorAddress;
  }

  function setChallengingDoctor(address _doctorAddress) external onlyCaseLifecycleManager {
    challengingDoctor = _doctorAddress;
  }

  function setStatus(CaseStatus _status) external onlyCaseLifecycleManager {
    status = _status;
  }

  function setDiagnosisHash(bytes _diagnosisHash)
    external
    onlyCaseLifecycleManager
  {
    diagnosisHash = _diagnosisHash;
  }

  function setChallengeHash(bytes _secondaryDiagnosisHash)
    external
    onlyCaseLifecycleManager
  {
    challengeHash = _secondaryDiagnosisHash;
  }

  function setDoctorEncryptedCaseKeys(address _doctor, bytes _doctorEncryptedKey)
    external
    onlyCaseLifecycleManager
  {
    doctorEncryptedCaseKeys[_doctor] = _doctorEncryptedKey;
  }

  /**
   * @dev - Contract should not accept any ether
   */
  function () public payable {
    revert();
  }

  function transferCaseFeeToDiagnosingDoctor() external onlyCaseLifecycleManager {
    medXToken.transfer(diagnosingDoctor, caseFee);
  }

  function transferBalanceToPatient() external onlyCaseLifecycleManager {
    medXToken.transfer(patient, medXToken.balanceOf(address(this)));
  }

  function transferChallengingDoctorFee() external onlyCaseLifecycleManager {
    medXToken.transfer(challengingDoctor, caseFee.mul(50).div(100));
  }

  function caseStatusManager() external view returns (CaseStatusManager) {
    return CaseStatusManager(registry.lookup(keccak256("CaseStatusManager")));
  }

  function caseLifecycleManager() internal view returns (CaseLifecycleManager) {
    return CaseLifecycleManager(registry.lookup(keccak256("CaseLifecycleManager")));
  }

}
