import { Database } from 'bun:sqlite';
import { BuildData, BuildDataResult, BuildDataStatus } from './BuildData.js';

export class DB {
    static db: Database;
    static {
        this.db = new Database('main.db', { strict: true });
        this.db.run(`CREATE TABLE IF NOT EXISTS buildData (
            id TEXT PRIMARY KEY,
            status INTEGER NOT NULL,
            result JSON,
            createdTime INTEGER NOT NULL
        );`);
    };

    private buildDataCache = new BuildDataCache();

    checkBuildId(id: string) {
        const data = DB.db.query<{ count: number }, { id: string }>("SELECT COUNT(*) as `count` FROM `buildData` WHERE `id` = $id").get({ id });
        if (data.count > 0) {
            return true;
        }
        else {
            return false;
        }
    }

    getBuildData(id: string) {
        const cache = this.buildDataCache.get(id);
        if (cache) {
            return cache;
        }

        const data = DB.db.query<DBSchema.BuildData, { id: string }>("SELECT * FROM `buildData` WHERE `id` = $id").get({ id });
        if (!data) {
            return null;
        }

        const buildData = new BuildData({
            id: data.id,
            status: BuildData.statusReverseEnum[data.status],
            result: data.result ? JSON.parse(data.result) : undefined
        });

        this.buildDataCache.set(buildData.id, buildData);
        return buildData;
    }

    createBuildData(id: string): BuildData | null {
        if (this.checkBuildId(id)) {
            return null;
        }

        const now = new Date();
        const buildData = new BuildData({ id, createdTime: now });

        DB.db.run<[string, number, string | null, number]>("INSERT INTO `buildData` (`id`, `status`, `result`, `createdTIme`) VALUES ($1, $2, $3, $4)", [
            buildData.id,
            BuildData.statusEnum[buildData.status],
            buildData.result ? JSON.stringify(buildData.result) : null,
            now.getTime()
        ]);
        this.buildDataCache.set(buildData.id, buildData);

        return buildData;
    }

    updateBuildData(id: string, { status, result }: { status?: BuildDataStatus, result?: BuildDataResult }) {
        const buildData = this.getBuildData(id);
        if (!buildData) {
            return false;
        }

        DB.db.run<[number, string | null, string]>("UPDATE `buildData` SET `status` = $1, `result` = $2 WHERE `id` = $3", [
            BuildData.statusEnum[status ?? buildData.status],
            result === undefined ? (buildData.result ? JSON.stringify(buildData.result) : null) : JSON.stringify(result),
            id
        ]);
        buildData.status = status || buildData.status;
        buildData.result = result === undefined ? buildData.result : result;

        this.buildDataCache.set(id, buildData);
        return true;
    }

    getRunningBuildData() {
        const data = DB.db.query<DBSchema.BuildData, [number]>("SELECT * FROM `buildData` WHERE `status` = $0").get(BuildData.statusEnum.running);
        if (!data) {
            return null;
        }

        const buildData = new BuildData({
            id: data.id,
            status: BuildData.statusReverseEnum[data.status],
            result: data.result ? JSON.parse(data.result) : null,
            createdTime: new Date(data.createdTime)
        });
        this.buildDataCache.set(buildData.id, buildData);
        return buildData;
    }
}

class BuildDataCache {
    map = new Map<string, BuildData>();

    get(id: string) {
        return this.map.get(id);
    }

    set(id: string, buildData: BuildData) {
        if (this.map.size > 100) {
            this.map.delete(this.map.keys()[0])
        }
        this.map.set(id, buildData);
    }
}

export namespace DBSchema {
    export type BuildData = {
        id: string;
        status: number;
        result: string | null;
        createdTime: number;
    }
}