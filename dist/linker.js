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
    async onMessage(root_url) {
        console.log(`Getting words from ${root_url}`);
        const html = await axios_1.default({
            url: root_url,
            method: 'GET',
            httpAgent: consts_1.httpAgent,
        })
            .then(r => r.data)
            .catch(err => {
            console.error(`Error fetching the html; ${err}`);
            return null;
        });
        if (!html)
            return process.exit(1);
        const doc = cheerio_1.default.load(html);
        return doc(`li.han.t-i > a`)
            .toArray()
            .reduce((acc, a) => {
            if (cheerio_1.default('span.pos', a).text() !== 'idiom')
                acc.push(a.attribs['href']);
            return acc;
        }, []);
    }
})();
