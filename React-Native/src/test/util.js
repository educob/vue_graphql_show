const sb = require("satoshi-bitcoin")
const bip39 = require('bip39');
const bitcoin = require('bitcoinjs-lib');

const { BIP32Factory } = require('bip32')
const ecc  = require( '../libs/noble_ecc_node');
const bip32 = BIP32Factory(ecc);
const varuint = require('varuint-bitcoin')

const managerToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NDhjMmFlMGZjNWZjYTcxZWYwY2EwNmIiLCJuaWNrIjoiUmVndGVzdCIsInJvbGVzIjpbInRoaXJkcGFydHlBZG1pbiJdLCJ0aGlyZHBhcnR5SWQiOiI2NDhjMmFjMWZjNWZjYTcxZWYwY2EwNmEiLCJuZXR3b3JrIjoiUmVndGVzdCIsImRhdGUiOiIyMDIzLTA2LTIzVDA2OjE4OjU4LjY2OVoiLCJpYXQiOjE2ODc1MDExMzh9.O663MDJp_liUfgDoC4vE_V_hiQ_ia8ZFl8Ujp5fYZcU'

module.exports = {
  network: bitcoin.networks.regtest,

  setNetwork: function (networkName) {
    if(networkName === 'Testnet') {
      module.exports.network = bitcoin.networks.testnet
    } 
  },

  // CallMother calls
  async createInheritance(clientId, name, beneficiaries) {
    //console.log("beneficiaries:", JSON.stringify(beneficiaries, null, 4))
    const notes = `notes: ${name}`
    let body = `mutation { saveInheritance ( inheritanceId: null, clientId: "${clientId}", 
                  name: "${name}", beneficiaries: ${module.exports.stringify(beneficiaries)}, notes: "${notes}" ) {
                    _id
                    logEntryId
                  } }`
    const inheritance = await callMother('saveInheritance', body, managerToken)
    //console.log("new inheritance:", inheritance)
    return inheritance
  },

  async updateInheritance(inheritanceId, clientId, name, beneficiaries) {
    //console.log("beneficiaries:", JSON.stringify(beneficiaries, null, 4))
    const notes = `notes: ${name}`
    let body = `mutation { saveInheritance ( inheritanceId: "${inheritanceId}", clientId: "${clientId}", 
                  name: "${name}", beneficiaries: ${module.exports.stringify(beneficiaries)}, notes: "${notes}" ) {
                    _id
                    logEntryId
                  } }`
    const inheritance = await callMother('saveInheritance', body, managerToken)
    //console.log("updated Inheritance:", inheritance)
    return inheritance
  },

  async getInheritances(clientId) {
    let body = `query { inheritances ( clientId: "${clientId}" ) {
      _id
      name
      beneficiaries {
        name
        surname
        percentage
        bitcoinAddress
      }
      index
      psbt
    } }`
    const inheritances = await callMother('inheritances', body, managerToken)
    //console.log("inheritances:", inheritances)
    return inheritances
   },

   async getInheritance(_id) {
    let body = `query { inheritance ( _id: "${_id}" ) {
      _id
      name
      beneficiaries {
        name
        surname
        percentage
        bitcoinAddress
      }
      psbt
      network
    } }`
    const inheritance = await callMother('inheritance', body, managerToken)
    //console.log("inheritance:", inheritance)
    return inheritance
  },

  async resetAppPin(clientId) {
    let body = `mutation { resetAppPin ( clientId: "${clientId}" ) {
      _id
      name
      surname
    } }`
    await callMother('resetAppPin', body, managerToken)
  },

  async installApp(clientId) {
    let body = `mutation { installApp ( clientId: "${clientId}" ) }`
    await callMother('installApp', body, managerToken)
  },

  async clientDeceased(clientId) {
    let body = `mutation { clientDeceased ( clientId: "${clientId}" ) {
      _id
      deceased
    } }`
    return callMother('clientDeceased', body, managerToken)
  },

  // utils ------------------------------ 
  stringify(obj) {
    const json = JSON.stringify(obj);  // {"name":"John Smith"}
    return json.replace(/"([^"]+)":/g, '$1:')
  },

  checkAmountsPercentage(received, percentages, tolerance=10) {
    const total = received.reduce((a, b) => a + b, 0);
    const expected = percentages.map(p => total * p / 100);
    for (let i = 0; i < received.length; i++) {
      if (Math.abs(received[i] - expected[i]) > tolerance) {
          return false;
      }
    }
    return true;
  },

  sing2HeirsTx(inheritance) {
    const seed = bip39.mnemonicToSeedSync('enseñar nítido pellejo', 'pass111')
    const root = bip32.fromSeed(seed, module.exports.network)     
    const psbt = bitcoin.Psbt.fromBase64(inheritance.psbt)
    const keyPair = root.derivePath( `m/84'/1'/0'/0/${inheritance.index}`)
    const sigs2 = []
    const sigs1 = []
    for(let i=0; i< psbt.data.inputs.length; i++) {
      psbt.signInput(i, keyPair)
      const sig1 = psbt.data.inputs[i].partialSig[1].signature.toString('base64')
      sigs1.push( sig1 )
      const sig2 = psbt.data.inputs[i].partialSig[0].signature.toString('base64')
      sigs2.push( sig2 )
    }
    // insert signature in path
    const path = { steps: [ { type: "IF" }, { type: "SIGNATURE", }, { type: "SIGNATURE", } ] }
    path.steps[2].sigs = sigs2
    path.steps[1].sigs = sigs1
    const tx = path2Tx(psbt, path)
    const tx_hex = tx.toHex()
    //console.log("tx_hex:", tx_hex)
    return tx_hex
  },

  getBeneficiaries(percs) {
    const addrs = this.getRandomAddresses(percs.length)
    const beneficiaries = []
    for(const [index, addr] of addrs.entries()) {
      beneficiary = {
        name: 'Beneficiary',
        surname: index+"",  
        email: `beneficiary${index}@gmail.com`,
        phone: `+${index}-555-55-55`,
        percentage: percs[index],
        bitcoinAddress: addr
      }
      beneficiaries.push(beneficiary)
    }
    return beneficiaries
  },

  getRandomAddresses(num) {
    const seed = bip39.mnemonicToSeedSync(bip39.generateMnemonic(128))
    const hDMaster =  bip32.fromSeed(seed, module.exports.network)
    const xpub = hDMaster.derivePath("m/84'/1'/0'/0").neutered().toBase58()
    const node = bip32.fromBase58(xpub, module.exports.network)
    const addrs = []
    for(let i=0; i<num; i++) {
      let child = node.derivePath(i+"")
      const addr = bitcoin.payments.p2wpkh({ pubkey: child.publicKey, network: module.exports.network }).address
      addrs.push(addr)
    }
    if(num === 1) return addrs[0]
    return addrs 
  },

  assert(condition, message="Assertion failed") {
    if (!condition) {
        throw message;
    }
    
  },


  // REGTEST ------------------------
  // TODO: create regtest.js for regtest methods.
  async getAddressUTXOs(addressId) {// console.log("utils getAddressUTXOs called:", addressId)
    let body = `query { getAddressUtxos ( addressId: "${addressId}" ) {
      hash
      height
      output_n
      value
    } }`
    const utxos = await callMother('getAddressUtxos', body, managerToken)
    return utxos
  },

  async getAddressBalance(addressId) {
    let body = `query { getAddressBalance ( addressId: "${addressId}" ) {
      confirmed
      unconfirmed
    } }`
    const balance = await callMother('getAddressBalance', body, managerToken)
    return balance
  },

  async broadcastTx(tx_hex) { 
    let body = `query { broadcastTx ( tx_hex: "${tx_hex}" ) }`
    const tx_hash = await callMother('broadcastTx', body, managerToken)
    return tx_hash
  },

  async fundAddress(addressId, bitcoins=0.25) {
    let body = `query { fundAddress ( addressId: "${addressId}", bitcoins: ${bitcoins} ) }`
    const tx_id = await callMother('fundAddress', body, managerToken)
    return tx_id
  },

  async mine(blocks=1) {
    let body = `query { mine ( blocks: ${blocks} ) }`
    const tx_hashes = await callMother('mine', body, managerToken)
    return tx_hashes
  },

  async getFees() {
    return { low: 10, medium: 15, high: 20 }
  },
  // END regtest ............................

}

