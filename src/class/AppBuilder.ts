import path from "node:path";
import fs from 'node:fs';
import { BuildArg, BuildFunction } from "../types.js";
import { Logger } from "./Logger.js";

export class AppBuilder {
    static randomBuildId() {
        return Math.floor(Math.random() * (10 ** 16)).toString(16);
    }

    private buildFunction?: BuildFunction<any>;
    private logger: Logger;

    constructor({
        logger
    }: {
        logger: Logger
    }) {
        this.logger = logger;
    }

    private async loadBuildFunction() {
        if (this.buildFunction) {
            return this.buildFunction;
        }

        let buildFunctionPath = path.join(process.cwd(), 'build.js');
        if (!fs.existsSync(buildFunctionPath)) {
            buildFunctionPath = path.join(process.cwd(), 'build.ts');
            if (!fs.existsSync(buildFunctionPath)) {
                this.logger.error('"build.js" or "build.ts" not exists.');
                return null;
            }
        }

        if (!fs.statSync(buildFunctionPath).isFile()) {
            this.logger.error(`"${buildFunctionPath}" is not an es-module.`);
            return null;
        }

        try {
            var module = await import(buildFunctionPath);
        }
        catch (err) {
            this.logger.error(`Cannot load module "${buildFunctionPath}".`);
            this.logger.error(err);
            return null;
        }

        if (typeof (module?.default) !== "function") {
            this.logger.error(`Default export from "${buildFunctionPath}" is not a function.`);
            return null;
        }

        this.buildFunction = module.default;
        return this.buildFunction;
    }

    async build(arg: BuildArg): Promise<boolean> {
        const buildFunction = await this.loadBuildFunction();
        if (!buildFunction) {
            return false;
        }
    }
}