import * as bip39 from 'bip39';
import * as bitcoin from 'bitcoinjs-lib';
import BIP32Factory from 'bip32';
import ecc from '../libs/noble_ecc';
const bip32 = BIP32Factory(ecc);
import sha256 from "js-sha256"
import varuint from 'varuint-bitcoin'

import { callMother } from './util'
import { store } from '../store/store'
import { setInheritance } from '../store/user/slice';
import { setFee, setFeeNextUpdate } from '../store/app/slice';
import { Storage } from '../utils/Storage';
import blockchain from '../utils/blockchain'
import { futureDate } from '../utils/util'

module.exports = {
  network: bitcoin.networks.bitcoin, // default value. change to testnet/regtest in core.init()
  networkName: 'Mainnet', // default value

  setNetwork(networkName) { 
    blockchain.setNetwork(networkName)
    // by default is mainnet. Set if different
    if(networkName == 'Testnet') {
      module.exports.networkName = 'Testnet'
      module.exports.network = bitcoin.networks.testnet
    } else if(networkName == 'Regtest') {
      module.exports.networkName = 'Regtest'
      module.exports.network = bitcoin.networks.regtest
    }

  },

  checkBalance: async () => { //console.log("checking Balance")
    const inheritances = store.getState().user.inheritances
    const withScriptAddressId = Object.values(inheritances).filter(inh => !!inh.scriptAddressId)
    //console.log("withScriptAddressId:", withScriptAddressId)
    for(const inheritance of withScriptAddressId) {
      //console.log("runJobs inheritance:", inheritance) 
      // check BALANCE changes.  
      const balance = await module.exports.getAddressBalance(inheritance.scriptAddressId)
      console.log("balanceJob:", balance)
      if(!balance) return
      if(balance.confirmed == -1) continue // error from blockcypher
      if(balance.confirmed !== inheritance.balance || balance.unconfirmed !== inheritance.unconfirmed) {
        console.log("new balance for: ", inheritance.name, inheritance.balance, inheritance.unconfirmed, ' -> ', balance )
        let copy = JSON.parse(JSON.stringify(inheritance))
        copy.balance = balance.confirmed
        copy.unconfirmed = balance.unconfirmed
        // with !!balance.unconfirmed just update balance
        if(!!balance.unconfirmed) { 
          store.dispatch(setInheritance( copy ));
          await Storage.setInheritances(store.getState().user.inheritances)        
        // balance.unconfirmed == 0: new psbt
        } else {
          await updateHeirsPsbt(copy)
        }
      }
    }
  },

  // psbt has already been generated. Now it checks that psbtHash is updated. If so: callMother('updatePsbt'
  // so the process of generating psbt and updatePsbt in mother is separated and the later repeated until success
  checkPsbtHash: async () => { //console.log("checking PsbtHash")
    const token = store.getState().user.token
    const inheritances = store.getState().user.inheritances
    for(const inheritance of Object.values(inheritances)) {
      if(inheritance.psbtHash === 'updateme') {
        console.log("inheritance.psbtHash === 'updateme")
        const psbtValue = copy.psbt === null ? null : `"${copy.psbt}"`;
        const body = `mutation { updatePsbt ( inheritanceId: "${inheritance._id}", psbt: ${psbtValue}, token: "${token}" ) }`
        const response = await callMother('updatePsbt', body) // , token)
        //console.log("response:", response)
        if(!!response) {
          const copy = JSON.parse(JSON.stringify(inheritance))
          copy.psbtHash = sha256(copy.psbt)
          copy.psbtUpdate = (new Date()).toString()
          store.dispatch(setInheritance( copy ));
          const newInheritances = store.getState().user.inheritances
          await Storage.setInheritances(newInheritances)
        }
      }  
    }
  },

  createHeirsPsbt: async (inheritance) => { //console.log("createHeirsPsbt called:", inheritance.scriptAddressId)
    const utxos = await module.exports.getAddressUTXOs(inheritance.scriptAddressId)
    if(!utxos.length) return null
    const fees = await module.exports.getFees()
    store.dispatch(setFee( fees.high )) 
    await Storage.setNumber('fee', fees.high) 
    // feeNextUpdate
    const feeNextUpdate = futureDate(1, true)
    store.dispatch(setFeeNextUpdate(feeNextUpdate))
    await Storage.set('feeNextUpdate', feeNextUpdate)
    const { keypair, output, witness } = await module.exports.createInheritanceScript(inheritance)
    const psbt = module.exports.buildHeirsTx(utxos, output, witness, inheritance.beneficiaries, 2) // fees.high * 2)
    module.exports.singInputs(psbt, keypair)
    return psbt
  },

  // checks one per day if fees have changed enough to create new psbt.
  checkFees: async () => { //console.log("checkFee called:")
    const fee = store.getState().app.fee
    if(!fee) return

    const feeNextUpdate = store.getState().app.feeNextUpdate
    if(new Date() < new Date(feeNextUpdate)) return 

    const newFeeNextUpdate = futureDate(1, true)
    store.dispatch(setFeeNextUpdate(newFeeNextUpdate))
    await Storage.set('feeNextUpdate', newFeeNextUpdate)
    console.log("feeeeee:", fee, feeNextUpdate, newFeeNextUpdate)

    const fees = await module.exports.getFees()
    // if fee is less than half or more than double update psbt
    if( (fees.high > fee / 2) && (fees.high < fee * 2) ) return

    const inheritances = store.getState().user.inheritances
    for(const inheritance of Object.values(inheritances)) {
      await updateHeirsPsbt(inheritance)
    }
    store.dispatch(setFee( fees.high ))
    await Storage.setNumber('fee', fees.high)
  },

  isPsbtPending: (inheritance) => {
    if(!!inheritance.unconfirmed) return true
    if(!!inheritance.psbtHash === 'updateme') return true
    return false
  },

  // to get balance. Final es optimistic for unconfirmed utxo and pessimitic for unconfirmed payment.
  // will use optismitic in inheritnace and pessimistic in send.
  getAddressBalance: async (addressId) => {
    return blockchain.getAddressBalance(addressId)
  },

  // fetches address utxos
  getAddressUTXOs: async (addressId) => {
    return blockchain.getAddressUTXOs(addressId)
  },

  // fetches Miner Fees
  getFees: async () => {
    return blockchain.getFees()
  },

  broadcastTx: async (tx_hex) => {
    return blockchain.broadcastTx(tx_hex)
  },
  
  generateMnemonic: () => { 
    return bip39.generateMnemonic(256)
  },

  checkMnemonic(mnemonic) {
    return bip39.validateMnemonic(mnemonic);
  },
 
  getAddressKeypair(mnemonic, index, passphrase="pass111") { //console.log("getAddressKeypair called:", mnemonic,  index, passphrase)
    const seed = bip39.mnemonicToSeedSync(mnemonic, passphrase)
    const root = bip32.fromSeed(seed, module.exports.network)
    let coin = 0
    if(module.exports.networkName === 'Testnet' || module.exports.networkName === 'Regtest')
      coin = 1
    const keypair = root.derivePath(`m/84'/${coin}'/0'/0/${index}`)
    //const address = bitcoin.payments.p2wpkh({ pubkey: keypair.publicKey, network: module.exports.network }).address
    //console.log("getAddressKeypair address:", address)
    return keypair
  },
 
  async createInheritanceScript(inheritance) {  
    //console.log("createInheritanceScript:", inheritance)
    const mnemonic = await Storage.get('mnemonic')
    const passphrase = await Storage.get('passphrase')
    const keypair = module.exports.getAddressKeypair(mnemonic, inheritance.index, passphrase)
    const testatorPK = keypair.publicKey
    const bitpassKp = Buffer.from(inheritance.kp)
    const script = []
    // inheritance execution path
    script.push(... my bitcoin script here ...
    const redeemScript = bitcoin.script.compile(script) // REDEEM Script
    const p2wsh = bitcoin.payments.p2wsh({ redeem: { output: redeemScript, network: module.exports.network }, network: module.exports.network } )
    const scriptAddressId = p2wsh.address
    const output = p2wsh.output
    const witness = p2wsh.redeem.output
    return { keypair, scriptAddressId, output, witness }
  },  

  buildTestatorTx(utxos, script, witnessScript, recipients, change, changeAddress) {
    //console.log("buildTestatorTx utxos:", utxos)
    const psbt = new bitcoin.Psbt({ network: module.exports.network })  
    
    utxos.forEach( utxo => { // spend utxos
      //console.log("addInput:", { hash: utxo.hash, index: utxo.output_n, value: utxo.value } )
      psbt.addInput({ hash: utxo.hash, index: utxo.output_n,
        witnessScript,
        witnessUtxo: {
          script, 
          value: utxo.value,
        }
      })
    })
    recipients.forEach(recipient => {
      //console.log("addOutput:", { address: recipient.address, value: recipient.satoshis } )
      psbt.addOutput({ address: recipient.address, value: recipient.satoshis })
    })
    // change
    if(!!change) {
      psbt.addOutput({ address: changeAddress, value: change })
    }
    return psbt
  },

  buildHeirsTx(utxos, script, witnessScript, recipients, fee_per_byte) {
    const network = module.exports.network
    const psbt = new bitcoin.Psbt({ network })  
    utxos.forEach( utxo => { // spend utxos
      //console.log("addInput:", { hash: utxo.hash, index: utxo.output_n, value: utxo.value})
      psbt.addInput({ hash: utxo.hash, index: utxo.output_n,
        witnessScript,
        witnessUtxo: {
          script, 
          value: utxo.value,
        }
      })
    })
    // amounts for each heir
    const available_funds = utxos.reduce( (acc, u) => acc + u.value, 0)

    const inputs = {}
    inputs['SCRIPT:108-146'] = utxos.length
    const outputsType = module.exports.getOutputsType(recipients.map(r => r.bitcoinAddress), network)
    const tx_bytes = module.exports.getTxBytes( inputs, outputsType)
    const tx_fee = tx_bytes * fee_per_byte
    const net_amount = available_funds - tx_fee
    let remaining = net_amount
    const outputs = []
    recipients.forEach( (recipient, i) => {// console.log("recipient:", recipient.name, ":", recipient.percentage)
      if( i <= recipients.length - 2) {
        const satoshis = parseInt( net_amount / 100 * recipient.percentage )
        outputs.push( { address: recipient.bitcoinAddress, satoshis } )
        remaining -= satoshis
      } else { // last sibling
        outputs.push( { address: recipient.bitcoinAddress, satoshis: remaining } )
      }
    })
    outputs.forEach(output => { //console.log("output:", output)
      //console.log("inheritance output: ", { address: output.address, value: output.satoshis })
      psbt.addOutput({ address: output.address, value: output.satoshis })
    })
    return psbt
  },

  signTestatorPayment (psbt, keyPair) {  
    const path = { steps: [ { type: "ELSE" }, { type: "SIGNATURE" } ] }
    path.steps[1].sigs = module.exports.singInputs(psbt, keyPair)
    //console.log("path.steps[1].sigs:", path.steps[1].sigs)
    return module.exports.finishPayment(psbt, path)
  },

  singInputs(psbt, keyPair) { //console.log("singInputs called psbt.data:", psbt.data)
    const sigs = []
    ... my bitcoin script signing code.
    return sigs
  },

  finishPayment(psbt, path) { //console.log("finishPayment called:", psbt, path)
    const tx = module.exports.path2Tx(psbt, path)
    const size = tx.virtualSize()
    console.log("Real tx virtual size:", size)
    return tx.toHex()
  },

  // recipients types for getTxBytes
  getOutputsType(addresses, network) { //console.log("getOutputsType addresses:", addresses)
    const outputs = {}
    addresses.forEach(addr => {
      const type = module.exports.getAddressType(addr, network) //; console.log("address type:", type)
      if(!!outputs[type])
        outputs[type]++
      else
        outputs[type] = 1
    })
    return outputs
  },

  // for getTxBytes outputs
  // Adaptation from bitcoin.address.toOutputScript
  getAddressType(address, network) { //    console.log("getAddressType address:", address)
    const FUTURE_SEGWIT_MAX_SIZE = 40;
    const FUTURE_SEGWIT_MIN_SIZE = 2;
    const FUTURE_SEGWIT_MAX_VERSION = 16;
    const FUTURE_SEGWIT_MIN_VERSION = 1;

    let decodeBase58
    let decodeBech32

    try {
      decodeBase58 = bitcoin.address.fromBase58Check(address);
    } catch (err) {} // eslint-disable-line no-empty

    if (decodeBase58) {
      if (decodeBase58.version === network.pubKeyHash) {
        return 'P2PKH';
      }
      if (decodeBase58.version === network.scriptHash) {
        return 'P2SH';
      }
    } else {
      try {
        decodeBech32 = bitcoin.address.fromBech32(address);
      } catch (err) {} // eslint-disable-line no-empty

      if (decodeBech32) {
        if (decodeBech32.prefix !== network.bech32) {
          throw new Error(`${address} has an invalid prefix`);
        }
        if (decodeBech32.version === 0) {
          if (decodeBech32.data.length === 20) {
            return 'P2WPKH';
          }
          if (decodeBech32.data.length === 32) {
            return 'P2WSH';
          }
        } else if (
          decodeBech32.version >= FUTURE_SEGWIT_MIN_VERSION &&
          decodeBech32.version <= FUTURE_SEGWIT_MAX_VERSION &&
          decodeBech32.data.length >= FUTURE_SEGWIT_MIN_SIZE &&
          decodeBech32.data.length <= FUTURE_SEGWIT_MAX_SIZE
        ) {
          throw new Error(`${address} FUTURE_SEGWIT is unkown`);
          //return 'FUTURE_SEGWIT_VERSION';
        }
      }
    }
    throw new Error(`${address} type is unkown`);
  },

  path2Tx(psbt, path, network) { //console.log("path2Tx patthhh:", path) // send script bitcoins
    const steps_reversed = JSON.parse(JSON.stringify(path.steps)).reverse() // copy cause path.steps.reverse screws it.
    function pathF(inputIndex) {
      let script = []
      steps_reversed.forEach(step => {
        ... my bitcoin script path code.
      })
      return bitcoin.script.compile(script)
    }
    for(let i=0; i<psbt.data.inputs.length; i++) { //console.log("****************** finalizing input:", i)
      psbt.finalizeInput(i, module.exports.generate_path_function(pathF, network))
    }
    const tx = psbt.extractTransaction()
    return tx
  },

  generate_path_function(pathF, network) { 
    function getFinalScripts(inputIndex, input, script, isSegwit, isP2SH, isP2WSH) {
      const redeemScript =  { input: pathF(inputIndex), output: script,  network }
      const payment = bitcoin.payments.p2wsh({ redeem: redeemScript, network })
      //console.log("payment:", payment)
    
      function witnessStackToScriptWitness(witness) {
        let buffer = Buffer.allocUnsafe(0)
    
        function writeSlice(slice) {
          buffer = Buffer.concat([buffer, Buffer.from(slice)])
        }
        function writeVarInt(i) {
          const currentLen = buffer.length
          const varintLen = varuint.encodingLength(i)
    
          buffer = Buffer.concat([buffer, Buffer.allocUnsafe(varintLen)])
          varuint.encode(i, buffer, currentLen)
        }
        function writeVarSlice(slice) {
          writeVarInt(slice.length)
          writeSlice(slice)
        }
        function writeVector(vector) {
          writeVarInt(vector.length)
          vector.forEach(writeVarSlice)
        }
        writeVector(witness)
        return buffer
      }
  
      return {
        finalScriptSig: payment.input,
        finalScriptWitness: witnessStackToScriptWitness(payment.witness)
      }
    }
    return getFinalScripts
  },

  // getByteCount({'MULTISIG-P2SH:2-4':45},{'P2PKH':1}) Means "45 inputs of P2SH Multisig and 1 output of P2PKH"
  // getByteCount({'P2PKH':1,'MULTISIG-P2SH:2-3':2},{'P2PKH':2}) means "1 P2PKH input and 2 Multisig P2SH (2 of 3) inputs along with 2 P2PKH outputs"
  getTxBytes(inputs, outputs) { // console.log("getTxBytes inputs:", inputs, "outputs:", outputs)
    var totalWeight = 0
    var hasWitness = false
    var inputCount = 0
    var outputCount = 0
    // assumes compressed pubkeys in all cases.
    var types = {
      // MULTISIG-* do not include pubkeys or signatures yet (this is calculated at runtime)
      // sigs = 73 and pubkeys = 34 (these include pushdata byte)
      'inputs': {
        // SCRIPT-P2WSH. Non-segwit: (txid:32) + (vout:4) + (sequence:4) + (script_len:1) = 41. utxo 
        'SCRIPT': 41 * 4 + 4, // + 4 comes from real txs.

        // Non-segwit: (txid:32) + (vout:4) + (sequence:4) + (script_len:3(max))
        //   + (script_bytes(OP_0,PUSHDATA(max:3),m,n,CHECK_MULTISIG):5) =  51
        'MULTISIG-P2SH': 51 * 4,

        // Segwit: (push_count:1) + (script_bytes(OP_0,PUSHDATA(max:3),m,n,CHECK_MULTISIG):5) = 8. locking script (without pubkeys)
        // Non-segwit: (txid:32) + (vout:4) + (sequence:4) + (script_len:1) = 41. utxo 
        'MULTISIG-P2WSH': 8 + (41 * 4),

        // Segwit: (push_count:1) + (script_bytes(OP_0,PUSHDATA(max:3),m,n,CHECK_MULTISIG):5) = 8
        // Non-segwit: (txid:32) + (vout:4) + (sequence:4) + (script_len:1) + (p2wsh:35) = 76
        'MULTISIG-P2SH-P2WSH': 8 + (76 * 4),

        // Non-segwit: (txid:32) + (vout:4) + (sequence:4) + (script_len:1) + (sig:73) + (pubkey:34)
        'P2PKH': 148 * 4,

        // Segwit: (push_count:1) + (sig:73) + (pubkey:34) = 108
        // Non-segwit: (txid:32) + (vout:4) + (sequence:4) + (script_len:1) = 41
        'P2WPKH': 108 + (41 * 4),

        // Segwit: (push_count:1) + (sig:73) + (pubkey:34) = 108
        // Non-segwit: (txid:32) + (vout:4) + (sequence:4) + (script_len:1) + (p2wpkh:23) = 64
        'P2SH-P2WPKH': 108 + (64 * 4)
      },
      'outputs': {
        // (p2sh:24) + (amount:8)
        'P2SH': 32 * 4,
        // (p2pkh:26) + (amount:8)
        'P2PKH': 34 * 4,
        // (p2wpkh:23) + (amount:8)
        'P2WPKH': 31 * 4,
        // (p2wsh:35) + (amount:8)
        'P2WSH': 43 * 4
      }
    }
    
    function checkUInt53 (n) {
        if (n < 0 || n > Number.MAX_SAFE_INTEGER || n % 1 !== 0) throw new RangeError('value out of range')
    }

    function varIntLength (number) {
      checkUInt53(number)

      return (
        number < 0xfd ? 1
        : number <= 0xffff ? 3
        : number <= 0xffffffff ? 5
        : 9
      )
    }

    Object.keys(inputs).forEach(function(key) {
      checkUInt53(inputs[key])
      if (key.slice(0,6) === 'SCRIPT') {
        var keyParts = key.split(':')
        if (keyParts.length !== 2) throw new Error('invalid input: ' + key)
        var newKey = keyParts[0]
        var scriptAndPath = keyParts[1].split('-').map(function (item) { return parseInt(item) })
        // script & path bytes are obtained after bitcoin.script.compile:
        // const redeemScript = bitcoin.script.compile(script) // REDEEM Script
        // const scriptBytes = redeemScript.length
        totalWeight += types.inputs[newKey] * inputs[key]
        totalWeight += (scriptAndPath[0] + scriptAndPath[1]) * inputs[key]
      } else if (key.slice(0,8) === 'MULTISIG') {
        // ex. "MULTISIG-P2SH:2-3" would mean 2 of 3 P2SH MULTISIG
        var keyParts = key.split(':')
        if (keyParts.length !== 2) throw new Error('invalid input: ' + key)
        var newKey = keyParts[0]
        var mAndN = keyParts[1].split('-').map(function (item) { return parseInt(item) })

        totalWeight += types.inputs[newKey] * inputs[key]
        var multiplyer = (newKey === 'MULTISIG-P2SH') ? 4 : 1
        totalWeight += ((73 * mAndN[0]) + (34 * mAndN[1])) * multiplyer * inputs[key]
      } else { // bitcoin address
        totalWeight += types.inputs[key] * inputs[key]
      }
      inputCount += inputs[key]
      if (key.indexOf('W') >= 0) hasWitness = true
    })

    Object.keys(outputs).forEach(function(key) {
        checkUInt53(outputs[key])
        totalWeight += types.outputs[key] * outputs[key]
        outputCount += outputs[key]
    })

    if (hasWitness) totalWeight += 2

    totalWeight += 8 * 4
    totalWeight += varIntLength(inputCount) * 4
    totalWeight += varIntLength(outputCount) * 4

    return Math.ceil(totalWeight / 4)
  }, // END getTxBytes()

  getTxParameters(utxos, recipients, scriptType, fees_per_byte, changeAddress) { //console.log("getTxParameters called:", scriptType, recipients)
    const network = module.exports.network
    const sendingamount = recipients.reduce( (acc, r) => acc + r.satoshis, 0)
    let selected_utxos_count = 0
    let tx_fee = 0
    let totalSelected = 0
    let change = 0
    let tx_bytes = 0

    function process_utxo(utxo, scriptType, outputsType) { //console.log("processing:", utxo)
      utxo.selected = true
      selected_utxos_count++
      totalSelected += utxo.value
      if(totalSelected >= sendingamount) {
        const inputs = {}
        inputs[scriptType] = selected_utxos_count
        tx_bytes = module.exports.getTxBytes( inputs, outputsType)
        tx_fee = tx_bytes * fees_per_byte
      }
    }

    outputsType = module.exports.getOutputsType(recipients.map(r => r.address), network)
    utxos.every(utxo => {
      process_utxo(utxo, scriptType, outputsType)
      return totalSelected < sendingamount + tx_fee
    })

    if(totalSelected > sendingamount + tx_fee) {      
      ... my coin selection code
    }
    const selectedUtxos = utxos.filter( u => !!u.selected )
    //console.log("selectedUtxos:", JSON.stringify(selectedUtxos, null, 4))
    return { tx_fee, selectedUtxos, change, totalSelected, sendingamount, tx_bytes }
  },

  isAddress(address) {
    try {
      bitcoin.address.toOutputScript(address, module.exports.network)
      return true
    } catch (e) {
      return false
    }
  },

  // testnet, regtest
  async fundTestAddress(addressId, satoshis=100) { // tb1q5rhxtc30s8jkmnj3lnf00nu4ellajmdt2t5r8x
    if(!!module.exports.networkName === 'Maiinnet') {      
      throw new Error("No free bitcoin in Mainnet");
    }
    return blockchain.fundTestAddress(addressId)
  },


}

async function updateHeirsPsbt(inheritance) { //console.log("updateHeirsPsbt called:", inheritance)
  let copy = JSON.parse(JSON.stringify(inheritance))
  copy.psbt = null
  copy.psbtHash = 'updateme'
  const psbt = await module.exports.createHeirsPsbt(inheritance)
  if(!!psbt) {// no utxos
    copy.psbt = psbt.toBase64()
  }
  store.dispatch(setInheritance( copy ));
  await Storage.setInheritances(store.getState().user.inheritances) // end of lines repeated
   
  // now to try to send psbt to mother. Then we update psbtUpdate & psbtHash fields.
  // same code as core.init() so no wait for next init.
  const token = store.getState().user.token
  const psbtValue = copy.psbt === null ? null : `"${copy.psbt}"`;
  const body = `mutation { updatePsbt ( inheritanceId: "${inheritance._id}", psbt: ${psbtValue}, token: "${token}" ) }`
  const response = await callMother('updatePsbt', body,  null, true)
  // if !response checkPsbtHash will eventually update it.
  if(!!response) {
    // copy has already been saved to redux so it can't be modifed
    copy = JSON.parse(JSON.stringify(copy))
    copy.psbtHash = null
    if(!!copy.psbt) {
      copy.psbtHash = sha256(copy.psbt) // now that psbt has been transmitted psbtHash is updated
      copy.psbtUpdate = (new Date()).toString()
    }
    store.dispatch(setInheritance( copy ))
    await Storage.setInheritances(store.getState().user.inheritances)
  }
}

