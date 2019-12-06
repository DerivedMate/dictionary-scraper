import { Worker } from 'paralio'
import axios from 'axios'
import { httpAgent } from './consts'
import cheerio from 'cheerio'

new (class extends Worker<string> {
  onMount() {
    console.log(`[Worker ${process.pid}]> Mounted`)
  }
  async onMessage(url: string) {
    const html = await axios({
      method: 'GET',
      httpAgent,
      url,
    })
      .then(r => r.data)
      .catch(err => {
        console.error(`Error fetching ${url}; ${err}`)
        return null
      })

    if (!html) return null
    const doc = cheerio.load(html)
    const category = doc('.pos.dpos')
      .toArray()
      .reduce(
        (acc, s) => {
          const type = s.children[0].data
          if (type && !acc.some(c => c == type)) acc.push(type)
          return acc
        },
        [] as string[]
      )
    const word = doc('.hw.dhw').first().text()
    return [word, category]
  }
})()
