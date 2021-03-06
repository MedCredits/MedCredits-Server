// Signed-Out Routes
export const WELCOME = '/welcome'
export const LOGIN_METAMASK = '/login-metamask'
export const GET_WALLET = '/get-wallet'
export const SIGN_IN = '/sign-in'
export const SIGN_UP = '/sign-up'
export const HOME = '/'

export const ADMIN_SETTINGS = '/admin/settings'
export const ADMIN_DOCTORS = '/admin/doctors'
export const ADMIN_FEES = '/admin/fees'
export const ADMIN_CASES = '/admin/cases'

export const ACCOUNT_EMERGENCY_KIT = '/account/emergency-kit'
export const ACCOUNT_CHANGE_PASSWORD = '/account/change-password'
export const ACCOUNT_MINT = '/account/mint'
export const ACCOUNT_WALLET = '/account/wallet'

export const DOCTORS_CASES_OPEN = '/doctors/cases/open'
export const DOCTORS_CASES_OPEN_PAGE_NUMBER = '/doctors/cases/:currentPage'
export const DOCTORS_CASES_DIAGNOSE_CASE = '/doctors/cases/diagnose/:caseAddress'

export const PATIENTS_CASES_NEW = '/patients/cases/new'
export const PATIENTS_CASES ='/patients/cases'
export const PATIENTS_CASES_PAGE_NUMBER = '/patients/cases/:currentPage'
export const PATIENTS_CASE = '/patients/cases/:currentPage/:caseAddress'

export const signedOutRoutes = [
  WELCOME, LOGIN_METAMASK, GET_WALLET, SIGN_UP, SIGN_IN, HOME
]
