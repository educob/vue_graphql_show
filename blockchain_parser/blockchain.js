return
import bitcoin from 'bitcoinjs-lib'
import zmq from'zeromq'
import Client from 'bitcoin-core'
import { Wallet, Address, FeePerByte } from '/lib/collections/wallets'
import { Block } from '/lib/collections/blocks'
import crypto from 'crypto'
import { Tx, Coin } from '/lib/collections/tx'
let exec = require('child_process').exec
require('dotenv').config( { path: process.env.PWD + "/.env", } ) // reads .env file with BITCOIN_NETWORK . https://github.com/motdotla/dotenv
require('dotenv').config( { path: process.env.PWD + "/" + process.env.BITCOIN_NETWORK + ".env", } ) // reads .env file with parameters. https://github.com/motdotla/dotenv
import fs from 'fs'
import path from 'path'

// sync file reading: https://www.dev2qa.com/node-js-read-write-file-examples/

const network = process.env.BITCOIN_NETWORK == 'mainnet' ? bitcoin.networks.bitcoin : (process.env.BITCOIN_NETWORK == 'testnet' ? bitcoin.networks.testnet : bitcoin.networks.regtest)

function process_config_file() {
    let settings = {}
    let content = fs.readFileSync('/home/r2d2/tmp/linearize.cfg', 'utf8')
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
    })
    settings['rev_hash_bytes'] = settings['rev_hash_bytes'] == 'true'

    if(!settings['netmagic']) // testnet '0B110907'
        settings['netmagic'] = 'f9beb4d9'
    if(!settings['genesis'])
        settings['genesis'] = '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f'
    
    settings['input'] = '/home/r2d2/vue/linear_blockchain'

    if(!settings['out_of_order_cache_sz'])
        settings['out_of_order_cache_sz'] = 100 * 1000 * 1000
    settings['debug_output'] = settings['debug_output'] == 'true'
    settings['out_of_order_cache_sz'] = parseInt(settings['out_of_order_cache_sz'])

    return settings
}

