export class BuildData {
    static statusEnum = {
        enqueued: 0,
        stopped: 1,
        building: 2,
        builded: 3,
        buildError: 4,
        running: 5,
        runError: 6
    } as const;
    static statusReverseEnum = ['enqueued', 'stopped', 'building', 'builded', 'buildError', 'running', 'runError'] as const;
    static randomBuildId() {
        return Math.floor(Math.random() * (10 ** 16)).toString(16);
    }

    id: string;
    status: BuildDataStatus;
    result?: Record<string, any>;
    createdTime: Date;

    constructor({
        id,
        status,
        result,
        createdTime
    }: BuildDataConstructorArg) {
        this.id = id;
        this.status = status ?? 'enqueued';
        this.result = result;
        this.createdTime = createdTime ?? new Date();
    }
}

export type BuildDataConstructorArg = {
    id: string;
    status?: BuildDataStatus;
    result?: Record<string, any>;
    createdTime?: Date;
}

export type BuildDataStatus = 'enqueued' | 'stopped' | 'building' | 'builded' | 'buildError' | 'running' | 'runError';