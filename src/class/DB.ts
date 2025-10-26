import { Database } from 'bun:sqlite';
import { BuildData } from './BuildData.js';

export class DB {
    static db = new Database('main.db')

    getBuildData(id: string) {
    }

    createBuildData(id: string) {
        const buildData = new BuildData({ id });
        return buildData;
    }
}