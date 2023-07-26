
const bitcoin = require('bitcoinjs-lib')
const zmq = require('zeromq')
const Client = require( 'bitcoin-core')
const crypto = require( 'crypto')
require('dotenv').config( { path: process.env.PWD + "/.env", } ) // reads .env file with BITCOIN_NETWORK . https://github.com/motdotla/dotenv
require('dotenv').config( { path: process.env.PWD + "/" + process.env.BITCOIN_NETWORK + ".env", } ) // reads .env file with parameters. https://github.com/motdotla/dotenv
const fs = require( 'fs') // sync file reading: https://www.dev2qa.com/node-js-read-write-file-examples/
const path = require( 'path')
const { MongoClient } = require('mongodb')
const assert = require('assert')
const { ObjectID } = require('mongodb')

const common = require('../lib/common')


console.log("memory:", process.memoryUsage())

//let lastdbblock

const network = process.env.BITCOIN_NETWORK == 'mainnet' ? bitcoin.networks.bitcoin : bitcoin.networks.testnet

let coins = []
let mongo_client
let db

const start_time = new Date()

async function start() {
  const MONGO_DB = process.env.DB_HOST
// https://mongodb.github.io/node-mongodb-native/3.2/tutorials/connect/authenticating/
  const user = encodeURIComponent('bapp_user')
  const password = encodeURIComponent('secretpass4bapp_user')
  const authMechanism = 'DEFAULT'
  const url = `mongodb://${user}:${password}@localhost:27000/?authMechanism=${authMechanism}`
  // https://www.shapeblock.com/docker-mongodb/
  // https://hackernoon.com/securing-mongodb-on-your-server-1fc50bd1267b

  try {
    mongo_client = await MongoClient.connect(MONGO_DB, { useNewUrlParser: true, useUnifiedTopology: true })
    db = mongo_client.db() // db('mydb1').collection('foo')
  } catch (error) {
    console.log(`
      Mongo DB Host not found!
      =====> export DB_HOST=mongodb://localhost:27000/admin
    `)
    console.log("error:", error)
    process.exit(1)
  }
  await db.collection('block').remove,({})
  await db.collection('tx').remove,({})
  await db.collection('coin').remove,({})
  //process.exit(1)

  load_blockchain()
}

start()


function process_config_file() {
    let settings = {}
    let content = fs.readFileSync('./linearize.cfg', 'utf8')
    if (!content) {
        console.log("linearize.cfg not found")
        return
    }
    content = content.toString('utf-8')
    content = content.split(/\n/)
    content.forEach(line => {
        if(!/^(\w+)\s*=\s*(\S.*)$/.test(line)) return
        let params = line.split("=")
        settings[params[0].trim()] = params[1].trim()
        //console.log("param:", params[0].trim(),":", params[1].trim())
    })
    
    settings['rev_hash_bytes'] = settings['rev_hash_bytes'] == 'true'

    if(!settings['netmagic']) // testnet '0B110907'
        settings['netmagic'] = 'f9beb4d9'
    if(!settings['genesis'])
        settings['genesis'] = '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f'
    if(!settings['input'])
        settings['input'] = 'input'
    if(!settings['hashlist'])
        settings['hashlist'] = 'hashlist.txt'
    if(!settings['out_of_order_cache_sz'])
        settings['out_of_order_cache_sz'] = 100 * 1000 * 1000 // 100MB
    settings['debug_output'] = settings['debug_output'] == 'true'
    settings['out_of_order_cache_sz'] = parseInt(settings['out_of_order_cache_sz'])

    return settings
}
 
// When getting the list of block hashes, undo any byte reversals.
function get_block_hashes(settings) {
    let blkindex = []
    let content
    try {
        content = fs.readFileSync(settings['hashlist'], 'utf8')
    } catch (e) {
        return blkindex
    }
    if (!content) {
        console.log(settings['hashlist'], " not found")
        return blkindex
    }
    content = content.toString('utf-8')
    content = content.split(/\n/)
    content.forEach(hash => {
        if(hash.length > 0)
            blkindex.push(hash)
    })
    return blkindex
}

