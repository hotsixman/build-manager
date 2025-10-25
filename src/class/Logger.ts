export class Logger{
    log(...message: any){
        console.log(...message);
    }

    error(...error: any){
        console.error(...error);
    }
}