import { ReadLine } from "./ReadLine.js";
import { AppBuilder } from "./AppBuilder.js";
import { DB } from "./DB.js";
import { EnvManager } from "./EnvManager.js";
import { Logger } from "./Logger.js";
import { Runner } from "./Runner.js";
import { WebhookServer } from "./WebhookServer.js";
import { Setting } from "./Setting.js";
import { CLI } from "./CLI.js";

export class Main {
    readonly envManager: EnvManager;
    readonly appBuilder: AppBuilder;
    readonly db: DB;
    readonly logger: Logger;
    readonly readLine: ReadLine;
    readonly runner: Runner;
    readonly webhookServer: WebhookServer;
    readonly setting: Setting;
    readonly cli: CLI;
    private beforeTerminates: (() => any)[] = [() => console.log('Closing...')];

    constructor() {
        this.readLine = new ReadLine();
        this.logger = new Logger({ main: this });
        this.envManager = new EnvManager();
        this.db = new DB();
        this.setting = new Setting({ main: this });
        this.appBuilder = new AppBuilder({ main: this });
        this.webhookServer = new WebhookServer({ main: this });
        this.runner = new Runner({ main: this });
        this.cli = new CLI(this);

        process.on('SIGINT', () => this.beforeTerminate_(0));
        process.on('SIGTERM', () => this.beforeTerminate_(0));
        process.on('uncaughtException', (err, origin) => this.beforeTerminate_(1, err, origin));
        process.on('unhandledRejection', (err) => this.beforeTerminate_(1, err));
    }

    async initialize() {
        await this.runner.init();
        console.log('Ready!');
        this.cli.start();
    }

    beforeTerminate(func: () => any) {
        this.beforeTerminates.push(func);
    }

    private async beforeTerminate_(code?: number, err?: any, origin?: any) {
        for (const func of this.beforeTerminates) {
            await func();
        }
        if (err) {
            console.error(err);
        }
        if (origin) {
            console.error(origin);
        }
        console.log('Bye Bye!');
        process.exit(code ?? 0);
    }
}