export class BuildData {
    static statusEnum = {
        enqueued: 0,
        stopped: 1,
        building: 2,
        builded: 3,
        buildError: 4
    } as const;
    static statusReverseEnum = ['enqueued', 'stopped', 'building', 'builded', 'buildError'] as const;
    static randomBuildId() {
        return Math.floor(Math.random() * (10 ** 16)).toString(16);
    }

    id: string;
    status: BuildDataStatus;
    createdTime: Date;

    constructor({
        id,
        status,
        createdTime
    }: BuildDataConstructorArg) {
        this.id = id;
        this.status = status ?? 'enqueued';
        this.createdTime = createdTime ?? new Date();
    }
}

export class BuildedData extends BuildData {
    status: 'builded' = 'builded';
    starting: BuildedDataStarting;
    result: Record<string, any> | null;

    constructor({ id, createdTime, starting, result }: BuildDataConstructorArg & { starting: BuildedDataStarting, result?: Record<string, any> }) {
        super({ id, createdTime, status: 'builded' });
        this.starting = starting;
        this.result = result ?? null;
    }
}

export type BuildDataConstructorArg = {
    id: string;
    status?: BuildDataStatus;
    createdTime?: Date;
}
export type BuildDataStatus = 'enqueued' | 'stopped' | 'building' | 'builded' | 'buildError';
export type BuildDataResult = Record<string, any>;
export type BuildedDataStarting = {
    script: string;
    interpreter?: string;
}