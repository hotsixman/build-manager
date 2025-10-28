import path from "node:path";
import { MainProcess } from "./MainProcess.js";
import pm2 from 'pm2';
import { BuildData } from "./BuildData.js";

export class Runner {
    private queue: string[] = [];
    private queueRunning: boolean = false;
    private mainProcess: MainProcess;
    private currentProcess?: pm2.Proc;
    private currentRunningBuildData?: BuildData;

    constructor({ mainProcess }: RunnerConsturctorArg) {
        this.mainProcess = mainProcess;
        this.mainProcess.beforeTerminate(async () => {
            const currentRunningId = this.currentRunningBuildData.id;
            await this.deleteBuildDataProcess(currentRunningId);
            console.log(`Process ${currentRunningId} closed.`)
            pm2.disconnect();
            console.log('pm2 disconnected.')
        })
    }
    private get displayLog() {
        return this.mainProcess.setting.displayRunLog;
    }

    enqueue(buildId: string) {
        this.queue.push(buildId);
        this.runqueue();
    }

    private runqueue() {
        if (this.queueRunning) return;
        this.queueRunning = true;

        queueMicrotask(async () => {
            while (this.queue.length > 0) {
                const buildId = this.queue.shift();
                const logPath = `run/${buildId}`;

                const currentRunning = this.mainProcess.db.getRunningBuildData();
                if (currentRunning) {
                    await this.deleteBuildDataProcess(currentRunning.id);
                }
                await this.startBuildDataProcess(buildId, logPath);
            }
            this.queueRunning = false;
        })
    }

    private async startBuildDataProcess(buildId: string, logPath: string) {
        const buildData = this.mainProcess.db.getBuildData(buildId);
        if (!buildData) {
            this.mainProcess.logger.error(logPath, this.displayLog, `Build ${buildId} not found.`);
            return false;
        }
        if (!buildData.result?.startScript) {
            this.mainProcess.logger.error(logPath, this.displayLog, `Build ${buildId} has no start command.`);
            return false;
        }
        const processName = `bm.${buildId}`;
        const cwd = path.join(process.cwd(), 'build', buildId);
        await this.pm2Connect;
        this.mainProcess.logger.log(logPath, this.displayLog, `Build ${buildId} started.`);
        try {
            this.currentProcess = await new Promise<pm2.Proc>((res, rej) => {
                pm2.start({
                    script: buildData.result.startScript,
                    cwd,
                    name: processName,
                    env: this.mainProcess.envManager.prodEnv,
                    //output: path.join(process.cwd(), 'log', 'run', `${buildId}.log`),
                    //error: path.join(process.cwd(), 'log', 'run', `${buildId}.log`),
                    log_date_format: "[YYYY-MM-DD HH:mm:ss]",
                }, (err, proc) => {
                    if (err) {
                        return rej(err);
                    }
                    res(proc);
                })
            });
        }
        catch (err) {
            this.mainProcess.logger.error(logPath, this.displayLog, `Starting ${buildId} failed.`);
            this.mainProcess.logger.error(logPath, this.displayLog, err);
            return false;
        }
        this.mainProcess.db.updateBuildData(buildId, { status: 'running' });
        this.currentRunningBuildData = buildData;
        return true;
    }

    private async deleteBuildDataProcess(buildId: string) {
        const processName = `bm.${buildId}`;
        await this.pm2Connect;
        try {
            const hasProcess = await new Promise<boolean>((res, rej) => {
                pm2.list((err, list) => {
                    if (err) {
                        return rej(err);
                    }
                    res(Boolean(list.find((p) => p.name === processName)));
                })
            })
            if (hasProcess) {
                await new Promise<void>((res, rej) => {
                    pm2.delete(processName, (err) => {
                        if (err) {
                            return rej(err);
                        }
                        res();
                    })
                });
            }
        }
        catch { }
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
                    if (!this.currentRunningBuildData) return;
                    if (data.process.name === `bm.${this.currentRunningBuildData.id}`) {
                        const logPath = `run/${this.currentRunningBuildData.id}`;
                        this.mainProcess.logger.log(logPath, this.displayLog, data.data);
                    }
                });
                bus.on('log:err', (data) => {
                    if (!this.currentRunningBuildData) return;
                    if (data.process.name === `bm.${this.currentRunningBuildData.id}`) {
                        const logPath = `run/${this.currentRunningBuildData.id}`;
                        this.mainProcess.logger.error(logPath, this.displayLog, data.data);
                    }
                });
                res();
            });
        });
    });
}

export type RunnerConsturctorArg = {
    mainProcess: MainProcess
}