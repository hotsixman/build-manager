export class MainProcess {

    close() {
        process.exit();
    }

    exit(){
        this.close();
    }
}