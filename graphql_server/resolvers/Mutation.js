const { ObjectID } = require('mongodb')
const bip32 = require('bip32')
const bitcoin = require('bitcoinjs-lib')

const { Decimal } = require('decimal.js')
const sha256 = require("js-sha256")

const common = require('../lib/common')
const alerts = require('../lib/alerts')
const crypto = require('crypto')
const moment = require('moment')
const { ok } = require('assert')


const network = common.bitcoin_network

module.exports = {
  async broadcastTx(parent, { tx_id, tx_hex, txextrainfo, collection, scriptId, pay_id }, { db, pubsub, btcNode, txs_extrainfo }) { // collection: msigpayment o payment
    //console.log("broadcast tx called tx_id:", tx_id, "txextrainfo:", txextrainfo, "collection:", collection, "scriptId:", scriptId, "pay_id:", pay_id, "tx_hex:", tx_hex.substring(0, 10))
    txs_extrainfo[tx_id] = txextrainfo
    try {
      const ret_tx_id = await btcNode.sendRawTransaction(tx_hex)
      //console.log("broadcastTx ret_tx_id:", ret_tx_id)
      if(!!collection) {
        if(['payment', 'msigpayment'].includes(collection)) { // multisig, smartcontract, ...
          const freed_utxos = await db.collection('coin').find( { pending_payment: ObjectID(pay_id) } ).toArray()
          const txBroadcasted = {
            paymentId: pay_id,
            freed_utxos
          }
          await db.collection(collection).updateOne( { _id: ObjectID(pay_id)}, { $set: { broadcasted: true } } )
          await db.collection('coin').updateMany( { pending_payment: ObjectID(pay_id) }, { $unset: { pending_payment: "" } } )//, $set: { spent_concept: concept } } )
          await pubsub.publish('tx-broadcasted', { txBroadcasted, scriptId } ) 
          await alerts.deleteAlerts(db, pubsub, { code2: ObjectID(pay_id) } )
        // Inheritance
        } else if(collection == 'inheritance') { // inheritance has been executed status -> 3
          const res = await db.collection('inheritance').findOneAndUpdate( { _id: ObjectID(scriptId) }, { $set: { status: 3 } }, { returnOriginal: false } )
          const inheritance = res.value
          // alerts  
          await alerts.deleteAlerts( db, pubsub, { entryId: ObjectID(scriptId) } )
          let testator = inheritance.signers[1] // ??? testatorId???s
          inheritance.activeHeirs.forEach(s => {// console.log("sending alert to:", s)
            alerts.newAlert(db, pubsub, s.userId, alerts.codes.inheritance.payment_sent, inheritance._id, aux1=testator.nick, aux2=s.addressId)
          })
          await alerts.newAlert(db, pubsub, inheritance.testatorId, alerts.codes.inheritance.payment_sent, inheritance._id, aux1=inheritance.name)
          if(!inheritance.timetrigger) // it's 3rd party
            await alerts.newAlert(db, pubsub, inheritance.thirdpartyUserId, alerts.codes.inheritance.payment_sent, inheritance._id, aux1=inheritance.name)
        // TRUST
        } else if(collection == 'trust') { //console.log("collection is trust")
          const res = await db.collection('trust').findOneAndUpdate( { _id: ObjectID(scriptId) }, { $inc: { status: 1 } }, { returnOriginal: false } )
          const trust = res.value
          if(trust.status == 3) // beneficiary received the funds
            alerts.newAlert(db, pubsub, trust.testatorId, alerts.codes.trust.payment_sent, scriptId, aux1=trust.beneficiary.nick, aux2=trust.name )

        // Lightning
        } else if(collection == 'lightning') { //console.log("collection is lightning")
          await db.collection('lightning').updateOne( { _id: ObjectID(scriptId) }, { $inc: { status: 1 } } )
        }
      }
      return true    
    } catch (error) {
      console.log("broadcastTx error:", error)
      await db.collection('log').insertOne( { type: common.log.database.txerror, errorcode: error.code, errormessage: error.message, status:0, tx_id, tx_hex, collection, scriptId, pay_id, created: new Date() } )
      delete txs_extrainfo[tx_id] 
      throw new Error("Error broadcasting tx")
    }
  },


  async payInheritance(parent, { tx_id, tx_hex, concept, scriptId }, { db, pubsub, btcNode, txs_extrainfo }) { // collection: msigpayment o payment
    //console.log(" broadcast tx called tx_id:", tx_id, tx_hex, concept, pay_id, scriptId)
    txs_extrainfo[tx_id] = concept
    try {
      const ret_tx_id = await btcNode.sendRawTransaction(tx_hex)
      console.log("broadcastTx: ret_tx_id:", ret_tx_id, typeof ret_tx_id)
      const inheritance = await db.collection('inheritance').findAndModify({
                                                            query: { _id: ObjectID(pay_id) },
                                                            update: { $set: { status: 2 } } })
      alerts.newAlert(db, pubsub, inheritance.creatorId, alerts.codes.inheritance.payment_sent, scriptId, aux1=inheritance.tree.nick, aux2=inheritance.name)
      if(!!inheritance.thirdpartyUserId)
        alerts.newAlert(db, pubsub, inheritance.thirdpartyUserId, alerts.codes.inheritance.payment_sent, scriptId, aux1=inheritance.tree.nick, aux2=inheritance.name)
      
      await pubsub.publish('inheritance-paid', { inheritancePaid: { scriptId } } )
      return true
    } catch (error) {
      delete txs_extrainfo[tx_id]
      console.log("error broadcasting inheritance payment:", error.toString())
      return error.toString()
    }
  },

  async newWallet(parent, { input }, { db, me, last_block, pubsub, jwtToken } ) { // API https://sochain.com/api#rate-limits
    //console.log("newWallet:", input)
    const mnemonic = input.mnemonic
    const isCold = !mnemonic
    const newWallet = {
      name: input.name,
      balance: 0,
      unconfirmedBalance: 0,
      ...!!mnemonic && { mnemonic },
      ...!!isCold && { isCold },
      lastChild: input.addresses.length-1,
      xpub: common.encrypt(input.xpub, jwtToken),
      userId: me.email_hash,
      created: new Date(),
      //addressId: input.addresses[0],
      path: input.path,
      ...!!input.noPassphrase && { noPassphrase: true }
    }
    //console.log("newWallet:", newWallet)
    const { insertedId } = await db.collection('wallet').insertOne(newWallet)
    newWallet._id = insertedId
    // input.addresses
    const addresses = input.addresses.map( (addr, i) => {
      return { 
        _id: addr,
        name: "BTC address #" + (i+1),
        parentId: insertedId,
        balance: 0,
        unconfirmedBalance: 0,
        index: i+"",
        created: new Date(),
      }
    })
    
    // load utxos
    for(const address of addresses) {// console.log("looking for utxos of:", address) // corn critic flavor chuckle develop immune dog bullet truck sail stay design search fish pencil middle young suggest pupil party print violin title used
      // read address utxos // 2N3UFzKRkrW3avaSyTdNcjh3zrL3AaWPGwR
      //const utxos = await btcNode.command('scantxoutset', 'start', [`addr(${address._id})`])
      //console.log("utxos found:", utxos.unspents)
      // TODO ??? uncomment in production
      if(process.env.BITCOIN_NETWORK != 'regtest') {
        const addressUtxos = await common.loadAddressUtxos(address._id, db, last_block.height)
        if(!!addressUtxos.total) {
          address.balance = addressUtxos.total
          newWallet.balance += addressUtxos.total
        }
      }
      //const { insertedId } = await db.collection('address').insertOne(address)
      //await db.collection('address').updateOne({_id: address._id}, { $set: { balance: item.balance, unconfirmedBalance: item.unconfirmedBalance } })    
    }
    //console.log("utxos processed")
    
    const { insertedIds } = await db.collection('address').insertMany(addresses)
    if(newWallet.balance > 0) {// console.log("wallet had balance:", newWallet.balance)
      await db.collection('wallet').updateOne({_id: newWallet._id }, { $set: { balance: newWallet.balance } } )
    }
    if(!me.defaultAddress) {
      me.defaultAddress = input.addresses[0]
      await db.collection('user').updateOne({ _id: me._id },  { $set: { defaultAddress: input.addresses[0] } } )
    }
    await pubsub.publish('new-wallet', { newWallet } )
    return newWallet
  },

  async hotify(parent, { _id, mnemonic, xpub }, { db, me, jwtToken } ) {    
    const wallet = await db.collection('wallet').findOne( { _id: ObjectID(_id) } )
    const w_xpub = common.decrypt(wallet.xpub, jwtToken)
    if(xpub != w_xpub) throw "Error"    
    const { modifiedCount } = await db.collection('wallet').updateOne( { _id: wallet._id, userId: me.email_hash }, { $set: { mnemonic }, $unset: { isCold: "" } } )
    return !!modifiedCount
  },

  async newLegacyWallet(parent, { name }, { db, me, btcNode, pubsub, jwtToken } ) {    // wif: cSQfQ9QPLskjmvSv2f4ACEkeAT3xBTV7SbVrQ8AXuk9FAvVxCNZh
    const newWallet = {
      name,
      balance: 0,
      unconfirmedBalance: 0,
      isLegacy: true,
      userId: me.email_hash,
      created: new Date(),
    }
    const { insertedId } = await db.collection('wallet').insertOne(newWallet)
    newWallet._id = insertedId
  
    //console.log("wallet created:", newWallet)
    await pubsub.publish('new-wallet', { newWallet } )
    return newWallet
  },

  // Legacy Wallet
  async addPrivateKey(parent, { walletId, addressId, name, pkCypher }, { db, me, pubsub, last_block }) {
    // multisignature address
    const newAddress = {
      _id: addressId,
      pkCypher,
      name,
      balance: 0,
      unconfirmedBalance: 0,
      parentId: ObjectID(walletId),
      created: new Date(),
    }
    const addressUtxos = await common.loadAddressUtxos(addressId, db, last_block.height)

    if(!!addressUtxos.total) {
      const res = await db.collection('wallet').findOneAndUpdate( { _id: ObjectID(walletId), userId: me.email_hash }, { $inc: { balance: addressUtxos.total } }, { returnOriginal: false } )
      const wallet = res.value

      for(const newCoin of addressUtxos.coins) {
        newCoin.walletConfirmedBalance = wallet.balance + addressUtxos.total
        newCoin.walletUnconfirmedBalance = wallet.unconfirmedBalance
        await pubsub.publish('new-coin', { newCoin } )
      }
      newAddress.balance = addressUtxos.total
    }
    const { insertedId } = await db.collection('address').insertOne(newAddress)
    
    //console.log("addPrivateKey newAddress:", newAddress)
    return newAddress
  },

  async createAddress(parent, { walletId, name }, { db, me, pubsub, jwtToken }) { 
    const { address } = await common.createAddress(walletId, name, db, me, pubsub, jwtToken )
    return address
  },

  async saveMultisig(parent, { input }, { db, me, pubsub }) {
    const newMultisig = {
      ...input,
      creatorId: me.email_hash,
      created: new Date(),
      scriptAddressId: null,
      output: null,
      witness: null,
    }
    const { insertedId } = await db.collection('multisig').insertOne(newMultisig)
    newMultisig._id = insertedId
    
    await db.collection('paidservice').updateOne( { userId: me.email_hash, serviceId: common.service.jointwallet }, { $set: { used: true } } )
    //console.log("mutation newMultisig:", newMultisig)
    await pubsub.publish('new-multisig', { newMultisig } )
    await alerts.newAlerts(db, pubsub, input.signers.filter(s => s.userId != me.email_hash).map(s=>s.userId), alerts.codes.multisig.created, insertedId, aux1=me.nick, aux2=input.name)
    return newMultisig
  },

  async multisigSetPubkey(parent, { multisigId, addressId }, { db, me, pubsub, jwtToken }) { console.log("multisigSetPubkey called:", multisigId, addressId)
    const res = await  db.collection('multisig').findOneAndUpdate( { _id: ObjectID(multisigId), 'signers.userId': me.email_hash }, 
                                                  { $set: { 'signers.$.addressId': addressId} }, { returnOriginal:false } )
    const multisig = res.value
    const alert = { userId: me.email_hash, entryId:ObjectID(multisigId), code: alerts.codes.multisig.created }                                                 
    await db.collection('alert').deleteOne( alert ) 
    await pubsub.publish('alert-deleted', { alertDeleted: alert } )                                                
    const scriptPubkeySet = {
      userId: me.email_hash,
      addressId
    }                                                  
    await pubsub.publish('script-pubkey-set', { scriptPubkeySet, scriptId: multisigId } ) 
    // create Address?
    const isComplete = multisig.signers.every((signer, i) => { // check that every row has userId
      return !!signer.addressId
    })
    //console.log("isComplete:", isComplete)
    if(!!isComplete) 
      await module.exports.multisigSetAddress(parent, { input: multisig }, { db, pubsub, jwtToken })
    return true
  },

  // used to be called from frontEnd by now from multisigSetPubkeyGo
  async multisigSetAddress(parent, { input }, { db, pubsub, jwtToken }) {
    let pubkeys = []
    for(i=0; i<input.signers.length; i++) {
      const addr = await db.collection('address').findOne( { _id: input.signers[i].addressId } )
      //console.log("signer: ", input.signers[i].nick, "addr:", addr)
      const wallet = await db.collection('wallet').findOne( { _id: addr.parentId } )
      //console.log("wallet:", wallet)
      const xpub = common.decrypt(wallet.xpub, jwtToken)
      const node = bip32.fromBase58(xpub, network)
      pubkeys.push(node.derivePath(addr.index+"").publicKey)
    }
    pubkeys = pubkeys.sort((a, b) => a.compare(b))
    const p2ms = bitcoin.payments.p2ms({ m: input.M, pubkeys, network }) // multisignature script
    const p2wsh = bitcoin.payments.p2wsh({ redeem: p2ms, network })

    const output = common.encrypt(p2wsh.output.toString('hex'), jwtToken)
    const witness = common.encrypt(p2wsh.redeem.output.toString('hex'), jwtToken)

    const { modifiedCount } = await db.collection('multisig').updateOne( {_id: ObjectID(input._id) }, { $set: { output, witness, scriptAddressId: p2wsh.address } } )
    if(modifiedCount != 1) {} // error !!!
    // multisignature address
    const newAddress = {
      _id: p2wsh.address,
      name: 'Joint: ' + input.name,
      balance: 0,
      unconfirmedBalance: 0,
      parentId: ObjectID(input._id),
      created: new Date(),
    }
    const { insertedId } = await db.collection('address').insertOne(newAddress)
    //console.log("mutation newAddress:", newAddress)
    const ret = await pubsub.publish('new-address', { newAddress } )

    // Alerts multisg p2hs created
    let usersId = new Set( input.signers.map(s => s.userId ))
    usersId.add(input.creatorId)
    await alerts.newAlerts(db, pubsub, usersId, alerts.codes.multisig.address_created, input._id, aux1=input.name)
  },


  // Escrow
  async saveEscrow(parent, { input }, { db, me, pubsub, jwtToken }) { 
    let profile = await db.collection('profile').findOne({ userId: input.thirdpartyUserId }) 
    const { address } = await common.createAddress(profile.walletId, "Escrow: " + input.name, db, me, pubsub, jwtToken )
    input.signers.unshift( { userId: input.thirdpartyUserId, nick: profile.companyName, addressId: address._id } )
    const newMultisig = {
      name: input.name,
      thirdpartyUserId: input.thirdpartyUserId,
      M: 2,
      N: 3,
      creatorId: me.email_hash,
      signers: input.signers,
      created: new Date(),
      scriptAddressId: null,
      output: null,
      witness: null,
    }
    const { insertedId } = await db.collection('multisig').insertOne(newMultisig)
    newMultisig._id = insertedId
    await db.collection('paidservice').updateOne( { userId: me.email_hash, serviceId: common.service.jointwallet3party }, { $set: { used: true } } )
    //console.log("mutation newMultisig:", newMultisig)
    await pubsub.publish('new-multisig', { newMultisig } )
    await alerts.newAlerts(db, pubsub, input.signers.filter(s => s.userId != input.thirdpartyUserId).map(s=>s.userId), alerts.codes.multisig.created, insertedId, aux1=me.nick, aux2=input.name)
    return newMultisig
  },

  async saveSmartcontract(parent, { input }, { db, me, pubsub }) {
    const newSmartcontract = {
      ...input,
      creatorId: me.email_hash,
      created: new Date(),
      scriptAddressId: null,
      output: null,
      witness: null,
    }
    const { insertedId } = await db.collection('smartcontract').insertOne(newSmartcontract)
    newSmartcontract._id = insertedId
    await pubsub.publish('new-smartcontract', { newSmartcontract } )
    await alerts.newAlerts(db, pubsub, input.signers.filter(s => s.userId != me.email_hash).map( s => s.userId ), alerts.codes.smartcontract.created, insertedId, aux1=me.nick, aux2=input.name)
    return newSmartcontract
  },

  async saveRecurringPayPay(parent, { scriptId, satoshis, fiat, currency }, { db, me, pubsub }) {
    const newRecurringPayment = {
      scriptId,
      satoshis,
      currency,
      fiat,
      time: new Date(),
    } 
    const { insertedId } = await db.collection('recurringpaypay').insertOne(newRecurringPayment)
    newRecurringPayment._id = insertedId
    //console.log("newPayment:", newRecurringPayment)
    //await pubsub.publish('new-time-payment', { newRecurringPayment } )
    return newRecurringPayment
  },

  async saveMultisigPayment(parent, { input }, { db, me, pubsub }) { //console.log("save multisig pay:", input)
    const date = new Date()
    const utxos = input.utxos
    delete input.utxos
    const { concept, icon, nicks, sender } = input.txextrainfo
    delete input.txinfo
    const newMultisigPayment = {
      concept,
      icon,
      nicks,
      sender,
      ...input,
      creatorId: me.email_hash,
      created: date,
    }
    const { insertedId } = await db.collection('msigpayment').insertOne(newMultisigPayment)
    newMultisigPayment._id = insertedId
    newMultisigPayment.utxos = utxos.map( u => { return { _id: u._id, utxo_tx: u.tx } } )
    // alerts
    const multisig = await db.collection('multisig').findOne({ _id: ObjectID(input.multisigId) } )
    await alerts.newAlerts2(db, pubsub, multisig.signers.filter(s => s.userId != me.email_hash).map(s => s.userId), alerts.codes.multisig.payment_created,  multisig._id, code2=insertedId, aux1=multisig.name, aux2=multisig.M, aux3=insertedId)

    await pubsub.publish('new-multisig-payment', { newMultisigPayment } )
    let updates = utxos.map ( u => { return {
      updateOne: { 
        filter: { utxo_tx: u.tx, utxo_n: u.n },
        update: { $set: { pending_payment: insertedId } }
      }
    }})
    db.collection('coin').bulkWrite( updates )
    return newMultisigPayment
  },

  async multisigPaymentSign(parent, { multisigId, msigpayId, signer}, { db, me, pubsub, btcNode, jwtToken, txs_extrainfo }) {
    const res = await db.collection('msigpayment').findOneAndUpdate( { _id: ObjectID(msigpayId) }, 
                       { $push: { signers: { userId: me.email_hash, nick: me.nick, signature: signer.signature, date: new Date() } } }, 
                       { returnOriginal:false } )
    const pay = res.value
    if(!pay) return false
    // delete alert to sign                                             
    await db.collection('alert').deleteOne( { userId: me.email_hash, code2: msigpayId }  ) 
    await pubsub.publish('alert-deleted', { alertDeleted: { userId: me.email_hash, entryId: ObjectID(multisigId), code: alerts.codes.multisig.payment_created }  } )   

    const multisig = await db.collection('multisig').findOne({ _id: ObjectID(multisigId) } )
    //console.log("multisigPaymentSign multisig:", multisig)
    await alerts.newAlerts2(db, pubsub, multisig.signers.filter(s => s.userId != me.email_hash).map(s => s.userId), alerts.codes.multisig.payment_signed,  multisig._id, code2=ObjectID(msigpayId), aux1=multisig.name, aux2=me.nick, aux3=msigpayId)
    //console.log("alerts created")
    const paymentSigned = {
      ...signer,
      signedId: msigpayId
    }
    await pubsub.publish('payment-signed', { paymentSigned, scriptId: multisigId } )

    // all signed
    const allSigned = pay.signers.length == multisig.M
    if(!allSigned)
      return { tx_id: null, signedOk: true }
    //console.log("allSigned:", allSigned)
    const psbt = bitcoin.Psbt.fromBase64(pay.tx)
    //console.log("pay.signers:", pay.signers)
    const signatures = pay.signers.filter(s => !!s.signature).map(s => bitcoin.Psbt.fromBase64(s.signature))
    //console.log("signatures:", signatures)
    psbt.combine(...signatures)
    //console.log("finalizing all inputs")
    psbt.finalizeAllInputs();
    //console.log("creating tx for broadcasting")
    const tx = psbt.extractTransaction()
    //const size = tx.virtualSize()
    //console.log("real tx virtualSize:", size)
    const tx_id =  tx.getId() // save to db.
    const tx_hex = tx.toHex()
    const txextrainfo = { concept: pay.concept, icon: pay.icon, nicks: pay.nicks, sender: pay.sender }
    const collection = 'msigpayment'
    try {
    await module.exports.broadcastTx(parent, { tx_id, tx_hex, txextrainfo, collection, scriptId: multisig._id, pay_id: pay._id }, { db, pubsub, btcNode, jwtToken, txs_extrainfo })
    } catch(e) {
      console.log("multisigPaymentSign broadcastTX error:", e)
      return { tx_id: null, signedOk: true }
    }
    return { tx_id, signedOk: true }
  },

  // heir signs payment to receive inheritance
  async inheritancePaymentSigned(parent, { inheritanceId, tx, path }, { db, me, pubsub, btcNode, jwtToken }) { 
    console.log("singed inheritance tx:", tx)
    //console.log("inheritancePaymentSigned inheritanceId:", inheritanceId, tx.substring(0, 10))
    const { matchedCount } = await db.collection('inheritance').updateOne( {_id: ObjectID(inheritanceId) }, { $set: { tx, path } } )
    const res = await db.collection('inheritance').findOneAndUpdate( { _id: ObjectID(inheritanceId) }, { $set: { tx, path : common.encrypt(JSON.stringify(path), jwtToken)} }, { returnOriginal:false } )
    const inheritance = res.value
    //console.log("signing inhs:", inheritance)
    await alerts.deleteAlerts( db, pubsub, { userId: me.email_hash, code: alerts.codes.inheritance.execution_heir } ) // it's just one alert
    // notary or bapp has signed the inheritance
    if(inheritance.thirdpartyUserId == me.email_hash) { //console.log("bapp has signed an inheritance") // bapp or 3rd party 
      const creator = inheritance.signers[1]
      inheritance.activeHeirs.forEach(s => {
        //console.log("inheritancePaymentSigned alert to:", s.nick)
        alerts.newAlert(db, pubsub, s.userId, alerts.codes.inheritance.execution_heir, inheritance._id, aux1=creator.nick, aux2=s.addressId)
      })
    }
    // all signed
    const allSigned = path.steps.every(step => {
      if(step.type == 'SIGNATURE' && !step.sigs) return false // signature not signed
      else if(step.type == 'MULTISIGNATURE') {
        const signersNum = step.signers.reduce( (sum, signer) => {
          return !!signer.sigs ? sum + 1 : sum
        }, 0)
        if(signersNum < step.number) return false // missing signatures
      }
      return true
    })
    if(!allSigned)
      return { tx_id: null, signedOk: true }
    //console.log("allSigned:", allSigned)

    const psbt = bitcoin.Psbt.fromBase64(tx)
    tx = common.path2Tx(psbt, path)
    const bytes = tx.virtualSize()
    console.log("tx virtual bytes:", bytes)
    const tx_id =  tx.getId() // save to db.
    const tx_hex = tx.toHex()
    console.log("tx_hex:", tx_hex)
    const sender = inheritance.signers[1].nick
    const txextrainfo = { concept: `Inheritance Plan ${inheritance.name} payment`, icon: 'family.svg', nicks: [], sender: sender }
    const collection = 'inheritance'
    try {
    await module.exports.broadcastTx(parent, { tx_id, tx_hex, txextrainfo, collection, scriptId: inheritance._id }, { db, pubsub, btcNode, jwtToken, txs_extrainfo })
    } catch(e) {
      console.log("inheritancePaymentSigned broadcastTX error:", e)
      return { tx_id: null, signedOk: false,error: e.toString() }
    }
    await alerts.deleteAlerts(db, pubsub, { entryId: ObjectID(inheritance._id), code: alerts.codes.inheritance.execution_heir } )
    return { tx_id, signedOk: true }
  },

  async deleteMultisigPayment( parent, { multisigId, msigpayId }, { db, me, pubsub }) {
    const { deletedCount } = await db.collection('msigpayment').deleteOne( { _id: ObjectID(msigpayId) } )
    if( deletedCount == 1) {
      const freed = await db.collection('coin').find( { pending_payment: ObjectID(msigpayId) } ).toArray()
      const paymentDeleted = {
        paymentId: msigpayId,
        freed_utxos: freed
      }  
      await alerts.deleteAlerts(db, pubsub, { code2: ObjectID(msigpayId) } )
      const multisig = await db.collection('multisig').findOne({ _id: ObjectID(multisigId) } )
      await alerts.newAlerts2(db, pubsub, multisig.signers.filter(s => s.userId != me.email_hash).map(s => s.userId), alerts.codes.multisig.payment_deleted,  multisig._id, code2=null, aux1=multisig.named)

      await pubsub.publish('payment-deleted', { paymentDeleted, scriptId: multisigId } )
      await db.collection('coin').updateMany( { pending_payment: ObjectID(msigpayId) }, { $unset: { pending_payment: "" } } )
    }
    return msigpayId
  },

  async saveSmartcontractPayment(parent, { input }, { db, me, pubsub }) {
    const date = new Date()
    const utxos = input.utxos
    delete input.utxos
    const { concept, icon, nicks, sender } = input.txextrainfo
    delete input.txinfo
    const newPayment = {
      concept,
      icon,
      nicks,
      sender,
      ...input,
      creatorId: me.email_hash,
      created:date,
    }
    const { insertedId } = await db.collection('payment').insertOne(newPayment)
    newPayment._id = insertedId
    newPayment.utxos = utxos.map( u => { return { _id: u._id, utxo_tx: u.tx } } )
    await pubsub.publish('new-payment', { newPayment } )
    /*let updates = utxos.map ( u => { return {
      updateOne: { 
        filter: { utxo_tx: u.tx, utxo_n: u.n },
        update: { $set: { pending_payment: insertedId } }
      }
    }})
    db.collection('coin').bulkWrite( updates )*/
    return newPayment
  },


  async deletePayment( parent, { scriptId, paymentId }, { db, pubsub }) {
    const { deletedCount } = await db.collection('payment').deleteOne( { _id: ObjectID(paymentId) } )
    if( deletedCount == 1) {
      const freed = await db.collection('coin').find( { pending_payment: ObjectID(paymentId) } ).toArray()
      const paymentDeleted = {
        paymentId: paymentId,
        freed_utxos: freed,
      }
      //console.log("paymentDeleted:", paymentDeleted)
      await pubsub.publish('payment-deleted', { paymentDeleted, scriptId } )
      db.collection('coin').updateMany( { pending_payment: ObjectID(paymentId) }, { $unset: { pending_payment: "" } } )
    }
    return paymentId
  },

  async setWalletName(parent, { _id, name }, { db, me, pubsub }) {
    const { modifiedCount } = await db.collection('wallet').updateOne( { _id: ObjectID(_id), userId: me.email_hash }, { $set: { name: name } } )
    //console.log("modifiedCount:", modifiedCount)
    //await pubsub.publish('wallet-name-set', modifiedCount == 1 ) 
    return modifiedCount == 1 
  },

  async saveAlert(parent, { input }, { db, me, pubsub }) {
    const newAlert = {
      ...input,
      created: new Date(),
    }
    const { insertedId } = await db.collection('alert').insertOne(newAlert)
    newAlert._id = insertedId
    await pubsub.publish('new-alert', { newAlert }) 
    return newAlert
  },

  async deleteAlert( parent, { entryId, code }, { db, me, pubsub }) {
    const alertDeleted = { userId: me.email_hash, entryId: ObjectID(entryId), code: code } // dleteMany !!!
    const { deletedCount } = await db.collection('alert').deleteMany( { entryId: ObjectID(entryId), code: code } )
    if( deletedCount == 1) {
      await pubsub.publish('alert-deleted', { alertDeleted } )
    }
    return alertDeleted
  },

  async deleteAlertById( parent, { _id }, { db, me, pubsub }) {
    //console.log("deleteAlertById _id:", _id)
    const alertDeleted = {  _id, userId: me.email_hash }
    const { deletedCount } = await db.collection('alert').deleteOne( { _id: ObjectID(_id), userId: me.email_hash } )
    if( deletedCount == 1) {
      await pubsub.publish('alert-deleted', { alertDeleted } )
    }
    return alertDeleted
  }, 

  async smartcontractPaymentSign(parent, { smartcontractId, payId, path }, { db, me, pubsub }) {
    const { matchedCount } = await db.collection('payment').updateOne( {_id: ObjectID(payId) }, { $set: { path } } )
    if(matchedCount != 1) return false
    const paymentSigned = {
      userId: me.email_hash,
      signedId: payId,
      path
    }
    // delete alert to sign
    await alerts.deleteAlerts( db, pubsub, { userId: me.email_hash, entryId: ObjectID(smartcontractId), code: alerts.codes.smartcontract.payment_created } ) // it's just one alert 

    // ALERTS
    /*const path_signersId = new Set(common.get_path_signersId(path)) // no userId repetitions
    path_signersId.delete(me.email_hash) // no need to alert signer he signed.
    await alerts.newAlerts(db, pubsub, path_signersId, alerts.codes.smartcontract.payment_signed, smartcontractId, aux1=smartcontractName, aux2=me.nick)*/
    
    await pubsub.publish('payment-signed', { paymentSigned, scriptId: smartcontractId } )
    //console.log("payment signed matchedCount:", matchedCount)
    return true
  },
 
  async setUserOpt(parent, { name, value }, { db, me }) {
    const { upsertedId, matchedCount } = await db.collection('opt').updateOne( { name: name, userId: me.email_hash }, 
                                                                    { $set: { value: value } }, 
                                                                    { upsert: true } )
    return matchedCount == 1 || !!upsertedId
  },

  async setUserSetting(parent, { name, value }, { db, me }) {
    const str = `settings.${name}`
    const { upsertedId, matchedCount } = await db.collection('user').updateOne( { _id: me._id }, 
                                                                    { $set: { [str]: value } }, 
                                                                    { upsert: true } )                                                           
    return matchedCount == 1 || !!upsertedId
  },

  async updateUser(parent, { field, value }, { db, me }) {
    const { upsertedId, matchedCount } = await db.collection('user').updateOne( { _id: me._id }, 
                                                                    { $set: { [field]: value } }, 
                                                                    { upsert: true } )                                                           
    return matchedCount == 1 || !!upsertedId
  },

  async setUserFrequent(parent, { nick, userId }, { db, me }) {
    //console.log("nick:", nick, "userId:", userId)
    const str = `frequents.${nick}`
    const { upsertedId, matchedCount } = await db.collection('user').updateOne( { _id: me._id }, 
                                                                    { $set: { [str]: userId } }, 
                                                                    { upsert: true } )                                                           
    return matchedCount == 1 || !!upsertedId
  },

  async delUserFrequent( parent, { nick }, { db, me, pubsub }) {
    const str = `frequents.${nick}`
    const { matchedCount } = await db.collection('user').updateOne( { _id: me._id },
                                                                    { $unset: {[str]: ""} })                                                           
    return matchedCount == 1
  },

  async setAddressName(parent, args, { db, me, pubsub }) {
    const { modifiedCount } = await db.collection('address').updateOne( { _id: args._id }, { $set: { name: args.name } } )
    await pubsub.publish('address-name-set', modifiedCount == 1 ) 
    return modifiedCount == 1
  },

  async setUserDefaultAddress(parent, { addressId }, { db, me, pubsub }) {
    const { matchedCount } = await db.collection('user').updateOne({ _id: me._id},  {$set: { defaultAddress: addressId }})
    //console.log("setUserDefaultAddress matchedCount:", matchedCount)
    //await pubsub.publish('user-defaultAddress-set', modifiedCount == 1 ) 
    return matchedCount == 1
  },

  async smartcontractSetPubkey(parent, { scriptId, addressId, tree }, { db, me, pubsub, jwtToken }) {
    //console.log(smartcontractId, userId,  addressId)
    const res = await db.collection('smartcontract').findOneAndUpdate( { _id: ObjectID(scriptId), 'signers.userId': me.email_hash }, 
                                                  { $set: { 'signers.$.addressId': addressId, tree } }, { returnOriginal:false } )
    const smartcontract = res.value                                                  
    const alert = { userId: me.email_hash, entryId: ObjectID(scriptId), code: alerts.codes.smartcontract.created }    
    await db.collection('alert').deleteOne( alert ) 
    await pubsub.publish('alert-deleted', { alertDeleted: alert } )                        
    const scriptPubkeySet = {
      userId: me.email_hash,
      addressId
    }                                              
    await pubsub.publish('script-pubkey-set', { scriptPubkeySet, scriptId} )
    const hasAllPubkeys = smartcontract.signers.every((signer, i) => { // check that every signer has addressId
      return !!signer.addressId
    })
    if(!hasAllPubkeys)
      return { ok: true }
    await module.exports.smartcontractSetP2sh(parent, { smartcontract, tree }, { db, pubsub, jwtToken } )
    return { scriptAddress: true,  ok: true }
  },

  // called by smartcontractSetPubkey above
  async smartcontractSetP2sh(parent, { smartcontract, tree }, { db, pubsub, jwtToken }) {
    const signers = smartcontract.signers.map(s => { 
      return { userId: s.userId, nick: s.nick, addressId: s.addressId }
    })
    for(let signer of signers) {
      const addr = await db.collection('address').findOne( { _id: signer.addressId } )
      const wallet = await db.collection('wallet').findOne( { _id: ObjectID(addr.parentId) } )
      const xpub = common.decrypt(wallet.xpub, jwtToken)
      const node = bip32.fromBase58(xpub, network)
      signer.publicKey = node.derivePath(addr.index+"").publicKey
    }
    const script = common.generateBitcoinScript(tree, signers)  
    const redeemScript = bitcoin.script.compile(script) // REDEEM Script
    const scriptBytes = redeemScript.length
    const p2wsh = bitcoin.payments.p2wsh({ redeem: { output: redeemScript, network }, network })
    const output = common.encrypt(p2wsh.output.toString('hex'), jwtToken)
    const witness = common.encrypt(p2wsh.redeem.output.toString('hex'), jwtToken)
    const address = p2wsh.address
    const { modifiedCount } = await db.collection('smartcontract').updateOne( { _id: ObjectID(smartcontract._id) }, { $set: { output, witness, scriptBytes, scriptAddressId: address } } )
    if(modifiedCount != 1) {} // error !!!
    // smartcontract address
    const newAddress = {
      _id: address,
      name: smartcontract.name,
      balance: 0,
      unconfirmedBalance: 0,
      parentId: smartcontract._id,
      created: new Date(),
    }
    const { insertedId } = await db.collection('address').insertOne(newAddress)
    await pubsub.publish('new-address', { newAddress } )
    // Alerts multisg p2hs created
    let usersId = new Set( smartcontract.signers.map(s => s.userId ))
    usersId.add(smartcontract.creatorId)
    await alerts.newAlerts(db, pubsub, usersId, alerts.codes.smartcontract.address_created, smartcontract._id, aux1=smartcontract.name)
    return true
  },

  // INHERITANCE ****************************************************************************************
  async saveInheritance(parent, { name, signers, tree, testatorWalletId }, { db, me, pubsub, jwtToken }) { console.log("saveInheritance called testatorWalletId:", testatorWalletId)
    // testator signer
    const { address: testatorAddress } = await common.createAddress(testatorWalletId, `Inheritance: ${name}`, db, me, pubsub, jwtToken )
    signers[0].addressId = testatorAddress._id
    tree.addressId = testatorAddress._id
    // bapp signer
    const fields = { name: `Inheritance: ${signers[0].nick}`, process: true }
    const { wallet: bappWallet, address: bappAddress } = await common.generateAddress(common.inheritance_wallet(), fields, db, jwtToken)
    signers.unshift( { userId: bappWallet.userId, nick: 'Bapp', addressId: bappAddress._id } )
    const newInheritance = {
      name,
      signers,
      tree,
      testatorId: tree.userId,
      timetriggered: true,
      thirdpartyUserId: bappWallet.userId,
      thirdpartyAddressId: bappAddress._id,
      created: new Date(),
      status: 0, 
      timetrigger: 1,
      scriptAddressId: '',
      witness: '',
    }
    const { insertedId } = await db.collection('inheritance').insertOne(newInheritance)
    newInheritance._id = insertedId
    await db.collection('paidservice').updateOne( { userId: me.email_hash, serviceId: common.service.inheritance }, { $set: { used: true } } )
    await pubsub.publish('new-inheritance', { newInheritance } )
    signers.filter( (s,i) => i >= 2).forEach(s => { // || (!!thirdparty && thirdparty.userId)).forEach(s => {
      alerts.newAlert(db, pubsub, s.userId, alerts.codes.inheritance.created, insertedId, aux1=tree.nick, aux2=s.level, aux3=name)
    })
    return newInheritance
  },

    // 3party inheritance
    async save3partyInheritance(parent, { name, signers, tree, thirdpartyWalletId }, { db, me, pubsub, jwtToken }) {  console.log("save3partyInheritance called thirdpartyId:", me.thirdpartyId)
    console.log("signers:", JSON.stringify(signers, null, 4))
    console.log("tree:", JSON.stringify(tree, null, 4))
    console.log("thirdpartyWalletId:", thirdpartyWalletId)
      // thirdparty signer
      const { address } = await common.createAddress(thirdpartyWalletId, `Inheritance: ${name}`, db, me, pubsub, jwtToken )
      signers.unshift( { userId: me.email_hash, nick: me.nick, addressId: address._id } )
      const testatorId = tree.userId
      const newInheritance = {
        name,
        signers,
        tree,
        testatorId,
        thirdpartyId: me.thirdpartyId,
        thirdpartyUserId: me.email_hash,
        thirdpartyAddressId: address._id,
        isThirdParty: true,
        created: new Date(),
        status: 0,
        scriptAddressId: null,
        witness: null,
      }
      const { insertedId } = await db.collection('inheritance').insertOne(newInheritance)
      newInheritance._id = insertedId
      //await db.collection('paidservice').updateOne( { userId: me.email_hash, serviceId: common.service.inheritances3party }, { $set: { used: true } } )
      //console.log("newInheritance 3 party:", newInheritance)
      await pubsub.publish('new-inheritance', { newInheritance } )
      // alerts
      tree.children.forEach(s => {
        alerts.newAlert(db, pubsub, s.userId, alerts.codes.inheritance.created, insertedId, aux1=tree.nick, aux2=s.level, aux3=name)
      })
      await alerts.newAlert(db, pubsub, testatorId, alerts.codes.inheritance.created3party, insertedId, aux3=name)
      return newInheritance
    },

  async newTimeTrust(parent, { name, beneficiary, executionDate, walletId }, { db, me, pubsub, jwtToken }) { //console.log("newTimeTrust called ")    
    let testatorDate = executionDate + 86400 
    let backDate =  executionDate + 86400*2
    if(common.isMainnet() || common.isRegtest()) {
      testatorDate = executionDate + 86400*30*6 // mainnet 6 months since executionDate
      backDate =  executionDate + 86400*30*12 // mainnet 12 months since executionDate
    }
    const newTrust = {
      name,
      beneficiary,
      executionDate,
      testatorDate,
      backDate,
      testatorId: me.email_hash,
      walletId,
      testatorNick: me.nick,                  
      created: new Date(),
      status: 0, 
      scriptAddressId: '',
    }
    //console.log("newTrust:", newTrust)
    const { insertedId } = await db.collection('trust').insertOne(newTrust)
    newTrust._id = insertedId
    await db.collection('paidservice').updateOne( { userId: me.email_hash, serviceId: common.service.trust }, { $set: { used: true } } )
    alerts.newAlert(db, pubsub, beneficiary.userId, alerts.codes.trust.created, insertedId, aux1=me.nick, aux2=name)
    return newTrust
  },
  
  async trustSetPubkey(parent, { scriptId, walletId }, { db, me, pubsub, jwtToken }) { // console.log("trustSetPubkey:", scriptId, walletId)
    const trust = await db.collection('trust').findOne( { _id: ObjectID(scriptId), 'beneficiary.userId': me.email_hash } ) //; console.log("trusttt:", trust)
    // beneficary data
    const beneficiaryData = await common.createAddress(walletId, `Trust: ${trust.name}`, db, me, pubsub, jwtToken ) // ; console.log("beneficiaryData:", beneficiaryData)
    // testator data
    const testatorData = await common.createAddress(trust.walletId, `Trust: ${trust.name}`, db, me, pubsub, jwtToken ) // ; console.log("testatorData:", testatorData)
    // back address  
    const fields = { name: `Trust BackAddress: ${me.nick}`, trustId: trust._id }
    const backData = await common.generateAddress(common.trusts_wallet(), fields, db, jwtToken)
    if(!trust) return false
    const tree = {
    }
    //console.log("tree:", JSON.stringify(tree, null, 4) )  

    const script = common.generateBitcoinScript(tree, [ { userId: me.email_hash, publicKey: beneficiaryData.publicKey }, 
                                                        { userId: trust.testatorId, publicKey: testatorData.publicKey }, 
                                                        { userId: backData.wallet.userId, publicKey: backData.publicKey } ] )
    const redeemScript = bitcoin.script.compile(script) // REDEEM Script
    //console.log("reddemScript.length:", redeemScript.length)
    const p2wsh = bitcoin.payments.p2wsh({ redeem: { output: redeemScript, network }, network } )
    // known scriptBytes
    const output = common.encrypt(p2wsh.output.toString('hex'), jwtToken)
    const witness = common.encrypt(p2wsh.redeem.output.toString('hex'), jwtToken)
    const address = p2wsh.address
    //console.log("trust address:", address)
    const { modifiedCount } = await db.collection('trust').updateOne( {_id: ObjectID(trust._id), 'beneficiary.userId': me.email_hash }, 
                      { $set: { 'beneficiary.addressId': beneficiaryData.address._id, output, witness, scriptAddressId: address, status: 1,
                                testatorAddressId: testatorData.address._id, backUserId: backData.wallet.userId, backAddressId: backData.address._id } } )
    if(modifiedCount != 1) return false // error !!!
    const newAddress = {
      _id: address,
      name: 'Trust: ' + trust.name,
      balance: 0,
      unconfirmedBalance: 0,
      parentId: trust._id,
      created: new Date(),
    }
    const { insertedId } = await db.collection('address').insertOne(newAddress)
    if(insertedId) { // alerts
      //console.log("insertedId: ", insertedId)
      await db.collection('alert').deleteOne( { userId: me.email_hash, entryId: ObjectID(scriptId), code: alerts.codes.trust.created } )
      await pubsub.publish('alert-deleted', { alertDeleted: { userId: me.email_hash, entryId: ObjectID(scriptId), code: alerts.codes.trust.created } } )
      await pubsub.publish('new-address', { newAddress } )
      await alerts.newAlert(db, pubsub, trust.testatorId, alerts.codes.trust.address_created, trust._id, aux1=trust.name)
    }
    return true
  },

  // called from testator/heir alert
  async inheritanceSetPubkeyAndAddress(parent, { scriptId, signingWalletId, recipientAddressId }, { db, me, pubsub, jwtToken }) {
    console.log("inheritanceSetPubkeyAndAddress scriptId:", scriptId, "signingWalletId:", signingWalletId, "recipientAddressId:", recipientAddressId)
    const inheritance = await db.collection('inheritance').findOne(
                    { _id: ObjectID(scriptId), signers: { $elemMatch: { userId: me.email_hash } } } )              
    if(!inheritance) return false
    const { address } = await common.createAddress(signingWalletId, "Inheritance: "+inheritance.name, db, me, pubsub, jwtToken )
    const addressId = address._id
    recipientAddressId = !!recipientAddressId ? recipientAddressId : address._id
    inheritance.signers.some( s => { // add addressId to signer
      if(s.userId == me.email_hash) {
        s.addressId = addressId
        s.recipientAddressId = recipientAddressId
        return true
      }
      return false
    }) // add addessId to tree
    const stack = [ inheritance.tree ] 
    while (stack.length) {
      const node = stack.pop()
      if(node.userId == me.email_hash) {
        node.addressId = addressId
        node.recipientAddressId = recipientAddressId
      }
      if(!!node.children) stack.push(...node.children)
    }
    let { modifiedCount } = await db.collection('inheritance').updateOne( { _id: ObjectID(scriptId), 'signers.userId': me.email_hash }, 
                        { $set: { 'signers.$.addressId': addressId, 'signers.$.recipientAddressId': recipientAddressId, tree: inheritance.tree } })
    if(modifiedCount == 0) return false 
    await db.collection('alert').deleteOne( { userId: me.email_hash, entryId: ObjectID(scriptId), code: alerts.codes.inheritance.created } )
    await pubsub.publish('alert-deleted', { alertDeleted: { userId: me.email_hash, entryId: ObjectID(scriptId), code: alerts.codes.inheritance.created } } )
    if(me.email_hash != inheritance.testatorId) // in thirparty inheritances testador adds pubkey after inheritance creation
      await alerts.newAlert(db, pubsub, inheritance.testatorId, alerts.codes.inheritance.pubkeyset, ObjectID(scriptId), aux1=me.nick)
    const scriptPubkeySet = {
      userId: me.email_hash,
      addressId,
      tree: JSON.stringify(inheritance.tree)
    }
    await pubsub.publish('script-pubkey-set', { scriptPubkeySet, scriptId} )
    const hasAllPubkeys = inheritance.signers.every(signer => !!signer.addressId )// ; console.log("hasAllPubkeys:", hasAllPubkeys, inheritance.signers)
    if(!hasAllPubkeys) return true
    return common.inheritanceCreateScriptAddress(db, pubsub, jwtToken, inheritance)
  },

  // call from purging the tree by creator/legal.
  async inheritanceSetScriptAddress(parent, { scriptId, tree, originalTree }, { db, me, pubsub, jwtToken }) { 
    //console.log("inheritanceSetScriptAddress tree:", tree)
    const inheritance = await db.collection('inheritance').findOne( { _id: ObjectID(scriptId) } )
    // unique signers array
    let unique = new Set()
    const signers = [inheritance.signers[0]] // 3rd party / bapp
    const stack = [ tree ]
    while (stack.length) {
      const node = stack.pop()
      if(!unique.has(node.userId))
        signers.push( { userId: node.userId, nick: node.nick, addressId: node.addressId} )
      unique.add(node.userId)
      if(!!node.children) stack.push(...node.children)
    }
    //console.log("new signers:", signers.map(s=>s.nick))
    const res = await db.collection('inheritance').findOneAndUpdate( { _id: ObjectID(scriptId) },
                                                                            { $set: { signers, tree, originalTree } }, { returnOriginal:false } )
    return common.inheritanceCreateScriptAddress(db, pubsub, jwtToken, res.value)
  },

  async inheritanceThirdPartyExecute(parent, { scriptId, finalTree }, { db, me, pubsub, jwtToken, fees }) {
    const inheritance = await db.collection('inheritance').findOne(
                                            { _id: ObjectID(scriptId), thirdpartyUserId: me.email_hash } )
    //console.log("inheritance:", inheritance)
    inheritance.tree = finalTree
    return common.buildInheritanceTx(db, pubsub, jwtToken, inheritance, { userId: inheritance.thirdpartyUserId, addressId: inheritance.thirdpartyAddressId }, fees)
  },

  async setInheritanceStatus(parent, { _id, status }, { db, me }) {// console.log("_id:", _id, "status:", status)
    const { modifiedCount } = await db.collection('inheritance').updateOne( { _id: ObjectID(_id), testatorId: me.email_hash }, { $set: { status } } )
    //console.log("modifiedCount:", modifiedCount)
    return modifiedCount == 1
  },

  async setInheritanceTimeTrigger(parent, { _id, timetrigger }, { db, me }) {
    const { modifiedCount } = await db.collection('inheritance').updateOne( { _id: ObjectID(_id), testatorId: me.email_hash }, { $set: { timetrigger } } )
    return modifiedCount == 1
  },

  // addresses to recieive services payments
  async serviceAddress(parent, { serviceId }, { db, me, jwtToken }) {// console.log("serviceAddress serviceId", serviceId)
    const found_address = await db.collection('address').findOne( { serviceUserId: me.email_hash, serviceId, process: true } )// ; console.log("found_address:", found_address)
    if(!!found_address) return found_address
   // console.log("serviceAddress not found so creating a new one")
    const referrer = me.referrer
    //console.log("me.referrer:", me)
    const fields = { name: `Service Payment ${common.serviceName(serviceId)}: ${me.nick}`, serviceId, serviceUserId: me.email_hash, process: true,  ...!!referrer && { referrer } }
    const { address } = await common.generateAddress(common.paidservice_wallet(), fields, db, jwtToken)
    return address
  },

  // called from origin
  // 'Bitcapp' origin = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiJCaXRjYXBwIiwiaWF0IjoxNjA2MTI4MjU2fQ.OgmaKOjAyaKiNBRn8JHwXD_Xpv_V9z7i43G36AWOaPY'
  async paidService(parent, { email_256, serviceId, value, origin }, { db, me, jwt, jwtToken }) { 
    try { 
      origin_ = jwt.verify(origin, jwtToken)
      //console.log("origin_:", origin_)
      const { insertedId } = await db.collection('paidservice').insertOne( { userId: email_256, serviceId, value, used: false, date: new Date(), origin: origin_._id } )
      //console.log("paidService insertedId:", insertedId)
      return !!insertedId
    } catch(err) { // no origin or wrong origin
      console.log("paid service:", err)
      return false
    }
  },

  async thirdpartyAddress(parent, args, { db, me, jwtToken }) { // bcrt1qguyjyh0sr42fasxjezkrxh7tzwg2w5lawdhfas
    const found_address = await db.collection('address').findOne( { thirdpartyUserId: me.email_hash, process: true } )
    if(!!found_address) return found_address
    const fields = { name: `3party Service Payment ${common.serviceName(serviceId)}: ${me.nick}`, thirdpartyUserId: me.email_hash, process: true }
    const { address } = await common.generateAddress(common.paidservice_wallet(), fields, db, jwtToken)
    return address
  },
 
  async lnActivate(parent, { walletId }, { db, me, jwtToken }) { //console.log("lnActivate: ", walletId)
    const { wallet: userWallet, address: userAddress, publicKey: userPubkey } = await common.generateAddress(walletId,  { name: "Lightning Service" }, db, jwtToken) 
    const fields = { name: `LN Service: ${me.nick}`, process: true }
    const { wallet, address, publicKey } = await common.generateAddress(common.ln_wallet(), fields, db, jwtToken)
    const pubkeys = [ userPubkey, publicKey ].sort((a, b) => a.compare(b))
    let p2ms = bitcoin.payments.p2ms({ m: 2, pubkeys, network }) // multisignature script
    const p2wsh = bitcoin.payments.p2wsh({ redeem: p2ms, network })
    const output = common.encrypt(p2wsh.output.toString('hex'), jwtToken)
    const witness = common.encrypt(p2wsh.redeem.output.toString('hex'), jwtToken)
    const newLlightning = {
      userId: me.email_hash, 
      walletId, 
      userAddressIndex: userWallet.lastChild,
      userAddressId: p2wsh.address,
      bappAddressIndex: wallet.lastChild,
      bappAddressId: address._id,
      pubkeys: pubkeys.map(pk => pk.toString('hex')),
      inContract: 0, 
      user_msats: 0,
      scriptAddressId: p2wsh.address
    }
    const { insertedId } = await db.collection('lightning').insertOne( newLlightning )
    //console.log("insertedId:", insertedId)
    if(!insertedId) { throw new Error("Error activating Instant Payments") } // error !!!
    newLlightning._id = insertedId
    // lightning address
    const newAddress = {
      _id: p2wsh.address,
      name: `LN address: ${me.nick}`,
      balance: 0,
      unconfirmedBalance: 0,
      parentId: insertedId,
      created: new Date(),
      isLightning: true,
    }
    const res = await db.collection('address').insertOne(newAddress)
    console.log("lnActivate newAddress:", newAddress )
    return newLlightning
  },

  // pay lightning invoice from bapp
  async lnpay(parent, { bolt11, invoiceId, msats, description, destination }, { db, me, lnNode, pubsub, fees } ) {//  console.log("lnpay msats:", msats, "lnpay destination:",  destination, description)
    const internal_pay = destination == common.bapp_lnid // internal bapp users ln payment
    //console.log("internal_pay:", internal_pay, "destination:", destination, "common.bapp_lnid:", common.bapp_lnid, "network:", process.env.BITCOIN_NETWORK)
    let lightning = await db.collection('lightning').findOne( { userId: me.email_hash } )
    if(!lightning) 
      throw new Error("Instant Payment Record Not Found")
    //console.log("payer lightning:", lightning)
    if(lightning.user_msats < msats)
      throw new Error("Insufficient Sending Capacidty")
    //let lnpay = await db.collection('lnpay').findOne( { payerId: me.email_hash, bolt11 } )    
    let lnpay = await db.collection('lnpay').findOne( { bolt11 } )
    //console.log("payerId lnpay:", lnpay, "bolt11:", bolt11)
    if(!!lnpay && lnpay.paid)
      throw new Error("Already paid")
    let fee = 0 // for external pay
    // EXTERNAL
    if(!internal_pay) { // EXTERNAL. create lnpay
      //console.log("EXTERNAL pay")
      let paid
      try {
        paid = await lnNode.lnService.payViaPaymentRequest( { lnd: lnNode.lnd, request: bolt11 } )
        //console.log("paid:", paid)
      } catch(e) {
        console.log("pay error:", e)
        throw new Error("LnPay Error:", e[2])
      }
      if(!paid.confirmed_at)
        throw new Error("Payment Error")    
      fee = parseInt(paid.fee_mtokens) // could be less than msats
      lnpay = {
        id: paid.id,
        bolt11, 
        payerId: me.email_hash, 
        payerNick: me.nick, 
        msats, 
        fee, 
        description,
        created: paid.confirmed_at, // we don't know better 
        paid: new Date() 
      }
      const { insertedId } = await db.collection('lnpay').insertOne( lnpay )
      lnpay._id = insertedId
      //console.log("lnpay insertedId:", insertedId)
      if(!insertedId) {  } // error !!!
    // internal pay among bapp users
    } else {   // INTERNAL. receiver processing. Same code as method: lnpayreceived
      //console.log("INTERNAL pay ---------------------------")
      const res = await db.collection('lnpay').findOneAndUpdate( { id: invoiceId },
            { $set: { paid: new Date(), payerId: me.email_hash, payerNick: me.nick } }, 
            { returnOriginal: false } )
      if(!res.value) {  // log something
        console.log("lnpay res:", res)
        return
      }
      lnpay = res.value
      //console.log('lnPayReceived:', lnpay)
      // increment recipient user_msats
      const lightning = await db.collection('lightning').findOneAndUpdate( { userId: lnpay.creatorId },
                                    { $inc: { user_msats: msats } }, 
                                    { returnOriginal: false } )
      await pubsub.publish('new-lnpay', { newLnPay: lnpay, subscriberId: lnpay.creatorId })
    }

    // decrease payer user_ mstats
    //console.log("previous ightning.user_msats: ", lightning.user_msats, "msats:", msats)
    const user_msats = parseInt(lightning.user_msats - msats - fee )
    const refundSatoshis = Math.round(lightning.inContract - user_msats/1000)
    // user has positive balance inContract
    if(refundSatoshis <= 0) 
      return lnpay
    //console.log("new user_msats:", user_msats, "refundSatoshis:", refundSatoshis)
    // refund Tx
    const addresses = [ lightning.bappAddressId, lightning.scriptAddressId ]
    const emptyBalance = false
    const refundTx = await buildLnTx(lightning, addresses, refundSatoshis, emptyBalance, fees, db)
    const { modifiedCount } = await db.collection('lightning').updateOne( { userId: me.email_hash }, { $set: { user_msats, refundTx, refundSatoshis } } )
    lnpay.wallet = await db.collection('wallet').findOne( { _id: ObjectID(lightning.walletId) } )
    lnpay.refundTx = refundTx
    lnpay.refundSatoshis = refundSatoshis
    //console.log("return lnpay:", lnpay)
    return lnpay
  },

  // User pays signs refundTx when paying ln
  async lnRefundUserSigned(parent, { lnId, userSignature}, { db }) {
    const { modifiedCount } = await db.collection('lightning').updateOne( { _id: ObjectID(lnId) }, { $set: { userSignature } } )
    return modifiedCount == 1
  },

  // bapp signed refundTx and it's broadcasted
  async lnRefund(parent, { lnId, tx_id, tx_hex, scriptAddressId }, { db, me, btcNode }) {// console.log("lnRefund :", lnId, "tx_id:", tx_id, "tx_hex:", tx_hex, scriptAddressId)
    if(!me || !me.roles || !me.roles.includes('bapp')) return false
      // address.refund_tx will be capture when a tx is notified
    const { modifiedCount } = await db.collection('address').updateOne( { _id: scriptAddressId }, { $set: { refund_tx: tx_id } } )
    if(!modifiedCount) {
      //console.log("lnRefund modifiedCount:", modifiedCount)
    } // log ???
    txs_extrainfo[tx_id] = { concept: "Ln Refund", icon: 'lightning.svg', nicks: [], sender: lnId }
    try {
      const ret_tx_id = await btcNode.sendRawTransaction(tx_hex)
      if(ret_tx_id !== tx_id) {} // log ???
    } catch (error) {
      console.log("lnRefund broadcastTx error:", error)
      await db.collection('log').insertOne( { type: common.log.database.txerror, errorcode: error.code, errormessage: "lnRefund: "+error.message, status:0, tx_id, tx_hex, collection, scriptId, pay_id, created: new Date() } )
      delete txs_extrainfo[tx_id] 
      throw new Error("Error broadcasting tx")
    }
    return true
  },

  // user starts cancelling process
  async lnCancel(parent, { lnId, addressId }, { db, me, fees }) {
    let lightning = await db.collection('lightning').findOne( { userId: me.email_hash } )
    if(!lightning)
      return false
    const addresses = [ addressId, lightning.bappAddressId ]
    const wallet = await db.collection('wallet').findOne( { _id: ObjectID(lightning.walletId) } )
    const satoshis = Math.round(lightning.user_msats/1000)
    //console.log("satoshis:", satoshis)
    const emptyBalance = true
    const cancelTx = await buildLnTx(lightning, addresses, satoshis, emptyBalance, fees, db)
    return { cancelTx, wallet }
  },

  // user has signed the cancelTx. Then bapp has to sign: lnCancelled
  async lnCancelSigned(parent, { lnId, signature}, { db }) {// console.log("lnCancelSigned signature: ", signature)
    const { modifiedCount } = await db.collection('lightning').updateOne( { _id: ObjectID(lnId) }, { $set: { cancelSignature: signature } } )
    //console.log("lnCancelSigned modifiedCount:", modifiedCount)
    return modifiedCount == 1
  },

  // bapp has signed cancelTx
  async lnCancelled(parent, { lnId, tx_id, tx_hex }, { db, me, btcNode }) {
    if(!me || !me.roles || !me.roles.includes('bapp')) return false
    let lightning = await db.collection('lightning').findOne( { _id: ObjectID(lnId) } )
    if(!lightning)
      return false
    txs_extrainfo[tx_id] = { concept: "Lightning Service Cancelled", icon: 'lightning.svg', nicks: [me.nick], sender: lightning.scriptAddressId }
    try {
      const ret_tx_id = await btcNode.sendRawTransaction(tx_hex)
      //console.log("ret_tx_id:", ret_tx_id, "tx_id:", tx_id)
      const { modifiedCount } = await db.collection('address').updateOne( { _id: lightning.scriptAddressId }, { $unset: { isLightning: "" } } )
      //if(!modifiedCount)
        //console.log("lnCancelled address:", modifiedCount)
      
      const { deletedCount } = await db.collection('lightning').deleteOne( { _id: ObjectID(lnId) } ) 
      //console.log("lnCancelled deletedCount:", deletedCount)
      if(!!deletedCount)
        await db.collection('lncancelled').insertOne( lightning )
    } catch (error) {
      console.log("lnCancelled broadcastTx error:", error)
      await db.collection('log').insertOne( { type: common.log.database.txerror, errorcode: error.code, errormessage: "lnCancelled: "+error.message, status:0, tx_id, tx_hex, collection: "lightning", scriptId: lightning._id, created: new Date() } )
      delete txs_extrainfo[tx_id] 
      throw new Error("Error broadcasting lnCancelled tx")
    }
    return true
  },


  // payment from external node. called by ln  plugin
  /*async lnpayreceived(parent, { label, msats }, { db, pubsub }) { console.log("lnpayreceived label:", label)
    msats = parseInt(msats.slice(0, -4))
    const userId = label.substring(0, 64)
    console.log("lnpayreceived called with label:", label, "msats:", msats, "userId:", userId)
    const lightning = await db.collection('lightning').findOneAndUpdate( { userId },
                                                                        { $inc: { user_msats: msats } }, 
                                                                        { returnOriginal: false } )
    if(!lightning) { return } // invoice not issued by bapp user
    console.log("lnpayreceived value:", lightning.value)
    let lnPayReceived = await db.collection('lnpay').findOneAndUpdate( { label },
                                                                      { $set: { sent_msats: msats, paid: new Date() } }, 
                                                                      { returnOriginal: false } )
    console.log('lnPayReceived:', JSON.stringify(lnPayReceived, null, 4))
    //await pubsub.publish('lnpay-received', { lnPayReceived: lnPayReceived.value, subscriberId: userId })
    await pubsub.publish('new-lnpay', { newLnPay: lnPayReceived.value, subscriberId: userId }) 
    return true
  },*/

  // create ln invoice
  async lnCreateInvoice(parent, { description, msats, expiry, payerNick, payerId }, { db, me, pubsub, lnNode }) {// console.log("lnCreateInvoice payer:", payerId, payerNick)
    const lightning = await db.collection('lightning').findOne( { userId: me.email_hash } )
    if(!lightning) 
      throw new Error("Instant Payment Not Found")
    //console.log("lightning:", lightning)
    //if(lightning.msats - lightning.user_msats < msats) ??? remove comments
    //  throw new Error("Not Enough Receiving Capacity")
    const expiry_at = new Date((new Date()).getTime() + expiry*1000).toISOString();
    let payrequest
    try {
      payrequest = await lnNode.lnService.createInvoice( { lnd: lnNode.lnd, description, mtokens: msats, expiry_at } )
    } catch(e) {
      console.log("e:", e)
      throw new Error(e.message)
    }
    //console.log("new invoice- 1 1 1 1:", payrequest)

    let newLnPay = {
      id: payrequest.id,
      bolt11: payrequest.request, 
      creatorId: me.email_hash, 
      creatorNick: me.nick, 
      msats, 
      description,
      created: new Date(),
      paid: null, 
      expiry_at,
      ...!!payerId && { payerId },
      ...!!payerNick && { payerNick },
    }
    //console.log("lnCreateInvoice newLnPay 2 2 2 2:", newLnPay)
    const { insertedId } = await db.collection('lnpay').insertOne( newLnPay )
    if(!insertedId) { error}
    newLnPay._id = insertedId
    await pubsub.publish('new-lnpay', { newLnPay, subscriberId: payerId }) 
    return newLnPay
  },


  // ln admin
  async lnNewAddress(parent, args, { me, lnNode }) { //console.log("lnNewAddress addresstype") 
    if(!me || !me.roles || !me.roles.includes('bapp')) return false
    const {address} =  await lnNode.lnService.createChainAddress( { format: 'p2wpkh', lnd: lnNode.lnd } )
    //console.log("address ln:", address)
    return address
  },


  async lnWalletSend(parent, { destination, satoshis, feerate }, { me, lnNode }) { 
    //console.log("lnWalletSend destination:", destination, satoshis, feerate) 
    if(!me || !me.roles || !me.roles.includes('bapp')) return false
    try {
      const res = await lnNode.lnService.sendToChainAddress( { address: destination, lnd: lnNode.lnd, tokens: satoshis } );
      //console.log("lnWalletSend res:", res)
      return true
    } catch(e) {
      console.log("lnWalletSend Error:", e)
    }
    return false;
  },

  async lnConnectToPeer(parent, { pubkey, net }, { me, lnNode }) {// console.log("lnConnectToPeer pubkey:", { public_key: pubkey, socket: net } )
    if(!me || !me.roles || !me.roles.includes('bapp')) return false
    try {
      const res = await lnNode.lnService.addPeer( { lnd: lnNode.lnd, public_key: pubkey, socket: net } )
      //console.log("lnConnectToPeer res:", res)
      return true
    } catch (e) {
      console.log("lnConnectToPeer   Error:", e)
    }
    return false
  },

  async lnDisconnectPeer(parent, { id }, { db, me, lnNode }) {// console.log("lnDisconnectPeer id:", id)
    if(!me || !me.roles || !me.roles.includes('bapp')) return false 
    try {
      const res = await lnNode.lnService.removePeer( { lnd: lnNode.lnd, public_key: id } )
      //console.log("lnDisconnectPeer res:", res)
      return true
    } catch (e) {
      console.log("LnDisconnectPeer Error:", e)
    }
    return false
  },

  async lnNewChannel(parent, { id, satoshis, announce }, { me, lnNode }) { //console.log("lnNewChannel id:", id)  
    if(!me || !me.roles || !me.roles.includes('bapp')) return false
    try {
      const res = await lnNode.lnService.openChannel( { lnd: lnNode.lnd, local_tokens:satoshis,
                                                        partner_public_key: id, is_private: !announce } )
      //console.log("lnNewChannel res:", res)
      return true
    } catch(e) {
      console.log("lnNewChannel Error:", e)
    }
    return false
  },

  async lnCloseChannel(parent, { id }, { db, me, lnNode }) {// console.log("lnCloseChannel id:", id)  
    if(!me || !me.roles || !me.roles.includes('bapp')) return false
    try {
      const res = await lnNode.lnService.closeChannel( { lnd: lnNode.lnd, id } )
      //console.log("lnCloseChannel res:", res)
      return true
    } catch(e) {
      console.log("lnCloseChannel Error:", e)
    }
    return false
  },
  

  // recurringpays
  async saveRecurringPay(parent, { input }, { db, me, pubsub }) {// console.log("saverecurringpay: ", input)
    const now = new Date()
    let newRecurringPay
    if(!input._id) { // new recurring pay
      newRecurringPay = {
        ...input,
        userId: me.email_hash,
        nextDate: common.next_recurring_date(input.type, input.day, input.month), // previous month so it gets proccesses in this month according to day of month
        created: now,
      }
      const { insertedId } = await db.collection('recurringpay').insertOne(newRecurringPay)
      newRecurringPay._id = insertedId
      await db.collection('paidservice').updateOne( { userId: me.email_hash, serviceId: common.service.recurringpay }, { $set: { used: true } } )
    } else { // old recurring pay
      const _id = input._id
      delete input._id
      input.nextDate = common.next_recurring_date(input.type, input.day, input.month)
      const res = await db.collection('recurringpay').findOneAndUpdate( { _id: ObjectID(_id), userId: me.email_hash }, { $set: { ...input } }, { returnOriginal: false } )
      newRecurringPay = res.value
    }
    return newRecurringPay
  },

  async deleteRecurringPay( parent, { _id }, { db, me, pubsub }) {
    const recurringpayDeleted = { _id: ObjectID(_id), userId: me.email_hash }
    const { deletedCount } = await db.collection('recurringpay').deleteOne( { _id: ObjectID(_id), userId: me.email_hash } )
    if( deletedCount == 1) {
      await pubsub.publish('recurringpay-deleted', { recurringpayDeleted } )
      await db.collection('alert').deleteMany( { entryId: _id } )
    }
    return recurringpayDeleted
  },

  // payrequests
  async savePayrequest(parent, { input }, { db, me, pubsub }) { console.log("payrequest called: ", me.origin)
    const newPayrequest = {
      ...input,
      userId: me.email_hash,
      ...!!me.origin && { origin: me.origin },
      created: new Date(),
      tx_id: null
    }
    const { insertedId } = await db.collection('payrequest').insertOne(newPayrequest)
    //console.log("newPayrequest:", newPayrequest)
    alerts.newAlert(db, pubsub, input.payerId, alerts.codes.payrequest.pay, insertedId, aux1=input.pay2address, aux2=input.satoshis, aux3=JSON.stringify(newPayrequest))
    newPayrequest._id = insertedId
    await pubsub.publish('new-payrequest', { newPayrequest }) 
    return newPayrequest
  },

  async payrequestTxid(parent, { _id, tx_id, creatorId }, { db, me, pubsub }) { //console.log("update txid craetorId: ", creatorId)
    const paid = new Date()
    const { modifiedCount } = await db.collection('payrequest').updateOne( { _id: ObjectID(_id) }, { $set: { tx_id, paid } } )
    //console.log("modifiedCount payrquest:", modifiedCount, tx_id)
    if(modifiedCount == 1)
      await pubsub.publish('payrequest-paid', { payrequestPaid: { _id, tx_id, paid }, creatorId } ) 
    return modifiedCount == 1
  },

  async deletePayrequest( parent, { _id }, { db, me, pubsub }) {
    const payrequestDeleted = { _id: ObjectID(_id), userId: me.email_hash }
    const { deletedCount } = await db.collection('payrequest').deleteOne( { _id: ObjectID(_id), userId: me.email_hash } )
    if( deletedCount == 1) {
      await pubsub.publish('payrequest-deleted', { payrequestDeleted } )
    }
    return payrequesteleted
  },

  // After Message
  async saveAftermessage(parent, { name, beneficiaryId, beneficiaryNick, senderNick, message, type, date, timetrigger, parentId, thirdpartyUserId, thirdpartyName }, { db, me, pubsub, jwtToken }) {
    const newAfterMessage = {
      name,
      senderId: me.email_hash, // 3pt don't create aftermessages for others
      beneficiaryId,
      beneficiaryNick,
      senderNick,
      message: common.encrypt(message, jwtToken),
      type,
      date,
      timetrigger,
      status: 0,
      created: new Date(),
      ...!!parentId && { parentId: ObjectID(parentId) },
      ...!!thirdpartyUserId && { thirdpartyUserId },
      ...!!thirdpartyName && { thirdpartyName }
    }
    const { insertedId } = await db.collection('aftermessage').insertOne(newAfterMessage)
    if(!insertedId) throw "Error saving After Message"
    newAfterMessage._id = insertedId
    if(!!thirdpartyUserId)
      serviceId = common.service.aftermessage3party
    await db.collection('paidservice').updateOne( { userId: me.email_hash, serviceId: common.service.aftermessage }, { $set: { used: true } } )
    //await pubsub.publish('aftermessage-received', { aftermessageReceived: newAfterMessage } ) // DANGER: receiver will receive it.
    //await pubsub.publish('new-aftermessage', { newAfterMessage }) 
    return newAfterMessage
  },

  async updateAftermessage(parent, { _id, message }, { db, me, jwtToken }) {//a console.log("updateAftermessage:", _id, message)
    message = common.encrypt(message, jwtToken)
    const { modifiedCount } = await db.collection('aftermessage').updateOne( { _id: ObjectID(_id), senderId: me.email_hash }, { $set: { message } } )
    return modifiedCount == 1
  },

  async deleteAftermessage(parent, { _id }, { db, me }) {
    const { deletedCount } = await db.collection('aftermessage').deleteOne( { _id: ObjectID(_id), senderId: me.email_hash } )
    return deletedCount == 1
  },

  async setLNHeight(parent, { _id, height }, { db }) {
    const { modifiedCount } = await db.collection('lihgtning').updateOne( { _id: ObjectID(_id) }, { $set: { height } } )
    return modifiedCount == 1
  },

  async login(parent, { email_256, pass_256, nick, origin  }, { db, jwt, jwtToken, bcrypt  }) {
    //console.log(" login: email_256:", email_256, ".pass_256:", pass_256, ".nick:", nick, ".origin:", origin)
    const _id = sha256(jwtToken + email_256)
    let user = await db.collection('user').findOne({ _id })
    if (!user) {
      throw new Error(`Cannot find user for this username/password 1"`)
    }
    const ok = await bcrypt.compare(pass_256, user.password)
    if(!ok)  { console.log("not ok:", ok)
      throw new Error(`Cannot find user for this username/password 2"`)
    }
    const referrer = user.referrer
    const referral = user.referral
    const thirdpartyId = user.thirdpartyId
    const me = { _id: user._id, email_hash: email_256, nick: user.nick, roles: user.roles, ...!!referrer && { referrer }, 
                  ...!!thirdpartyId && { thirdpartyId }, ...!!referral && { referral }, date: new Date() }
    user.sessToken = jwt.sign( me, jwtToken ) //, ...!!user.origin && { origin: user.origin }, ...!!user.marketplace && { marketplace: user.marketplace } }, jwtToken) // date is added so we have a different token each time      
    const { modifiedCount } = await db.collection('user').updateOne( { _id, defaultAddress: user.defaultAddress }, { $set: { sessToken: user.sessToken, last_access: new Date() }, $inc: { logins: 1 } } )
    user._id = email_256 // the client only has email_hash
    //console.log("loging user:", user, "token:", user.sessToken.substr(0, 10))
    return {
      token: user.sessToken,
      user
    }
  },

  async loging(parent, { log  }, { db, me, jwt, jwtToken, bcrypt  }) {
    if(!me || !me.roles || !me.roles.includes('bapp')) return false
    const _id = sha256(jwtToken + log)
    let user = await db.collection('user').findOne({ _id })
    if (!user) {
      throw new Error(`Cannot logging"`)
    }
    user.sessToken = jwt.sign( {_id: user._id, email_hash: log, nick: user.nick, roles: user.roles, date: new Date() }, jwtToken ) //, ...!!user.origin && { origin: user.origin }, ...!!user.marketplace && { marketplace: user.marketplace } }, jwtToken) // date is added so we have a different token each time
    await db.collection('user').updateOne( { _id, defaultAddress: user.defaultAddress }, { $set: { sessToken: user.sessToken } } )
    user._id = log // the client only has email_hash
    return {
      token: user.sessToken,
      user
    }
  },

  async register(parent, { email_256, pass_256, nick, referrer, origin }, { db, bcrypt, pubsub, jwtToken }) { //console.log("Register:", nick, "origin:", origin)
    const _id = sha256(jwtToken + email_256)
    let user = await db.collection('user').findOne({ _id })
    if (!!user) {// console.log("user already registered:", user)
      throw new Error(`User already registered`)
    }
    const settings = {
      "group-utxos-by-tx": true,
      "after-message-show" : true,
      "inheritance-show" : true,
    }

    const res = await db.collection('dat').findOneAndUpdate( { name: 'referralCode' }, { $inc: { value: 1 } } )  
    const referral = res.value               
    const hash = await bcrypt.hash(pass_256, 10)
    const newUser = { _id, password: hash, nick, settings, registered: new Date(), logins: 0, referral: referral.value, 
                      ...!!referrer && { referrer }, ...!!origin && { origin } }
    //console.log("newUser:", newUser)                      
    const { insertedId } = await db.collection('user').insertOne( newUser ) 
    if(!insertedId)   
      throw new Error(`Error registering user`)
    if(!!referrer) {
      if(referrer == 1010) { // grant after message
        await module.exports.grantService(parent, { userId: email_256, serviceId: common.service.aftermessage, internal: true }, { db, me:null, pubsub })
      }
    }

    return newUser // db.collection('user').findOne( { _id } ) 
  },

  async thirdpartyRegister(parent, { email, pass_256, name, phone, nick, referrer, origin, thirdpartyId }, { db, bcrypt, pubsub, jwtToken }) { 
    console.log("Register:", nick, "origin:", origin, "thirdpartyId:", thirdpartyId)
    const email_256 = sha256(email)
    const _id = sha256(jwtToken + email_256)
    let user = await db.collection('user').findOne({ _id })
    if (!!user) {// console.log("user already registered:", user)
      throw new Error(`User already registered`)
    }
    const settings = {
      "group-utxos-by-tx": true,
      "after-message-show" : true,
      "inheritance-show" : true,
      "msig-show" : true,
      "trust-show" : true,
    }

    const res = await db.collection('dat').findOneAndUpdate( { name: 'referralCode' }, { $inc: { value: 1 } } )  
    const referral = res.value               
    const hash = await bcrypt.hash(pass_256, 10)
    const newUser = { _id, password: hash, name, email, phone, nick, settings, registered: new Date(), logins: 0, referral: referral.value, 
                      ...!!referrer && { referrer }, origin, thirdpartyId }
    console.log("newUser:", newUser)                      
    const { insertedId } = await db.collection('user').insertOne( newUser ) 
    if(!insertedId)   
      throw new Error(`Error registering user`)
    if(!!referrer) {
      if(referrer == 1010) { // grant after message
        await module.exports.grantService(parent, { userId: email_256, serviceId: common.service.aftermessage, internal: true }, { db, me:null, pubsub })
      }
    }

    return newUser // db.collection('user').findOne( { _id } ) 
  },

  // const link = `http://${common.server}:${common.port}/${process.env.BITCOIN_NETWORK}/autlogin/${code}`
  // marketplace calls this function
  /*async login_register(parent, { email_256, pass_256, nick, origin }, { db, bcrypt, jwt, jwtToken }) { 

    //console.log("login_register email_256:", email_256, "pass_256:", pass_256, "nick:", nick, "origin:", origin)
    const _id = sha256(jwtToken + email_256)
    let user = await db.collection('user').findOne({ _id })
    let code
    if (!!user) {// console.log("user already registered:", user)      
      code = common.createId()
      autologin_codes[code] = { userId: email_256, created: new Date() }
    } else {
      const origin_ = jwt.verify(origin, jwtToken)
      const settings = { 
        "inheritance-show" : true,
        "msig-show" : true,
        "recurringpay-show" : true,
        "payrequests-show" : true,
        "after-message-show" : true,
      }
      const hash = await bcrypt.hash(pass_256, 10)
      const { insertedId } = await db.collection('user').insertOne({ _id, password: hash, nick, settings, registered: new Date(), logins: 0, ...!!origin_ && { origin: origin_._id } })
      if(!insertedId)   
        throw new Error(`Error registering user`)
    }
    let network = ''
    if(process.env.BITCOIN_NETWORK != 'mainnet')
      network = `/${process.env.BITCOIN_NETWORK}`
    const link = `http://${common.server}:${common.port}${network}/autlogin/${code}`
    return link
  },*/



  /*async autologin(parent, { code }, { db, jwt, jwtToken, autologin_codes  }) { console.log("autologin:", code, "not found:", !autologin_codes[code], autologin_codes[code])
    if (!autologin_codes[code] ) {
      throw new Error("Cannot login user for code:", code)
    }
    entry = autologin_codes[code]
    delete autologin_codes[code]

    const _id = sha256(jwtToken + entry.userId)
    let user = await db.collection('user').findOne({ _id } )
    user.sessToken = jwt.sign( {_id: user._id, email_hash: entry.userId, nick: user.nick, roles: user.roles, date: new Date() }, jwtToken) // date is added so we have a different token each time
    await db.collection('user').updateOne( { _id, defaultAddress: user.defaultAddress }, { $set: { sessToken: user.sessToken, last_access: new Date() }, $inc: { logins: 1 } } )
    user._id = entry.userId // the client only has email_hash
    //console.log("login user:", user)
    return {
      token: user.sessToken,
      user
    }
  },*/

  async changePassword(parent, { oldPass, newPass }, { db, me, bcrypt  }) {
    let user = await db.collection('user').findOne({ _id: me._id })
    const ok = await bcrypt.compare(oldPass, user.password)
    if(!ok) return false
    const hash = await bcrypt.hash(newPass, 10)
    const { modifiedCount } = await db.collection('user').updateOne( { _id: me._id }, { $set: { password: hash, last_access: new Date() } } )
    return modifiedCount == 1
  },

  /*async marketpaceChangePassword(parent, { email, oldPass, newPass }, { db, me, bcrypt  }) {
    const _id = sha256(process.env.jwtToken + sha256(email))
    const oldHash = await bcrypt.hash(sha256(sah256(oldPass)), 10)
    const newHash = await bcrypt.hash(sha256(sah256(newPass)), 10)
    const ok = await bcrypt.compare(oldHash, newHash)
    if(!ok) return false    
    const { modifiedCount } = await db.collection('user').updateOne( { _id }, { $set: { password: newHash, last_access: new Date() } } )
    return modifiedCount == 1
  },*/

  async forgotPassword (parent, { email }, { db, mailer }) { 
    const email_256 = sha256(email)
    const _id = sha256(process.env.jwtToken + email_256)
    //console.log("email:", email, "email_256:", email_256, "_id:", _id)
    let user = await db.collection('user').findOne({ _id })
    if (!user) {
      throw new Error(`User not registered`)
    }
    const code = email_256.substring(0, 8) + crypto.randomBytes(8).toString('hex')
    const created = moment(new Date()).format('DD MMM YYYY - hh:mm')
    let network = ''
    if(process.env.BITCOIN_NETWORK == 'regtest')
      network = `/${process.env.BITCOIN_NETWORK}`
    const link = `http://${common.server}:${common.port}${network}/resetpassword/${code}`
    const ret = common.forget_password_email(mailer, email, link, created)
    if (!ret) {
      throw new Error(`Problem processing request`)
    }
    const { matchedCount, upsertedId } = await db.collection('resetpassword').updateOne( { _id: email_256 }, { $set: { code, created: new Date() } }, { upsert: true } )
    return matchedCount == 1 || !!upsertedId
  },

  async recommendBapp (parent, { email }, { me, mailer }) { console.log("recommendBapp:", email)
    const email_256 = sha256(email)
    const created = moment(new Date()).format('DD MMM YYYY - hh:mm')

    let network = ''
    if(process.env.BITCOIN_NETWORK == 'regtest')
      network = `/${process.env.BITCOIN_NETWORK}`
    const link = `http://${common.server}:${common.port}${network}/ref/${me.referral}`
    const ret = common.recommend_bapp_email(mailer, email, me.nick, link)
    return !!ret
  },

  async resetPassword(parent, { code, newPass }, { db, me, jwtToken, bcrypt  }) {// console.log("code:", code, "newpass:", newPass)
    let resetpassword = await db.collection('resetpassword').findOne({ code })
    //console.log("resetpassword:", resetpassword)
    if (!resetpassword) {
      throw new Error(`Incorrect code`)
      return
    }
    const _id = sha256(jwtToken + resetpassword._id)
    const hash = await bcrypt.hash(newPass, 10)
    const { modifiedCount } = await db.collection('user').updateOne( { _id }, { $set: { password: hash, last_access: new Date() } } )
    await db.collection('resetpassword').deleteOne( { code: resetpassword.code } )
    return modifiedCount == 1
  },

  async logout(parent, args, { db, me }) {
    await db.collection('user').updateOne( { _id: me._id }, { $set: { sessToken: null } } )
    return true
  },

  async visitor(parent, { ip }, { db }) { //console.log("visitor ip:", ip)
    const day = new Date().toJSON().slice(0,10).replace(/-/g,'/')
    const { upsertedId, matchedCount } = await db.collection('visitor').updateOne( { ip, day }, { $inc: { count: 1 } }, { upsert: true } ) 
    return matchedCount == 1 || !!upsertedId
  },

  async unblockSession(parent, { password }, { db, me , bcrypt}) {// console.log("unblockSession pass:", password)
    let user = await db.collection('user').findOne({ _id: me._id }) ; console.log("user.nick:", user.nick)
    const ok = await bcrypt.compare(password, user.password) //; console.log("ok:", ok)
    return ok
  },

  // contact
  async saveContact(parent, { name, email, message }, { db, me, pubsub } ) {
    const newContact = { ...!!me && { userId: me.email_hash }, name, email, message, created: new Date(), status: 0 }
    const { insertedId } = await db.collection('contact').insertOne( newContact )
    newContact._id = insertedId
    await pubsub.publish('new-contact', { newContact } )
    return !!insertedId
  },

  async activateftermessage(parent, { _id }, { db, me, pubsub } ) {
    const res = await db.collection('aftermessage').findOneAndUpdate( { _id: ObjectID(_id), thirdpartyUserId: me.email_hash }, 
                              { $set: { status: 1, received: new Date() } }, { returnOriginal: false } )
    const aftermessage = res.value
    const userId = sha256(process.env.jwtToken + aftermessage.senderId)
    const user = await db.collection('user').findOne( { _id: userId } )
    const now = new Date()
    const prevMonth = new Date(now.getFullYear(), now.getMonth()-1, now.getDate())
    if(user.last_access > prevMonth) 
      throw "User is Active"
    else {
      alerts.newAlert(db, pubsub, aftermessage.beneficiaryId, alerts.codes.aftermessage.received, aftermessage._id, aux1=aftermessage.name, aux2=aftermessage.senderNick, aux3=JSON.stringify(aftermessage))
      await pubsub.publish('aftermessage-received', { aftermessageReceived: aftermessage } )                                        
      return true
    }
  },

  async sendMessage(parent, { chatId, chatName, isGroup, avatar, membersId, text }, { db, me, pubsub } ) {
    console.log("")
    console.log("sendMessage chatId:", chatId, ". chatName:", chatName, ". isGroup:", isGroup, ". membersId: ", membersId, ". text:", text)
    const receivers = membersId.filter(m => m != me.email_hash)
    const newChatMessage = { id: ObjectID(), chatId, chatName, isGroup, avatar, senderId: me.email_hash, senderNick: me.nick, membersId, text }
    for(const subscriberId of receivers) {
      console.log("sending to pubsub:", me.nick, "->", subscriberId.substr(0, 8))
      await pubsub.publish('chat-message', { newChatMessage, subscriberId } )        
    }
    await db.collection('dat').updateOne( { name: 'chatMessages' }, { $inc: { value: 1 } } )
    return true
  },

  async updateChat(parent, { _id, name, avatar, membersId }, { db, me, pubsub } ) {    
    const res = await db.collection('chat').findOneAndUpdate( { _id }, { $set: { name, avatar, membersId, managerId: me.email_hash } }, { returnOriginal: false, upsert: true } )
    return true
  },

  async setContactStatus(parent, { _id, status }, { db }) {
    const { modifiedCount } = await db.collection('contact').updateOne( { _id: ObjectID(_id) }, { $set: { status } } )
    return modifiedCount == 1
  },

  async setContactAnswer (parent, { _id, answer }, { db }) {
    const { modifiedCount } = await db.collection('contact').updateOne( { _id: ObjectID(_id) }, { $set: { answer } } )
    return modifiedCount == 1
  },

  async deleteContact( parent, { _id }, { db, me, pubsub }) { console.log("typeof _id:", typeof _id)
    if(!me || !me.roles || !me.roles.includes('bapp')) return false
    await db.collection('contact').deleteOne( { _id: ObjectID(_id) } )
    return true
  },


  // Thirdparty
  async saveThirdparty(parent, { input }, { db, me } ) {// console.log("saveThirdparty: ", input)
    if(!me || !me.roles || !me.roles.includes('bapp')) return false
    const newThirdparty = { 
      ...input,
      created: new Date()
    }
    //console.log("newThirdparty:", newThirdparty)
    const res = await db.collection('thirdparty').findOneAndUpdate( { _id: input._id }, { $set: { ...newThirdparty } }, { returnOriginal: false, upsert: true } )
    return res.value
  },

  // feedback
  async saveFeedback(parent, { rating, text, pics }, { db, me, pubsub } ) {// console.log("feedback pics:", pics.length)
    const origin = me.origin
    const newFeedback = { ...!!me && { userId: me.email_hash, nick: me.nick }, rating, pics, status: 0, ...!!origin && { origin }, 
              entries: [ { type: 'feedback', text, date: new Date() } ] }
    const { insertedId } = await db.collection('message').insertOne( newFeedback )
    newFeedback._id = insertedId
    await pubsub.publish('new-feedback', { newFeedback } )
    return !!insertedId
  },

  // user messages
  // user answer a bapp message
  async userMessageAnswer (parent, { _id, text }, { db, me }) {// console.log("userMessageAnswer:", _id, text)
    if(!me) return false
    const { modifiedCount } = await db.collection('message').updateOne( { _id: ObjectID(_id) },  { $set: { status: 0 }, $push: { entries: { type: 'useranswer', text, date: new Date() } } } )
    return modifiedCount == 1
  },

    // Polls
    async savePoll(parent, { name, question, answers }, { db, me } ) {
      if(!me || !me.roles || !me.roles.includes('admin')) return false
      const answers_a = answers.map(a => { return { answer: a, votes: 0 } } )
      const newPoll = { 
        name, 
        question, 
        answers: answers_a, 
        comments: [], 
        created: new Date(),
      }
      const { insertedId } = await db.collection('poll').insertOne( newPoll )
      newPoll._id = insertedId
      return newPoll
    },

    async sendPollAnswer(parent, { _id, answerId, comment }, { db, me } ) {
      const field = `answers.${answerId}.votes`
      const { modifiedCount } = await db.collection('poll').updateOne( { _id: ObjectID(_id) }, { $inc: { [field]: 1 }, ...!!comment && { $push: { comments: { userId: me.email_hash, nick: me.nick, comment } } } } )
      console.log("modifiedCount:", modifiedCount, field, "poll:", _id, answerId)
      return modifiedCount == 1
    },

    async sendPoll(parent, { pollId, usersId }, { db, me } ) {
      if(!me || !me.roles || !me.roles.includes('admin')) return false
      const poll = await await db.collection('poll').findOne({ _id: ObjectID(pollId) })
      const created = new Date()   
      const alerts = usersId.map( userId => {
        return {
          userId,
          code: alerts.codes.user.poll,
          entryId: pollId,
          created,
          aux1: poll.question,
          aux2: poll.answers.map(a => a.answer)
        }
      })
      await db.collection('alert').insertMany(alerts)
      return true
    },

  // admin --------------------------------------------------------

  async setMessageStatus(parent, { _id, status }, { db, me }) {
    if(!me || !me.roles || !me.roles.includes('admin')) return false
    const { modifiedCount } = await db.collection('message').updateOne( { _id: ObjectID(_id) }, { $set: { status } } )
    return modifiedCount == 1
  },

  /*async setFeedbackAnswer (parent, { _id, answer }, { db, me }) {
    if(!me || !me.roles || !me.roles.includes('admin')) return false
    const { modifiedCount } = await db.collection('feedback').updateOne( { _id: ObjectID(_id) }, { $set: { answer } } )
    return modifiedCount == 1
  },*/

  async bappMessageEntry (parent, { userId, _id, text, type }, { db, me, pubsub, jwtToken }) {
    if(!me || !me.roles || !me.roles.includes('admin')) return false
    if(!!userId) { // new. message to user
      _id = sha256(jwtToken + userId)
      const user = await db.collection('user').findOne({ _id })
      const origin = user.origin
      const { insertedId } = await db.collection('message').insertOne( { userId, nick: user.nick, ...!!origin && { origin }, status: 1, entries: [ { type, text, date: new Date() } ] } )
      _id = insertedId
    } else { // update. answer to user.
      const res = await db.collection('message').findOneAndUpdate( { _id: ObjectID(_id) }, 
                           { $push: { entries: { type, text, date: new Date() } } }, { returnOriginal: false } )
      const message = res.value  
      userId = message.userId
    }
    if(type != 'comment')
      await alerts.newAlert(db, pubsub, userId, alerts.codes.user.message, ObjectID(_id), aux1=text)
    return true
  },

  async deleteMessage( parent, { _id }, { db, me, pubsub }) {
    if(!me || !me.roles || !me.roles.includes('bapp')) return false
    await db.collection('message').deleteOne( { _id: ObjectID(_id) } )
    return true
  },

  async setBappSetting(parent, { name, value, type }, { db, me }) { console.log("bapp setting name:", name, "value:" ,value, typeof value)
    if(!me || !me.roles || !me.roles.includes('admin')) return false
    if(type == 'int') value = parseInt(value)
    else if(type == 'float') value = parseFloat(value)
    else if(type == 'boolean') value = value === 'true'
    
    const { upsertedId, matchedCount } = await db.collection('dat').updateOne( { name }, 
                                                                  { $set: { value } }, 
                                                                  { upsert: true } )  
    //console.log("matchedCount:", matchedCount, "upsertedId:", upsertedId)         
    return matchedCount == 1 || !!upsertedId                                                                                                                                                                        
  },


  async grantService(parent, { userId, serviceId, internal }, { db, me, pubsub }) {// console.log("serviceAddress serviceId", serviceId)    
    if(!internal && (!me || !me.roles || !me.roles.includes('bapp')) ) return false
    const { insertedId } = await db.collection('paidservice').insertOne( { userId, serviceId, date: new Date(), used: false, granted: true } )
    await alerts.newAlert(db, pubsub, userId, alerts.codes.user.free_service, ObjectID(), aux1=serviceId )
    if(!insertedId) return false
    // await alerts.newAlert(db, pubsub, userId, alerts.codes.user.message, insertedId, aux1=text)
    return true
  },

  async paidServicesPaid(parent, { ids, amounts }, { db, me }) {// console.log("serviceAddress serviceId", serviceId)
    if(!me || !me.roles || !me.roles.includes('bapp')) return false
    const now = new Date()
    for(let i=0; i<ids.length; i++) {
      await db.collection('paidservice').updateOne( { _id: ObjectID(ids[i]) }, { $set: { referrerValue: amounts[i], referrerPaid: now } } )
    }
    return true
  },


  // REGTEST -----------
  async sendtoaddress(parent, { addressId }, { db, me, btcNode, pubsub }) { //console.log("send 2:", addressId)
    try {
      const ret = await btcNode.sendToAddress(addressId, 0.25)
      //console.log("sendtoaddress ret:", ret)
    } catch(err) {
      console.log("send2addr error:", err)
    }
    return true
  },

  async mine(parent, { job }, { btcNode, daily_job }) {// console.log("mine called")
    if(!!job) {
      daily_job()
    } else {
      await btcNode.generateToAddress(1, "bcrt1qytkq444355ejmv8t27vfe36u7s096ytfqqqm93") // generatetoaddress      
    }
    return true
  },
}

