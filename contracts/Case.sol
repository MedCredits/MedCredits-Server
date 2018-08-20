pragma solidity ^0.4.23;

import "./ICase.sol";
import "./IMedXToken.sol";
import "./IDoctorManager.sol";
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

  /**
   * @dev - Contract should not accept any ether
   */
  function () public payable {
    revert();
  }

}
