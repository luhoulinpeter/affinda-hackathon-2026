// Approval is operator configuration, never supplied by browser requests.
function isOngoingApproval(proof, now = Date.now()) {
  return proof?.approvalMode === 'ongoing' && proof.revoked !== true &&
    proof.providerLimitsReportedByUser === true && typeof proof.approvedAt === 'string' &&
    Number.isFinite(Date.parse(proof.approvedAt)) && Date.parse(proof.approvedAt) <= now;
}

function approvalError(name, proof, now = Date.now()) {
  const invalid = 'Call approval or credit controls unverified or expired';
  if (!proof || proof.revoked === true || typeof proof.id !== 'string' || !proof.id) return invalid;
  if (proof.approvalMode === 'ongoing') {
    if (!isOngoingApproval(proof, now)) return invalid;
    // User-reported API limits are not a verified provider hard stop.
    const authorised = name === 'jev' ? proof.existingCreditUseApproved === true :
      proof.freeOnlyConfirmed === true && proof.liveTestApproved === true;
    return authorised ? null : invalid;
  }
  if (proof.approvalMode !== undefined && proof.approvalMode !== 'bounded') return invalid;
  const existingCreditSession = proof.existingCreditUseApproved === true && proof.autoRechargeOffVerified === true &&
    Number.isFinite(proof.availableCreditsUSD) && proof.availableCreditsUSD >= 1 && proof.maxCalls <= 20;
  const controls = name === 'jev' ? (proof.creditOnlyConfirmed === true && proof.providerHardStopVerified === true) || existingCreditSession :
    proof.freeOnlyConfirmed === true && proof.liveTestApproved === true;
  if (!controls || !Number.isInteger(proof.maxCalls) || proof.maxCalls < 1 || proof.maxCalls > 100 ||
      !Number.isFinite(Date.parse(proof.verifiedAt)) || !Number.isFinite(Date.parse(proof.expiresAt)) ||
      Date.parse(proof.verifiedAt) > now || Date.parse(proof.expiresAt) <= now ||
      Date.parse(proof.expiresAt) - Date.parse(proof.verifiedAt) > 86400000) return invalid;
  return null;
}

module.exports = { approvalError, isOngoingApproval };
