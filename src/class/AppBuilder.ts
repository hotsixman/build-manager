import path from "node:path";
import fs from 'node:fs';
import { BuildFunction } from "../types.js";
import { Logger } from "./Logger.js";
import { DB } from "./DB.js";
import { EnvManager } from "./EnvManager.js";
import { BuildData } from "./BuildData.js";

export class AppBuilder {
    static randomBuildId() {
        return Math.floor(Math.random() * (10 ** 16)).toString(16);
    }

    private buildFunction?: BuildFunction<any, any>;
    private logger: Logger;
    private db: DB;
    private envManager: EnvManager;
    private queue: { buildId: string, param: Record<string, any>, resolver: (success: boolean) => void }[] = [];
    private queueRunning: boolean = false;

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
            this.logger.error(`"${buildFunctionPath}" is not a file.`);
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

        const buildData = this.db.getBuildData(buildId);
        if (!buildData) {
            this.logger.error(`Cannot find build data where build id is ${buildId}`);
            return false;
        }

        this.db.updateBuildData(buildId, { status: 'building' });
        try {
            var buildResultData = await buildFunction({
                buildId,
                env: this.envManager.getBuildEnv(),
                param: param ?? {}
            });
        }
        catch (err) {
            this.logger.error(err);
            this.db.updateBuildData(buildId, { status: 'buildError' });
            return false;
        }

        this.db.updateBuildData(buildId, {
            status: 'builded',
            result: buildResultData
        });
        return true;
    }

    enqueue(buildData: BuildData, param: Record<string, any>, resolver: (success: boolean) => void) {
        this.db.updateBuildData(buildData.id, { status: 'enqueued' });
        this.queue.push({
            buildId: buildData.id,
            param,
            resolver
        });
        this.runqueue();
    }

    private runqueue() {
        if (this.queueRunning) return;
        this.queueRunning = true;

        queueMicrotask(async () => {
            while (this.queue.length > 0) {
                const { buildId, param, resolver } = this.queue.shift();
                try {
                    const success = await this.build({ buildId, param });
                    resolver(success);
                }
                catch {
                    resolver(false);
                }
            }
            this.queueRunning = false;
        })
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