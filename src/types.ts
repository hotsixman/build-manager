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
> = (arg: BuildFunctionArg<Env, Param>) => Record<string, any> | Promise<Record<string, any>>;