import { Worker } from 'paralio'
import axios from 'axios'
import { httpAgent } from './consts'
import cheerio from 'cheerio'
new (class extends Worker<string> {
  onMount() {
    console.log(`[Worker ${process.pid}]> Mounted`)
  }
  async onMessage(root_url: string) {
    console.log(`Getting words from ${root_url}`)
    const html: string | null = await axios({
      url: root_url,
      method: 'GET',
      httpAgent,
    })
      .then(r => r.data)
      .catch(err => {
        console.error(`Error fetching the html; ${err}`)
        return null
      })

    if (!html) return process.exit(1)

    const doc = cheerio.load(html)

    return doc(`li.han.t-i > a`)
      .toArray()
      .reduce((acc: string[], a) => {
        if (cheerio('span.pos', a).text() !== 'idiom')
          acc.push(a.attribs['href'])
        return acc
      }, [])
  }
})()
