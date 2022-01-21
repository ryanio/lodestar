import {ByteVectorType, CompositeViewDU, ListCompositeType} from "@chainsafe/ssz";
import {Root, ssz} from "@chainsafe/lodestar-types";
import {IChainForkConfig} from "@chainsafe/lodestar-config";
import {bytesToInt} from "@chainsafe/lodestar-utils";
import {Db, Bucket, Repository, IKeyValue, IDbMetrics} from "@chainsafe/lodestar-db";

// TODO: Review where is best to put this type
export type DepositTree = CompositeViewDU<ListCompositeType<ByteVectorType>>;

export class DepositDataRootRepository extends Repository<number, Root> {
  private depositRootTree?: DepositTree;

  constructor(config: IChainForkConfig, db: Db, metrics?: IDbMetrics) {
    super(config, db, Bucket.index_depositDataRoot, ssz.Root, metrics);
  }

  decodeKey(data: Buffer): number {
    return bytesToInt((super.decodeKey(data) as unknown) as Uint8Array, "be");
  }

  // depositDataRoots stored by depositData index
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getId(value: Root): number {
    throw new Error("Unable to create depositIndex from root");
  }

  async put(id: number, value: Root): Promise<void> {
    const depositRootTree = await this.getDepositRootTree();
    await super.put(id, value);
    depositRootTree.set(id, value);
  }

  async batchPut(items: IKeyValue<number, Root>[]): Promise<void> {
    const depositRootTree = await this.getDepositRootTree();
    await super.batchPut(items);
    for (const {key, value} of items) {
      depositRootTree.set(key, value);
    }
  }

  async putList(roots: Root[]): Promise<void> {
    await this.batchPut(roots.map((root, index) => ({key: index, value: root})));
  }

  async batchPutValues(values: {index: number; root: Root}[]): Promise<void> {
    await this.batchPut(
      values.map(({index, root}) => ({
        key: index,
        value: root,
      }))
    );
  }

  async getDepositRootTree(): Promise<DepositTree> {
    if (!this.depositRootTree) {
      const values = await this.values();
      this.depositRootTree = ssz.phase0.DepositDataRootList.toViewDU(values);
    }
    return this.depositRootTree;
  }

  async getDepositRootTreeAtIndex(depositIndex: number): Promise<DepositTree> {
    const depositRootTree = await this.getDepositRootTree();
    return depositRootTree.sliceTo(depositIndex);
  }
}
