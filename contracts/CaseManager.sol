pragma solidity ^0.4.23;

import "./Case.sol";
import "./MedXToken.sol";
import "./Registry.sol";
import "./Delegate.sol";
import "./Initializable.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "zeppelin-solidity/contracts/lifecycle/Pausable.sol";
import "./SkipList.sol";

contract CaseManager is Ownable, Pausable, Initializable {
    using SafeMath for uint256;
    using SkipList for SkipList.UInt256;

    uint256 public caseFee;

    address[] public caseList;
    mapping (address => uint256) public caseIndices;
    mapping (address => address[]) public patientCases;

    MedXToken public medXToken;
    Registry public registry;

    SkipList.UInt256 openCaseQueue;

    mapping (address => uint256[]) public doctorAuthorizationRequests;

    event NewCase(address indexed caseAddress, uint256 indexed index);
    event CaseDequeued(address indexed caseAddress);
    event CaseQueued(address indexed caseAddress);

    modifier onlyCase(address _case) {
      require(_case != address(0));
      require(caseIndices[_case] != uint256(0));
      _;
    }

    modifier onlyThis() {
      require(this == msg.sender);
      _;
    }

    /**
     * @dev - Constructor
     * @param _baseCaseFee - initial case fee
     * @param _medXToken - the MedX token
     */
    function initialize(uint256 _baseCaseFee, MedXToken _medXToken, Registry _registry) external notInitialized {
        require(_baseCaseFee > 0);
        require(address(_medXToken) != 0x0);
        require(address(_registry) != 0x0);
        setInitialized();

        owner = msg.sender;
        caseFee = _baseCaseFee;
        medXToken = _medXToken;
        registry = _registry;
        caseList.push(address(0));
    }

    /**
     * @dev - Contract should not accept any ether
     */
    function () payable public {
        revert();
    }

    /**
     * @dev - initial payment it 150% of the fee, 50% refunded if first diagnosis accepted
     * @param _from - owner of the tokens
     * @param _value - number of tokens allowed to spend
     * @param _token - unused
     * @param _extraData - unused
     */
    function receiveApproval(address _from, uint256 _value, address _token, bytes _extraData) external whenNotPaused {
        require(_value == caseFee.add(caseFee.mul(50).div(100)));
        require(medXToken.balanceOf(_from) >= _value);

        /**

        Call data will be structured:

        4 bytes: sig
        32 bytes: _from
        32 bytes: _value
        32 bytes: _token
        32 bytes: _extraData offset
        32 bytes: _extraData length
        X bytes: _extraData
        Y bytes: 32 - (_extraData.length % 32)

         */

        bytes4 sig;

        uint256 i;
        for (i = 0; i < 4; i++) {
          sig |= bytes4(_extraData[i]) >> 8*i;
        }

        require(sig == bytes4(keccak256('createCase(address,bytes,bytes)')));

        address _this = address(this);
        address newCase;

        uint256 inputSize = _extraData.length;

        assembly {
          let ptr := mload(0x40)
          calldatacopy(ptr, 164, inputSize)
          let result := call(gas, _this, 0, ptr, inputSize, 0, 0)
          let size := returndatasize
          returndatacopy(ptr, 0, size)

          switch result
          case 0 { revert(ptr, size) }
          default {
            newCase := mload(ptr)
          }
        }

        medXToken.transferFrom(_from, newCase, _value);
    }

    /**
     * @dev - sets the base case fee - only affects new cases
     */
    function setBaseCaseFee(uint256 _newCaseFee) public onlyOwner {
        require(_newCaseFee > 0);
        caseFee = _newCaseFee;
    }

    /**
     * @dev - returns the length of the "all" case list
     */
    function getAllCaseListCount() public constant returns (uint256) {
        return caseList.length - 1;
    }

    /**
     * @dev - returns the length of the patient specific case list
     */
    function getPatientCaseListCount(address _patient) constant public returns (uint256) {
        return patientCases[_patient].length;
    }

    /**
     * @dev - Internal function to create a new case which will have the required tokens already transferred to it
     * @param _patient - the patient creating the case
     * @return - address of the case contract created
     */
    function createCase(address _patient, bytes _encryptedCaseKey, bytes _ipfsHash) public onlyThis returns (address) {
      Delegate delegate = new Delegate(registry, keccak256("Case"));
      Case newCase = Case(delegate);
      newCase.initialize(_patient, _encryptedCaseKey, _ipfsHash, caseFee, medXToken, registry);
      uint256 caseIndex = caseList.push(address(newCase)) - 1;
      caseIndices[address(newCase)] = caseIndex;
      openCaseQueue.enqueue(address(0), caseIndex);
      patientCases[_patient].push(address(newCase));
      emit NewCase(newCase, caseIndex);
      return newCase;
    }

    function requestNextCase() external returns (address) {
      require(openCaseQueue.length() > 0, 'No more cases');
      uint256 caseIndex = openCaseQueue.dequeue(msg.sender);
      require(caseIndex > 0, 'Invalid case index');
      Case caseContract = Case(caseList[caseIndex]);
      if (caseContract.status() == Case.CaseStatus.Open) {
        caseContract.requestDiagnosisAuthorization(msg.sender);
      } else {
        caseContract.requestChallengeAuthorization(msg.sender);
      }
      doctorAuthorizationRequests[msg.sender].push(caseIndex);
      emit CaseDequeued(caseContract);
      return caseContract;
    }

    function peekNextCase() external view returns (address) {
      require(openCaseQueue.length() > 0);
      uint256 caseIndex = openCaseQueue.peek(msg.sender);
      if (caseIndex > 0) {
        return caseList[caseIndex];
      } else {
        return address(0);
      }
    }

    function addCaseToQueue(address _case) external onlyCase(_case) {
      Case caseContract = Case(_case);
      require(caseContract.status() == Case.CaseStatus.Challenged);
      openCaseQueue.enqueue(caseContract.diagnosingDoctorA(), caseIndices[_case]);
      emit CaseQueued(_case);
    }

    function openCaseCount() external view returns (uint256) {
      return openCaseQueue.length();
    }

    function doctorAuthorizationRequestCount(address _doctor) external view returns (uint256) {
      return doctorAuthorizationRequests[_doctor].length;
    }

    function doctorAuthorizationRequestCaseAtIndex(address _doctor, uint256 _doctorAuthIndex) external view returns (address) {
      require(_doctorAuthIndex < doctorAuthorizationRequests[_doctor].length);
      uint256 index = doctorAuthorizationRequests[_doctor][_doctorAuthIndex];
      require(index < caseList.length);
      return caseList[index];
    }

    /**
     * @dev Converts bytes to bytes32
     * see https://ethereum.stackexchange.com/questions/7702/how-to-convert-byte-array-to-bytes32-in-solidity
     */
    /* function bytesToBytes32(bytes b, uint256 offset) internal pure returns (bytes32) {
      bytes32 out;
      for (uint256 i = 0; i < 32; i++) {
        out |= bytes32(b[offset + i] & 0xFF) >> (i * 8);
      }
      return out;
    } */
}
