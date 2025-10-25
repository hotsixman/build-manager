export type BuildFunctionArg<
    Env extends Record<string, string | undefined>
> = {
    env: Env;
};
export type BuildFunction<
    Env extends Record<string, string | undefined>
> = (arg: BuildFunctionArg<Env>) => void | Promise<void>;

// AppBuilder
export type BuildArg = {
    buildId: string;
}