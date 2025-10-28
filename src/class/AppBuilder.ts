import path from "node:path";
import fs from 'node:fs';
import { BuildFunction } from "../types.js";
import { MainProcess } from "./MainProcess.js";

export class AppBuilder {
    private mainProcess: MainProcess;
    private buildFunction?: BuildFunction<any, any>;
    private queue: { buildId: string, param: Record<string, any>, next: (success: boolean) => void }[] = [];
    private queueRunning: boolean = false;

    constructor({
        mainProcess
    }: AppBuilderConstructorArg) {
        this.mainProcess = mainProcess;
    }

    private async loadBuildFunction() {
        if (this.buildFunction) {
            return this.buildFunction;
        }

        let buildFunctionPath = path.join(process.cwd(), 'script', 'build.js');
        if (!fs.existsSync(buildFunctionPath)) {
            buildFunctionPath = path.join(process.cwd(), 'script', 'build.ts');
            if (!fs.existsSync(buildFunctionPath)) {
                this.mainProcess.logger.error('"build.js" or "build.ts" not exists.');
                return null;
            }
        }

        if (!fs.statSync(buildFunctionPath).isFile()) {
            this.mainProcess.logger.error(`"${buildFunctionPath}" is not a file.`);
            return null;
        }

        try {
            var module = await import(buildFunctionPath);
        }
        catch (err) {
            this.mainProcess.logger.error(`Cannot load module "${buildFunctionPath}".`);
            this.mainProcess.logger.error(err);
            return null;
        }

        if (typeof (module?.default) !== "function") {
            this.mainProcess.logger.error(`Default export from "${buildFunctionPath}" is not a function.`);
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

        const buildData = this.mainProcess.db.getBuildData(buildId);
        if (!buildData) {
            this.mainProcess.logger.error(`Cannot find build data where build id is ${buildId}`);
            return false;
        }

        this.mainProcess.db.updateBuildData(buildId, { status: 'building' });
        try {
            var buildResultData = await buildFunction({
                buildId,
                env: this.mainProcess.envManager.getBuildEnv(),
                param: param ?? {}
            });
        }
        catch (err) {
            this.mainProcess.logger.error(err);
            this.mainProcess.db.updateBuildData(buildId, { status: 'buildError' });
            return false;
        }

        this.mainProcess.db.updateBuildData(buildId, {
            status: 'builded',
            result: buildResultData
        });
        return true;
    }

    enqueue(buildId: string, param: Record<string, any>, next: (success: boolean) => void) {
        this.mainProcess.db.updateBuildData(buildId, { status: 'enqueued' });
        this.queue.push({
            buildId: buildId,
            param,
            next
        });
        this.runqueue();
    }

    private runqueue() {
        if (this.queueRunning) return;
        this.queueRunning = true;

        queueMicrotask(async () => {
            while (this.queue.length > 0) {
                const { buildId, param, next } = this.queue.shift();
                try {
                    const success = await this.build({ buildId, param });
                    next(success);
                }
                catch (err) {
                    this.mainProcess.logger.error(err);
                    next(false);
                }
            }
            this.queueRunning = false;
        })
    }
}

export type AppBuilderConstructorArg = {
    mainProcess: MainProcess;
}

export type BuildArg = {
    buildId: string;
    param?: Record<string, any>;
}