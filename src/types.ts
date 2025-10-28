import { SpawnOption } from "./class/AppBuilder.js";
import { BuildDataResult } from "./class/BuildData.js";

export type BuildFunctionArg<
    Env extends Record<string, string>,
    Param extends Record<string, string>
> = {
    env: Env;
    param: Param;
    buildId: string;
    spawn: (cmd: string | string[], options?: SpawnOption) => Promise<number>;
    cwd: string;
    console: {
        log: (...messages: any[]) => void;
        error: (...messages: any[]) => void;
        warn: (...messages: any[]) => void;
    }
};
export type BuildFunction<
    Env extends Record<string, string>,
    Param extends Record<string, any>
> = (arg: BuildFunctionArg<Env, Param>) => MaybePromise<BuildDataResult>;

export type WebhookFunctionArg<
    Env extends Record<string, string>
> = {
    request: Bun.BunRequest,
    env: Env,
    buildDir: string;
}
export type WebhookFunction<
    Env extends Record<string, string>,
    Param extends Record<string, any>
> = (arg: WebhookFunctionArg<Env>) => MaybePromise<
    { build: true, param: Param, autorun: boolean } |
    { build: false }
>;

type MaybePromise<T> = T | Promise<T>;