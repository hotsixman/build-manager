import path from "node:path";
import { MainProcess } from "./MainProcess.js";
import fs from 'node:fs';

export class Setting {
    private mainProcess: MainProcess;
    maxBuildProcess: number = 1;

    constructor({ mainProcess }: SettingConstructorArg) {
        this.mainProcess = mainProcess;
        try {
            const jsonPath = path.join(process.cwd(), 'setting.json');
            const json = fs.readFileSync(jsonPath, 'utf-8');
            const settingData = JSON.parse(json);
            this.loadSettingData(settingData);
        }
        catch {
            this.mainProcess.logger.error('Cannot load "setting.json".');
        };
    }

    private loadSettingData(settingData: Record<string, any>) {
        if (typeof (settingData.maxBuildProcess) === "number") {
            this.maxBuildProcess = Math.max(settingData.maxBuildProcess, 1);
        }
    }

    toJson() {
        return JSON.stringify({
            maxBuildProcess: this.maxBuildProcess
        });
    }
}

export type SettingConstructorArg = {
    mainProcess: MainProcess;
}