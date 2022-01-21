/**
 * @module chain/stateTransition
 */

export * from "./constants";
export * from "./util";
export * from "./metrics";

export * as phase0 from "./phase0";
export * as altair from "./altair";
export * as bellatrix from "./bellatrix";
export * as allForks from "./allForks";

// State transition functions
export {beforeProcessEpoch} from "./cache/beforeProcessEpoch";
export {afterProcessEpoch} from "./cache/afterProcessEpoch";
export {stateTransition} from "./allForks";

// Data structures
export {BeaconStateCache, createCachedBeaconState} from "./cache/stateCache";
export {EpochContext, EpochContextImmutableData, createEmptyEpochContextImmutableData} from "./cache/epochContext";
export {PubkeyIndexMap, Index2PubkeyCache} from "./cache/pubkeyCache";
export {IEpochProcess} from "./cache/epochProcess";
export {EffectiveBalanceIncrements, getEffectiveBalanceIncrementsZeroed} from "./cache/effectiveBalanceIncrements";

// Epoch context errors
export {EpochContextError, EpochContextErrorCode} from "./cache/epochContext";

export {
  CachedBeaconStatePhase0,
  CachedBeaconStateAltair,
  CachedBeaconStateBellatrix,
  CachedBeaconStateAllForks,
  // Non-cached states
  BeaconStatePhase0,
  BeaconStateAltair,
  BeaconStateBellatrix,
  BeaconStateAllForks,
} from "./types";
