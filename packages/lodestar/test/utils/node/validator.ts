import bls from "@chainsafe/bls";
import {LevelDbController} from "@chainsafe/lodestar-db";
import {ILogger, intDiv, LogLevel, WinstonLogger} from "@chainsafe/lodestar-utils";
import {IEventsApi} from "@chainsafe/lodestar-validator/lib/api/interface/events";
import {
  ApiClientOverInstance,
  IApiClient,
  interopKeypair,
  SlashingProtection,
  Validator,
} from "@chainsafe/lodestar-validator";
import tmp from "tmp";
import {ApiClientOverRest} from "../../../../lodestar-validator/src/api/impl/rest/apiClient";
import {BeaconApi} from "../../../src/api/impl/beacon";
import {EventsApi} from "../../../src/api/impl/events";
import {NodeApi} from "../../../src/api/impl/node/node";
import {ValidatorApi} from "../../../src/api/impl/validator";
import {Eth1ForBlockProductionDisabled} from "../../../src/eth1";
import {BeaconNode} from "../../../src/node";

export function getDevValidators(
  node: BeaconNode,
  count = 8,
  validatorClientCount = 1,
  useRestApi = false
): Validator[] {
  const validatorsPerValidatorClient = intDiv(count, validatorClientCount);
  const vcs: Validator[] = [];
  while (count > 0) {
    if (count > validatorsPerValidatorClient) {
      vcs.push(
        getDevValidator({
          node,
          startIndex: vcs.length * validatorsPerValidatorClient,
          count: validatorsPerValidatorClient,
          useRestApi,
        })
      );
    } else {
      vcs.push(
        getDevValidator({
          node,
          startIndex: vcs.length * validatorsPerValidatorClient,
          count,
          useRestApi,
        })
      );
    }
    count = count - validatorsPerValidatorClient;
  }
  return vcs;
}

export function getDevValidator({
  node,
  startIndex,
  count,
  logger,
  useRestApi = false,
}: {
  node: BeaconNode;
  startIndex: number;
  count: number;
  logger?: ILogger;
  useRestApi?: boolean;
}): Validator {
  if (!logger) logger = new WinstonLogger({level: LogLevel.info, module: "validator"});
  const tmpDir = tmp.dirSync({unsafeCleanup: true});
  return new Validator({
    config: node.config,
    api: useRestApi ? getDevValidatorRestApiClient(node, logger) : getDevValidatorInstanceApiClient(node, logger),
    slashingProtection: new SlashingProtection({
      config: node.config,
      controller: new LevelDbController({name: tmpDir.name}, {logger}),
    }),
    logger: logger,
    keypairs: Array.from({length: count}, (_, i) => {
      const privateKey = bls.PrivateKey.fromBytes(interopKeypair(i + startIndex).privkey);
      const publicKey = privateKey.toPublicKey();
      return {privateKey, publicKey};
    }),
  });
}

export function getDevValidatorRestApiClient(node: BeaconNode, logger: ILogger): IApiClient {
  return new ApiClientOverRest(
    node.config,
    "http://127.0.0.1:9596",
    logger.child({module: "api", level: LogLevel.warn})
  );
}

export function getDevValidatorInstanceApiClient(node: BeaconNode, logger: ILogger): IApiClient {
  return new ApiClientOverInstance({
    config: node.config,
    validator: new ValidatorApi(
      {},
      {
        ...node,
        logger: logger.child({module: "api", level: LogLevel.warn}),
        eth1: new Eth1ForBlockProductionDisabled(),
      }
    ),
    node: new NodeApi({}, {...node}),
    events: new EventsApi({}, {...node}) as IEventsApi,
    beacon: new BeaconApi({}, {...node}),
  });
}
