import path from "node:path";
import fs from 'node:fs';
import fsPromise from 'node:fs/promises';
import { BuildFunction } from "../types.js";
import { Main } from "./Main.js";

export class AppBuilder {
    private main: Main;
    private buildFunction?: BuildFunction<any, any>;
    private queue: { buildId: string, param: Record<string, any>, next: (success: boolean) => void }[] = [];
    private queueRunning: boolean = false;

    constructor({
        main
    }: AppBuilderConstructorArg) {
        this.main = main;
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
        const buildData = this.main.db.getBuildData(buildId);
        if (!buildData) {
            this.main.logger.error(logPath, this.main.setting.displayBuildLog, `Cannot find build data where build id is ${buildId}`);
            return false;
        }

        this.main.db.updateBuildData(buildId, { status: 'building' });
        try {
            const buildDir = path.join(process.cwd(), 'build', buildId);
            await fsPromise.mkdir(buildDir, { recursive: true, });
            var { result, starting } = await buildFunction({
                buildId,
                env: this.main.envManager.buildEnv,
                param: param,
                spawn: async (cmd, options) => {
                    return this.spawn(cmd, { cwd: buildDir, ...options }, buildId);
                },
                buildDir,
                console: {
                    log: (...messages) => {
                        this.main.logger.log(logPath, this.main.setting.displayBuildLog, ...messages);
                    },
                    error: (...messages) => {
                        this.main.logger.error(logPath, this.main.setting.displayBuildLog, ...messages);
                    },
                    warn: (...messages) => {
                        this.main.logger.warn(logPath, this.main.setting.displayBuildLog, ...messages);
                    }
                }
            });
        }
        catch (err) {
            this.main.logger.error(logPath, this.main.setting.displayBuildLog, err);
            this.main.db.updateBuildData(buildId, { status: 'buildError' });
            return false;
        }
        this.main.db.updateBuildData(buildId, {
            status: 'builded',
            result: result,
            starting
        });
        return true;
    }

    enqueue(buildId: string, param: Record<string, any>, next: (success: boolean) => void) {
        this.main.db.updateBuildData(buildId, { status: 'enqueued' });
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
                    this.main.logger.error(logPath, this.main.setting.displayBuildLog, err);
                    next(false);
                }
            }
            this.queueRunning = false;
        })
    }

    private spawn(cmd: string | string[], options: SpawnOption, buildId: string) {
        return new Promise<number>(async (res) => {
            const childProcess = Bun.spawn(typeof (cmd) === "string" ? cmd.split(' ') : cmd, {
                stdin: options.stdin ? Buffer.from(options.stdin) : undefined,
                cwd: options.cwd,
                stdout: 'pipe',
                stderr: 'pipe',
            });
            const textDecoder = new TextDecoder();
            const logPath = `build/${buildId}`;
            await Promise.all([[childProcess.stdout.getReader(), 'out'] as const, [childProcess.stderr.getReader(), 'err'] as const].map(([reader, type]) => (async () => {
                while (true) {
                    const { value, done } = await reader.read();
                    if (type === "out") {
                        this.main.logger.error(logPath, this.main.setting.displayBuildLog, textDecoder.decode(value));
                    }
                    else {
                        this.main.logger.log(logPath, this.main.setting.displayBuildLog, textDecoder.decode(value));
                    }
                    if (done) break;
                }
            })()));
            res(await childProcess.exited);
        })
    }
}

export type AppBuilderConstructorArg = {
    main: Main;
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