// Repeated cause can't import from utils/util
async function callMother(method, body, token=null, debug=false) {
  let url = 'http://192.168.1.101:4002/graphql'

  try {
    return await fetch(url, { 
      method: 'post', 
      body: JSON.stringify( { query: body } ), 
      headers: { 
        'Content-Type': 'application/json',
        ...!!token && { 'authorization': token }
      }, 
    }).then(res => res.json()) 
    .then(json => {
      if(!!debug || !json.data) {
        console.log("callMother", method, "json:", json)
        console.log("Response:", json.data[method])
      }
      if(!!json.data)
        return json.data[method]
    })
  } catch(err) {
    console.log(`callMother(${method}):`, body)
    console.log("callMother error:", err)
    return false
  }
}


function path2Tx(psbt, path, network) { //console.log("path2Tx patthhh:", path) // send script bitcoins
  const steps_reversed = JSON.parse(JSON.stringify(path.steps)).reverse() // copy cause path.steps.reverse screws it.
  function pathF(inputIndex) {
    let script = []
    steps_reversed.forEach(step => {
      //console.log("step:", step)
      if(step.type == 'IF') {
        script.push(bitcoin.opcodes.OP_TRUE)
        //console.log("bitcoin.opcodes.OP_TRUE")
      } else if(step.type == 'ELSE') {
        script.push(bitcoin.opcodes.OP_FALSE)
        //console.log("bitcoin.opcodes.OP_FALSE")
      } else if(step.type == 'SIGNATURE') {
        const sig = Buffer.from(step.sigs[inputIndex], 'base64')
        script.push(sig)
        //console.log(step.nick,".signature")
      }
    })
    return bitcoin.script.compile(script)
  }
  for(let i=0; i<psbt.data.inputs.length; i++) { //console.log("****************** finalizing input:", i)
    psbt.finalizeInput(i, generate_path_function(pathF, network))
  }
  const tx = psbt.extractTransaction()
  return tx
}

function generate_path_function(pathF, network) { 
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
}
