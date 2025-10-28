export class BuildData {
    static statusEnum = {
        enqueued: 0,
        building: 1,
        builded: 2,
        buildError: 3,
        running: 4,
        runError: 5
    } as const;
    static statusReverseEnum = ['enqueued', 'building', 'builded', 'buildError', 'running', 'runError'] as const;
    static randomBuildId() {
        return Math.floor(Math.random() * (10 ** 16)).toString(16);
    }

    id: string;
    status: BuildDataStatus;
    result?: Record<string, any>;

    constructor({
        id,
        status,
        result
    }: BuildDataConstructorArg) {
        this.id = id;
        this.status = status ?? 'enqueued';
        this.result = result;
    }
}

export type BuildDataConstructorArg = {
    id: string;
    status?: BuildDataStatus;
    result?: Record<string, any>;
}

export type BuildDataStatus = 'enqueued' | 'building' | 'builded' | 'buildError' | 'running' | 'runError';