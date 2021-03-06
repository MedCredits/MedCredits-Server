import React, { Component } from 'react'
import { toBN } from '~/utils/toBN'
import { connect } from 'react-redux'
import { cold } from 'react-hot-loader'
import {
  ControlLabel,
  ToggleButtonGroup,
  ToggleButton,
  ButtonToolbar,
  Button,
  Modal
} from 'react-bootstrap'
import { toastr } from '~/toastr'
import ReactTooltip from 'react-tooltip'
import { withRouter } from 'react-router-dom'
import classnames from 'classnames'
import { sleep } from '~/utils/sleep'
import { isNotEmptyString } from '~/utils/isNotEmptyString'
import { cancelablePromise } from '~/utils/cancelablePromise'
import { uploadJson, uploadFile } from '~/utils/storage-util'
import hashToHex from '~/utils/hash-to-hex'
import get from 'lodash.get'
import { genKey } from '~/services/gen-key'
import { currentAccount } from '~/services/sign-in'
import { jicImageCompressor } from '~/services/jicImageCompressor'
import { computeChallengeFee } from '~/utils/computeChallengeFee'
import { computeTotalFee } from '~/utils/computeTotalFee'
import { EtherFlip } from '~/components/EtherFlip'
import { Dai } from '~/components/Dai'
import { DaiApproval } from '~/components/DaiApproval'
import { DaiAllowance } from '~/components/DaiAllowance'
import { InfoQuestionMark } from '~/components/InfoQuestionMark'
import { WyreModal } from '~/components/WyreModal'
import { externalTransactionFinders } from '~/finders/externalTransactionFinders'
import {
  contractByName,
  cacheCall,
  cacheCallValue,
  withSaga,
  withSend,
  TransactionStateHandler
} from '~/saga-genesis'
import { reencryptCaseKeyAsync } from '~/services/reencryptCaseKey'
import { getExifOrientation } from '~/services/getExifOrientation'
import { mixpanel } from '~/mixpanel'
import { Loading } from '~/components/Loading'
import { HippoImageInput } from '~/components/forms/HippoImageInput'
import { HippoTextArea } from '~/components/forms/HippoTextArea'
import { PatientInfo } from './PatientInfo'
import { SpotQuestions } from './SpotQuestions'
import { RashQuestions } from './RashQuestions'
import { AcneQuestions } from './AcneQuestions'
import { NextAvailableDoctor } from '~/components/NextAvailableDoctor'
import pull from 'lodash.pull'
import FlipMove from 'react-flip-move'
import { promisify } from '~/utils/promisify'
import { regions } from '~/lib/regions'

function mapStateToProps (state) {
  const address = get(state, 'sagaGenesis.accounts[0]')
  const CaseManager = contractByName(state, 'CaseManager')
  const CasePaymentManager = contractByName(state, 'CasePaymentManager')
  const Dai = contractByName(state, 'Dai')
  const WrappedEther = contractByName(state, 'WrappedEther')
  const daiBalance = cacheCallValue(state, Dai, 'balanceOf', address)

  const weiPerCase = cacheCallValue(state, CasePaymentManager, 'weiPerCase')
  const caseFeeUsdWei = cacheCallValue(state, CasePaymentManager, 'baseCaseFeeUsdWei')
  const usdWeiPerEther = cacheCallValue(state, CasePaymentManager, 'usdWeiPerEther')
  const AccountManager = contractByName(state, 'AccountManager')
  const publicKey = cacheCallValue(state, AccountManager, 'publicKeys', address)
  const doctor = get(state, 'nextAvailableDoctor.doctor')

  const sendEtherTx = externalTransactionFinders.sendEther(state)
  const sendDaiTx = externalTransactionFinders.sendDai(state)
  const etherIsInflight = sendEtherTx && sendEtherTx.inFlight
  const daiIsInFlight = sendDaiTx && sendDaiTx.inFlight

  return {
    AccountManager,
    doctor,
    address,
    daiBalance,
    daiIsInFlight,
    etherIsInflight,
    weiPerCase,
    caseFeeUsdWei,
    usdWeiPerEther,
    transactions: state.sagaGenesis.transactions,
    CaseManager,
    CasePaymentManager,
    publicKey,
    WrappedEther,
    Dai
  }
}

