import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseEnv } from "node:util";

export class EnvManager {
    readonly buildEnv: Record<string, string>;
    readonly prodEnv: Record<string, string>;

    constructor() {
        try {
            this.buildEnv = parseEnv(readFileSync(join(process.cwd(), '.build.env'), 'utf-8'));
            console.log('Successfully loaded .build.env');
        }
        catch {
            this.buildEnv = {};
            console.error('Cannot load .build.env');
        }
        try {
            this.prodEnv = parseEnv(readFileSync(join(process.cwd(), '.prod.env'), 'utf-8'));
            console.log('Successfully loaded .prod.env');
        }
        catch {
            this.prodEnv = {};
            console.error('Cannot load .prod.env');
        }
    }
}