// When getting the list of block hashes, undo any byte reversals.
function get_block_hashes(settings) {
    let blkindex = []
    let content = fs.readFileSync(settings['hashlist'], 'utf8')
    if (!content) {
        console.log(settings['hashlist'], " not found")
        return
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

function BlockDataCopier(settings, blkindex, blkmap) { 
    let offset = 0
    inFn = 0
    inF = null
    blkCountIn = 0
    blkCountOut = 0
    // Extents and cache for out-of-order blocks
    blocksNum = Object.keys(blkindex).length

    function inFileName(fn) { // fn = file number.
        console.log("creating filename for ", fn)
        const fileName = `blk${(""+fn).padStart(5, '0')}.dat`
        return path.join(settings['input'], fileName)
    }

    run()
    
    function run() {
        const batch = 100
        let start = new Date()
        while(blkCountOut < blocksNum -1) { // we process all but the last one (so we have nexthash)
            if(!inF) {
                const fname = inFileName(inFn)
                console.log("Input file ", fname)
                try {
                    console.log("opening new blk file" )
                    inF = fs.openSync(fname, 'r')
                    offset = 0
                } catch(e) {
                    console.log("Premature end of block data", fname, e)
                    return
                }
            }


            const inhdr = readSlice(8)
            if (!inhdr) { // || inhdr.slice(0, 1).toString('hex') == '00') {
                console.log(" inhdr returned is null")
                fs.closeSync(inF)
                inF = null
                inFn += 1
                continue 
            }
            const inLenLE = inhdr.readUInt32LE(4)
            inLen = inLenLE - 80 // length without header
            const blk_hdr = readSlice(80)
            if(!blk_hdr) console.log("blk_hdr is null")
            hash = hash256(blk_hdr)
            if(!blkmap.hasOwnProperty(hash)) { // Because blocks can be written to files out-of-order as of 0.10, the script
                // may encounter blocks it doesn't know about. Treat as debug output.
                //if(settings['debug_output']) 
                    console.log("Skipping unknown hash ", hash)
                offset += inLen
                continue
            }
            const blkHeight = blkmap[hash]

            blkCountIn += 1

            if(blkHeight % batch == 0) { 
                //console.info("block", blkHeight, "processed in", (new Date() - start)/1000/batch, "s.")
                start = new Date()      
            }

            if(blkCountOut == blkHeight) { // If in-order block, just copy
                rawblock = readSlice(inLen)
                processBlock(hash, blk_hdr, rawblock, blkHeight)
            } else { // If out-of-order, skip over block data for now
                console.log(FgRed, "----------- block ", blkHeight, "out of order:", hash)                
            }
        }
    }

    function processBlock(hash, blk_hdr, rawblock, blkHeight) {
        console.log("Processing blk", blkHeight, hash, "file:", inFn, "blockchain 1")
        blkCountOut += 1
        return

        let block 
        try {
            block = bitcoin.Block.fromBuffer(Buffer.concat( [ blk_hdr, rawblock ]))
console.log("block:", block)
        } catch(e) {
            console.log("Error blkHeight:", blkHeight, "blk_hdr:", "hash:", hash, "rawblock:", rawblock, e)
        }
return
    
        let txs = []
        let coins = []

        block.transactions.forEach( tx => { 
          const tx_id = tx.getId()
          tx.outs.forEach( (vout, index) => { // UTXO
            //console.log("vout:  ", vout)
            let address = bitcoin.address.fromOutputScript(vout.script, network)
            if(!!address) {
              //const utxo = {address: vout.scriptPubKey.addresses[0], utxo_tx: tx.txid, utxo_n: index, value: vout.value, spent_tx:0}
              coins = add_coin(coins, {
                updateOne: { //   
                    filter: { utxo_tx: tx_id, utxo_n: index },
                    update: { $set: { address: address, utxo_time: utcNow(), utxo_height: null, value: vout.value/100000000, spent_tx:null } },
                    upsert: true
                  },
                //utxo: 1 // coment out when loading blockchain. used in update_balances
              })
            }
          })
          tx.ins.forEach( vin => { // SPEND
            if(!vin.coinbase) { // coinbase tx. no utxo spent.
              let vin_id = vin.hash.reverse().toString('hex')
              //console.log("*** spent: vin_id: ", vin_id, ". index: ", vin.index)
              coins = add_coin(coins, {
                updateOne: { 
                    filter: { utxo_tx: vin_id, utxo_n: vin.index },
                    update: { $set: { spent_tx: tx_id, spent_time: utcNow(), spent_height: null  } }
                  },
                //spent: 1 // coment out when loading blockchain 
              })
            }
          })
          txs.push({
            updateOne: {  
              filter: { _id: tx.txid },
              update: { $set: { locktime: tx.locktime, block_height:blkHeight } },
              upsert: true
            }
          })
          if(txs.length == 1000) {
            if(!!coins.length) Coin.rawCollection().bulkWrite(coins)
            coins = []
            Tx.rawCollection().bulkWrite(txs)
            txs = []
          }
        })
        if(!!coins.length) {
          Coin.rawCollection().bulkWrite(coins)
          //update_balances(coins)
        }
        if(!!txs.length) Tx.rawCollection().bulkWrite(txs) 
        const blockPrevHash = block.prevHash.toString('hex')
        //console.log("prevHash.toString('hex'):", blockPrevHash)
        Meteor.call('block.new', [ { _id:hash, prevhash:blockPrevHash, height:blkHeight, nexthash:blkindex[blkHeight+1], time:block.timestamp } ] )
        //Meteor.call('block.setnexthash', [ blockPrevHash, hash ] )

        if([100000, 150000, 200000, 250000, 300000, 350000, 400000, 450000, 500000, 550000].includes(blkHeight)) 
            console.log("Block ", blkHeight, ":", block)
    }

    function readSlice(n) {
        let buffer = new Buffer(n)
        var readCount = fs.readSync(inF, buffer, null, n, offset)
        if(readCount < n) {
            console.log("END OF FILE. read count < ", n)
            return null
        }
        offset += n
        return buffer
    }

    function add_coin(coins, coin) {
        coins.push(coin)
        if(coins.length == 1000) {
          Coin.rawCollection().bulkWrite(coins) // 1st we insert txs & coins
          //update_balances(coins)
          coins = []
        }
        return coins
    }
      
    function update_balances(coins) {
        coins.forEach(coin => { // now we update balances of bapp addresses
            //console.log("coin: ", coin)
            if(!!coin.utxo) {
            Meteor.call('address.update_balance', [ { address: coin.updateOne.update.$set.address } ] )
            //console.log("utxo: coin.updateOne.update.$set.address: ", coin.updateOne.update.$set.address)
            } else if(!!coin.spent) {
            Meteor.call('address.update_balance', [ { utxo_tx: coin.updateOne.filter.utxo_tx, utxo_n: coin.updateOne.filter.utxo_n } ] )
            //console.log("spent: coin.updateOne.filter.utxo: ", coin.updateOne.filter.utxo_tx, coin.updateOne.filter.utxo_n)
            }
        })
    }

    function hash256( buf ) {
        const hash1 = crypto.createHash('sha256').update(buf).digest()
        const hash2 = crypto.createHash('sha256').update(hash1).digest()
        return hash2.reverse().toString('hex')
    }

    function utcNow () {
        return Math.floor(Date.now() / 1000)
    }

}


function run() {
    console.log("----------------------- Loading Bitcoin Blockchain ------------------------")
    const settings = process_config_file()
    //console.log("settings:", settings)
    const blkindex = get_block_hashes(settings)
    //console.log("blkindex:", blkindex)
    const blkmap = mkblockmap(blkindex)
    //console.log("blkmap:", blkmap) 
    BlockDataCopier(settings, blkindex, blkmap)
} 

//  xxd -b blk00000.dat
// 

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


run()