import {allForks, phase0, Slot, RootHex} from "@chainsafe/lodestar-types";
import {CachedBeaconState} from "@chainsafe/lodestar-beacon-state-transition";
import {CheckpointHex} from "../stateCache";
import {IProtoBlock} from "@chainsafe/lodestar-fork-choice";

export enum RegenCaller {
  getDuties = "getDuties",
  produceBlock = "produceBlock",
  validateGossipBlock = "validateGossipBlock",
  precomputeEpoch = "precomputeEpoch",
  produceAttestationData = "produceAttestationData",
  processBlocksInEpoch = "processBlocksInEpoch",
  validateGossipAggregateAndProof = "validateGossipAggregateAndProof",
  validateGossipAttestation = "validateGossipAttestation",
  onForkChoiceFinalized = "onForkChoiceFinalized",
}

export enum RegenFnName {
  getBlockSlotState = "getBlockSlotState",
  getState = "getState",
  getPreState = "getPreState",
  getCheckpointState = "getCheckpointState",
}
/**
 * Regenerates states that have already been processed by the fork choice
 */
export interface IStateRegeneratorInternal {
  /**
   * Return a valid pre-state for a beacon block
   * This will always return a state in the latest viable epoch
   */
  getPreState(block: allForks.BeaconBlock, rCaller: RegenCaller): Promise<CachedBeaconState<allForks.BeaconState>>;

  /**
   * Return a valid checkpoint state
   * This will always return a state with `state.slot % SLOTS_PER_EPOCH === 0`
   */
  getCheckpointState(cp: phase0.Checkpoint, rCaller: RegenCaller): Promise<CachedBeaconState<allForks.BeaconState>>;

  /**
   * Return the state of `blockRoot` processed to slot `slot`
   */
  getBlockSlotState(
    blockRoot: RootHex,
    slot: Slot,
    rCaller: RegenCaller
  ): Promise<CachedBeaconState<allForks.BeaconState>>;

  /**
   * Return the exact state with `stateRoot`
   */
  getState(stateRoot: RootHex, rCaller: RegenCaller): Promise<CachedBeaconState<allForks.BeaconState>>;
}

/**
 * Regenerates states that have already been processed by the fork choice
 */
export interface IStateRegenerator extends IStateRegeneratorInternal {
  getHeadState(): CachedBeaconState<allForks.BeaconState> | null;

  /**
   * Set head in regen to trigger updating the head state.
   * Accepts an optional state parameter that may be the head for faster setting.
   * Otherwise it will look in the cache or trigger regen. If regen requires async work, the head will not be available
   * for some time, which can cause issues but will be resolved eventually.
   */
  setHead(head: IProtoBlock, potentialHeadState?: CachedBeaconState<allForks.BeaconState>): Promise<void>;

  /**
   * TEMP - To get justifiedBalances for the fork-choice.
   * Get checkpoint state from memory cache doing no regen
   */
  getCheckpointStateSync(cp: CheckpointHex): CachedBeaconState<allForks.BeaconState> | null;

  /**
   * TEMP - To get states from API
   * Get state from memory cache doing no regen
   */
  getStateSync(stateRoot: RootHex): CachedBeaconState<allForks.BeaconState> | null;

  /**
   * Add post to cache after verifying and importing block
   */
  addPostState(postState: CachedBeaconState<allForks.BeaconState>): void;
}
