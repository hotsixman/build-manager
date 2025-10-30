import { createInterface, Interface } from 'node:readline';
import { Main } from './Main.js';

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

    question(question: string) {
        return new Promise<string>((res) => {
            const rl = ReadLine.loadInterface();
            rl.question(question, (answer) => res(answer));
        })
    }

    line() {
        return new Promise<string>((res) => {
            const rl = ReadLine.loadInterface();
            rl.on('line', callback);
            function callback(line: string) {
                rl.off('line', callback)
                res(line);
            }
        })
    }
}

export type ReadlineConstuctorArg = {
    main: Main;
};