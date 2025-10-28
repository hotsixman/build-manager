export type BuildFunctionArg<
    Env extends Record<string, string>,
    Param extends Record<string, string>
> = {
    env: Env;
    param: Param;
    buildId: string;
};
export type BuildFunction<
    Env extends Record<string, string>,
    Param extends Record<string, any>
> = (arg: BuildFunctionArg<Env, Param>) => MaybePromise<Record<string, any>>;

export type WebhookFunction<
    Param extends Record<string, any>
> = (request: Bun.BunRequest) => MaybePromise<
    { build: true, param: Param, autorun: boolean } |
    { build: false }
>;

type MaybePromise<T> = T | Promise<T>;