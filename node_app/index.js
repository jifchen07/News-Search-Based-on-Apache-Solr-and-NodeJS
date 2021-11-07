const express = require('express')
const path = require('path')
const fs = require('fs')
const parse = require('csv-parse')
// import fetch from 'node-fetch'
// const fetch = require('node-fetch')

const app = express()
const axios = require('axios')

app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')
app.use(express.json())     // Used to parse JSON bodies
app.use(express.urlencoded({extended: true}))   //Parse URL-encoded bodies, form data

let haveData = false
let isDefaultAlgo = true
let isPageRankAlgo = false
let fileUrlMapping = {}

let lastUrls = []

// parse the csv file to create a filename to url mapping
const parser = parse({columns: true}, function (err, records) {
    // console.log(records)
    records.forEach(function (record) {
        fileUrlMapping[record.filename] = record.URL
    })
    // console.log(fileUrlMapping)
})
fs.createReadStream(path.join(__dirname, 'files/URLtoHTML_nytimes_news.csv')).pipe(parser)

app.get('/', (req, res) => {
    // res.send('Hello World!!!')
    haveData = false
    isDefaultAlgo = true
    isPageRankAlgo = false
    res.render('main', {
        haveData: haveData,
        name: null,
        searchFieldValue: "california",
        isDefaultAlgo: isDefaultAlgo,
        isPageRankAlgo: isPageRankAlgo
    })
})

app.post('/', (req, res) => {
    // console.log(req.body.search_field)
    const inputStr = req.body.searchField
    const keywords = inputStr.trim().split(' ').join("+")
    const searchAlgo = req.body.searchAlgo

    isDefaultAlgo = (searchAlgo == 'default')
    isPageRankAlgo = (searchAlgo == 'pageRank')

    const suffix = (isPageRankAlgo) ? '&sort=pageRankFile+desc' : ''
    const queryUrl = `http://localhost:8983/solr/myexample/select?q=${keywords}${suffix}`

    // fetch(queryUrl).then(res => console.log(res.response.numFound)).then(data => {})
    axios.get(queryUrl)
        .then(resp => {
            const num = Math.min(resp.data.response.numFound, 10)
            haveData = (num > 0) ? true : false
            const topList = resp.data.response.docs.slice(0, num)
            
            let urlList = []
            let desList = []
            for (let i = 0; i < num; i++) {
                if (topList[i].url != null) {
                    urlList.push(topList[i].url)
                } else{ // url field is undefined, need to find url from mapping file
                    const pathElements = topList[i].id.trim().split('/')
                    const filename = pathElements[pathElements.length - 1]
                    const url = fileUrlMapping[filename]
                    if (url != null) {
                        urlList.push(url)
                    } else {
                        urlList.push('url not found')
                    }
                }

                if (topList[i].description != null) {
                    desList.push(topList[i].description)
                } else {
                    desList.push('NA')
                }
            }

            // for calculate the overlaps between two algos
            console.log('\n\n')
            if (isDefaultAlgo) {
                lastUrls = urlList
            } else {
                overlap = 0
                urlList.forEach(url => {
                    if (lastUrls.includes(url)) {
                        overlap += 1
                    }
                })
                console.log(overlap)
            }
            
            urlList.forEach(url => console.log(url))
            
            res.render('main', {
                haveData: haveData,
                name: inputStr,
                searchFieldValue: inputStr,
                topList: topList,
                urlList: urlList,
                desList: desList,
                isDefaultAlgo: isDefaultAlgo,
                isPageRankAlgo: isPageRankAlgo
            })
        })
        .catch(err => console.log(err))

})

const port = process.env.PORT || 3000
app.listen(port, () => console.log(`listening on port ${port}`))
