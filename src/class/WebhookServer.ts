import { WebhookFunction } from "../types.js";
import { AppBuilder } from "./AppBuilder.js";
import { BuildData } from "./BuildData.js";
import { MainProcess } from "./MainProcess.js";
import fs from 'fs';
import path from 'path';

export class WebhookServer {
    server = Bun.serve({
        routes: {
            'hook/build': {
                POST: async (req) => {
                    const webhookFunction = await this.loadWebhookFunction();
                    try {
                        const webhookResult = await webhookFunction(req);
                        if (webhookResult.build) {
                            let buildId: string | null = null;
                            while (buildId === null) {
                                buildId = BuildData.randomBuildId();
                                if (!this.mainProcess.db.createBuildData(buildId)) {
                                    buildId = null;
                                }
                            }
                            this.mainProcess.logger.log(`Build ${buildId} enqueued.`)
                            this.mainProcess.appBuilder.enqueue(buildId, webhookResult.param, (success) => {
                                if (success) {
                                    if (webhookResult.autorun) {
                                        this.mainProcess.runner.enqueue(buildId);
                                    }
                                    this.mainProcess.logger.log(`Build ${buildId} completed.`);
                                }
                                else {
                                    this.mainProcess.logger.log(`Build ${buildId} failed.`);
                                }
                            })
                        }
                    }
                    catch (err) {
                        this.mainProcess.logger.error(err);
                        this.mainProcess.logger.error("An exception occued in webhook.");
                        return new Response('Server Error', { status: 500 });
                    }
                }
            }
        },
        fetch() {
            return new Response('Not Found', { status: 404 });
        }
    });
    mainProcess: MainProcess;
    private webhookFunction?: WebhookFunction<any>;

    constructor({ mainProcess }: WebhookServerConstructorArg) {
        this.mainProcess = mainProcess;
    }

    private async loadWebhookFunction() {
        if (this.webhookFunction) {
            return this.webhookFunction;
        }

        let webhookFunctionPath = path.join(process.cwd(), 'script', 'webhook.js');
        if (!fs.existsSync(webhookFunctionPath)) {
            webhookFunctionPath = path.join(process.cwd(), 'script', 'webhook.ts');
            if (!fs.existsSync(webhookFunctionPath)) {
                this.mainProcess.logger.error('"webhook.js" or "webhook.ts" not exists.');
                return null;
            }
        }

        if (!fs.statSync(webhookFunctionPath).isFile()) {
            this.mainProcess.logger.error(`"${webhookFunctionPath}" is not a file.`);
            return null;
        }

        try {
            var module = await import(webhookFunctionPath);
        }
        catch (err) {
            this.mainProcess.logger.error(`Cannot load module "${webhookFunctionPath}".`);
            this.mainProcess.logger.error(err);
            return null;
        }

        if (typeof (module?.default) !== "function") {
            this.mainProcess.logger.error(`Default export from "${webhookFunctionPath}" is not a function.`);
            return null;
        }

        this.webhookFunction = module.default;
        return this.webhookFunction;
    }
}

export type WebhookServerConstructorArg = {
    mainProcess: MainProcess;
}