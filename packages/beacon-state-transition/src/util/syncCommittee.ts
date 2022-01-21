import {aggregatePublicKeys} from "@chainsafe/bls";
import SHA256 from "@chainsafe/as-sha256";
import {altair, ValidatorIndex} from "@chainsafe/lodestar-types";
import {bnToNum, intDiv, intToBytes} from "@chainsafe/lodestar-utils";
import {Gwei} from "@chainsafe/lodestar-types";
import {
  BASE_REWARD_FACTOR,
  EFFECTIVE_BALANCE_INCREMENT,
  SLOTS_PER_EPOCH,
  SYNC_COMMITTEE_SIZE,
  SYNC_REWARD_WEIGHT,
  WEIGHT_DENOMINATOR,
  DOMAIN_SYNC_COMMITTEE,
  MAX_EFFECTIVE_BALANCE,
} from "@chainsafe/lodestar-params";
import {bigIntSqrt} from "@chainsafe/lodestar-utils";
import {computeEpochAtSlot, computeShuffledIndex, getSeed} from "./";
import {BeaconStateAllForks} from "../types";
import {EffectiveBalanceIncrements} from "../cache/effectiveBalanceIncrements";

/**
 * Same logic in https://github.com/ethereum/eth2.0-specs/blob/v1.1.0-alpha.5/specs/altair/beacon-chain.md#sync-committee-processing
 */
export function computeSyncParticipantReward(totalActiveBalance: Gwei): number {
  // TODO: manage totalActiveBalance in eth
  const totalActiveIncrements = bnToNum(totalActiveBalance / BigInt(EFFECTIVE_BALANCE_INCREMENT));
  const baseRewardPerIncrement = Math.floor(
    (EFFECTIVE_BALANCE_INCREMENT * BASE_REWARD_FACTOR) / bnToNum(bigIntSqrt(totalActiveBalance))
  );
  const totalBaseRewards = baseRewardPerIncrement * totalActiveIncrements;
  const maxParticipantRewards = Math.floor(
    Math.floor((totalBaseRewards * SYNC_REWARD_WEIGHT) / WEIGHT_DENOMINATOR) / SLOTS_PER_EPOCH
  );
  return Math.floor(maxParticipantRewards / SYNC_COMMITTEE_SIZE);
}

/**
 * TODO: NAIVE
 *
 * Return the sync committee indices for a given state and epoch.
 * Aligns `epoch` to `baseEpoch` so the result is the same with any `epoch` within a sync period.
 *  Note: This function should only be called at sync committee period boundaries, as
 *  ``get_sync_committee_indices`` is not stable within a given period.
 *
 * SLOW CODE - 🐢
 */
export function getNextSyncCommitteeIndices(
  state: BeaconStateAllForks,
  activeValidatorIndices: ValidatorIndex[],
  effectiveBalanceIncrements: EffectiveBalanceIncrements
): ValidatorIndex[] {
  // TODO: Inline outside this function
  const MAX_RANDOM_BYTE = 2 ** 8 - 1;
  const MAX_EFFECTIVE_BALANCE_INCREMENT = MAX_EFFECTIVE_BALANCE / EFFECTIVE_BALANCE_INCREMENT;

  const epoch = computeEpochAtSlot(state.slot) + 1;

  const activeValidatorCount = activeValidatorIndices.length;
  const seed = getSeed(state, epoch, DOMAIN_SYNC_COMMITTEE);
  let i = 0;
  const syncCommitteeIndices = [];
  while (syncCommitteeIndices.length < SYNC_COMMITTEE_SIZE) {
    const shuffledIndex = computeShuffledIndex(i % activeValidatorCount, activeValidatorCount, seed);
    const candidateIndex = activeValidatorIndices[shuffledIndex];
    const randomByte = SHA256.digest(Buffer.concat([seed, intToBytes(intDiv(i, 32), 8, "le")]))[i % 32];

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const effectiveBalanceIncrement = effectiveBalanceIncrements[candidateIndex];
    if (effectiveBalanceIncrement * MAX_RANDOM_BYTE >= MAX_EFFECTIVE_BALANCE_INCREMENT * randomByte) {
      syncCommitteeIndices.push(candidateIndex);
    }

    i++;
  }
  return syncCommitteeIndices;
}

/**
 * Return the sync committee for a given state and epoch.
 *
 * SLOW CODE - 🐢
 */
export function getNextSyncCommittee(
  state: BeaconStateAllForks,
  activeValidatorIndices: ValidatorIndex[],
  effectiveBalanceIncrements: EffectiveBalanceIncrements
): {indices: ValidatorIndex[]; syncCommittee: altair.SyncCommittee} {
  const indices = getNextSyncCommitteeIndices(state, activeValidatorIndices, effectiveBalanceIncrements);

  // Using the index2pubkey cache is slower because it needs the serialized pubkey.
  const pubkeys = indices.map((index) => state.validators.get(index).pubkey);

  return {
    indices,
    syncCommittee: {
      pubkeys,
      aggregatePubkey: aggregatePublicKeys(pubkeys),
    },
  };
}