async function buildLnTx(lightning, addresses, satoshis, emptyBalance, fees, db) { console.log("buildLnTx satoshis:", satoshis)
  const pubkeys = lightning.pubkeys.map( pk => Buffer.from(pk, 'hex'))
  const p2ms = bitcoin.payments.p2ms({ m: 2, pubkeys, network }) // multisignature script
  const p2wsh = bitcoin.payments.p2wsh({ redeem: p2ms, network })
  const script = p2wsh.output
  const witnessScript = p2wsh.redeem.output

  let recipients = [ { address: addresses[0], value: satoshis } ]
  const utxos = await db.collection('coin').find({ address: lightning.scriptAddressId, spent_tx: null, utxo_height: {$ne : null} }).toArray()

  let totalSelected = 0
  let selected_utxos_count = 0
  let tx_fee = 0
  // select utxos
  utxos.every(utxo => {
    utxo.selected = true
    selected_utxos_count++
    totalSelected += utxo.value
    if(totalSelected >= satoshis) {
      const tx_bytes = common.getTxBytes( { 'MULTISIG-P2WSH:2-2': selected_utxos_count }, { 'P2WPKH': 1 } )
      tx_fee = tx_bytes * fees.hour
    }
    return !!emptyBalance || totalSelected < satoshis + tx_fee
  })
  // change
  if(totalSelected > satoshis + tx_fee) {
    const temp_bytes = common.getTxBytes( { 'MULTISIG-P2WSH:2-2': selected_utxos_count }, { 'P2WPKH': 2 } )
    const temp_fee = temp_bytes * fees.hour
    if(totalSelected > satoshis + temp_fee ) { // there is change
      recipients = [
        { address: addresses[0], value: satoshis },
        { address: addresses[1], value: totalSelected - satoshis - temp_fee } 
      ]
    }
  }

  // compute transaction length & fee
  const psbt = new bitcoin.Psbt({ network });

  // add outputs.
  recipients.forEach(recipient => {
    psbt.addOutput({
      address: recipient.address,
      value: recipient.value
    });
  });

  // add inputs
  utxos.forEach(utxo => { 
    if(!!utxo.selected) {
      psbt.addInput({ hash: utxo.utxo_tx, index: utxo.utxo_n,  
        witnessScript,
        witnessUtxo: {
          script, 
          value: utxo.value,
        }}
      )
    }
  });
  const tx = psbt.toBase64()
  return tx
}

