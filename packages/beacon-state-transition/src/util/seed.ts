/**
 * @module chain/stateTransition/util
 */

import SHA256 from "@chainsafe/as-sha256";
import {Epoch, Bytes32, DomainType, ValidatorIndex} from "@chainsafe/lodestar-types";
import {assert, bytesToBigInt, intToBytes} from "@chainsafe/lodestar-utils";
import {
  DOMAIN_BEACON_PROPOSER,
  EFFECTIVE_BALANCE_INCREMENT,
  EPOCHS_PER_HISTORICAL_VECTOR,
  MAX_EFFECTIVE_BALANCE,
  MIN_SEED_LOOKAHEAD,
  SHUFFLE_ROUND_COUNT,
  SLOTS_PER_EPOCH,
} from "@chainsafe/lodestar-params";
import {BeaconStateAllForks} from "../types";
import {computeStartSlotAtEpoch} from "./epoch";
import {EffectiveBalanceIncrements} from "../cache/effectiveBalanceIncrements";

/**
 * Compute proposer indices for an epoch
 */
export function computeProposers(
  state: BeaconStateAllForks,
  epoch: Epoch,
  activeIndices: ValidatorIndex[],
  effectiveBalanceIncrements: EffectiveBalanceIncrements
): number[] {
  const epochSeed = getSeed(state, epoch, DOMAIN_BEACON_PROPOSER);
  const startSlot = computeStartSlotAtEpoch(epoch);
  const proposers = [];
  for (let slot = startSlot; slot < startSlot + SLOTS_PER_EPOCH; slot++) {
    proposers.push(
      computeProposerIndex(
        effectiveBalanceIncrements,
        activeIndices,
        SHA256.digest(Buffer.concat([epochSeed, intToBytes(slot, 8)]))
      )
    );
  }
  return proposers;
}

/**
 * Return from ``indices`` a random index sampled by effective balance.
 *
 * SLOW CODE - 🐢
 */
export function computeProposerIndex(
  effectiveBalanceIncrements: EffectiveBalanceIncrements,
  indices: ValidatorIndex[],
  seed: Uint8Array
): ValidatorIndex {
  if (indices.length === 0) {
    throw Error("Validator indices must not be empty");
  }

  // TODO: Inline outside this function
  const MAX_RANDOM_BYTE = 2 ** 8 - 1;
  const MAX_EFFECTIVE_BALANCE_INCREMENT = MAX_EFFECTIVE_BALANCE / EFFECTIVE_BALANCE_INCREMENT;

  let i = 0;
  /* eslint-disable-next-line no-constant-condition */
  while (true) {
    const candidateIndex = indices[computeShuffledIndex(i % indices.length, indices.length, seed)];
    const randByte = SHA256.digest(
      Buffer.concat([
        seed,
        //
        intToBytes(Math.floor(i / 32), 8),
      ])
    )[i % 32];

    const effectiveBalanceIncrement = effectiveBalanceIncrements[candidateIndex];
    if (effectiveBalanceIncrement * MAX_RANDOM_BYTE >= MAX_EFFECTIVE_BALANCE_INCREMENT * randByte) {
      return candidateIndex;
    }
    i += 1;
    if (i === indices.length) {
      return -1;
    }
  }
}

/**
 * Return the shuffled validator index corresponding to ``seed`` (and ``index_count``).
 *
 * Swap or not
 * https://link.springer.com/content/pdf/10.1007%2F978-3-642-32009-5_1.pdf
 *
 * See the 'generalized domain' algorithm on page 3.
 */
export function computeShuffledIndex(index: number, indexCount: number, seed: Bytes32): number {
  let permuted = index;
  assert.lt(index, indexCount, "indexCount must be less than index");
  assert.lte(indexCount, 2 ** 40, "indexCount too big");
  const _seed = seed;
  for (let i = 0; i < SHUFFLE_ROUND_COUNT; i++) {
    const pivot = Number(
      bytesToBigInt(SHA256.digest(Buffer.concat([_seed, intToBytes(i, 1)])).slice(0, 8)) % BigInt(indexCount)
    );
    const flip = (pivot + indexCount - permuted) % indexCount;
    const position = Math.max(permuted, flip);
    const source = SHA256.digest(Buffer.concat([_seed, intToBytes(i, 1), intToBytes(Math.floor(position / 256), 4)]));
    const byte = source[Math.floor((position % 256) / 8)];
    const bit = (byte >> position % 8) % 2;
    permuted = bit ? flip : permuted;
  }
  return permuted;
}

/**
 * Return the randao mix at a recent [[epoch]].
 */
export function getRandaoMix(state: BeaconStateAllForks, epoch: Epoch): Bytes32 {
  return state.randaoMixes.get(epoch % EPOCHS_PER_HISTORICAL_VECTOR);
}

/**
 * Return the seed at [[epoch]].
 */
export function getSeed(state: BeaconStateAllForks, epoch: Epoch, domainType: DomainType): Uint8Array {
  const mix = getRandaoMix(state, epoch + EPOCHS_PER_HISTORICAL_VECTOR - MIN_SEED_LOOKAHEAD - 1);

  return SHA256.digest(Buffer.concat([domainType as Buffer, intToBytes(epoch, 8), mix]));
}
