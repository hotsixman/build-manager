export class EnvManager {
    buildEnv: Record<string, string>;

    getBuildEnv() {
        return structuredClone(this.buildEnv);
    }
}