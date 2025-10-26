export class BuildData {
    id: string;
    status: ''

    constructor({
        id
    }: BuildDataConstructorArg) {
        this.id = id;
    }
}

export type BuildDataConstructorArg = {
    id: string;
}