import type { BuildFunction } from "../src/types.js";

const build: BuildFunction<{}, {}> = async function ({ env, param, buildId }) {
    console.log(`buildId: ${buildId}`);
    return {};
}

export default build;