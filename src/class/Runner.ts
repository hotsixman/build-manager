import path from "node:path";
import { Main } from "./Main.js";
import pm2 from 'pm2';
import { BuildData, BuildedData } from "./BuildData.js";
import { ProcessData } from "./ProcessData.js";

export class Runner {
    private queue: string[] = [];
    private queueRunning: boolean = false;
    private main: Main;
    private currentProcess?: ProcessData;

    constructor({ main }: RunnerConsturctorArg) {
        this.main = main;
        this.main.beforeTerminate(async () => {
            if (this.main.setting.cleanupProcess) {
                const currentRunningId = this.currentProcess?.id;
                await this.deleteProcess(currentRunningId, true);
                console.log(`Process ${currentRunningId} stopped.`)
            }
            pm2.disconnect();
            console.log('pm2 disconnected.')
        })
    }
    private get displayLog() {
        return this.main.setting.displayRunLog;
    }

    enqueue(id: string) {
        this.queue.push(id);
        this.runqueue();
    }

    async init() {
        const processData = this.main.db.getProcessData();
        if (processData) {
            if (!(await this.checkProcessRunning(processData.id))) {
                this.main.logger.log('main', true, `Process ${processData.id} starting.`)
                await this.startProcess(processData.id, true);
            }
            this.currentProcess = processData;
        }
    }

    cloneCurrentProcess() {
        const clone = structuredClone(this.currentProcess);
        if (!clone) return undefined;
        Object.setPrototypeOf(clone, ProcessData);
        return clone;
    }

    async deleteCurrentProcess() {
        if (this.currentProcess) {
            await this.deleteProcess(this.currentProcess.id);
        }
    }

    async restartCurrentProcess() {
        if (this.currentProcess) {
            const id = this.currentProcess.id;
            await this.deleteProcess(this.currentProcess.id);
            this.enqueue(id);
        }
    }

    private runqueue() {
        if (this.queueRunning) return;
        this.queueRunning = true;

        queueMicrotask(async () => {
            while (this.queue.length > 0) {
                const id = this.queue.shift();

                const currentRunning = this.main.db.getProcessData();
                let previousProcessDeleted: boolean;
                if (currentRunning) {
                    previousProcessDeleted = await this.deleteProcess(currentRunning.id);
                }
                else {
                    previousProcessDeleted = true;
                }

                if (previousProcessDeleted) {
                    await this.startProcess(id);
                }
            }
            this.queueRunning = false;
        })
    }

    private async checkProcessRunning(id: string) {
        await this.pm2Connect;
        const processName = `bm.${id}`;
        const running = await new Promise<boolean>((res, rej) => {
            pm2.list((err, list) => {
                if (err) {
                    return rej(err);
                }
                res(Boolean(list.find((p) => p.name === processName)));
            })
        });
        return running;
    }

    private async startProcess(id: string, dontMakeProcessData?: boolean) {
        const buildData: BuildData | BuildedData = this.main.db.getBuildData(id);
        const logPath = `run/${id}`
        if (!buildData) {
            this.main.logger.error(logPath, this.displayLog, `Build ${id} not found.`);
            return false;
        }
        if (buildData.status !== "builded" || !(buildData instanceof BuildedData)) {
            this.main.logger.error(logPath, this.displayLog, `Build ${id} is not completed.`);
            return false;
        }

        const processName = `bm.${id}`;
        const cwd = path.join(process.cwd(), 'build', id);
        await this.pm2Connect;
        try {
            await new Promise<void>((res, rej) => {
                pm2.start({
                    script: buildData.starting.script,
                    cwd,
                    name: processName,
                    env: this.main.envManager.prodEnv,
                    interpreter: buildData.starting.interpreter || 'node',
                    args: buildData.starting.args
                    //output: path.join(process.cwd(), 'log', 'run', `${buildId}.log`),
                    //error: path.join(process.cwd(), 'log', 'run', `${buildId}.log`),
                    //log_date_format: "[YYYY-MM-DD HH:mm:ss]",
                }, (err, proc) => {
                    if (err) {
                        return rej(err);
                    }
                    res();
                })
            });
        }
        catch (err) {
            this.main.logger.error(logPath, this.displayLog, `Starting process ${id} failed.`);
            this.main.logger.error(logPath, this.displayLog, err);
            return false;
        }

        if (!dontMakeProcessData) {
            this.currentProcess = this.main.db.createProcessData(id);
        }
        this.main.logger.log(logPath, this.displayLog, `Process ${id} started.`);
        return true;
    }

    private async deleteProcess(id: string, cleanUp?: boolean) {
        const processRunning = await this.checkProcessRunning(id);
        if (!processRunning) {
            return true;
        }
        const processName = `bm.${id}`;
        try {
            await new Promise<void>((res, rej) => {
                pm2.delete(processName, (err) => {
                    if (err) {
                        return rej(err);
                    }
                    res();
                })
            });
        }
        catch (err) {
            this.main.logger.error('main', true, err);
            this.main.logger.error('main', true, `Cannot delete process ${id}`);
            return false;
        }

        if (!cleanUp) {
            this.main.db.deleteProcessData(id);
        }
        this.main.logger.log(`run/${id}`, this.displayLog, `Process ${id} stopped.`)

        this.currentProcess = undefined;
        return true;
    }

    private pm2Connect = new Promise<void>((res, rej) => {
        pm2.connect((err) => {
            if (err) {
                return rej(err);
            }
            pm2.launchBus((err, bus) => {
                if (err) {
                    return rej(err);
                }
                bus.on('log:out', (data) => {
                    if (!this.currentProcess) return;
                    if (data.process.name === `bm.${this.currentProcess.id}`) {
                        const logPath = `run/${this.currentProcess.id}`;
                        this.main.logger.log(logPath, this.displayLog, data.data);
                    }
                });
                bus.on('log:err', (data) => {
                    if (!this.currentProcess) return;
                    if (data.process.name === `bm.${this.currentProcess.id}`) {
                        const logPath = `run/${this.currentProcess.id}`;
                        this.main.logger.error(logPath, this.displayLog, data.data);
                    }
                });
                res();
            });
        });
    });
}

export type RunnerConsturctorArg = {
    main: Main
}