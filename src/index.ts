import { MainProcess } from "./class/MainProcess.js";

const mainProcess = new MainProcess();
await mainProcess.initialize();
console.log('ready');