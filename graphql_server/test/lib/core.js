const fetch = require('node-fetch')
const sha256 = require("js-sha256")
const crypto = require('crypto')
const { ObjectID } = require('mongodb')
const bip32 = require('bip32')
const bip39 = require('bip39')
const bitcoin = require('bitcoinjs-lib')
const mongodb = require('mongodb');
const common = require('../../lib/common.js')
const { sleep } = require('../../lib/common.js')
const util = require('./utils')
const { user } = require('../../resolvers/Query.js')
////// METHODS //////////////////////////////////////////////////////////////////

const network = bitcoin.networks.regtest

let mongo_client
let db

module.exports = {

  network: bitcoin.networks.regtest,

  db: async function() {
    if(!!db)
      return db
    const MONGO_URL = "mongodb://bapp_user:bapp_password_user_27002@localhost:27002/regtest?retryWrites=true&w=majority"
    try {
      mongo_client = await mongodb.connect(MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true })
      db = mongo_client.db()
    } catch (error) {
      console.log(`Mongo DB connect error:`, error)
    }
    return db
  },

  dbClose: async function() {
    return mongo_client.close()
  },

  register: async function( email, nick, referrer, pass="tonto" ) {
    const email_256 = sha256(email)
    const pass_256 = sha256(pass)
    const body = `mutation {
      register ( email_256: "${email_256}", pass_256: "${pass_256}", nick: "${nick}", referrer: ${referrer} ) {
        _id
        referral
      }
    }` 
    return callBapp('register', body)
  },

  login: async function (email, pass="tonto") {
    const email_256 = sha256(email)
    const pass_256 = sha256(pass)
    const body = `mutation {
      login ( email_256: "${email_256}", pass_256: "${pass_256}" ) {
        token
        user {
          _id
          nick
          defaultAddress
          avatar
          fee_address
          roles
          opts {
            _id
            name
            userId
            value
          }
          settings
          frequents
          donation_address
          subscription
          subscriptionDate
          thirdpartyDate
          origin
          referral
        }
      }
    }` 
    return callBapp('login', body)
  },

  logout: async function (token) {
    const body = `mutation {
      logout
    }` 
    return callBapp('logout', body, token)
  },

  newWallet: async function (name, addrsNum, liam, token ) {
    let mnemonic = util.mnemonic()
    const seed = bip39.mnemonicToSeedSync(mnemonic, "pass111" )
    const hDMaster = bip32.fromSeed( seed, network) // https://github.com/bitcoinjs/bitcoinjs-lib/issues/997
    const path = `m/84'/1'/0'/0`
    const xpub = hDMaster.derivePath(path).neutered().toBase58()
    // create addr
    const node = bip32.fromBase58(xpub, network)
    const keyPair = node.derivePath("0")
    const addrs = []
    for(let i=0; i<addrsNum; i++) {
      const keypair = util.getAddressKeypair(mnemonic, i)
      addrs.push (bitcoin.payments.p2wpkh({ pubkey: keypair.publicKey, network }).address)
    }

    const key = util.nHash(liam + "pass111")
    const enc_mnemonic = util.frontEncrypt(mnemonic, key)
    const body = `mutation {
      newWallet ( 
        input: {
            name: "${name}",
            mnemonic: "${enc_mnemonic}",
            xpub: "${xpub}",
            addresses: ${util.stringify(addrs)},
            path: "${path}",
            noPassphrase: false
          }
       ) {
        _id
        name
        balance
        unconfirmedBalance
        path
        created
        isLegacy
        isCold
        addresses {
          _id
          name
        }
      }
    }`
    const wallet = await callBapp('newWallet', body, token)
    wallet.mnemonic = mnemonic
    return wallet
  },

  saveMultisig: async function (name, M, N, signers, token ) {
    const body = `mutation {
      saveMultisig ( input: {
            name: "${name}",
            M: ${M},
            N: ${N},
            signers: ${util.stringify(signers)}
          }
       ) {
         _id
      }
    }`
    return callBapp('saveMultisig', body, token)
  },

  executeInheritance: async function (scriptId, finalTree, token ) { console.log("finalTree:", finalTree)
    const body = `mutation {
      inheritanceThirdPartyExecute ( 
        scriptId: "${scriptId}",
        finalTree: ${util.stringify(finalTree)}
       )
    }`
    return callBapp('inheritanceThirdPartyExecute', body, token)
  },

  newTimeTrust: async (name, beneficiary, executionDate, walletId, token) => {
    const body = `mutation {
      newTimeTrust ( 
        name: "${name}",
        beneficiary: ${util.stringify(beneficiary)},
        executionDate: ${executionDate},
        walletId: "${walletId}"
       ) {
         _id
         name
         beneficiary {
           userId
           nick
           addressId
         }
         executionDate
         testatorDate
         thirdpartyUserId
      }
    }`
    return callBapp('newTimeTrust', body, token)
  },

  trustSetPubkey: async (scriptId, walletId, token) => {
    const body = `mutation {
      trustSetPubkey(scriptId: "${scriptId}", walletId: "${walletId}" )
    }`
    return callBapp('trustSetPubkey', body, token)
  },

  inheritanceSetPubkeyAndAddress: async (scriptId, signingWalletId, recipientAddressId, token) => {
    //  console.log("scriptId:", scriptId, "signingWalletId:", signingWalletId, "recipientAddressId:", recipientAddressId, "token:", token.substring(0, 10) )
    const body = `mutation {
      inheritanceSetPubkeyAndAddress(
        scriptId: "${scriptId}", 
        signingWalletId: "${signingWalletId}",
        recipientAddressId: "${recipientAddressId}"
      )
    }`
    return callBapp('inheritanceSetPubkeyAndAddress', body, token)
  },

  signTrustPayment: async (trust, mnemonic, addressIndex, token) => {
    const keyPair = util.getAddressKeypair(mnemonic, addressIndex)
    const psbt = bitcoin.Psbt.fromBase64(trust.tx)
    const sigs = []
    const signature_idx = !!psbt.data.inputs[0].partialSig ? psbt.data.inputs[0].partialSig.length : 0
    for(let i=0; i< psbt.data.inputs.length; i++) {
      psbt.signInput(i, keyPair)
      const sig = psbt.data.inputs[i].partialSig[signature_idx].signature.toString('base64')
      sigs.push( sig )
    }
    trust.path.steps[trust.path.steps.length-1].sigs = sigs // last step is SIGNATURE. adding sigs 
    
    const pathBytes = common.pathBytes(trust.path)
    console.log("pathBytes:", pathBytes)
    const tx = common.path2Tx(psbt, trust.path)
    const size = tx.virtualSize()
    console.log("real tx virtualSize:", size) 
    // Tx Broadcast
    const tx_id =  tx.getId()
    const tx_hex = tx.toHex()
    let action = 'payment'
    if(trust.status > 2) 
      action = 'recovered'
    const concept = `Trust ${trust.name} ${action}`
    const body = `mutation {
      broadcastTx(
        tx_id: "${tx.getId()}", 
        tx_hex: "${tx_hex}", 
        txextrainfo: { concept: "${concept}", icon: "bitcoin_trust.svg", nicks: [], sender: "${trust.testatorNick}" },
        collection: "trust", 
        scriptId: "${trust._id}"
      )
    }`
    return callBapp('broadcastTx', body, token)
  },

  signInheritancePayment: async (inheritance, mnemonic, addressIndex, userId, token) => {
    const keyPair = util.getAddressKeypair(mnemonic, addressIndex)
    const psbt = bitcoin.Psbt.fromBase64(inheritance.tx)
    const sigs = []
    const signature_idx = !!psbt.data.inputs[0].partialSig ? psbt.data.inputs[0].partialSig.length : 0
    for(let i=0; i< psbt.data.inputs.length; i++) {
      psbt.signInput(i, keyPair)
      const sig = psbt.data.inputs[i].partialSig[signature_idx].signature.toString('base64')
      sigs.push( sig )
    }
    inheritance.path.steps.forEach(step => { // add sig to path signers.
      if(step.type == 'SIGNATURE' && step.userId == userId) {
        step.sigs = sigs
        //console.log("adding sig to --SIGNATURE:", step)
      } else if(step.type == 'MULTISIGNATURE') {
        step.signers.forEach(signer => {
          if(signer.userId == userId)
            signer.sigs = sigs
        })
      }
    })
    const tx = psbt.toBase64()
    const body = `mutation {
      inheritancePaymentSigned(
        inheritanceId: "${inheritance._id}", 
        tx: "${tx}", 
        path: ${util.stringify(inheritance.path)}
      ) {
        signedOk
        tx_id
      }
    }`
    return callBapp('inheritancePaymentSigned', body, token)
  },

  signTestatorInheritancePayment: async (inheritance, mnemonic, addressIndex, recipients, token) => {
    const keyPair = util.getAddressKeypair(mnemonic, addressIndex)
    const script = Buffer.from(inheritance.output)
    const witnessScript = Buffer.from(inheritance.witness)

    const addresses = recipients.map( r => r.address )
    const satoshis = recipients.map( r => r.satoshis )
    const total_sending = satoshis.reduce( (sum, sats) => sum + sats, 0)
    
    let all_utxos = await db.collection('coin').find({ address: inheritance.scriptAddressId, spent_tx: null, utxo_height: {$ne : null} }).toArray()
    const psbt = new bitcoin.Psbt( { network } )
    // recipients
    addresses.forEach( (address, i) => {
      psbt.addOutput({ address, value: satoshis[i] })
    })
    const { utxos, totalSelected, fee, change } = util.select_utxos(all_utxos, total_sending)
    // change
    if(!!change) { //console.log("change :", "totalSelected:", totalSelected, "sending:", total_sending, "fee:", fee, "change:", change)
      psbt.addOutput({ address: inheritance.scriptAddressId, value: change })    
    }
    // spend utxos
    utxos.forEach( utxo => {// console.log("adding input:", utxo)
      psbt.addInput({ hash: utxo.utxo_tx, index: utxo.utxo_n,  
        witnessScript,
        witnessUtxo: {
          script, 
          value: utxo.value,
        }}
      )
    })      
    // sign
    const sigs = []
    utxos.forEach( (utxo, i) => {// console.log("real signing input:", i)
      psbt.signInput(i, keyPair)
      sigs.push( psbt.data.inputs[i].partialSig[0].signature )
    })
    function pathF(inputIndex) {
      return bitcoin.script.compile([  // path inversed
        sigs[inputIndex],
        bitcoin.opcodes.OP_FALSE,
      ])
    }
    sigs.forEach((s, i) => {//      console.log("____________ finalizeInput:", i)
      psbt.finalizeInput(i, common.generate_path_function(pathF))
    })
    const tx = psbt.extractTransaction()
    const nicks = util.stringify(recipients.filter(r => !!r.nick).map( r => r.nick ))
    const concept = "Inheritance spending"

    const body = `mutation {
      broadcastTx(
        tx_id: "${tx.getId()}", 
        tx_hex: "${tx.toHex()}", 
        txextrainfo: { concept: "${concept}", icon: "inheritance.svg", nicks: ${nicks}, sender: "Alice" }
      )
    }`
    return callBapp('broadcastTx', body, token)
  },

  setInheritanceStatus: async(_id, status, token) => {
    const body = `mutation {
      setInheritanceStatus(
        _id: "${_id}", 
        status: ${status}
      )
    }`
    return callBapp('setInheritanceStatus', body, token)
  },

  setInheritanceTimeTrigger: async(_id, timetrigger, token) => {
    const body = `mutation {
      setInheritanceTimeTrigger(
        _id: "${_id}", 
        timetrigger: ${timetrigger}
      )
    }`
    return callBapp('setInheritanceTimeTrigger', body, token)
  },

  multisigSetPubkey: async function (multisigId, addressId, token ) {
    const body = `mutation {
      multisigSetPubkey (
        multisigId: "${multisigId}",
        addressId: "${addressId}"
      )        
    }`
    return callBapp('multisigSetPubkey', body, token)
  },

  saveMultisigPayment: async (multisig, recipients, token) => {
    const script = Buffer.from(multisig.output)
    const witnessScript = Buffer.from(multisig.witness)

    const addresses = recipients.map( r => r.address )
    const satoshis = recipients.map( r => r.satoshis )
    const total_sending = satoshis.reduce( (sum, sats) => sum + sats, 0)
    let all_utxos = await db.collection('coin').find({ address: multisig.scriptAddressId, spent_tx: null, utxo_height: {$ne : null} }).toArray()
    if(!all_utxos.length) {
      console.log("saveMultisigPayment No utxos")
      return
    }
    const { utxos, totalSelected, fee, change } = util.select_utxos(all_utxos, total_sending)

    const psbt = new bitcoin.Psbt({ network })
    // recipients
    addresses.forEach( (address, i) => {// console.log("adding output:", recipient, satoshis[i]) 
      psbt.addOutput({ address, value: satoshis[i] })
    })
    // change
    if(!!change) { //console.log("change :", "totalSelected:", totalSelected, "sending:", total_sending, "fee:", fee, "change:", change)
      psbt.addOutput({ address: multisig.address._id, value: change })    
    }
    // spend utxos
    utxos.forEach( utxo => {// console.log("adding input:", utxo)
      psbt.addInput({ hash: utxo.utxo_tx, index: utxo.utxo_n,  
        witnessScript,
        witnessUtxo: {
          script, 
          value: utxo.value,
        }}
      )
    })
    const tx = psbt.toBase64()
    const nicks = util.stringify(recipients.filter(r => !!r.nick).map( r => r.nick ))
    const concept = "Some concept"
    const icon = "user.svg"
    const utxos_s = util.stringify(utxos.map( utxo => { return { _id: utxo._id, tx: utxo.utxo_tx, n: utxo.utxo_n } }))
    const body = `mutation {
      saveMultisigPayment (
        input: {
          satoshis: ${total_sending},
          txextrainfo: { concept: "${concept}", icon: "${icon}", nicks: ${nicks}, sender: "${multisig.name}" },
          multisigId: "${multisig._id}",
          tx: "${tx}",
          utxos: ${utxos_s},
        }
      ) {
          _id
          satoshis
          concept
          icon
          nicks
          sender
          utxos {
            _id
            utxo_tx
          }
          created
          multisigId
          broadcasted
          tx
          signers {
            userId
            nick
          }
        }
    }`
    return callBapp('saveMultisigPayment', body, token)
  },

  walletSend: async (wallet, all_utxos, recipients, changeAddress, token) => {
    const addresses = recipients.map( r => r.address )
    const satoshis = recipients.map( r => r.satoshis )
    const total_sending = satoshis.reduce( (sum, sats) => sum + sats, 0)
    if(!all_utxos.length) {
      console.log("No utxos")
      return
    }
    const { utxos, totalSelected, fee, change } = util.wallet_select_utxos(all_utxos, total_sending)

    const psbt = new bitcoin.Psbt({ network })
    // recipients
    addresses.forEach( (recipient, i) => {// console.log("adding output:", recipient, satoshis[i]) 
      psbt.addOutput({ address: recipient, value: satoshis[i] })
    })
    // donation
    /*if(donation > 0) {
      psbt.addOutput({ address: this.$store.getters['user/donation_address'], value: this.donationf })
    }*/
    // change
    if(!!change) { //console.log("change :", "totalSelected:", totalSelected, "sending:", total_sending, "fee:", fee, "change:", change)
      //console.log("change2:", { address: this.multisig.address._id, value: this.totalSelected - this.sendingamount - this.total_fee })
      psbt.addOutput({ address: changeAddress, value: change })    
    }
    // spend utxos
    utxos.forEach( utxo => {// console.log("adding input:", utxo)
      const keyPair = util.getAddressKeypair(wallet.mnemonic, utxo.index )
      const p2wpkh = bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey, network } )
      psbt.addInput({ hash: utxo.utxo_tx, index: utxo.utxo_n, 
        witnessUtxo: {
          script: p2wpkh.output, 
          value: utxo.value,
        }}
      )
    })
    
    utxos.forEach( (utxo, i) => {// console.log("adding input:", utxo)
      const keyPair = util.getAddressKeypair(wallet.mnemonic, utxo.index )
      psbt.signInput(i, keyPair)
    })
    
    psbt.finalizeAllInputs()    
    const tx = psbt.extractTransaction()
    const tx_id =  tx.getId()
    const tx_hex = tx.toHex()
    //console.log("tx_hex:", tx_hex)
    const sender = wallet.name
    const nicks = util.stringify(recipients.filter(r => !!r.nick).map( r => r.nick ))
    const concept = "Some concept"
    const icon = "user.svg"

    const body = `mutation {
      broadcastTx(
        tx_id: "${tx_id}", 
        tx_hex: "${tx_hex}", 
        txextrainfo: { concept: "${concept}", icon: "${icon}", nicks: ${util.stringify(nicks)}, sender: "${sender}" }
      )      
    }`
    return callBapp('broadcastTx', body, token)
  },

  multisigPaymentSign: async (multisig, msigpay, user, keypair, token) => {
    const psbt = bitcoin.Psbt.fromBase64(msigpay.tx)
    psbt.signAllInputs(keypair)
    const signature = psbt.toBase64()
    const signer = { userId: user._id, nick: user.nick, signature }
    const body = `mutation {
      multisigPaymentSign ( multisigId: "${multisig._id}", msigpayId: "${msigpay._id}", signer: ${util.stringify(signer)} ) {
        signedOk
        tx_id
      }
    }` 
    return callBapp('multisigPaymentSign', body, token)
  },

  wallets: async function (token) {
    const body = `query {
      wallets {
        _id
        name
        userId
        mnemonic
        path
        balance
        unconfirmedBalance
        created
        isLegacy
        isCold
        addresses {
          _id
          name
          created
          balance
          unconfirmedBalance
        }
        addresses_confirmed_utxos {
          _id
          name
          index
          balance
          confirmed_utxos {
            _id # database _id: tx + n
            utxo_tx
            utxo_n
            utxo_time
            utxo_concept
            utxo_icon
            value
          }
          pkCypher
        }
      }
    }`
    return callBapp('wallets', body, token)
  },

  address: async function (addressId, token) {
    const body = `query {
      address ( _id: "${addressId}" ) {
        _id
        name
        balance
        unconfirmedBalance
        parentId
        index
        pkCypher
        coins( paging: { page: 0, pagesize: 20 }, bytx: true) {
          _id
          time
          height
          value
          concept
          icon
          nicks
          sender
          tx
        }
      }
    }`
    return callBapp('address', body, token)
  },

  inheritances: async function (token) {
    const body = `query {
      inheritances {
        _id
        name
        scriptAddressId
        output
        witness
        address {
          _id
          balance
          unconfirmedBalance
        }
        status
        signers {
          userId
          addressId
        }
        tx
        path
        scriptBytes
        activeHeirs
      }
    }`
    return callBapp('inheritances', body, token)
  },

  aftermessages: async function (token) {
    const body = `query {
      aftermessages {
        _id
        senderId
        name
        beneficiaryId
        beneficiaryNick
        senderNick
        type
        status
        date
        message
        timetrigger
        parentId
        thirdpartyUserId
        thirdpartyName
        thirdparty {
          logoUrl
          companyName
          companyAddress
          email
          phone
          countries
          languages
        }
      }
    }`
    return callBapp('aftermessages', body, token)
  },

  multisigs: async function (token) {
    const body = `query {
      multisigs {
        _id
        name
        thirdpartyUserId
        scriptAddressId
        address {
          _id
          balance
          unconfirmedBalance
        }
        output
        witness
      }
    }`
    return callBapp('multisigs', body, token)
  },

  trusts: async function (token) {
    const body = `query {
      trusts {
        _id
        name
        beneficiary {
          userId
          nick
          addressId
        }
        executionDate
        testatorDate
        thirdpartyUserId
      }
    }`
    return callBapp('trusts', body, token)
  },

  recurringpays: async function (token) {
    const body = `query {
      recurringpays {
        _id
        concept
        icon
        nicks          
        type
        day
        month
        created
        nextDate
        recipients
        amounts
        currency
        total
      }
    }`
    return callBapp('recurringpays', body, token)
  },

  alerts: async function (token) {
    const body = `query {
      alerts {
        _id
        created
        code
        entryId
        aux1
        aux2
        aux3
      }
    }`
    return callBapp('alerts', body, token)
  },


  fiat: async function (token) {
    const body = `query {
      fiat {
        USD
        EUR
        GBP
        JPY
        CHF
        AUD
      }
    }`
    return callBapp('fiat', body, token)
  },

  saveAftermessage: async function(token, name, message, sender, beneficiary, type, date, timetrigger, password) {
    let key = util.nHash(beneficiary.liam + password)
    const cryptext = util.frontEncrypt(message, key)
    const body = `mutation {
      saveAftermessage(
        name: "${name}", 
        beneficiaryId: "${beneficiary._id}", 
        beneficiaryNick: "${beneficiary.nick}",
        senderNick: "${sender.nick}", 
        message: "${cryptext}", 
        type: ${type}, 
        date: "${date}", 
        timetrigger: ${timetrigger}
      ) {
        _id
      }
    }`
    return callBapp('saveAftermessage', body, token)
  },

  updateAftermessage: async function(token, _id, message, beneficiary, password) {
    const key = util.nHash(beneficiary.liam + password)
    const cryptext = util.frontEncrypt(message, key)
    const body = `mutation {
      updateAftermessage(
        _id: "${_id}", 
        message: "${cryptext}"
      )
    }`
    return callBapp('updateAftermessage', body, token)
  },

  generateBappAddress: async (fields) => {
    return common.generateAddress(common.inheritance_wallet(), fields, db, util.jwt)
  },

  createGreatFamilyInheritance: async (user, bappAddress) => {
    /*const signers = `[
      {userId:"0beaac69d53e38d275aadd405b7f414dee8c268979fdcd8381ce1434328f91de",nick:"Alice",addressId:"${user.address}",level:0},
      {userId:"002e47f70d659f8e09351771455d3941ffaff6be8c7efa877f774df5423d7a37",nick:"Alice Girl",level:1},
      {userId:"b89e5d97279c61e995eb85372f014ae46a416bb3d73b3a1620e7ac7966aa9905",nick:"Alice Son",level:1},
      {userId:"300db02db75af922c759f08a0efa5a400128eac1f531b802697450b5c6da6e9f",nick:"Bob",level:1},
      {userId:"cca8120950e7f43ad7de77f0de28015adbfae718bbd817059fabff540b946b41",nick:"Charlie",level:1},
      {userId:"3a8376d114b8f107aa3f4bcf80f1d6f223149199b617f64c1a8e04f6487071ce",nick:"Alice Grand Son",level:2},
      {userId:"5f72c4ad2598301f5f0a47cee1a1fac0335be9b82e649c003b13f975aeb1647a",nick:"Bob Friend",level:2},
      {userId:"e8f799297a8eee4a6b0d7f2fb4ae322c37821268ead3500302b03101f6249790",nick:"Bob Friend 2",level:2},
      {userId:"ba92904c15c98bbb1669cde77d8835421253cc31583dbab085157ffe6d2975b8",nick:"Charlie Lawyer",level:2}
    ]`
    const tree = {
      id: "Root",
      name: "GreatFamily",
      type: "Root",
      level: 0,
      children: [
          {
              id: "99f2dff2d0f7521b",
              nick: "Alice Girl",
              type: "heir",
              children: [
                  {
                      id: "80004ef3e335f5c0",
                      nick: "Alice Grand Son",
                      type: "heir",
                      children: [],
                      parentId: "99f2dff2d0f7521b",
                      level: 2,
                      percentage: 100,
                      userId: "3a8376d114b8f107aa3f4bcf80f1d6f223149199b617f64c1a8e04f6487071ce"
                  }
              ],
              parentId: "Root",
              level: 1,
              percentage: 40,
              userId: "002e47f70d659f8e09351771455d3941ffaff6be8c7efa877f774df5423d7a37"
          },
          {
              id: "c3f9356c0336b506",
              nick: "Alice Son",
              type: "heir",
              children: [],
              parentId: "Root",
              level: 1,
              percentage: 30,
              userId: "b89e5d97279c61e995eb85372f014ae46a416bb3d73b3a1620e7ac7966aa9905"
          },
          {
              id: "52cd2ee8676aea13",
              nick: "Bob",
              type: "heir",
              children: [
                  {
                      id: "07e1d79445a69f87",
                      nick: "Bob Friend",
                      type: "heir",
                      children: [],
                      parentId: "52cd2ee8676aea13",
                      level: 2,
                      percentage: 60,
                      userId: "5f72c4ad2598301f5f0a47cee1a1fac0335be9b82e649c003b13f975aeb1647a"
                  },
                  {
                      id: "10fa7d7289279e6f",
                      nick: "Bob Friend 2",
                      type: "heir",
                      children: [],
                      parentId: "52cd2ee8676aea13",
                      level: 2,
                      percentage: 40,
                      userId: "e8f799297a8eee4a6b0d7f2fb4ae322c37821268ead3500302b03101f6249790"
                  }
              ],
              parentId: "Root",
              level: 1,
              percentage: 20,
              userId: "300db02db75af922c759f08a0efa5a400128eac1f531b802697450b5c6da6e9f"
          },
          {
              id: "830ede509aa11287",
              nick: "Charlie",
              type: "heir",
              children: [
                  {
                      id: "f1f81a9c1ea3d89b",
                      nick: "Charlie Lawyer",
                      type: "heir",
                      children: [],
                      parentId: "830ede509aa11287",
                      level: 2,
                      percentage: 100,
                      userId: "ba92904c15c98bbb1669cde77d8835421253cc31583dbab085157ffe6d2975b8"
                  }
              ],
              parentId: "Root",
              level: 1,
              percentage: 10,
              userId: "cca8120950e7f43ad7de77f0de28015adbfae718bbd817059fabff540b946b41"
          }
      ],
      addressId: user.address,
      userId: user._id,
      nick: "Alice"
    }
    console.log("tree.name:", util.stringify(tree))
    const body = `mutation {
      saveInheritance(name: "Great Family", signers: ${signers}, tree: ${util.stringify(tree)} ) {
        _id
      }
    }`
    console.log("body:", body)
    const inheritance = await callBapp('saveInheritance', body, user.token, true) */
    const doc = {"name":"Great Family","signers":[
      {"userId":"e68a6459450d0c02ee22d55c0ee28fa56d8653b2104e50c394ce2496de33f684","nick":"Bapp","addressId":bappAddress},
      {"userId":"0beaac69d53e38d275aadd405b7f414dee8c268979fdcd8381ce1434328f91de","nick":"Alice","addressId":user.address,"level":0},
      {"userId":"002e47f70d659f8e09351771455d3941ffaff6be8c7efa877f774df5423d7a37","nick":"Alice Girl","level":1},
      {"userId":"b89e5d97279c61e995eb85372f014ae46a416bb3d73b3a1620e7ac7966aa9905","nick":"Alice Son","level":1},
      {"userId":"300db02db75af922c759f08a0efa5a400128eac1f531b802697450b5c6da6e9f","nick":"Bob","level":1},
      {"userId":"cca8120950e7f43ad7de77f0de28015adbfae718bbd817059fabff540b946b41","nick":"Charlie","level":1},
      {"userId":"3a8376d114b8f107aa3f4bcf80f1d6f223149199b617f64c1a8e04f6487071ce","nick":"Alice Grand Son","level":2},
      {"userId":"5f72c4ad2598301f5f0a47cee1a1fac0335be9b82e649c003b13f975aeb1647a","nick":"Bob Friend","level":2},
      {"userId":"e8f799297a8eee4a6b0d7f2fb4ae322c37821268ead3500302b03101f6249790","nick":"Bob Friend 2","level":2},
      {"userId":"ba92904c15c98bbb1669cde77d8835421253cc31583dbab085157ffe6d2975b8","nick":"Charlie Lawyer","level":2}],
      "tree":{"id":"Root","name":"Great Family","type":"Root","level":0,"children":[{"id":"4115b40b08935ed3","nick":"Alice Girl","type":"heir","children":[{"id":"885ea563701d3039","nick":"Alice Grand Son","type":"heir","children":[],"parentId":"4115b40b08935ed3","level":2,"percentage":100,"userId":"3a8376d114b8f107aa3f4bcf80f1d6f223149199b617f64c1a8e04f6487071ce"}],"parentId":"Root","level":1,"percentage":40,"userId":"002e47f70d659f8e09351771455d3941ffaff6be8c7efa877f774df5423d7a37"},{"id":"5453d3fdd066dc93","nick":"Alice Son","type":"heir","children":[],"parentId":"Root","level":1,"percentage":30,"userId":"b89e5d97279c61e995eb85372f014ae46a416bb3d73b3a1620e7ac7966aa9905"},{"id":"b8ae305f6ab8eabf","nick":"Bob","type":"heir","children":[{"id":"a2452a35a56e5823","nick":"Bob Friend","type":"heir","children":[],"parentId":"b8ae305f6ab8eabf","level":2,"percentage":45,"userId":"5f72c4ad2598301f5f0a47cee1a1fac0335be9b82e649c003b13f975aeb1647a"},{"id":"221b0d537a910fb3","nick":"Bob Friend 2","type":"heir","children":[],"parentId":"b8ae305f6ab8eabf","level":2,"percentage":55,"userId":"e8f799297a8eee4a6b0d7f2fb4ae322c37821268ead3500302b03101f6249790"}],"parentId":"Root","level":1,"percentage":10,"userId":"300db02db75af922c759f08a0efa5a400128eac1f531b802697450b5c6da6e9f"},{"id":"bc32dc00264f2bcd","nick":"Charlie","type":"heir","children":[{"id":"b8eed2ec32da625f","nick":"Charlie Lawyer","type":"heir","children":[],"parentId":"bc32dc00264f2bcd","level":2,"percentage":100,"userId":"ba92904c15c98bbb1669cde77d8835421253cc31583dbab085157ffe6d2975b8"}],"parentId":"Root","level":1,"percentage":20,"userId":"cca8120950e7f43ad7de77f0de28015adbfae718bbd817059fabff540b946b41"}],
        "addressId":user.address,"userId":"0beaac69d53e38d275aadd405b7f414dee8c268979fdcd8381ce1434328f91de","nick":"Alice"},"testatorId":"0beaac69d53e38d275aadd405b7f414dee8c268979fdcd8381ce1434328f91de","timetriggered":true,"thirdpartyUserId":"e68a6459450d0c02ee22d55c0ee28fa56d8653b2104e50c394ce2496de33f684",
        "thirdpartyAddressId":bappAddress,"created":"2022-11-16T12:09:54.998Z","status":0,"timetrigger":1,"scriptAddressId":"","witness":""}
      const { insertedId } =   await db.collection('inheritance').insertOne(doc)
    return db.collection('inheritance').findOne( { _id: ObjectID(insertedId) } )
  },


  createThirdpartySimpleInheritance: async () => {
    /*const signers = `[
    { "userId": "0beaac69d53e38d275aadd405b7f414dee8c268979fdcd8381ce1434328f91de", "nick": "Alice", "level": 0 },
    { "userId": "300db02db75af922c759f08a0efa5a400128eac1f531b802697450b5c6da6e9f", "nick": "Bob", "level": 1 }
]`
    const tree = {
    "id": "Root",
    "name": "Simple 3rParty ",
    "type": "Root",
    "level": 0,
    "children": [
        {
            "id": "f67f5178d80dab97",
            "nick": "Bob",
            "type": "heir",
            "children": [],
            "parentId": "Root",
            "level": 1,
            "percentage": 100,
            "userId": "300db02db75af922c759f08a0efa5a400128eac1f531b802697450b5c6da6e9f"
        }
    ],
    "userId": "0beaac69d53e38d275aadd405b7f414dee8c268979fdcd8381ce1434328f91de",
    "nick": "Alice"
}
    console.log("tree.name:", util.stringify(tree))
    const body = `mutation {
      saveInheritance(name: "Great Family", signers: ${signers}, tree: ${util.stringify(tree)} ) {
        _id
      }
    }`
    console.log("body:", body)
    const inheritance = await callBapp('saveInheritance', body, user.token, true) */
    const doc = {"name":"Simple 3rdParty","signers":[
      {"userId":"8f48133e2bd97867ed31b2dc6ea467dfed6ae9c9b44265226acd86880818cb89","nick":"Interserv Staff 1","addressId":"bcrt1q8y5mm6whaf6x7qvylkal926uj4ex6g8m2pwkq8"},
      {"userId":"0beaac69d53e38d275aadd405b7f414dee8c268979fdcd8381ce1434328f91de","nick":"Alice","level":0},
      {"userId":"300db02db75af922c759f08a0efa5a400128eac1f531b802697450b5c6da6e9f","nick":"Bob","level":1}],

      "tree":{"id":"Root","name":"Simple 3rParty ","type":"Root","level":0,"children":[
            {"id":"4115b40b08935ed3","nick":"Bob","type":"heir","children":[],"parentId":"Root","level":1,"percentage":100,"userId":"300db02db75af922c759f08a0efa5a400128eac1f531b802697450b5c6da6e9f"}]
            ,"userId":"0beaac69d53e38d275aadd405b7f414dee8c268979fdcd8381ce1434328f91de","nick":"Alice"},"testatorId":"0beaac69d53e38d275aadd405b7f414dee8c268979fdcd8381ce1434328f91de",
           "thirdpartyId": "638a4343af8d9f14f9178676", "thirdpartyUserId":"8f48133e2bd97867ed31b2dc6ea467dfed6ae9c9b44265226acd86880818cb89",
        "thirdpartyAddressId":"bcrt1q8y5mm6whaf6x7qvylkal926uj4ex6g8m2pwkq8","created":"2022-11-16T12:09:54.998Z","status":0,"timetrigger":1,"scriptAddressId":"","witness":""}
      const { insertedId } =   await db.collection('inheritance').insertOne(doc)
      console.log("insertedId:", insertedId)
    return db.collection('inheritance').findOne( { _id: ObjectID(insertedId) } )
  },


  createUser: async (email, nick, referrer, walletName, addrsNum=1) => {
    const reg_user = await module.exports.register(email, nick, referrer )
    await sleep(200)
    const { user, token } = await module.exports.login(email, "tonto")
    await sleep(200)
    user.__id = reg_user._id
    user.liam = util.liam(email)
    user.email = email
    const wallet = await module.exports.newWallet(walletName, addrsNum, user.liam, token)
    user.address = wallet.addresses[0]._id
    user.wallet = wallet
    user.token = token
    return user
  },

  createAllUsers: async (debug=false) => {
    const users_def = util.users() // [ alice: { ... }, bob: { ...}, ...]
    const users_keys = Object.keys(users_def) // [ alice, bobo, ...]
    const users = {}
    for(const key of users_keys) {
      const u = users_def[key]
      if(!!debug)
        console.log("creating user:", u)
      const user = await module.exports.createUser(u.email, u.nick, 100, `${u.nick} Wallet 1`, 1)
      if(!!debug)
        console.log("user:", user.nick, user._id, user.__id)
      users[key] = user
    }
    return users
  },

  bappLogin: async () => {
    const { user, token } = await module.exports.login("bapp@bapp.plus")
    user.token = token
    return user
  },

  reset: async () => {
    for(const user of Object.values(util.users())) {
      await module.exports.resetUser(user)
    }
    await db.collection('alert').deleteMany( { userId: util.bapp._id } )
  },

  resetUser: async (user) => {
    const user_db = await db.collection('user').findOne( { _id: user.__id } )
    if(!user_db)
      return
    const wallets = await db.collection('wallet').find({ userId: user._id }).toArray()
    for(const wallet of wallets) {
      const addresses = await db.collection('address').find({ parentId: wallet._id }).toArray()
      for(const address of addresses) {
        await db.collection('coin').deleteMany({ address: address._id })
        await db.collection('address').deleteOne({ _id: address._id })
      }
      await db.collection('wallet').deleteOne({ userId: user._id })
    }
    const multisigs = await db.collection('multisig').find({ userId: user._id }).toArray()
    for(const multisig of multisigs) {
      await db.collection('address').deleteOne({ _id: multisig.scriptAddressId } )
      await db.collection('coin').deleteMany({ address: multisig.scriptAddressId } )
    }
    const inheritances = await db.collection('inheritance').find({ testatorId: user._id }).toArray()
    for(const inheritance of inheritances) {
      await db.collection('address').deleteOne({ _id: inheritance.scriptAddressId } )
      await db.collection('coin').deleteMany({ address: inheritance.scriptAddressId } )
    }
    const trusts = await db.collection('trust').find({ testatorId: user._id }).toArray()
    for(const trust of trusts) {
      await db.collection('address').deleteOne({ _id: trust.scriptAddressId } )
      await db.collection('coin').deleteMany({ address: trust.scriptAddressId } )
    }
    await db.collection('trust').deleteMany( { testatorId: user._id } )
    await db.collection('multisig').deleteMany( { creatorId: user._id } )
    await db.collection('inheritance').deleteMany( { testatorId: user._id } )
    await db.collection('msigpayment').deleteMany( { creatorId: user._id } )
    await db.collection('aftermessage').deleteMany( { senderId:  user._id } )
    await db.collection('alert').deleteMany( { userId: user._id } )
    await db.collection('user').deleteOne( { _id:  user.__id } )
  },

  dailyjob: async function() {
    let body = `mutation {
      mine( job: true)
    }` 
    callBapp('mine', body)
    return sleep(500)
  },

  mine: async function(blocks=1, sleep=0) {
    let body = `mutation {
      mine( job: false)
    }` 
    for(let i=0; i<blocks; i++)
      await callBapp('mine', body)
    if(!!sleep)
      await util.sleep(sleep)
  },

  faucet: async function(addressId) {
    const body = `mutation {
      sendtoaddress(
        addressId: "${addressId}"
      )
    }`
    return callBapp('sendtoaddress', body, null)
  },


}

// callBapp
async function callBapp(method, body, token=null, debug=false) {
  try {
    return await fetch('http://localhost:4002/graphql', { 
      method: 'post', 
      body: JSON.stringify( { query: body } ), 
      headers: { 
        'Content-Type': 'application/json',
        ...!!token && { 'authorization': token }
      }, 
    }).then(res => res.json()) 
    .then(json => {// console.log("-------------json:", json.errors[0].extensions)
      if(!!debug || !json.data)
        console.log(method, "json:", json)
      if(!!json.data)
        return json.data[method]
    }) 
  } catch(err) {
    console.log(`callBapp(${method}) error:`, body)
    console.log("Error:", err)
  }

}
