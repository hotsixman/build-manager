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

    constructor() {
        this.readLine = new ReadLine();
        this.logger = new Logger();
        this.envManager = new EnvManager();
        this.db = new DB();
        this.setting = new Setting({mainProcess: this});
        this.appBuilder = new AppBuilder({ mainProcess: this });
        this.runner = new Runner();
        this.webhookServer = new WebhookServer({ mainProcess: this });
    }
}