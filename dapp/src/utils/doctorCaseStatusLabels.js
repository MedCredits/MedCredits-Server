const statusNames = {
  0: 'None',
  1: 'Open',
  2: 'Requires Evaluation',
  3: 'Awaiting Patient',
  4: 'Closed',
  5: 'Awaiting Patient',
  6: 'Requires Evaluation',
  7: 'Diagnosis Rejected',
  8: 'Diagnosis Confirmed'
}

var statusClasses = {
  0: 'default',
  1: 'info',
  2: 'warning',
  3: 'default',
  4: 'success',
  5: 'default',
  6: 'warning',
  7: 'default',
  8: 'success'
}

// This is context specific, and will say what state the case is in depending on
// which doc is viewing the case
export function doctorCaseStatusToName(caseObject) {
  let statusName
  const evaluatedState = statusNames[3]
  const { isFirstDoc, status } = caseObject

  if (status === 4 || status === 7 || status === 8)
    statusName = statusNames[4]
  else if (isFirstDoc && status > 2)
    statusName = evaluatedState
  else
    statusName = statusNames[status]

  return statusName
}

// This is context specific, and will provide a different result depending on
// which doc is viewing the case
export function doctorCaseStatusToClass(caseObject) {
  let statusClass
  const evaluatedState = statusClasses[3]
  const { isFirstDoc, status } = caseObject

  if (isFirstDoc && status === 4)
    statusClass = statusClasses[4]
  else if (isFirstDoc && status > 2)
    statusClass = evaluatedState
  else if (!isFirstDoc && status > 6)
    statusClass = evaluatedState
  else
    statusClass = statusClasses[status]

  return statusClass
}
