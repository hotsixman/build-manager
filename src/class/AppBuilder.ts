import path from "node:path";
import fs from 'node:fs';
import fsPromise from 'node:fs/promises';
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
                console.error('"build.js" or "build.ts" not exists.');
                return null;
            }
        }

        if (!fs.statSync(buildFunctionPath).isFile()) {
            console.error(`"${buildFunctionPath}" is not a file.`);
            return null;
        }

        try {
            var module = await import(buildFunctionPath);
        }
        catch (err) {
            console.error(`Cannot load module "${buildFunctionPath}".`);
            console.error(err);
            return null;
        }

        if (typeof (module?.default) !== "function") {
            console.error(`Default export from "${buildFunctionPath}" is not a function.`);
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
        
        const logPath = `build/${buildId}`;
        const buildData = this.mainProcess.db.getBuildData(buildId);
        if (!buildData) {
            this.mainProcess.logger.error(logPath, true, `Cannot find build data where build id is ${buildId}`);
            return false;
        }

        this.mainProcess.db.updateBuildData(buildId, { status: 'building' });
        try {
            const cwd = path.join(process.cwd(), 'build', buildId);
            await fsPromise.mkdir(cwd, { recursive: true, });
            var buildResultData = await buildFunction({
                buildId,
                env: this.mainProcess.envManager.getBuildEnv(),
                param: param,
                spawn: async (cmd, options) => {
                    return this.spawn(cmd, { cwd, ...options }, buildId);
                },
                cwd,
                console: {
                    log: (...messages) => {
                        this.mainProcess.logger.log(logPath, true, ...messages);
                    },
                    error: (...messages) => {
                        this.mainProcess.logger.error(logPath, true, ...messages);
                    },
                    warn: (...messages) => {
                        this.mainProcess.logger.warn(logPath, true, ...messages);
                    }
                }
            });
        }
        catch (err) {
            this.mainProcess.logger.error(logPath, true, err);
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
                const logPath = `build/${buildId}`;
                try {
                    const success = await this.build({ buildId, param });
                    next(success);
                }
                catch (err) {
                    this.mainProcess.logger.error(logPath, true, err);
                    next(false);
                }
            }
            this.queueRunning = false;
        })
    }

    private spawn(cmd: string | string[], options: SpawnOption, buildId: string) {
        return new Promise<number>(async (res) => {
            const { promise: exitcodePromise, resolve: exitCodeResolve } = Promise.withResolvers<number>();
            const childProcess = Bun.spawn(typeof (cmd) === "string" ? cmd.split(' ') : cmd, {
                onExit(_, exitCode) {
                    exitCodeResolve(exitCode);
                },
                stdin: options.stdin ? Buffer.from(options.stdin) : undefined,
                cwd: options.cwd
            });
            const outputReader = childProcess.stdout.getReader();
            const textDecoder = new TextDecoder();
            const logPath = `build/${buildId}`;
            while (true) {
                const { value, done } = await outputReader.read();
                this.mainProcess.logger.log(logPath, true, textDecoder.decode(value));
                if (done) break;
            }
            res(await exitcodePromise);
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

export type SpawnOption = {
    onOutput?: (data: Uint8Array<ArrayBuffer>) => void;
    stdin?: string;
    cwd?: string;
}