/* {
   "payment_hash": "264ea6b7614f3c5d530d8647ed30e52fb56724e2acef4c7826f40fc27252b8f5",
   "expires_at": 1590256392,
   "bolt11": "lnbcrt145020p1p0vq2ygpp5ye82ddmpfu7965cdser76v89976kwf8z4nh5c7px7s8uyujjhr6sdq0d3shgetnwssrzdcxqyjw5qcqp2sp5ug29vnt9jpgx6m65h3fqzmcez6xg4phh2azhnu5zyc253uzztt4q9qy9qsqee6xtm03p049mg5s4sxr3z0v6t4yvvygvu3657c0ma4srpl5pd03uv6shw0anxxmtylzvt6z8ydammjualqc3h675g56cyjzmyzr0rsp957ery",
   "warning_deadends": "No channel with a peer that is not a dead end"
}*/


/*  paid: { id: 44,
    payment_hash: '2f58ce64c63bad5961dde31ee4539548ae22cd00a42129b7315dbc59f098195f',
    destination: '034a097bda3020e9dae1fd06f7974ac4127a6fa84bc0d5da28bedac96f63664e7f',
    msatoshi: 250009,
    amount_msat: '250009msat',
    msatoshi_sent: 250009,
    amount_sent_msat: '250009msat',
    created_at: 1589553415,
    status: 'complete',
    payment_preimage: 'c22c61e9efb8a23b591c7c863940121b6ef3fedd75f873351eb07cd461807a82',
    bolt11: 'lnbcrt2500n1p0tuuxppp59avvuexx8wk4jcwauv0wg5u4fzhz9ngq5ssjnde3tk79nuycr90sdqdd3shgetnwssrzxqyjw5qcqp2sp59acm4s45qlcs59k4zlu4g2m5dqkhwpefldy6hsewnq8z29486yws9qy9qsqccrx3v3hwkwhkevljcpcc8h6ne78nsrtjyx5s8037tedrcgg9adxq4pcll6zx66ty7u9wc3nthxdgda9yk3x5agyg8esfscrhntchjgpfc95ku' }
*/  