function mapDispatchToProps(dispatch) {
  return {
    dispatchExcludedDoctors: (excludedAddresses) => {
      dispatch({ type: 'EXCLUDED_DOCTORS', excludedAddresses })
    },
    dispatchPatientInfo: (patientCountry, patientRegion) => {
      dispatch({ type: 'PATIENT_INFO', patientCountry, patientRegion })
    },
    dispatchNextAvailableDoctor: (doctor) => {
      dispatch({ type: "NEXT_AVAILABLE_DOCTOR", doctor })
    }
  }
}

function* saga({ address, Dai, AccountManager, CaseManager, CasePaymentManager }) {
  if (!address || !Dai || !AccountManager || !CaseManager || !CasePaymentManager) { return }
  yield cacheCall(AccountManager, 'publicKeys', address)
  yield cacheCall(CasePaymentManager, 'weiPerCase')
  yield cacheCall(CasePaymentManager, 'usdWeiPerEther')
  yield cacheCall(CasePaymentManager, 'baseCaseFeeUsdWei')
  yield cacheCall(Dai, 'balanceOf', address)
}

const requiredFields = [
  'age',
  'gender',
  'country',
  'allergies',
  'spotRashOrAcne',
  'firstImageHash',
  'secondImageHash',
  'howLong',
  'sexuallyActive',
  'prevTreatment',
  'doctor'
]
// These fields are dynamically added as required depending on choices the user makes:
// 'pregnant' => female only
// 'whatAllergies' => allergies yes only
// 'region' => USA only
// 'worseWithPeriod' => female and acne only
// 'onBirthControl' => female and acne only
// 'hadBefore' => spot/rash only

