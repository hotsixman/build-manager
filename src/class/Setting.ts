import path from "node:path";
import { Main } from "./Main.js";
import fs from 'node:fs';

export class Setting implements SettingInterface {
    private main: Main;
    maxBuildProcess: number = 1;
    webhookPort: number = 3000;
    displayBuildLog: boolean = false;
    displayRunLog: boolean = false;
    cleanupProcess: boolean = true;

    constructor({ main }: SettingConstructorArg) {
        this.main = main;
        try {
            this.load();
            console.log('Successfully loaded setting.json');
        }
        catch {
            console.warn('Cannot load setting.json');
        };
        this.save();
    }

    private loadSettingData(settingData: Record<string, any>) {
        if (typeof (settingData.maxBuildProcess) === "number") {
            this.maxBuildProcess = Math.max(settingData.maxBuildProcess, 1);
        }
        if (typeof (settingData.webhookPort) === "number") {
            this.webhookPort = Math.max(settingData.webhookPort, 1);
        }
        if (typeof (settingData.displayBuildLog) === "boolean") {
            this.displayBuildLog = Boolean(settingData.displayBuildLog);
        }
        if (typeof (settingData.displayRunLog) === "boolean") {
            this.displayRunLog = Boolean(settingData.displayRunLog);
        }
        if (typeof (settingData.cleanupProcess) === "boolean") {
            this.cleanupProcess = Boolean(settingData.cleanupProcess);
        }
    }

    load() {
        const jsonPath = path.join(process.cwd(), 'setting.json');
        const json = fs.readFileSync(jsonPath, 'utf-8');
        const settingData = JSON.parse(json);
        this.loadSettingData(settingData);
    }

    async save() {
        await Bun.write(path.join(process.cwd(), 'setting.json'), this.toJson());
    }

    toJson() {
        return JSON.stringify(this.toObject());
    }

    toObject() {
        return {
            maxBuildProcess: this.maxBuildProcess,
            webhookPort: this.webhookPort,
            displayBuildLog: this.displayBuildLog,
            displayRunLog: this.displayRunLog,
            cleanupProcess: this.cleanupProcess
        }
    }
}

interface SettingInterface {
    webhookPort: number;
    displayBuildLog: boolean;
    displayRunLog: boolean;
    cleanupProcess: boolean;

}

export type SettingConstructorArg = {
    main: Main;
}