
const bip39 = require('bip39');
import BIP32Factory from 'bip32';
import ecc from '../libs/noble_ecc';
const bip32 = BIP32Factory(ecc);
const bitcoin = require('bitcoinjs-lib');
import { getTxParameters } from '../utils/bitcoin';
import {logger} from 'react-native-logs';

const log = logger.createLogger();

// blockcypher token: xxx
// rate limits: https://api.blockcypher.com/v1/tokens/xxx
// ?token=xxx

module.exports = {

  networkName: 'main', // main, test3

  setNetwork: (networkName) => {
    if(networkName === 'Testnet') {
      module.exports.networkName = 'test3'
    }
  },

  // fetches address utxos
  getAddressUTXOs: async (addressId) => {// log.debug(`blockcypher getAddressUTXOs: https://api.blockcypher.com/v1/btc/${module.exports.networkName}/addrs/${addressId}?unspentOnly=true&token=xxx`)
    const raw = await fetch(
      `https://api.blockcypher.com/v1/btc/${module.exports.networkName}/addrs/${addressId}?unspentOnly=true&token=xxx`
    )
    const res = await raw.json()
    const utxos = []
    log.debug(`blockcypher getAddressUTXOs res: ${JSON.stringify(res, null, 4)}`)
    if (res.txrefs) {
      for (const tx of res.txrefs) {
        const confirmed = new Date(tx.confirmed).getTime() / 1000
        const utxo = {
          addressId,
          confirmations: tx.confirmations,
          confirmed,
          hash: tx.tx_hash,
          height: tx.block_height,
          output_n: tx.tx_output_n,
          value: tx.value
        }
        utxos.push(utxo)
      }
    }
    //log.debug(`blockcypher getAddressUTXOs utxos: ${JSON.stringify(utxos, null, 4)}`)
    return utxos
  },

  getAddressBalance: async (addressId) => { 
    //log.debug(`getAddressBalance https://api.blockcypher.com/v1/btc/${module.exports.networkName}/addrs/${addressId}?token=xxx`)
    const raw = await fetch(
      `https://api.blockcypher.com/v1/btc/${module.exports.networkName}/addrs/${addressId}?token=xxx`
    )
    const address = await raw.json()
    //log.debug(`getAddressBalance address: ${JSON.stringify(address, null, 4)}`)
    if(address.error) {
      console.log("address:", address)
      return { confirmed: -1, unconfirmed: -1 }
    }
    return { confirmed: address.balance, unconfirmed: address.unconfirmed_balance }
  },

  // fetches Miner Fees
  getFees: async () => {
    if(module.exports.networkName === 'test3')
      return { high: 4, low: 2, medium: 3 }
    // Mainnet
    try {
      const raw = await fetch(`https://api.blockcypher.com/v1/btc/${module.exports.networkName}?token=xxx`);
      const res = await raw.json();

      return {
        low: parseInt(res.low_fee_per_kb / 1000),
        medium: parseInt(res.medium_fee_per_kb / 1000),
        high: parseInt(res.high_fee_per_kb / 1000)
      }
    } catch (_) {
      return {
        low: -1,
        medium: -1,
        high: -1
      };
    }
  },

  async broadcastTx(tx) {
    const url = `https://api.blockcypher.com/v1/btc/${module.exports.networkName}/txs/push?token=xxx`
    const body = { tx }
    const res = await module.exports.post(url, body, true)
    log.debug(`blockcypher broadcastTx res: ${JSON.stringify(res, null, 4)}`)
    return res
  },


  // call Blockcypher
  async post(url, body, debug=false) {
    try {
      return fetch(url, { 
        method: 'post', 
        body: JSON.stringify( body ), 
        headers: { 
          'Content-Type': 'application/json'
        }, 
      }).then(res => res.json()) 
      .then(json => {
        if(!!debug)
          console.log("Blockcypher Post:", url, "json:", json)
        return json
      })
    } catch(err) {
      console.log(`Blockcypher post(${url}):`, body)
      console.log("Error:", err)
      return false
    }
  },

  async fundAddress(addressId, satoshis=12100) { log.debug(`blockcypher fundAddress addressId: ${addressId}`)
    const mnemonic = "enseñar nítido pellejo"
    const passphrase = 'pass111'
    const addr1 = 'tb1q5rhxtc30s8jkmnj3lnf00nu4ellajmdt2t5r8x'

    log.debug('next line will show modue.exports.networkName')
    log.debug(`fundAddress networkName: ${module.exports.networkName}`)
    log.debug(`Calling now getAddressUTXOs for addr: ${addr1}`)
    const all_utxos = await module.exports.getAddressUTXOs(addr1)
    log.debug(`faucet utxos:", ${all_utxos.length}`)
    //const all_utxos = [ {"addressId": "tb1q5rhxtc30s8jkmnj3lnf00nu4ellajmdt2t5r8x", "confirmations": 11, "confirmed": 1685275722, "hash": "39aa59725be348ec3401e16c8517abc3e5ce985dd9f7dd89edac5c0366894abf", "height": 2435759, "output_n": 0, "value": 1000}, {"addressId": "tb1q5rhxtc30s8jkmnj3lnf00nu4ellajmdt2t5r8x", "confirmations": 11, "confirmed": 1685275722, "hash": "0b552f998b0dbd7aa185fff0c5e3a7e05397109e4fe2b7803efa422faa410fb9", "height": 2435759, "output_n": 0, "value": 9149}, {"addressId": "tb1q5rhxtc30s8jkmnj3lnf00nu4ellajmdt2t5r8x", "confirmations": 20, "confirmed": 1685269821, "hash": "0300e3e02081ec91d3f2c3603f49b4f080b5607cddd9219bd71ac1ec239b0ef9", "height": 2435750, "output_n": 1, "value": 12314}, {"addressId": "tb1q5rhxtc30s8jkmnj3lnf00nu4ellajmdt2t5r8x", "confirmations": 20, "confirmed": 1685269821, "hash": "dc2fc53438bd6ca38a56534903cc9220b0b65d4d5c6985f7277c65f57d3272d3", "height": 2435750, "output_n": 0, "value": 1000}, {"addressId": "tb1q5rhxtc30s8jkmnj3lnf00nu4ellajmdt2t5r8x", "confirmations": 20, "confirmed": 1685269821, "hash": "3cafa1377da74127088d6555ec03e31ba95bd62441517870399de1ff49b2bf75", "height": 2435750, "output_n": 0, "value": 7000}, {"addressId": "tb1q5rhxtc30s8jkmnj3lnf00nu4ellajmdt2t5r8x", "confirmations": 48, "confirmed": 1685245981, "hash": "e23fbe05fc0833bae13cf46f39e37258e5ca2e8b0a927ba1e3febcce51cd39e5", "height": 2435722, "output_n": 3, "value": 3822401}, {"addressId": "tb1q5rhxtc30s8jkmnj3lnf00nu4ellajmdt2t5r8x", "confirmations": 94, "confirmed": 1685211931, "hash": "cb343322b41c3240ab1bfc2efd0748a4bdf312d281bedd50c557c3f5604ebffa", "height": 2435676, "output_n": 1, "value": 8937}, {"addressId": "tb1q5rhxtc30s8jkmnj3lnf00nu4ellajmdt2t5r8x", "confirmations": 94, "confirmed": 1685211931, "hash": "61742e83db057010c878d764491aff6c694c1e246aad177a5eb06670ced90268", "height": 2435676, "output_n": 1, "value": 1000}, {"addressId": "tb1q5rhxtc30s8jkmnj3lnf00nu4ellajmdt2t5r8x", "confirmations": 94, "confirmed": 1685211931, "hash": "629e89c606ae435e31fd9786b152f2c0fefa136970e24372efba395c6e464c52", "height": 2435676, "output_n": 0, "value": 1000}, {"addressId": "tb1q5rhxtc30s8jkmnj3lnf00nu4ellajmdt2t5r8x", "confirmations": 94, "confirmed": 1685211931, "hash": "8edeae631313331935cabbf8aa6115d492c180d66ad78bab4726278c202cb936", "height": 2435676, "output_n": 1, "value": 6000}]
    //console.log("all_utxos:", JSON.stringify(all_utxos, null, 4))
    let seed = bip39.mnemonicToSeedSync(mnemonic, passphrase) 
  console.log("seed:", seed)
    const network = bitcoin.networks.testnet
    console.log("network:", network)
    const root = bip32.fromSeed(seed, network)
    console.log("root:", root)
    psbt = new bitcoin.Psbt( { network } )
    console.log("psbt:", psbt)
    // recipient
    psbt.addOutput({ address: addressId, value: satoshis })
    const keyPair = root.derivePath("m/84'/1'/0'/0/0")
    const address = bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey, network }).address
    log.debug(`blockcypher fundAddress faucet address: ${address}`)
    const script = bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey, network }).output
    log.debug(`script created`)
    const { selectedUtxos, change } = getTxParameters( all_utxos, [ { address: addressId, satoshis } ], 'P2WPKH', 1, 'tb1q5rhxtc30s8jkmnj3lnf00nu4ellajmdt2t5r8x')    

    log.debug(`getTxParameters change ${change}`)
    // change
    if(!!change) {
      psbt.addOutput({ address: addr1, value: change })
    }
    selectedUtxos.forEach( utxo => {
      psbt.addInput({ hash: utxo.hash, index: utxo.output_n,  
        witnessUtxo: {
          script, 
          value: utxo.value,
        }
      }) 
    })
    let count = 0
    selectedUtxos.forEach( _ => {
      psbt.signInput(count, keyPair)
      count++
    })
    psbt.finalizeAllInputs()  
    
    const tx = psbt.extractTransaction()
    const size = tx.virtualSize()
    log.debug(`tx.virtualSiz: ${size}`)  
    const tx_hex = tx.toHex()
    const broadcastRes = await module.exports.broadcastTx(tx_hex)
    log.debug(`blockcypher broadcastRes: ${broadcastRes}`)
    return broadcastRes
  },

}
