import { WebhookFunction } from "../types.js";
import { BuildData } from "./BuildData.js";
import { Main } from "./Main.js";
import fs from 'fs';
import path from 'path';

export class WebhookServer {
    server: Bun.Server<undefined>;
    main: Main;
    private webhookFunction?: WebhookFunction<any, any>;

    constructor({ main }: WebhookServerConstructorArg) {
        this.main = main;
        this.server = Bun.serve({
            routes: {
                '/hook/build': {
                    POST: async (req) => {
                        let buildId: string | null = null;
                        while (buildId === null) {
                            buildId = BuildData.randomBuildId();
                            if (!this.main.db.createBuildData(buildId)) {
                                buildId = null;
                            }
                        }
                        const logPath = `build/${buildId}`;
                        try {
                            const webhookFunction = await this.loadWebhookFunction();
                            const buildDir = path.join(process.cwd(), 'build', buildId);
                            const webhookResult = await webhookFunction({
                                request: req,
                                env: this.main.envManager.buildEnv,
                                buildDir
                            });
                            if (webhookResult.build) {
                                this.main.logger.log(logPath, this.main.setting.displayBuildLog, `Build ${buildId} enqueued.`)
                                this.main.appBuilder.enqueue(buildId, webhookResult.param, (success) => {
                                    if (success) {
                                        if (webhookResult.autorun) {
                                            this.main.runner.enqueue(buildId);
                                        }
                                        this.main.logger.log(logPath, this.main.setting.displayBuildLog, `Build ${buildId} completed.`);
                                    }
                                    else {
                                        this.main.logger.log(logPath, this.main.setting.displayBuildLog, `Build ${buildId} failed.`);
                                    }
                                })
                            }
                            else {
                                this.main.logger.log(logPath, this.main.setting.displayBuildLog, `Build ${buildId} stopped.`)
                                this.main.db.updateBuildData(buildId, { status: 'stopped' });
                            }
                            return new Response();
                        }
                        catch (err) {
                            this.main.logger.error(logPath, this.main.setting.displayBuildLog, "An exception occued in webhook.");
                            this.main.logger.error(logPath, this.main.setting.displayBuildLog, err);
                            return new Response('Server Error', { status: 500 });
                        }
                    }
                }
            },
            fetch() {
                return new Response('Not Found', { status: 404 });
            },
            port: this.main.setting.webhookPort
        });
        this.main.beforeTerminate(async () => {
            await this.server.stop();
            console.log('Webhook server stopped.');
        })
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
    main: Main;
}