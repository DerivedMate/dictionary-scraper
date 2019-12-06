import { Paralio } from 'paralio'
import { resolve } from 'path'
import fs from 'fs-extra'
import inq from 'inquirer'

type Output = [string, string[]]
class App extends Paralio<string, Output> {
  out_stream: fs.WriteStream
  len = 0
  write_buffer: Output[] = []

  constructor(input: string[]) {
    super({
      input,
      workerPath: resolve(__dirname, 'worker'),
      repl: false,
    })

    this.out_stream = fs.createWriteStream(resolve(__dirname, 'out.json'), {
      autoClose: false,
      encoding: 'utf8',
    })
    this.out_stream.writable && this.out_stream.write('{\n')
  }

  write() {
    return new Promise((res, rej) => {
      this.write_buffer = this.write_buffer.concat(this.output)
      this.output = []
      if (this.out_stream.writable) {
        let acc = ''
        let data

        while ((data = this.write_buffer.pop())) {
          if (!data[1].length) continue
          acc += `  "${data[0]}": ${JSON.stringify(data[1])}${
            this.len === this.input.length && this.write_buffer.length === 0
              ? ''
              : ','
          }\n`
        }
        this.out_stream.write(acc, err => (err ? rej(err) : res()))
      }
    })
  }
}
const URLS = [
  'https://dictionary.cambridge.org/browse/english/c/c-f/',
  // 'https://dictionary.cambridge.org/browse/english/c/cable-stitch/',
  // 'https://dictionary.cambridge.org/browse/english/c/caesium/',
  // 'https://dictionary.cambridge.org/browse/english/c/calamitous/',
  // 'https://dictionary.cambridge.org/browse/english/c/calibrate/',
  // 'https://dictionary.cambridge.org/browse/english/c/call-on-sb/',
  // 'https://dictionary.cambridge.org/browse/english/c/callose/',
]

const getLinks = () =>
  new Promise<string[]>((res, rej) => {
    try {
      const linker = new Paralio({
        repl: false,
        workerPath: resolve(__dirname, 'linker'),
        input: URLS,
      })

      linker.on('end', a =>
        res(a.output.reduce((acc: string[], ws) => acc.concat(ws), []))
      )
    } catch (err) {
      rej(err)
    }
  })
;(async function main() {
  console.time('t')
  const status = new inq.ui.BottomBar()
  const urls: string[] = await getLinks().catch(err => {
    console.error(`Error fetching word urls; ${err}`)
    process.exit(1)
    return []
  })

  // -------- Get words from the sites -------- //

  const app = new App(urls)

  // @ts-ignore
  app.on('data', ([data, app]: [Output, App]) => {
    app.len++
    if (data[1].length) {
      status.updateBottomBar(
        `[${app.len}/${app.input.length}] Fetched ${data[0]}`
      )
    }

    if (app.len % 100 === 0) app.write()
  })

  // @ts-ignore
  app.on('end', async (app: App) => {
    await app.write()
    app.out_stream.write('}', app.out_stream.end)
    console.timeEnd('t')
    console.log(`${app.len} words aggregated`)
  })
})()