export const CreateCase = connect(mapStateToProps, mapDispatchToProps)(
  withSaga(saga)(
    withSend(
      class _CreateCase extends Component {

        constructor (props) {
          super(props)

          this.state = {
            acneDoesItInclude: [],
            age: null,
            allergies: null,
            caseEncryptionKey: genKey(32),
            country: '',
            description: null,
            errors: [],
            firstImageFileName: null,
            firstImageHash: null,
            firstImagePercent: null,
            gender: null,
            hadBefore: null,
            howLong: null,
            isSubmitting: false,
            isTheRash: [],
            isTheSpot: [],
            onBirthControl: null,
            paymentMethod: 'ETH',
            pregnant: null,
            prevTreatment: null,
            region: null,
            regionOptions: [],
            secondImageFileName: null,
            secondImageHash: null,
            secondImagePercent: null,
            sexuallyActive: null,
            showPublicKeyModal: false,
            showTermsModal: false,
            spotRashOrAcne: null,
            whatAllergies: null,
            worseWithPeriod: null
          }

          this.setCountryRef = element => { this.countryInput = element }
          this.setRegionRef = element => { this.regionInput = element }
        }

        componentDidMount() {
          // This ensures we attempt to randomly find a different doctor for the next
          // case this patient may submit
          this.props.dispatchExcludedDoctors([ this.props.address ])
        }

        componentWillReceiveProps (nextProps) {
          if (this.props.address !== nextProps.address) {
            // This ensures we attempt to randomly find a different doctor if the current eth address
            // was undefined on mount or changes mid-session
            this.props.dispatchExcludedDoctors([ nextProps.address ])
          }

          if (this.state.createCaseEvents) {
            this.state.createCaseEvents.handle(nextProps.transactions[this.state.transactionId])
              .onError((error) => {
                toastr.transactionError(error)
                this.setState({
                  createCaseEvents: null,
                  transactionId: '',
                  isSubmitting: false
                })
              })
              .onTxHash(() => {
                toastr.success('Your case has been broadcast to the network. It will take a moment to be confirmed.')
                mixpanel.track('Case Submitted')
                this.props.history.push('/patients/cases')

                // This ensures we attempt to randomly find a different doctor for the next
                // case this patient may submit
                // this.props.dispatchExcludedDoctors([ this.props.address ])
              })
          }
        }

        handleButtonGroupOnChange = (event) => {
          this.setState({ [event.target.name]: event.target.value }, () => {
            this.validateField(event.target.name)

            this.setOrClearRequired(event.target.name)
          })
        }

        setOrClearRequired = (fieldName) => {
          if (fieldName === 'gender') {
            if (this.state.gender === 'Female') {
              requiredFields.splice(2, 0, 'pregnant')

              if (this.state.spotRashOrAcne === 'Acne') {
                const howLongIndex = requiredFields.indexOf('howLong')
                requiredFields.splice(howLongIndex + 1, 0, 'worseWithPeriod')
                requiredFields.splice(howLongIndex + 2, 0, 'onBirthControl')
              }
            } else {
              pull(requiredFields, 'pregnant')
              this.setState({ pregnant: null })

              if (this.state.spotRashOrAcne === 'Acne') {
                pull(requiredFields, 'worseWithPeriod', 'onBirthControl')
                this.setState({ worseWithPeriod: null, onBirthControl: null })
              }
            }
          }

          if (fieldName === 'spotRashOrAcne') {
            if (this.state.spotRashOrAcne === 'Acne' && this.state.gender === 'Female') {
              const howLongIndex = requiredFields.indexOf('howLong')
              requiredFields.splice(howLongIndex + 1, 0, 'worseWithPeriod')
              requiredFields.splice(howLongIndex + 2, 0, 'onBirthControl')
            } else {
              pull(requiredFields, 'worseWithPeriod', 'onBirthControl')
              this.setState({ worseWithPeriod: null, onBirthControl: null })
            }
          }

          if (fieldName === 'allergies') {
            if (this.state.allergies === 'Yes') {
              const allergiesIndex = requiredFields.indexOf('allergies')
              requiredFields.splice(allergiesIndex, 0, 'whatAllergies')
            } else {
              pull(requiredFields, 'whatAllergies')
              this.setState({ whatAllergies: null })
            }
          }

          if (fieldName === 'spotRashOrAcne') {
            if (this.state.spotRashOrAcne === 'Spot' || this.state.spotRashOrAcne === 'Rash') {
              const howLongIndex = requiredFields.indexOf('howLong')
              requiredFields.splice(howLongIndex, 0, 'hadBefore')
            } else {
              pull(requiredFields, 'hadBefore')
              this.setState({ hadBefore: null })
            }
          }
        }

        handleCheckboxGroupOnChange = (event) => {
          let currentValues = this.state[event.target.name]

          if (currentValues.includes(event.target.value)) {
            pull(currentValues, event.target.value)
          } else {
            currentValues.push(event.target.value)
          }

          this.setState({ [event.target.name]: currentValues })
        }

        handleTextInputOnChange = (event) => {
          this.setState({ [event.target.id]: event.target.value })
        }

        handleTextInputOnBlur = (event) => {
          this.validateField(event.target.id)
        }

        handleTextAreaOnChange = (event) => {
          this.setState({ [event.target.id]: event.target.value })
        }

        handleTextAreaOnBlur = (event) => {
          this.validateField(event.target.id)
        }

        fileTooLarge (size) {
          return size > 10485760 // 10 megabytes
        }

        validateFile (file) {
          let error = null
          if (file && this.fileTooLarge(file.size)) {
            error = 'The file must be smaller than 10MB'
          }
          return error
        }

        handleCaptureImage = async (file, imageToCapture) => {
          if (!file) { return }

          await this.handleResetImageState(imageToCapture)

          const error = this.validateFile(file)
          if (error) {
            this.setState({ [`${imageToCapture}Error`]: error })
            return
          }

          const fileName = file.name
          const progressHandler = (percent) => {
            this.setState({ [`${imageToCapture}Percent`]: percent })
          }

          const cancelableUploadPromise = cancelablePromise(
            new Promise(async (resolve, reject) => {
              const orientation = await this.srcImgOrientation(file)
              const blob = await this.compressFile(file, orientation)
              progressHandler(10)
              await sleep(300)

              let arrayBuffer
              const fileReader = new FileReader()
              await this.promisifyFileReader(fileReader, blob)
              arrayBuffer = fileReader.result

              progressHandler(20)
              await sleep(300)

              uploadFile(arrayBuffer, this.state.caseEncryptionKey, progressHandler).then(imageHash => {
                return resolve(imageHash)
              })
            })
          )
          await this.setState({ [`${imageToCapture}UploadPromise`]: cancelableUploadPromise })

          cancelableUploadPromise
            .promise
            .then((imageHash) => {
              this.setState({
                [`${imageToCapture}Hash`]: imageHash,
                [`${imageToCapture}FileName`]: fileName,
                [`${imageToCapture}Percent`]: null
              })

              this.validateField(`${imageToCapture}Hash`)
            })
            .catch((reason) => {
              // cancel pressed
              this.handleResetImageState(imageToCapture)
            })
        }

        srcImgOrientation = async (file) => {
          return await getExifOrientation(file)
        }

        handleResetImageState = async (image) => {
          await this.setState({
            [`${image}UploadPromise`]: undefined,
            [`${image}Hash`]: null,
            [`${image}FileName`]: null,
            [`${image}Percent`]: null,
            [`${image}Error`]: null
          })
        }

        promisifyFileReader = (fileReader, blob) => {
          return new Promise((resolve, reject) => {
            fileReader.onloadend = resolve
            fileReader.readAsArrayBuffer(blob)
          })
        }

        calculateScalePercent(sourceWidth, sourceHeight, targetSize) {
          let resizeRatio
          if ((sourceWidth / sourceHeight) > 1) {
            resizeRatio = (targetSize / sourceWidth)
          } else {
            resizeRatio = (targetSize / sourceHeight)
          }
          // console.log(`${sourceWidth}x${sourceHeight} => ${sourceWidth*resizeRatio}x${sourceHeight*resizeRatio}. Resize Ratio is: ${resizeRatio}`)
          return resizeRatio
        }

        async compressFile(file, orientation) {
          const qualityPercent = 0.5

          return await promisify(cb => {
            const image = new Image()

            image.onload = (event) => {
              let error
              const width = event.target.width
              const height = event.target.height

              const scalePercent = this.calculateScalePercent(width, height, 1000)

              const canvas = jicImageCompressor.compress(image, qualityPercent, scalePercent, orientation)
              // console.log('source img length: ' + event.target.src.length)
              // console.log('compressed img length: ' + event.target.src.length)

              canvas.toBlob((blob) => { cb(error, blob) }, "image/jpeg", qualityPercent)
            }

            image.src = window.URL.createObjectURL(file)
          })
        }

        handleCancelUpload = async (imageToCancel) => {
          if (imageToCancel === 'firstImage' && this.state.firstImageUploadPromise) {
            this.state.firstImageUploadPromise.cancel()
          } else if (this.state.secondUploadPromise) {
            this.state.secondUploadPromise.cancel()
          }
        }

        findNewDoctor = () => {
          this.props.dispatchPatientInfo(this.state.country, this.state.region ? this.state.region.value : '')
        }

        checkCountry = () => {
          this.validateField('country')

          if (this.isCanadaOrUSA()) {
            requiredFields.push('region')
          } else {
            pull(requiredFields, 'region')

            this.setState({ region: null })
            this.regionInput.select.clearValue()
          }

          this.findNewDoctor()

          this.setState({ regionOptions: this.isCanadaOrUSA() ? regions[this.state.country] : [] })
        }

        isCanadaOrUSA = () => {
          return this.state.country === 'US' || this.state.country === 'CA'
        }

        validateField = (fieldName) => {
          if (!requiredFields.includes(fieldName)) {
            return
          }

          const errors = this.state.errors

          if (!isNotEmptyString(this.state[fieldName])) {
            errors.push(fieldName)
          } else {
            pull(errors, fieldName)
          }

          if (errors.includes('firstImageHash')) {
            this.handleResetImageState('firstImage')
          } else if (errors.includes('secondImageHash')) {
            this.handleResetImageState('secondImage')
          }

          this.setState({ errors: errors })
        }

        runValidation = async () => {
          // reset error states
          await this.setState({ errors: [] })

          let errors = []
          let length = requiredFields.length

          for (var fieldIndex = 0; fieldIndex < length; fieldIndex++) {
            let fieldName = requiredFields[fieldIndex]
            if (!isNotEmptyString(this.state[fieldName]) &&
                !isNotEmptyString(this.props[fieldName])
            ) {
              errors.push(fieldName)
            }
          }

          await this.setState({ errors: errors })

          if (errors.length > 0) {
            // First reset it so it will still take the user to the anchor even if
            // we already took them there before (still error on same field)
            window.location.hash = `#`;

            // Go to first error field
            window.location.hash = `#${errors[0]}`;
          }
        }

        handleSubmit = async (event) => {
          const { address,
            weiPerCase,
            noDoctorsAvailable
          } = this.props
          event.preventDefault()

          await this.runValidation()

          if (!weiPerCase) {
            toastr.warning('The case fee has not been set.')
          } else if (this.props.doctor && this.props.doctor.address === address) {
            toastr.warning('You cannot be your own Doctor.')
          } else if (noDoctorsAvailable) {
            toastr.warning('There are no Doctors currently available. Please try again later.')
          } else if (this.state.errors.length === 0) {
            this.setState({
              isSubmitting: true
            }, this.doCreateCase)
          }
        }

        handleCloseDisclaimerModal = (event) => {
          if (event) {
            event.preventDefault()
          }
          this.setState({ showDisclaimerModal: false });
        }

        doCreateCase = async () => {
          let retries = 0
          const maxRetries = 3
          let transactionId

          while(transactionId === undefined) {
            try {
              await sleep(1200)

              transactionId = await this.createNewCase()

              if (transactionId) {
                this.setState({
                  transactionId,
                  createCaseEvents: new TransactionStateHandler()
                })
              }
            } catch (error) {
              if (++retries === maxRetries) {
                toastr.error('There was an issue creating your case, please try again.')
                this.setState({
                  isSubmitting: false
                })
                console.error(error)
                return
              }
            }
          }
        }

        handleCountryChange = (newValue) => {
          this.setState({ country: newValue.value, region: null }, this.checkCountry)
        }

        handleRegionChange = (newValue) => {
          this.setState({ region: newValue }, () => {
            if (this.isCanadaOrUSA()) {
              this.validateField('region')

              this.findNewDoctor()
            }
          })
        }

        handleOnChangeDoctor = (option) => {
          this.props.dispatchNextAvailableDoctor(option.doctor)
        }

        createNewCase = async () => {
          const { send, CaseManager } = this.props
          const caseInformation = {
            firstImageHash: this.state.firstImageHash,
            secondImageHash: this.state.secondImageHash,
            gender: this.state.gender,
            allergies: this.state.allergies,
            pregnant: this.state.pregnant,
            whatAllergies: this.state.whatAllergies,
            spotRashOrAcne: this.state.spotRashOrAcne,
            howLong: this.state.howLong,
            hadBefore: this.state.hadBefore,
            isTheSpot: this.state.isTheSpot.join(', '),
            isTheRash: this.state.isTheRash.join(', '),
            acneDoesItInclude: this.state.acneDoesItInclude.join(', '),
            worseWithPeriod: this.state.worseWithPeriod,
            onBirthControl: this.state.onBirthControl,
            skinCancer: this.state.skinCancer,
            sexuallyActive: this.state.sexuallyActive,
            age: this.state.age,
            country: this.state.country,
            region: this.state.region ? this.state.region.value : '',
            prevTreatment: this.state.prevTreatment,
            description: this.state.description
          }

          const caseJson = JSON.stringify(caseInformation)
          const hash = await uploadJson(caseJson, this.state.caseEncryptionKey)
          const account = currentAccount()
          const caseKeySalt = genKey(32)
          const encryptedCaseKey = await account.encrypt(this.state.caseEncryptionKey, caseKeySalt)

          const doctorPublicKey = this.props.doctor.publicKey.substring(2)
          const doctorEncryptedCaseKey = await reencryptCaseKeyAsync({ account, encryptedCaseKey, doctorPublicKey, caseKeySalt })

          let hashHex = hashToHex(hash)

          const paymentMethodOptions = {
            ETH: this.props.WrappedEther,
            DAI: this.props.Dai
          }
          const tokenContract = paymentMethodOptions[this.state.paymentMethod]
          let value = 0
          if (this.state.paymentMethod === 'ETH') {
            value = computeTotalFee(this.props.weiPerCase)
          }

          let result = null
          if (!this.props.publicKey) {
            result = await send(CaseManager, 'createAndAssignCaseWithPublicKey',
              tokenContract,
              this.props.address,
              '0x' + encryptedCaseKey,
              '0x' + caseKeySalt,
              '0x' + hashHex,
              this.props.doctor.address,
              '0x' + doctorEncryptedCaseKey,
              '0x' + account.hexPublicKey()
            )({
              value,
              from: this.props.address
            })
          } else {
            result = await send(CaseManager, 'createAndAssignCase',
              tokenContract,
              this.props.address,
              '0x' + encryptedCaseKey,
              '0x' + caseKeySalt,
              '0x' + hashHex,
              this.props.doctor.address,
              '0x' + doctorEncryptedCaseKey
            )({
              value,
              from: this.props.address
            })
          }
          return result
        }

        fileUploadActive = (percent) => {
          return (percent !== null) ? true : false
        }

        errorMessage = (fieldName) => {
          let msg
          if (fieldName === 'country' || fieldName === 'region') {
            msg = 'must be chosen'
          } else if (fieldName.match(/ImageHash/g)) {
            msg = 'There was an error uploading this image. Please choose a photo and wait for it to complete uploading'
          } else {
            msg = 'must be filled out'
          }
          return msg
        }

        render() {
          if (this.props.address === undefined) { return null }

          let errors = {}
          for (var i = 0; i < this.state.errors.length; i++) {
            let fieldName = this.state.errors[i]

            errors[fieldName] =
              <p key={`errors-${i}`} className='has-error help-block small'>
                {this.errorMessage(fieldName)}
              </p>
          }

          if (this.state.firstImageError) {
            var firstImageError = <p className='has-error help-block'>{this.state.firstImageError}</p>
          }

          if (this.state.secondImageError) {
            var secondImageError = <p className='has-error help-block'>{this.state.secondImageError}</p>
          }

          if (this.state.spotRashOrAcne === 'Spot') {
            var spotQuestions = <SpotQuestions
              errors={errors}
              textInputOnChange={this.handleTextInputOnChange}
              textInputOnBlur={this.handleTextInputOnBlur}
              buttonGroupOnChange={this.handleButtonGroupOnChange}
              checkboxGroupOnChange={this.handleCheckboxGroupOnChange}
            />
          } else if (this.state.spotRashOrAcne === 'Rash') {
            var rashQuestions = <RashQuestions
              errors={errors}
              textInputOnChange={this.handleTextInputOnChange}
              textInputOnBlur={this.handleTextInputOnBlur}
              buttonGroupOnChange={this.handleButtonGroupOnChange}
              checkboxGroupOnChange={this.handleCheckboxGroupOnChange}
            />
          } else if (this.state.spotRashOrAcne === 'Acne') {
            var acneQuestions = <AcneQuestions
              errors={errors}
              textInputOnChange={this.handleTextInputOnChange}
              textInputOnBlur={this.handleTextInputOnBlur}
              buttonGroupOnChange={this.handleButtonGroupOnChange}
              checkboxGroupOnChange={this.handleCheckboxGroupOnChange}
              gender={this.state.gender}
            />
          }

          if (this.props.daiIsInFlight && this.state.paymentMethod === 'DAI') {
            var submitButtonTooltip = 'Your DAI is still transferring'
          } else if (this.props.etherIsInflight && this.state.paymentMethod === 'ETH') {
            submitButtonTooltip = 'Your Ether is still transferring'
          }

          if (this.state.paymentMethod === 'ETH') {
            var caseFeeItem = <EtherFlip wei={computeTotalFee(this.props.weiPerCase) - computeChallengeFee(this.props.weiPerCase)} />
            var depositItem = <EtherFlip wei={computeChallengeFee(this.props.weiPerCase)} />
            var totalItem = <EtherFlip wei={computeTotalFee(this.props.weiPerCase)} />
          } else {
            const totalFeeUsdWei = computeTotalFee(this.props.caseFeeUsdWei)
            const daiBalance = toBN(this.props.daiBalance)
            let insufficientFunds = false
            if (totalFeeUsdWei.gt(daiBalance)) {
              insufficientFunds = true
            }
            var daiBalanceRow =
              <tr>
                <th>Your DAI balance:</th>
                <td><span className={classnames({ 'danger': insufficientFunds })}><Dai wei={this.props.daiBalance} /></span></td>
              </tr>
            var daiApprovalRow =
              <tr>
                <th>
                  Approved DAI: &nbsp;
                  <InfoQuestionMark
                    name="approval-info"
                    place="bottom"
                    tooltipText="You need to first approve of us spending Dai on your behalf"
                  />
                </th>
                <td>
                  <DaiAllowance address={this.props.address} requiredWei={totalFeeUsdWei} />
                </td>
              </tr>
            var approvalButtonRow =
              <tr>
                <th>
                </th>
                <td>
                  <DaiApproval address={this.props.address} requiredWei={totalFeeUsdWei} />
                </td>
              </tr>
            caseFeeItem = <Dai wei={computeTotalFee(this.props.caseFeeUsdWei) - computeChallengeFee(this.props.caseFeeUsdWei)} />
            depositItem = <Dai wei={computeChallengeFee(this.props.caseFeeUsdWei)} />
            totalItem = <Dai wei={computeTotalFee(this.props.caseFeeUsdWei)} />
          }

          return (
            <React.Fragment>
              <div className="row">
                <div className="col-xs-12 col-md-8 col-md-offset-2">
                  <div className="card">
                    <div className="card-header">
                      <div className="row">
                        <div className="col-xs-12 col-md-12">
                          <p className="lead lead--card-title">
                            Tell your physician about your problem by answering the questions below.
                          </p>
                          <p className="text-gray">
                            All information is encrypted and visible to only you and the dermatologist. By submitting a case on OpenCare you agree to the terms in our disclaimer: <a onClick={(e) => this.setState({ showDisclaimerModal: true })}>Read Disclaimer</a>
                          </p>
                        </div>
                      </div>
                    </div>

                    <form onSubmit={this.handleSubmit}>
                      <div className="card-body">
                        <PatientInfo
                          errors={errors}
                          textInputOnChange={this.handleTextInputOnChange}
                          textInputOnBlur={this.handleTextInputOnBlur}
                          buttonGroupOnChange={this.handleButtonGroupOnChange}
                          gender={this.state.gender}
                          allergies={this.state.allergies}
                          setCountryRef={this.setCountryRef}
                          setRegionRef={this.setRegionRef}
                          country={this.state.country}
                          region={this.state.region}
                          handleCountryChange={this.handleCountryChange}
                          handleRegionChange={this.handleRegionChange}
                          isCanadaOrUSA={this.isCanadaOrUSA}
                          regionOptions={this.state.regionOptions}
                        />

                        <FlipMove
                          enterAnimation="accordionVertical"
                          leaveAnimation="accordionVertical"
                          maintainContainerHeight={true}
                        >
                          {
                            this.state.spotRashOrAcne ? (
                              <div key="imagery-key">
                                <div className="form-group--heading">
                                  Imagery:
                                </div>
                                <div className="form-group--heading form-group--heading__help">
                                  An evaluation is only as good as the photos provided. So be sure the photos are high quality!
                                </div>
                                <HippoImageInput
                                  name='firstImage'
                                  id='firstImageHash'
                                  label="Overview Photo:"
                                  colClasses='col-xs-12'
                                  error={errors['firstImageHash']}
                                  fileError={firstImageError}
                                  handleCaptureImage={this.handleCaptureImage}
                                  handleResetImageState={this.handleResetImageState}
                                  handleCancelUpload={this.handleCancelUpload}
                                  uploadPromise={this.state.firstImageUploadPromise}
                                  currentValue={this.state.firstImageFileName}
                                  fileUploadActive={this.fileUploadActive(this.state.firstImagePercent)}
                                  progressPercent={this.state.firstImagePercent}
                                />

                                <HippoImageInput
                                  name='secondImage'
                                  id='secondImageHash'
                                  label={'Close-up Photo:'}
                                  subLabel={this.state.spotRashOrAcne === 'Spot' ? '' : '(separate location from above if on more than one body part)'}
                                  colClasses='col-xs-12'
                                  error={errors['secondImageHash']}
                                  fileError={secondImageError}
                                  handleCaptureImage={this.handleCaptureImage}
                                  handleResetImageState={this.handleResetImageState}
                                  handleCancelUpload={this.handleCancelUpload}
                                  uploadPromise={this.state.secondImageUploadPromise}
                                  currentValue={this.state.secondImageFileName}
                                  fileUploadActive={this.fileUploadActive(this.state.secondImagePercent)}
                                  progressPercent={this.state.secondImagePercent}
                                />
                              </div>
                            ) : null
                          }
                        </FlipMove>

                        <div className="form-group--heading">
                          Details:
                        </div>

                        {spotQuestions}
                        {rashQuestions}
                        {acneQuestions}

                        <HippoTextArea
                          id='description'
                          name='description'
                          colClasses='col-xs-12'
                          label='Please include any additional info below'
                          optional={true}
                          error={errors['description']}
                          textAreaOnBlur={this.handleTextAreaOnBlur}
                          textAreaOnChange={this.handleTextAreaOnChange}
                        />

                        <hr />

                        <div className="row">
                          <div className="col-xs-12 col-sm-12 col-md-12">
                            <div className={classnames("form-group", { 'has-error': !!errors['doctor'] })}>
                              <NextAvailableDoctor />
                              <input type='hidden' name='doctor' value={get(this.props.doctor, 'address', '')} />
                              {errors['doctor']}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="card-footer card-footer--invoice">
                        <ControlLabel>Payment Method</ControlLabel>
                        <ButtonToolbar className='d-inline-block'>
                          <ToggleButtonGroup
                            name='Payment Method'
                            type="radio"
                            value={this.state.paymentMethod}
                            onChange={(value) => this.setState({paymentMethod: value})}>
                            {
                              ['ETH', 'DAI'].map((option) => {
                                return <ToggleButton
                                        key={`payment-method-${option}`}
                                        value={option}>
                                        {option}
                                      </ToggleButton>
                              })
                            }
                          </ToggleButtonGroup>
                        </ButtonToolbar>
                        <table className="table table--invoice">
                          <tbody>
                            <tr>
                              <th>
                                Fee:
                              </th>
                              <td>
                                {caseFeeItem}
                              </td>
                            </tr>
                            <tr>
                              <th>
                                Deposit for Second Opinion:
                                &nbsp;<InfoQuestionMark
                                  name="deposit-info"
                                  place="bottom"
                                  tooltipText="This deposit will be automatically refunded unless <br />you request a second opinion."
                                />
                              </th>
                              <td>
                                {depositItem}
                              </td>
                            </tr>
                            <tr>
                              <th>
                                Total:
                              </th>
                              <td>
                                {totalItem}
                              </td>
                            </tr>
                            {daiBalanceRow}
                            {daiApprovalRow}
                            {approvalButtonRow}
                          </tbody>
                        </table>

                        <WyreModal />
                      </div>

                      <div className="card-footer text-right">
                        <button
                          type="submit"
                          className="btn btn-lg btn-success"
                          data-tip=''
                        >
                          Submit Case
                        </button>
                        <ReactTooltip effect='solid' place='top' getContent={() => submitButtonTooltip} />
                      </div>
                    </form>
                  </div>
                </div>
              </div>

              <Modal show={this.state.showPublicKeyModal}>
                <Modal.Body>
                  <div className="row">
                    <div className="col-xs-12 text-center">
                      <h4>
                        Your account has not yet been set up.
                      </h4>
                      <p>
                        You must wait until your account has been saved to the blockchain. Click the <span className="text-blue">blue</span> button labeled <strong><span className="text-blue">Register Account</span></strong>.
                      </p>
                    </div>
                  </div>
                </Modal.Body>
                <Modal.Footer>
                  <button
                    onClick={() => { this.setState({ showPublicKeyModal: false }) }}
                    type="button"
                    className="btn btn-danger"
                  >Ok</button>
                </Modal.Footer>
              </Modal>

              <Modal show={this.state.showDisclaimerModal} onHide={this.handleCloseDisclaimerModal}>
                <Modal.Header>
                  <Modal.Title>
                    Disclaimer:
                  </Modal.Title>
                 </Modal.Header>
                <Modal.Body>
                  <p>
                    The MedX Health System is a decentralized platform that connects patients,
                    consulting providers and specialists globally. The MedX team does not have access
                    to any patient information, and does not guarantee any outcome on behalf of the
                    doctors or patients. For all evaluated cases, there is an option for a discounted
                    second opinion. However, patients should see a specialist if there is a degree of
                    concern. Lastly, an evaluation is only as good as the photos provided. So be sure
                    the photos are high quality.
                  </p>
                </Modal.Body>
                <Modal.Footer>
                  <Button
                    onClick={this.handleCloseDisclaimerModal}
                    bsStyle="primary">
                    OK
                  </Button>
                </Modal.Footer>
              </Modal>

              <Loading loading={this.state.isSubmitting} />
            </React.Fragment>
          )
        }
      }
    )
  )
)

export const CreateCaseContainer = cold(withRouter(CreateCase))
