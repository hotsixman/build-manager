import fs from 'node:fs';
import path from 'node:path';
import { stripANSI } from "bun";
import { MainProcess } from './MainProcess.js';

export class Logger {
    private logStreamSet = new Map<string, fs.WriteStream>();
    private mainProcess: MainProcess;

    constructor({ mainProcess }: LoggerConstructorArg) {
        this.mainProcess = mainProcess;
    }

    log(fileName: string | null, display: boolean, ...messages: any[]) {
        const message = messages.map((e) => `${e}`).join(' ');
        if (fileName) {
            const stream = this.getStream(fileName);
            let line = `[${this.getCurrentTimestamp()}] [LOG] ${stripANSI(message)}`.trimEnd() + '\n';
            stream.write(line);
        }
        if (display) {
            console.log(message);
        }
    }

    error(fileName: string | null, display: boolean, ...errors: any[]) {
        const error = errors.map((e) => `${e}`).join(' ');
        if (fileName) {
            const stream = this.getStream(fileName);
            let line = `[${this.getCurrentTimestamp()}] [ERROR] ${stripANSI(error)}`.trimEnd() + '\n';
            stream.write(line);
        }
        if (display) {
            console.error(error);
        }
    }

    warn(fileName: string | null, display: boolean, ...warns: any[]) {
        const warn = warns.map((e) => `${e}`).join(' ');
        if (fileName) {
            const stream = this.getStream(fileName);
            let line = `[${this.getCurrentTimestamp()}] [WARN] ${stripANSI(warn)}`.trimEnd() + '\n';
            stream.write(line);
        }
        if (display) {
            console.warn(warn);
        }
    }

    private getStream(file: string) {
        let absPath = path.resolve(process.cwd(), 'log', file);
        if (!absPath.endsWith('.log')) {
            absPath += '.log';
        }
        let stream = this.logStreamSet.get(absPath);
        if (!stream) {
            const dirPath = path.dirname(absPath);
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }
            stream = fs.createWriteStream(absPath, { flags: 'a' });
            stream.write('');
            if (this.logStreamSet.size >= 10) {
                const [firstKey, firstStream] = Array.from(this.logStreamSet.entries())[0];
                firstStream.end();
                this.logStreamSet.delete(firstKey);
            }
            this.logStreamSet.set(absPath, stream);
        }
        return stream;
    }

    private getCurrentTimestamp() {
        const date = new Date();
        return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
    };
}

export type LoggerConstructorArg = {
    mainProcess: MainProcess;
}