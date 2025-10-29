export class ProcessData {
    id: string;
    createdTime: Date;

    constructor({ id, createdTime }: ProcessDataConstructorArg) {
        this.id = id;
        this.createdTime = createdTime ?? new Date();
    }
}

export type ProcessDataConstructorArg = {
    id: string;
    createdTime?: Date;
}