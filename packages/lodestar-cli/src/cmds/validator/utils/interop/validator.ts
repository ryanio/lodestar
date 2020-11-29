import {IBeaconConfig} from "@chainsafe/lodestar-config";
import {ILogger} from "@chainsafe/lodestar-utils";
import {Validator, SlashingProtection} from "@chainsafe/lodestar-validator";
import {IApiClient, interopKeypair} from "@chainsafe/lodestar-validator/lib";
import bls from "@chainsafe/bls";
import {LevelDbController} from "@chainsafe/lodestar-db";
import {join} from "path";
import {mkdirSync} from "fs";

export interface IValidatorModules {
  api: IApiClient;
  logger: ILogger;
}

export function getInteropValidator(
  config: IBeaconConfig,
  rootDir: string,
  modules: IValidatorModules,
  index: number
): Validator {
  const logger = modules.logger.child({module: "Validator #" + index, level: modules.logger.level}) as ILogger;
  const dbPath = join(rootDir, "validators", index.toString());
  mkdirSync(dbPath, {recursive: true});
  const privateKey = bls.PrivateKey.fromBytes(interopKeypair(index).privkey);
  const publicKey = privateKey.toPublicKey();
  return new Validator({
    config,
    slashingProtection: new SlashingProtection({
      config: config,
      controller: new LevelDbController({name: dbPath}, {logger}),
    }),
    api: modules.api,
    logger: logger,
    keypairs: [{privateKey, publicKey}],
  });
}
