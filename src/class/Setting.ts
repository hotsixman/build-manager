import path from "node:path";
import { MainProcess } from "./MainProcess.js";
import fs from 'node:fs';

export class Setting {
    private mainProcess: MainProcess;
    maxBuildProcess: number = 1;
    webhookPort: number = 3000;
    displayBuildLog: boolean = false;
    displayRunLog: boolean = false;

    constructor({ mainProcess }: SettingConstructorArg) {
        this.mainProcess = mainProcess;
        try {
            const jsonPath = path.join(process.cwd(), 'setting.json');
            const json = fs.readFileSync(jsonPath, 'utf-8');
            const settingData = JSON.parse(json);
            this.loadSettingData(settingData);
        }
        catch {
            this.mainProcess.logger.warn(null, true, 'Cannot load "setting.json".');
        };
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
    }

    toJson() {
        return JSON.stringify({
            maxBuildProcess: this.maxBuildProcess,
            webhookPort: this.webhookPort,
            displayBuildLog: this.displayBuildLog,
            displayRunLog: this.displayRunLog,
        });
    }
}

export type SettingConstructorArg = {
    mainProcess: MainProcess;
}