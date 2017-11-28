import medXTokenContractConfig from '../config/contracts/medXToken.json';
import caseFactoryContractConfig from '../config/contracts/caseFactory.json';
import caseContractConfig from '../config/contracts/case.json';
import doctorManagerContractConfig from '../config/contracts/doctorManager.json';
import {promisify} from './common-util';

export function getSelectedAccount() {
    const { web3 } = window;

    return web3.eth.accounts[0];
}

export async function getSelectedAccountBalance() {
    const selectedAccount = getSelectedAccount();
    const contract = getMedXTokenContract();

    const balance = promisify(cb => contract.balanceOf(selectedAccount, cb));

    return balance;
}

export async function getMedXTokenBalance(account) {
    const contract = getMedXTokenContract();

    return promisify(cb => contract.balanceOf(account, cb));
}

export function mintMedXTokens(account, amount, callback) {
    const contract = getMedXTokenContract();
    contract
        .mint(account, amount, getDefaultTxObj(), function(error, result) {
            if(error !== null){
                callback(error, result);
            } else {
                waitForTxComplete(result, callback);
            }
        });
}

export function createCase(documentHash, callback) {
    const contract = getMedXTokenContract();
    const caseFactoryAddress = caseFactoryContractConfig.address;

    contract
        .approveAndCall(caseFactoryAddress, 150, documentHash, getDefaultTxObj(), function(error, result){
            if(error !== null) {
                callback(error, result);
            } else {
                waitForTxComplete(result, callback);
            }
        });
}

export async function getAllCasesForCurrentAccount() {
    const contract = getCaseFactoryContract();
    const account = getSelectedAccount();

    const count = await promisify(cb => contract.getPatientCaseListCount(account, cb));

    let cases = [];
    
    for(let i = 0; i < count; i++) {
        const caseContractAddress = await promisify(cb => contract.patientCases(account, i, cb));

        const caseContract = getCaseContract(caseContractAddress);

        const caseDetailLocationHash = await promisify(cb => caseContract.caseDetailLocationHash(cb));
        const status = await promisify(cb => caseContract.status(cb));

        cases.push({
            number: i + 1,
            address: caseContractAddress,
            caseDetailLocationHash : caseDetailLocationHash,
            status: status.toNumber(),
            statusName: getCaseStatusName(status.toNumber())
        });
    }

    return cases;
}

function getCaseStatusName(status) {
    switch(status) {
        case 1:
            return "Open";
        case 2:
            return "Evaluated";
        case 3:
            return "Closed";
        case 4:
            return "Challenged";
        case 5:
            return "Canceled";
        case 6:
            return "Rejected";
        case 7:
            return "Confirmed";
        default:
            return "";
    }
}

export function registerDoctor(address, callback) {
    const contract = getDoctorManagerContract();
    contract
        .addDoctor(address, getDefaultTxObj(), function(error, result) {
            if(error !== null){
                callback(error, result);
            } else {
                waitForTxComplete(result, callback);
            }
        });
}

function getMedXTokenContract() {
    const { web3 } = window;

    const contract = web3.eth.contract(medXTokenContractConfig.abi);
    return contract.at(medXTokenContractConfig.address);
}

function getCaseFactoryContract() {
    const { web3 } = window;

    const contract = web3.eth.contract(caseFactoryContractConfig.abi);
    return contract.at(caseFactoryContractConfig.address);
}

function getCaseContract(address) {
    const { web3 } = window;

    const contract = web3.eth.contract(caseContractConfig.abi);
    return contract.at(address);
}

function getDoctorManagerContract() {
    const { web3 } = window;

    const contract = web3.eth.contract(doctorManagerContractConfig.abi);
    return contract.at(doctorManagerContractConfig.address);
}

function getDefaultTxObj() {
    const { web3 } = window;

    return {'from': web3.eth.accounts[0]};
}

function waitForTxComplete(txHash, callback) {
    const { web3 } = window;

    web3.eth.getTransactionReceipt(txHash, function (error, result) {
        if(error !== null) {
            callback(error, result);
            return;
        }
        
        if (result !== null) {
            callback(null, result);
            return;
        }
        console.log("Waiting for tx to be mined....");
        setTimeout(function () {
            waitForTxComplete(txHash, callback);
        }, 5000);
    });
}