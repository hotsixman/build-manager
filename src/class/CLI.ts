import { Main } from "./Main.js";
import { ReadLine } from "./ReadLine.js";

export class CLI {
    private main: Main;
    private readLine: ReadLine;

    constructor(main: Main) {
        this.main = main;
        this.readLine = this.main.readLine;
    }

    async start() {
        while (true) {
            console.log('');
            console.log('1. Current process');
            console.log('2. Builds');
            console.log('3. Setting');
            const answer = await this.readLine.line();
            console.log('');
            switch (answer) {
                case '1': {
                    await this.currentProcess();
                    break;
                }
                case '2': {
                    await this.builds();
                    break;
                }
                case '3': {
                    await this.setting();
                    break;
                }
                default: {
                    console.log('Invalid option.')
                }
            }
        }
    }

    private async currentProcess() {
        const currentProcess = this.main.runner.cloneCurrentProcess();
        if (!currentProcess) {
            console.log('No running process.');
            return;
        }
        console.log(`Current process is ${currentProcess.id}`);
        while (true) {
            console.log('');
            console.log('1. Restart');
            console.log('2. Stop');
            console.log('3. Go back')
            const answer = await this.readLine.line();
            console.log('');
            switch (answer) {
                case "1": {
                    await this.main.runner.restartCurrentProcess();
                    console.log(`Process ${currentProcess.id} restarted.`);
                    return;
                }
                case "2": {
                    await this.main.runner.deleteCurrentProcess();
                    console.log(`Process ${currentProcess.id} stopped.`);
                    return;
                }
                case "3": {
                    return;
                }
                default: {
                    console.log("Invalid option.")
                }
            }
        }
    }

    private async builds(offset: number = 0) {
        const buildDatas = this.main.db.getBuildDatas(10, offset * 10).map((e) => ({ id: e.id, status: e.status, createdTime: e.createdTime }));
        console.table(buildDatas);
        console.log(`Page ${offset + 1}`);

        while (true) {
            console.log('');
            console.log('1. Start');
            console.log('2. Details');
            console.log('3. Next');
            if (offset > 0) {
                console.log('4. Previous');
            }
            console.log('5. Go back');
            const answer = await this.readLine.line();
            console.log('');
            switch (answer) {
                case '1': {
                    const answer = await this.readLine.question("Type id of the build which you want to start.\n");
                    this.main.runner.enqueue(answer);
                    console.log(`Process ${answer} enqueued.`);
                    return;
                }
                case '2': {
                    const answer = await this.readLine.question("Type id of the build which you want to see details.\n");
                    const buildData = this.main.db.getBuildData(answer);
                    if (buildData) {
                        console.log('');
                        console.log(buildData);
                        return;
                    }
                    else {
                        console.log(`Build ${buildData} not found.`);
                        continue;
                    }
                }
                case '3': {
                    return await this.builds(offset + 1);
                }
                case '4': {
                    if (offset > 0) {
                        return await this.builds(offset - 1);
                    }
                }
                case '5': {
                    return;
                }
                default: {
                    console.log('Invalid option.')
                }
            }
        }
    }

    private async setting() {
        console.log(this.main.setting.toObject());
        while (true) {
            console.log('');
            console.log('1. Reload')
            console.log('2. Go back');
            const answer = await this.readLine.line();
            console.log('');

            switch (answer) {
                case '1': {
                    console.log("Reloading setting...");
                    this.main.setting.load();
                    console.log("Reloaded!");
                    return;
                }
                case '2': {
                    return;
                }
                default: {
                    console.log("Invalid option")
                }
            }
        }
    }
}