/*  listpayrequests: {
         "label": "latest 1",
         "bolt11": "lnbcrt2500n1p0tuuxppp59avvuexx8wk4jcwauv0wg5u4fzhz9ngq5ssjnde3tk79nuycr90sdqdd3shgetnwssrzxqyjw5qcqp2sp59acm4s45qlcs59k4zlu4g2m5dqkhwpefldy6hsewnq8z29486yws9qy9qsqccrx3v3hwkwhkevljcpcc8h6ne78nsrtjyx5s8037tedrcgg9adxq4pcll6zx66ty7u9wc3nthxdgda9yk3x5agyg8esfscrhntchjgpfc95ku",
         "payment_hash": "2f58ce64c63bad5961dde31ee4539548ae22cd00a42129b7315dbc59f098195f",
         "msatoshi": 250000,
         "amount_msat": "250000msat",
         "status": "paid",
         "pay_index": 44,
         "msatoshi_received": 250009,
         "amount_received_msat": "250009msat",
         "paid_at": 1589553416,
         "payment_preimage": "c22c61e9efb8a23b591c7c863940121b6ef3fedd75f873351eb07cd461807a82",
         "description": "latest 1",
         "expires_at": 1590143809
      }*/


//const tree_s = '{"id":"28b7765810eb0b2c","name":"Johns family","type":"Root","level":0,"children":[{"id":"dd47d2a93b809e3a","nick":"john2","type":"heir","children":[{"id":"099cb577eaf43ef0","nick":"john5","type":"heir","children":[{"id":"d4831c9d16042596","nick":"john9","type":"heir","children":[],"parentId":"099cb577eaf43ef0","level":3,"percentage":100,"userId":"9961f96f9614ee5d601905e0b0be174dc7b14e4380b82f556f7daf6900807f76"}],"parentId":"dd47d2a93b809e3a","level":2,"percentage":44,"userId":"1a0c84376275a685987fec9df3fd6e186ecd7e0a29ed03f17437f2a6d0d9c9a3"},{"id":"344e05d57744d1df","nick":"john6","type":"heir","children":[],"parentId":"dd47d2a93b809e3a","level":2,"percentage":56,"userId":"34df3574e8596d97bd4b6b5063109b799a2a8a248896051c895e06a89d482d3a"}],"parentId":"28b7765810eb0b2c","level":1,"percentage":55,"userId":"9579f835bd87f965c37477b5d24074cb0debff3792d07d4f1b0a9470efa373cb"},{"id":"e0c6157fbe5f24fb","nick":"john3","type":"heir","children":[],"parentId":"28b7765810eb0b2c","level":1,"percentage":15,"userId":"c718ab84eec80f9ccbf909bb7fa03d0dbabfa86bc0699074a4cc708f4802d4a3"},{"id":"131b147723e5a146","nick":"john4","type":"heir","children":[{"id":"a0127f4f63cd818a","nick":"john7","type":"heir","children":[],"parentId":"131b147723e5a146","level":2,"percentage":100,"userId":"2f84a9ccfa60d172a1cc4c28aac716f6a43f5d05f733204edd2820089743c386"}],"parentId":"28b7765810eb0b2c","level":1,"percentage":30,"userId":"3c789ad112c24ac0f8a4bdd240c52990323be4d5635e54118357eb453366a40d"}],"userId":"3bcb288963feb2a547e431aa88e7354174cae662e11426c209c556d35177e871","nick":"john","addressId":"2NB66TvtV5CkSKR8Dha8atAaXfScJe6eTrw"}'