// The block map shouldn't give or receive byte-reversed hashes.
function mkblockmap(blkindex) {
    let blkmap = {}
    blkindex.forEach( (hash, height) => {
        blkmap[hash] = height
    })
    return blkmap
}


let count_utoxs = 0
let count_spends = 0

function BlockDataCopier(settings, blkindex, blkmap) { 
    let offset = 0
    let inFn = 0
    let inF = null
    let blkCountIn = 0
    let blkCountOut = 0
    // Extents and cache for out-of-order blocks
    let blockExtents = {}
    let outOfOrderData = {}
    let outOfOrderSize = 0 // running total size for items in outOfOrderData
    let blocksNum = Object.keys(blkindex).length

    function inFileName(fn) { // fn = file number.
        const fileName = `blk${(""+fn).padStart(5, '0')}.dat`
        return path.join(settings['input'], fileName)
    }

    function fetchBlock(extent) {  // Fetch block contents from disk given extents
        let buffer = new Buffer(extent.inLen)
        if(extent.fn != inFn) { 
            let fd = fs.openSync(extent.fn, 'rb')
            let readCount = fs.readSync(fd, buffer, null, extent.inLen, extent.offset)
            fs.closeSync(fd)
            if(readCount < extent.inLen) 
                console.log("Reading ", readSync, "/", extenst.inLen, "file:", extent.fn, " offset:", offset)
            return buffer
        } else { // no need to read the file again.
            return fs.readSync(inF, buffer, null, extent.inLen, extent.offset) 
        }
    }

    async function recoverBlock() { // block was read ahead of time and saved.
        const extent = blockExtents[blkCountOut]
        delete blockExtents[blkCountOut]
        if(outOfOrderData[blkCountOut]) { // If the data is cached, use it from memory and remove from the cache
            rawblock = outOfOrderData[blkCountOut]
            delete outOfOrderData[blkCountOut]
            outOfOrderSize -= rawblock.length
        } else{ // rawBlock not saved cause there wasn't enough memory.
            rawblock = fetchBlock(extent)
        }
        console.log("recoverBlock:",extent.blkHeight, "hash, blk_hdr, rawblock", extent.hash, extent.blk_hdr.length, rawblock.length)
        console.log("block:", extent.blkHeight)
        await processBlock(extent.hash, extent.blk_hdr, rawblock, extent.blkHeight)
    }

    async function run() {
        const batch = 100
        let start = new Date()
        console.log("blkCountOut:", blkCountOut, "blocksNum:", blocksNum)
        while(blkCountOut < blocksNum) { // we process all but the last one (so we have nexthash)

            //console.log("while countIn: ", blkCountIn, "countOut:", blkCountOut, "inFn:", inFn)
            if(!inF) {
                const fname = inFileName(inFn)
                console.log("Input file ", fname)
                try {
                    inF = fs.openSync(fname, 'r')
                    offset = 0
                } catch(e) {
                    console.log("Premature end of block data", fname, e)
                    return
                }
            }

            const inhdr = readSlice(8)
            if (!inhdr) { // || inhdr.slice(0, 1).toString('hex') == '00') {
                console.log("inFn incremented:", inFn)
                fs.closeSync(inF)
                inF = null
                inFn += 1
                continue
            }
            const inMagic = inhdr.slice(0, 4) 
            if (inMagic.toString('hex') != settings['netmagic']) {
                console.log("Invalid magic: ", inhdr.toString('hex'), "file:", inFn, "(",offset,")", "netmagic:", settings['netmagic'])
                continue
            }
            const inLenLE = inhdr.readUInt32LE(4)
            inLen = inLenLE - 80 // length without header
            const blk_hdr = readSlice(80) 
            hash = hash256(blk_hdr)
            if(!blkmap.hasOwnProperty(hash)) { // Because blocks can be written to files out-of-order as of 0.10, the script
                // may encounter blocks it doesn't know about. Treat as debug output.
                //if(settings['debug_output']) 
                console.log("Skipping unknown hash ", hash)
                offset += inLen
                continue
            }
            const blkHeight = blkmap[hash]

            //console.log("run block:", blkHeight, "blkCountOut:", blkCountOut)
            //if(blkHeight == 162) process.exit()

            blkCountIn += 1

            if(blkHeight % batch == 0) { 
                console.info("block", blkHeight, "processed in", (new Date() - start)/1000/batch, "s.")
                start = new Date()      
            }

            if(blkCountOut == blkHeight) { // If in-order block, just copy
                rawblock = readSlice(inLen)
                await processBlock(hash, blk_hdr, rawblock, blkHeight)
                // See if we can catch up to prior out-of-order blocks
                while(blockExtents[blkCountOut]) // let's say we just processed the 4th block. maybe block 5 is in blockExtents.
                    recoverBlock()
            } else { // If out-of-order, skip over block data for now
                process.stdout.write(blkHeight + "")
                blockExtents[blkHeight] = { inFn, offset, hash, blk_hdr, inLen, blkHeight }
                if(outOfOrderSize < settings['out_of_order_cache_sz']) {
                    // If there is space in the cache, read the data
                    // Reading the data in file sequence instead of seeking and fetching it later is preferred,
                    // but we don't want to fill up memory
                    outOfOrderData[blkHeight] = readSlice(inLen)
                    outOfOrderSize += inLen
                } else { // If no space in cache, seek forward
                    console.log("no space in cache")
                    offset += inLen
                }
            }
        }
        console.log("count_utoxs:", count_utoxs)
        console.log("count_spends:", count_spends)
        
        console.log("(Date.now() - start:", (Date.now() - start_time)/1000)
    }

    run()

    async function processBlock(hash, blk_hdr, rawblock, height) {
        //console.log(FgYellow, "        processing blk", height, "blockchain 2")
        blkCountOut += 1
        /*if(lastdbblock.height > height) {
            await sleep(10)
            return
        }*/
        let block
        try {
            block = bitcoin.Block.fromBuffer(Buffer.concat( [ blk_hdr, rawblock ]))
            //common.pprint("block:", block)
            //process.exit()
            //if(!block.transactions) console.log("------------- bloque empty:", block)
            //assert(!!block)
        } catch(e) {
            console.log("Error height:", height, "blk_hdr:", "hash:", hash, "rawblock:", rawblock, e)
            return
        }
        let txs = []
        
        block.transactions.forEach( async function(tx)  {
            let tx_id = tx.getId()
            if(tx_id == 'e3bf3d07d4b0375638d5f1db5255fe07ba2c4cb067cd81b84ee974b6585fb468' || tx_id == 'd5d27987d2a3dfc724e359870c6644b40e497bdc0589a033220fe15429d88599') return
            tx.outs.forEach( async function(vout, index) { // utxo 
                //console.log("vout:  ", vout)
                try {
                    let address = bitcoin.address.fromOutputScript(vout.script, network)
                    if(!!address) {
                        //console.log("utxo: tx_id + index:", tx_id + index)
                        await add_coin( {
                            insertOne: { //
                                document: { _id: tx_id + index, utxo_tx: tx_id, utxo_n: index, address, 
                                    utxo_time: block.timestamp, utxo_height: height, value: vout.value, spent_tx: null } }
                        })
                    }
                } catch (e) { // console.log("====> OP_return found")
                  if(!!e.ERROR && !e.ERROR.contains('OP_CHECKSIG has no matching Address') && !e.ERROR.contains('OP_RETURN'))
                    console.log("utxo error: ", e)
                }
            })
            tx.ins.forEach( async function(vin) { // spend
                if(vin.index == 4294967295) return
                let vin_id = vin.hash.reverse().toString('hex')
                //console.log("vin_id + vin.index:", vin_id + vin.index)
                //console.log("tx.txid:", tx.txid, "vin:", vin)
                await add_coin( {
                  updateOne: { // it should already be in db from mempool.
                    filter: { _id: vin_id + vin.index }, //, utxo_tx: vin_id, utxo_n: vin.index },
                    update: { $set: { spent_tx: tx_id, spent_time: block.timestamp, spent_height: height } }
                  } 
                })
            })
            txs.push({
                insertOne: {
                    document: { _id: tx_id, locktime: tx.locktime, block_height: height } 
                }
            })
            if(txs.length > 1000) {
                if(!!coins.length) {
                    console.log(" * * *process_block  > 1000 * * * calling bulkWrite & update_balances with ", coins.length, " coins.", coins)
                    const coins_copy = [...coins]
                    coins.length = 0
                    await db.collection('coin').bulkWrite(coins_copy)
                    await update_balances(coins_copy, is_bulk)
                }
                const txs_copy = [...txs]
                txs.length = 0
                await db.collection('tx').bulkWrite(txs_copy)
            }
        })
        if(!!coins.length) {
            const coins_copy = [...coins]
            coins.length = 0
            await  db.collection('coin').bulkWrite(coins_copy)
            await update_balances(coins_copy)
        }

        if(txs.length) {
            const txs_copy = [...txs]
            txs.length = 0
            await db.collection('tx').bulkWrite(txs_copy)
        }
        const newBlock = { _id:block.hash, prevhash:block.previousblockhash, nexthash:block.nextblockhash, 
                    height:block.height, time:block.time, mediantime:block.mediantime, processed: new Date()}
        await db.collection('block').insertOne( newBlock )
        //const count = await db.collection('coin').countDocuments()
        //console.log("coins in db:", count)
        // update previous block's nexthash
        await db.collection('block').updateOne({_id: block.previousblockhash}, { $set: { nexthash: block.hash} })
        //console.log("end of processblock:", block.height)
    }


    // add_coind
    async function add_coin(coin) {
        //console.log("coin:", JSON.stringify(coin))
        //console.log("coin:", coin)
        //console.log("")
        //if(!!coin.insertOne) console.log( `adding insert:" ${coin.insertOne.document._id} coins@:${coins.length+1}`)
        //else console.log(`adding update:" ${coin.updateOne.filter._id} coins@:${coins.length+1}`)
        coins.push(coin)
        if(coins.length > 80000) {
            const coins_copy = [...coins]
            coins.length = 0
            await db.collection('coin').bulkWrite(coins_copy) // 1st we insert txs & coins 
            await update_balances(coins_copy)
        }
        if(!!coin.insertOne) count_utoxs++
        else count_spends++
    }

    async function update_balances(coins) {
        coins.forEach(async function(coin) { // now we update balances of bapp addresses
            if(!!coin.insertOne) { // utxo
                const address = await db.collection('address').findOne( { _id: coin.insertOne.document.address } ) // ??? remove this call???
                if(!!address) {
                    const newCoin = { _id: coin.insertOne.document.utxo_tx + coin.insertOne.document.utxo_n, time: coin.insertOne.document.utxo_time,
                                    value: coin.insertOne.document.value, height: coin.insertOne.document.utxo_height, addressId: address._id, addressName: address.name,
                                    ...!!coin.insertOne.document.utxo_concept  && { concept: coin.insertOne.document.utxo_concept },
                                    ...!!coin.insertOne.document.utxo_icon  && { icon: coin.insertOne.document.utxo_icon } }
                    await wallet_address_update_balance(address, newCoin) // maybe just this call to db???
                    if(!!address.isLightning)
                        await db.collection('lightning').updateOne({_id: ObjectID(address.parentId)}, { $set: { height: block.height } })
                }
            } else if(!!coin.updateOne.update.$set.spent_tx) { // spend
                const coin_db = await db.collection('coin').findOne( { _id: coin.updateOne.filter.utxo_tx + coin.updateOne.filter.utxo_n } ) // received an spend.
                if(coin_db) {
                    const address = await db.collection('address').findOne( { _id: coin_db.address} ) // ??? remove???
                    if(!!address) {
                        const newCoin = { _id: coin.updateOne.filter.utxo_tx + coin.updateOne.filter.utxo_n + "_", time: coin.updateOne.update.$set.spent_time,
                                        value: -coin_db.value, height: coin.updateOne.update.$set.spent_height, addressId: address._id, addressName: address.name,
                                        ...!!coin.updateOne.update.$set.spent_concept  && { concept: coin.updateOne.update.$set.spent_concept },
                                        ...!!coin.updateOne.update.$set.spent_icon  && { icon: coin.updateOne.update.$set.spent_icon } } 
                        await wallet_address_update_balance(address, newCoin) // balance updated for unconfirmed spents
                    }
                }
            }
        })
    }

    async function wallet_address_update_balance(address, coin) { // confirmed_utxos ???
        if(coin.value < 0 || !!coin.height) { // all but unconfirmed utxos. update address balance
            let cursor = db.collection('coin').aggregate([ // address balance
                { $match: { address: address._id, utxo_height: { "$ne": null }, spent_tx: { "$eq": null } } }, // , spent_tx: { "$eq": null }
                { $group : {_id : "$address", balance : {$sum : "$value"} } }
            ])
            let balance = 0
            if(await cursor.hasNext() ) {
                const item = await cursor.next()
                balance = item.balance
            }
            await db.collection('address').updateOne({_id: address._id}, { $set: {balance: balance} })
        }
        // update wallet balance
        if(!!address.index) { // address belongs to wallet
            coin.walletId = address.parentId
            if(coin.value < 0 || !!coin.height) { // spent or is not unconfirmed utxo -> update wallet balance
                coin.addressindex = address.index
                let cursor = db.collection('address').aggregate([ // wallet's balance
                    { $match: { parentId: address.parentId } },
                    { $group : {_id : "$parentId", balance : {$sum : "$balance"} } }    
                ])
                if(!await cursor.hasNext() ) {
                    console.log("************************************ cursor 2 doesn't have next")
                    console.log("coin:", JSON.stringify(coin))
                    console.log("address:", address)
                }
                const item = await cursor.next()
                await db.collection('wallet').updateOne({_id: ObjectID(address.parentId) }, { $set: { balance: item.balance} })
            }
        }
    }

    function sleep2(ms){
        return new Promise(resolve=>{
            setTimeout(resolve,ms)
        })
    }

    function sleep(seconds) {
        const start = Date.now();
        while ((Date.now() - start) < seconds*1000);
      }

    function hash256( buf ) {
        const hash1 = crypto.createHash('sha256').update(buf).digest()
        const hash2 = crypto.createHash('sha256').update(hash1).digest()
        return hash2.reverse().toString('hex')
    }

    function readSlice (n) {
        let buffer = Buffer.alloc(n)
        var readCount = fs.readSync(inF, buffer, null, n, offset)
        if(readCount < n) {
            console.log("read count < ", n)
            return null
        }
        offset += n
        return buffer
    }

}


