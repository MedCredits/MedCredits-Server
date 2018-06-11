export default function (state, {type, overrideError, masterPasswordError, secretKeyError}) {
  if (typeof state === 'undefined') {
    state = {
      signedIn: false
    }
  }

  switch(type) {
    case 'SIGN_IN':
      state = {
        signingIn: true
      }
      break
    case 'SIGN_IN_ERROR':
      state = {
        ...state,
        signingIn: false,
        overrideError,
        masterPasswordError,
        secretKeyError
      }
      break
    case 'SIGN_IN_RESET_OVERRIDE':
      state = {
        ...state,
        overrideError: false
      }
      break
    case 'SIGNED_IN':
      state = {
        signedIn: true
      }
      break
    case 'SIGN_OUT':
      state = {
        signedIn: false
      }
      break
    case 'MASTER_PASSWORD_OK':
      state = {
        ...state,
        masterPasswordOk: true
      }
      break
    case 'MASTER_PASSWORD_FAIL':
      state = {
        ...state,
        masterPasswordOk: false,
        masterPasswordError
      }
      break
    case 'MASTER_PASSWORD_CHECK':
      state = {
        ...state,
        masterPasswordOk: false
      }
      break
    case 'MASTER_PASSWORD_RESET':
      state = {
        ...state,
        masterPasswordOk: false,
        masterPasswordError: ''
      }
      break
  }

  return state
}
