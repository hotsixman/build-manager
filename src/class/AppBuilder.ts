import path from "node:path";
import fs from 'node:fs';
import { BuildFunction } from "../types.js";
import { Logger } from "./Logger.js";
import { DB } from "./DB.js";
import { EnvManager } from "./EnvManager.js";

export class AppBuilder {
    static randomBuildId() {
        return Math.floor(Math.random() * (10 ** 16)).toString(16);
    }

    private buildFunction?: BuildFunction<any, any>;
    private logger: Logger;
    private db: DB;
    private envManager: EnvManager;

    constructor({
        logger,
        db,
        envManager
    }: AppBuilderConstructorArg) {
        this.logger = logger;
        this.db = db;
        this.envManager = envManager;
    }

    private async loadBuildFunction() {
        if (this.buildFunction) {
            return this.buildFunction;
        }

        let buildFunctionPath = path.join(process.cwd(), 'build.js');
        if (!fs.existsSync(buildFunctionPath)) {
            buildFunctionPath = path.join(process.cwd(), 'build.ts');
            if (!fs.existsSync(buildFunctionPath)) {
                this.logger.error('"build.js" or "build.ts" not exists.');
                return null;
            }
        }

        if (!fs.statSync(buildFunctionPath).isFile()) {
            this.logger.error(`"${buildFunctionPath}" is not an es-module.`);
            return null;
        }

        try {
            var module = await import(buildFunctionPath);
        }
        catch (err) {
            this.logger.error(`Cannot load module "${buildFunctionPath}".`);
            this.logger.error(err);
            return null;
        }

        if (typeof (module?.default) !== "function") {
            this.logger.error(`Default export from "${buildFunctionPath}" is not a function.`);
            return null;
        }

        this.buildFunction = module.default;
        return this.buildFunction;
    }

    async build({ buildId, param }: BuildArg): Promise<boolean> {
        const buildFunction = await this.loadBuildFunction();
        if (!buildFunction) {
            return false;
        }

        const buildData = this.db.createBuildData(buildId);
        const buildResultData = await buildFunction({
            buildId,
            env: this.envManager.getBuildEnv(),
            param: param ?? {}
        });
    }
}

export type AppBuilderConstructorArg = {
    logger: Logger;
    db: DB;
    envManager: EnvManager;
}

export type BuildArg = {
    buildId: string;
    param?: Record<string, any>;
}