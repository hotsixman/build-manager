import fs from 'node:fs';
import path from 'node:path';
import { stripANSI } from "bun";

export class Logger {
    private logStreamSet = new Map<string, fs.WriteStream>();

    constructor() {
        process.on('beforeExit', () => {
            for (const stream of this.logStreamSet.values()) {
                stream.end();
            }
        });
        process.on('uncaughtException', () => {
            for (const stream of this.logStreamSet.values()) {
                stream.end();
            }
        })
    }

    log(fileName: string | null, display: boolean, ...messages: any[]) {
        const message = messages.map((e) => `${e}`).join(' ');
        if (fileName) {
            const stream = this.getStream(fileName);
            stream.write(`[${this.getCurrentTimestamp()}] [LOG] ${stripANSI(message)}\n`);
        }
        if (display) {
            console.log(message);
        }
    }

    error(fileName: string | null, display: boolean, ...errors: any[]) {
        const error = errors.map((e) => `${e}`).join(' ');
        if (fileName) {
            const stream = this.getStream(fileName);
            stream.write(`[${this.getCurrentTimestamp()}] [ERROR] ${stripANSI(error)}\n`);
        }
        if (display) {
            console.error(error);
        }
    }

    warn(fileName: string | null, display: boolean, ...warns: any[]) {
        const warn = warns.map((e) => `${e}`).join(' ');
        if (fileName) {
            const stream = this.getStream(fileName);
            stream.write(`[${this.getCurrentTimestamp()}] [WARN] ${stripANSI(warn)}\n`);
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