async function load_blockchain() {
    console.log("----------------------- Loading Bitcoin Blockchain ------------------------")  
    //lastdbblock = await Block.findOne({}, {sort: {height: -1} })  
    const settings = process_config_file()
    //console.log("settings:", settings)
    const blkindex = get_block_hashes(settings)
    //console.log("blkindex:", blkindex)
    const blkmap = mkblockmap(blkindex)
    //console.log("blkmap:", blkmap) 
    BlockDataCopier(settings, blkindex, blkmap)
}

const Reset = "\x1b[0m"
const Bright = "\x1b[1m"
const Dim = "\x1b[2m"
const Underscore = "\x1b[4m"
const Blink = "\x1b[5m"
const Reverse = "\x1b[7m"
const Hidden = "\x1b[8m"

const FgBlack = "\x1b[30m"
const FgRed = "\x1b[31m"
const FgGreen = "\x1b[32m"
const FgYellow = "\x1b[33m"
const FgBlue = "\x1b[34m"
const FgMagenta = "\x1b[35m"
const FgCyan = "\x1b[36m"
const FgWhite = "\x1b[37m"
//// background
const BgBlack = "\x1b[40m"
const BgRed = "\x1b[41m"
const BgGreen = "\x1b[42m"
const BgYellow = "\x1b[43m"
const BgBlue = "\x1b[44m"
const BgMagenta = "\x1b[45m"
const BgCyan = "\x1b[46m"
const BgWhite = "\x1b[47m"

//  xxd -b blk00000.dat
// educob bug issues: https://github.com/alecalve/python-bitcoin-blockchain-parser/issues/64
// educob bug issues: https://github.com/bitcoin/bitcoin/issues/14986
