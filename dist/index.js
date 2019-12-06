"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const paralio_1 = require("paralio");
const path_1 = require("path");
const fs_extra_1 = __importDefault(require("fs-extra"));
const inquirer_1 = __importDefault(require("inquirer"));
class App extends paralio_1.Paralio {
    constructor(input) {
        super({
            input,
            workerPath: path_1.resolve(__dirname, 'worker'),
            repl: false,
        });
        this.len = 0;
        this.write_buffer = [];
        this.out_stream = fs_extra_1.default.createWriteStream(path_1.resolve(__dirname, 'out.json'), {
            autoClose: false,
            encoding: 'utf8',
        });
        this.out_stream.writable && this.out_stream.write('{\n');
    }
    write() {
        return new Promise((res, rej) => {
            this.write_buffer = this.write_buffer.concat(this.output);
            this.output = [];
            if (this.out_stream.writable) {
                let acc = '';
                let data;
                while ((data = this.write_buffer.pop())) {
                    if (!data[1].length)
                        continue;
                    acc += `  "${data[0]}": ${JSON.stringify(data[1])}${this.len === this.input.length && this.write_buffer.length === 0
                        ? ''
                        : ','}\n`;
                }
                this.out_stream.write(acc, err => (err ? rej(err) : res()));
            }
        });
    }
}
const URLS = [
    'https://dictionary.cambridge.org/browse/english/c/c-f/',
];
const getLinks = () => new Promise((res, rej) => {
    try {
        const linker = new paralio_1.Paralio({
            repl: false,
            workerPath: path_1.resolve(__dirname, 'linker'),
            input: URLS,
        });
        linker.on('end', a => res(a.output.reduce((acc, ws) => acc.concat(ws), [])));
    }
    catch (err) {
        rej(err);
    }
});
(async function main() {
    console.time('t');
    const status = new inquirer_1.default.ui.BottomBar();
    const urls = await getLinks().catch(err => {
        console.error(`Error fetching word urls; ${err}`);
        process.exit(1);
        return [];
    });
    // -------- Get words from the sites -------- //
    const app = new App(urls);
    // @ts-ignore
    app.on('data', ([data, app]) => {
        app.len++;
        if (data[1].length) {
            status.updateBottomBar(`[${app.len}/${app.input.length}] Fetched ${data[0]}`);
        }
        if (app.len % 100 === 0)
            app.write();
    });
    // @ts-ignore
    app.on('end', async (app) => {
        await app.write();
        app.out_stream.write('}', app.out_stream.end);
        console.timeEnd('t');
        console.log(`${app.len} words aggregated`);
    });
})();
