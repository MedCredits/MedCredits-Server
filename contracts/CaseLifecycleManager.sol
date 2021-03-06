// This is the contract with mainly external method definitions to receive calls from web3 / etc
// It does the require / guard checks to ensure the incoming requests are coming from the correct
// user, and acts as the interface to update the state of a case

pragma solidity ^0.4.23;

import './Case.sol';
import './CaseManager.sol';
import './CaseFirstPhaseManager.sol';
import './CaseSecondPhaseManager.sol';
import './CaseScheduleManager.sol';
import './DoctorManager.sol';
import "./Initializable.sol";
import './Registry.sol';
import './RegistryLookup.sol';
import './DelegateTarget.sol';

import "zeppelin-solidity/contracts/ownership/Ownable.sol";

contract CaseLifecycleManager is Ownable, Initializable, DelegateTarget {

  using RegistryLookup for Registry;

  Registry registry;

  /**
   * @dev - throws if the sender is not the case's patient
   */
  modifier onlyPatient(address _caseAddress) {
    Case _case = Case(_caseAddress);
    require(msg.sender == _case.patient()/*, 'sender needs to be the patient'*/);
    _;
  }

  /**
   * @dev - throws unless the patient has waited 24 hours
   */
  modifier patientWaitedOneDay(address _caseAddress) {
    require(
      registry.caseScheduleManager().patientWaitedOneDay(_caseAddress)/*,
      'patient must wait at least one day to call this'*/
    );
    _;
  }

  /**
   * @dev - throws if called by any account that is not a case
   */
  modifier isCase(address _caseAddress) {
    require(registry.caseManager().isCase(_caseAddress)/*, 'case not found'*/);
    _;
  }

  /**
   * @dev - throws if called by any account that is not the deployed case scheduler
   */
  modifier onlyCaseScheduleManager() {
    require(
      msg.sender == address(registry.caseScheduleManager())/*,
      'Must be the Case Schedule Manager contract'*/
    );
    _;
  }

  /**
   * @dev - Throws if not instance of CaseManager
   */
  modifier onlyCaseManager() {
    require(msg.sender == address(registry.caseManager())/*,
      'must be the Case Manager contract'*/
    );
    _;
  }

  /**
   * @dev - throws if called by any account that is not the challenging doctor.
   */
  modifier onlyChallengeDoctor(address _caseAddress) {
    Case _case = Case(_caseAddress);

    require(
      msg.sender == _case.challengingDoctor()/*,
      'Must be the second opinion challenging doctor'*/
    );
    _;
  }

  /**
   * @dev - throws if called by any account other than a doctor.
   */
  modifier isDermatologist(address _doctor) {
    require(
         registry.doctorManager().isDoctor(_doctor)
      && registry.doctorManager().isDermatologist(_doctor)/*,
      '_doctor address must be a Registered Doctor & Dermatologist'*/
    );
    _;
  }

  /**
   * @dev - throws if called by any account other than the diagnosing doctor
   */
  modifier onlyDiagnosingDoctor(address _caseAddress) {
    Case _case = Case(_caseAddress);
    require(msg.sender == _case.diagnosingDoctor()/*, 'sender needs to be the diagnosis doctor'*/);
    _;
  }

  /**
   * @dev - throws if called by any account other than the diagnosing doctor
   */
  modifier onlyDiagnosingDoctorSenderOrCaseDiagnosingDoctor(address _caseAddress) {
    Case _case = Case(_caseAddress);
    require(
      msg.sender == _case.diagnosingDoctor() || msg.sender == address(registry.caseDiagnosingDoctor())/*,
      'sender needs to be the diagnosis doctor or the CaseDiagnosingDoctor contract'*/
    );
    _;
  }



  /**
   * @dev - Contract should not accept any ether
   */
  function () public payable {
    revert();
  }

  function initializeTarget(address _registry, bytes32) public notInitialized {
    require(_registry != address(0)/*, 'registry is not blank'*/);
    registry = Registry(_registry);
    owner = msg.sender;
    setInitialized();
  }

  function setDiagnosingDoctor(address _caseAddress, address _doctor, bytes _doctorEncryptedKey)
    public
    isCase(_caseAddress)
    onlyCaseManager
    isDermatologist(_doctor)
  {
    Case _case = Case(_caseAddress);

    require(_case.status() == Case.CaseStatus.Open/*, 'case must be open to set the Diagnosing Doctor'*/);
    require(_case.diagnosingDoctor() == address(0)/*, 'the Diagnosing Doctor must be blank'*/);
    require(_doctor != _case.patient()/*, 'the doctor cannot be the patient'*/);

    registry.caseFirstPhaseManager().setDiagnosingDoctor(_case, _doctor, _doctorEncryptedKey);
  }

  /**
   * @dev - The patient accepts the evaluation and tokens are credited to doctor
   * and rest is returned to the patient (can also happen 24 hours after the patient
   * chooses a challenge doc)
   */
  function acceptDiagnosis(address _caseAddress)
    external
    isCase(_caseAddress)
    onlyPatient(_caseAddress)
  {
    Case _case = Case(_caseAddress);

    require(_case.evaluatedOrChallenging()//,
      //'must be in evaluated or challenging state'
    );

    registry.caseFirstPhaseManager().acceptDiagnosis(_case);

    // If this case had been challenged, clear the case for that doc
    if (_case.challengingDoctor() != address(0)) {
      registry.caseSecondPhaseManager().clearChallengingDoctor(_case);
    }
  }

  /**
     * @dev - doctor submits diagnosis for case. Patient must have approved the doctor in order for them to decrypt the case files
     * @param _diagnosisHash - Swarm hash of where the diagnosis data is stored
     */
  function diagnoseCase(address _caseAddress, bytes _diagnosisHash)
    external
    onlyDiagnosingDoctor(_caseAddress)
    isCase(_caseAddress)
  {
    Case _case = Case(_caseAddress);

    require(
      _case.status() == Case.CaseStatus.Evaluating/*,
      'case must be in evaluating state to diagnose'*/
    );

    registry.caseFirstPhaseManager().diagnoseCase(_caseAddress, _diagnosisHash);
  }

  /**
   * @dev - allows the patient to withdraw funds after 1 day if the initial doc didn't respond
   */
  function patientWithdrawFunds(address _caseAddress)
    external
    isCase(_caseAddress)
    onlyPatient(_caseAddress)
    patientWaitedOneDay(_caseAddress)
  {
    Case _case = Case(_caseAddress);

    require(
      _case.status() == Case.CaseStatus.Evaluating/*,
      'case must be in evaluating state to close and withdraw funds'*/
    );

    registry.caseFirstPhaseManager().patientWithdrawFunds(_caseAddress);
  }

  /**
   * @dev - allows the patient to choose another doc if the first doc hasn't responded after 24 hours
   */
  function patientRequestNewInitialDoctor(address _caseAddress, address _doctor, bytes _doctorEncryptedKey)
    external
    isCase(_caseAddress)
    onlyPatient(_caseAddress)
    patientWaitedOneDay(_caseAddress)
  {
    Case _case = Case(_caseAddress);

    require(
      _case.status() == Case.CaseStatus.Evaluating/*,
      'case must be in evaluating state to choose a different doctor'*/
    );

    registry.caseFirstPhaseManager().patientRequestNewInitialDoctor(_caseAddress, _doctor, _doctorEncryptedKey);
  }

  /**
   * @dev - allows the patient to choose another challenge doc if the second doc hasn't responded after 24 hours
   */
  function patientRequestNewChallengeDoctor(address _caseAddress, address _doctor, bytes _doctorEncryptedKey)
    external
    isCase(_caseAddress)
    onlyPatient(_caseAddress)
    patientWaitedOneDay(_caseAddress)
  {
    Case _case = Case(_caseAddress);

    require(
      _case.status() == Case.CaseStatus.Challenging//,
      // 'case must be in evaluating state to choose a different doctor'
    );

    registry.caseSecondPhaseManager().patientRequestNewChallengeDoctor(_caseAddress, _doctor, _doctorEncryptedKey);
  }

  /**
   * @dev - The initial doctor can accept their evaluation after 48 hours and get tokens owing to them
   */
  function acceptAsDoctor(address _caseAddress)
    external
    isCase(_caseAddress)
    onlyDiagnosingDoctorSenderOrCaseDiagnosingDoctor(_caseAddress)
  {
    Case _case = Case(_caseAddress);
    require(_case.evaluatedOrChallenging()/*, 'Case must be in Evaluated or Challenged state'*/);

    if (_case.status() == Case.CaseStatus.Evaluated) {
      require(
        registry.caseScheduleManager().doctorWaitedTwoDays(_caseAddress)/*,
        'Must wait 2 days'*/
      );
    } else if (_case.status() == Case.CaseStatus.Challenging) {
      require(
        registry.caseScheduleManager().doctorWaitedFourDays(_caseAddress)/*,
        'Must wait 4 days'*/
      );
    }

    registry.caseFirstPhaseManager().acceptAsDoctor(_case);
  }

  function challengeWithDoctor(address _caseAddress, address _doctor, bytes _doctorEncryptedKey)
    external
    onlyPatient(_caseAddress)
    isCase(_caseAddress)
    isDermatologist(_doctor)
  {
    Case _case = Case(_caseAddress);

    require(_case.challengingDoctor() == address(0)/*, 'the Diagnosing Doctor must be blank'*/);
    require(_doctor != _case.patient()/*, 'the doctor cannot be the patient'*/);
    require(_case.status() == Case.CaseStatus.Evaluated/*, 'Case must be in Evaluated state'*/);

    registry.caseSecondPhaseManager().challengeWithDoctor(_caseAddress, _doctor, _doctorEncryptedKey);
  }

  /**
   * @dev - Submit a diagnosis for a challenged case, must be a different doctor to the first
   * @param _secondaryDiagnosisHash - Location of the diagnosis
   * @param _accept - diagnosis the same as the original
   */
  function diagnoseChallengedCase(
    address _caseAddress,
    bytes _secondaryDiagnosisHash,
    bool _accept
  )
    external
    isCase(_caseAddress)
    onlyChallengeDoctor(_caseAddress)
  {
    Case _case = Case(_caseAddress);

    require(
      _case.status() == Case.CaseStatus.Challenging/*,
      'case needs to be challenged for a challenge diagnosis'*/
    );

    registry.caseSecondPhaseManager().diagnoseChallengedCase(_case, _secondaryDiagnosisHash, _accept);
  }

}
