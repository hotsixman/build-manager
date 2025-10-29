import { Database } from 'bun:sqlite';
import { BuildData, BuildDataStatus, BuildedData, BuildedDataStarting } from './BuildData.js';
import { ProcessData } from './ProcessData.js';

export class DB {
    static db: Database;
    static {
        this.db = new Database('main.db', { strict: true });
        this.db.run(`CREATE TABLE IF NOT EXISTS buildData (
            id TEXT PRIMARY KEY,
            status INTEGER NOT NULL,
            result JSON,
            starting JSON,
            createdTime INTEGER NOT NULL
        );`);
        this.db.run(`CREATE TABLE IF NOT EXISTS processData (
            id TEXT PRIMARY KEY,
            createdTime INTEGER NOT NULL
        );`);
    };
    static from = {
        buildData(data: DBSchema.BuildData) {
            if (data.status === BuildData.statusEnum.builded) {
                return new BuildedData({
                    id: data.id,
                    createdTime: new Date(data.createdTime),
                    starting: JSON.parse(data.starting),
                    result: JSON.parse(data.result)
                })
            }
            else {
                return new BuildData({
                    id: data.id,
                    status: BuildData.statusReverseEnum[data.status],
                    createdTime: new Date(data.createdTime)
                })
            }
        },
        processData(data: DBSchema.ProcessData) {
            return new ProcessData({
                id: data.id,
                createdTime: new Date(data.createdTime)
            })
        }
    };
    static to = {
        buildData(buildData: BuildData): DBSchema.BuildData {
            return {
                id: buildData.id,
                status: BuildData.statusEnum[buildData.status],
                createdTime: buildData.createdTime.getTime(),
                result: (buildData instanceof BuildedData) ? JSON.stringify(buildData.result) : null as string | null,
                starting: (buildData instanceof BuildedData) ? JSON.stringify(buildData.starting) : null as string | null,
            }
        },
        processData(processData: ProcessData): DBSchema.ProcessData {
            return {
                id: processData.id,
                createdTime: processData.createdTime.getTime()
            }
        }
    }

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

        const buildData = DB.from.buildData(data);
        this.buildDataCache.set(buildData.id, buildData);
        return buildData;
    }

    createBuildData(id: string): BuildData | null {
        if (this.checkBuildId(id)) {
            return null;
        }

        const now = new Date();
        const buildData = new BuildData({ id, createdTime: now });

        const data = DB.to.buildData(buildData);
        DB.db.run<[string, number, string | null, string | null, number]>("INSERT INTO `buildData` (`id`, `status`, `result`, `starting`, `createdTIme`) VALUES ($1, $2, $3, $4, $5)", [
            data.id,
            data.status,
            null,
            null,
            data.createdTime
        ]);
        this.buildDataCache.set(buildData.id, buildData);

        return buildData;
    }

    updateBuildData(id: string, arg: UpdateBuildDataArg) {
        const buildData = this.getBuildData(id);
        if (!buildData) {
            return false;
        }

        let updatedBuildData: BuildData;
        if (arg.status === "builded") {
            updatedBuildData = new BuildedData({
                id,
                createdTime: buildData.createdTime,
                starting: arg.starting,
                result: arg.result
            });
        }
        else {
            updatedBuildData = new BuildData({
                id,
                createdTime: buildData.createdTime,
                status: arg.status
            })
        }

        const dbData = DB.to.buildData(updatedBuildData);
        DB.db.run<[number, string | null, string | null, number, string]>(
            "UPDATE `buildData` SET `status` = $0, `result` = $1, `starting` = $2, `createdTime` = $3 WHERE `id` = $4", [
            dbData.status,
            dbData.result,
            dbData.starting,
            dbData.createdTime,
            dbData.id
        ]);

        this.buildDataCache.set(id, updatedBuildData);
        return true;
    }

    getProcessData() {
        const data = DB.db.query<DBSchema.ProcessData, []>("SELECT * FROM `processData`").get();
        if (!data) {
            return null;
        }
        return DB.from.processData(data);
    }

    createProcessData(id: string) {
        const processData = new ProcessData({ id });
        const dbData = DB.to.processData(processData);
        DB.db.run<[string, number]>("INSERT INTO `processData` (`id`, `createdTime`) VALUES ($0, $1)", [
            dbData.id,
            dbData.createdTime
        ]);
        return processData
    }

    deleteProcessData(id: string) {
        DB.db.run<[string]>("DELETE FROM `processData` WHERE `id` = $0", [
            id
        ]);
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

    delete(id: string) {
        this.map.delete(id);
    }
}

export namespace DBSchema {
    export type BuildData = {
        id: string;
        status: number;
        result: string | null;
        starting: string | null;
        createdTime: number;
    }
    export type ProcessData = {
        id: string;
        createdTime: number;
    }
}

type UpdateBuildDataArg = {
    status: Exclude<BuildDataStatus, 'builded'>
} | {
    status: 'builded',
    starting: BuildedDataStarting,
    result?: Record<string, any>
}