"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const paralio_1 = require("paralio");
const axios_1 = __importDefault(require("axios"));
const consts_1 = require("./consts");
const cheerio_1 = __importDefault(require("cheerio"));
new (class extends paralio_1.Worker {
    onMount() {
        console.log(`[Worker ${process.pid}]> Mounted`);
    }
    async onMessage(url) {
        const html = await axios_1.default({
            method: 'GET',
            httpAgent: consts_1.httpAgent,
            url,
        })
            .then(r => r.data)
            .catch(err => {
            console.error(`Error fetching ${url}; ${err}`);
            return null;
        });
        if (!html)
            return null;
        const doc = cheerio_1.default.load(html);
        const category = doc('.pos.dpos')
            .toArray()
            .reduce((acc, s) => {
            const type = s.children[0].data;
            if (type && !acc.some(c => c == type))
                acc.push(type);
            return acc;
        }, []);
        const word = doc('.hw.dhw').first().text();
        return [word, category];
    }
})();
