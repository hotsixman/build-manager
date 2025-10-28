import { ReadLine } from "./ReadLine.js";
import { AppBuilder } from "./AppBuilder.js";
import { DB } from "./DB.js";
import { EnvManager } from "./EnvManager.js";
import { Logger } from "./Logger.js";
import { Runner } from "./Runner.js";
import { WebhookServer } from "./WebhookServer.js";
import { Setting } from "./Setting.js";

export class MainProcess {
    readonly envManager: EnvManager;
    readonly appBuilder: AppBuilder;
    readonly db: DB;
    readonly logger: Logger;
    readonly readLine: ReadLine;
    readonly runner: Runner;
    readonly webhookServer: WebhookServer;
    readonly setting: Setting;
    private beforeTerminates: (() => any)[] = [() => console.log('Closing...')];

    constructor() {
        this.readLine = new ReadLine();
        this.logger = new Logger({mainProcess: this});
        this.envManager = new EnvManager();
        this.db = new DB();
        this.setting = new Setting({ mainProcess: this });
        this.appBuilder = new AppBuilder({ mainProcess: this });
        this.webhookServer = new WebhookServer({ mainProcess: this });
        this.runner = new Runner({ mainProcess: this });

        process.on('SIGINT', () => this.beforeTerminate_(0));
        process.on('SIGTERM', () => this.beforeTerminate_(0));
        process.on('uncaughtException', (err, origin) => this.beforeTerminate_(1, err, origin));
        process.on('unhandledRejection', (err) => this.beforeTerminate_(1, err));
    }

    async initialize() {
        await this.startRunningBuildData();
    }
    private async startRunningBuildData() {
        const running = this.db.getRunningBuildData();
        if (running) {
            this.runner.enqueue(running.id);
        }
    }

    beforeTerminate(func: () => any){
        this.beforeTerminates.push(func);
    }

    private async beforeTerminate_(code?: number, err?: any, origin?: any){
        for(const func of this.beforeTerminates){
            await func();
        }
        if(err){
            console.error(err);
        }
        if(origin){
            console.error(origin);
        }
        process.exit(code ?? 0);
    }
}