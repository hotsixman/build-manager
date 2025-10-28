import { WebhookFunction } from "../types.js";
import { AppBuilder } from "./AppBuilder.js";
import { BuildData } from "./BuildData.js";
import { MainProcess } from "./MainProcess.js";
import fs from 'fs';
import path from 'path';

export class WebhookServer {
    server: Bun.Server<undefined>;
    mainProcess: MainProcess;
    private webhookFunction?: WebhookFunction<any>;

    constructor({ mainProcess }: WebhookServerConstructorArg) {
        this.mainProcess = mainProcess;
        this.server = Bun.serve({
            routes: {
                '/hook/build': {
                    POST: async (req) => {
                        let buildId: string | null = null;
                        while (buildId === null) {
                            buildId = BuildData.randomBuildId();
                            if (!this.mainProcess.db.createBuildData(buildId)) {
                                buildId = null;
                            }
                        }
                        const logPath = `build/${buildId}`;
                        const webhookFunction = await this.loadWebhookFunction();
                        try {
                            const webhookResult = await webhookFunction(req);
                            if (webhookResult.build) {
                                this.mainProcess.logger.log(logPath, true, `Build ${buildId} enqueued.`)
                                this.mainProcess.appBuilder.enqueue(buildId, webhookResult.param, (success) => {
                                    if (success) {
                                        if (webhookResult.autorun) {
                                            this.mainProcess.runner.enqueue(buildId);
                                        }
                                        this.mainProcess.logger.log(logPath, true, `Build ${buildId} completed.`);
                                    }
                                    else {
                                        this.mainProcess.logger.log(logPath, true, `Build ${buildId} failed.`);
                                    }
                                })
                            }
                            else {
                                this.mainProcess.logger.log(logPath, true, `Build ${buildId} stopped.`)
                                this.mainProcess.db.updateBuildData(buildId, { status: 'stopped' });
                            }
                            return new Response();
                        }
                        catch (err) {
                            this.mainProcess.logger.error(logPath, true, "An exception occued in webhook.");
                            this.mainProcess.logger.error(logPath, true, err);
                            return new Response('Server Error', { status: 500 });
                        }
                    }
                }
            },
            fetch() {
                return new Response('Not Found', { status: 404 });
            },
            port: this.mainProcess.setting.webhookPort
        });
    }

    private async loadWebhookFunction() {
        if (this.webhookFunction) {
            return this.webhookFunction;
        }

        let webhookFunctionPath = path.join(process.cwd(), 'script', 'webhook.js');
        if (!fs.existsSync(webhookFunctionPath)) {
            webhookFunctionPath = path.join(process.cwd(), 'script', 'webhook.ts');
            if (!fs.existsSync(webhookFunctionPath)) {
                console.error('"webhook.js" or "webhook.ts" not exists.');
                return null;
            }
        }

        if (!fs.statSync(webhookFunctionPath).isFile()) {
            console.error(`"${webhookFunctionPath}" is not a file.`);
            return null;
        }

        try {
            var module = await import(webhookFunctionPath);
        }
        catch (err) {
            console.error(`Cannot load module "${webhookFunctionPath}".`);
            console.error(err);
            return null;
        }

        if (typeof (module?.default) !== "function") {
            console.error(`Default export from "${webhookFunctionPath}" is not a function.`);
            return null;
        }

        this.webhookFunction = module.default;
        return this.webhookFunction;
    }
}

export type WebhookServerConstructorArg = {
    mainProcess: MainProcess;
}