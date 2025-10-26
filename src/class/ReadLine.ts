import { createInterface, Interface } from 'node:readline';
import { MainProcess } from './MainProcess.js';

export class ReadLine {
    static interface?: Interface;
    static loadInterface(): Interface {
        if (!ReadLine.interface) {
            ReadLine.interface = createInterface({
                input: process.stdin,
                output: process.stdout
            });
        }

        return ReadLine.interface;
    }

    mainProcess: MainProcess;

    constructor({
        mainProcess
    }: ReadlineConstuctorArg) {
        this.mainProcess = mainProcess;
    }

    question(question: string) {
        return new Promise<string>((res) => {
            const rl = ReadLine.loadInterface();
            rl.question(question, (answer) => res(answer));
        })
    }

    line() {
        return new Promise<string>((res) => {
            const rl = ReadLine.loadInterface();
            rl.on('line', (line) => {
                res(line);
            })
        })
    }
}

export type ReadlineConstuctorArg = {
    mainProcess: MainProcess;
};