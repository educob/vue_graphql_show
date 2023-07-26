const { ObjectID } = require('mongodb')
const bip32 = require('bip32')
const sha256 = require("js-sha256")

const common = require('../lib/common')
const network = common.bitcoin_network

var traverse = require('traverse')

const jwt = require('jsonwebtoken')
const { NoFragmentCycles } = require('graphql/validation/rules/NoFragmentCycles')

module.exports = {

  me: (parent, args, { me }) => me,

  resetpassword:  (parent, { code }, { db }) => {
    return db.collection('resetpassword').findOne( { code } )
  },

  wallet: async(parent, { _id }, { db, me }) => {
    if(!me) return null
    const wallet = await db.collection('wallet').findOne( { _id: ObjectID(_id), userId: me.email_hash } )
    //console.log("Query wallet:", wallet)
    return wallet
  },

  wallets: async(parent, { withBalance }, { db, me }) => { //console.log("wallets me:", me)
    if(!me) return []
    if(withBalance)
      return db.collection('wallet').find({ userId: me.email_hash, balance: { $gt: 0 } }, { sort: { created: -1 } }).toArray() 
    else 
      return db.collection('wallet').find({ userId: me.email_hash }, { sort: { created: -1 }}).toArray()
  },

  inheritances: function(parent, args, { db, me }) {
    if(!me) return []
    return db.collection('inheritance').find( { 
                                        $or: [ { testatorId: me.email_hash },
                                               { thirdpartyUserId: me.email_hash } ] },
                                        { sort: { created: -1 } } ).toArray()
  },

  inheritance: function(parent, { _id }, { db, me }) {
    if(!me) return null
    return db.collection('inheritance').findOne( { 
                                          $or: [ { _id: ObjectID(_id), testatorId: me.email_hash },
                                                 { _id: ObjectID(_id), thirdpartyUserId: me.email_hash },
                                                 { _id: ObjectID(_id), signers: { $elemMatch: { userId: me.email_hash } } } ] } )
  },

  trusts: function(parent, args, { db, me }) {
    if(!me) return []
    return db.collection('trust').find( { $or: [ { testatorId: me.email_hash },
                                               { thirdpartyUserId: me.email_hash } ] },
                                        { sort: { created: -1 } } ).toArray()
  },

  trust: function(parent, { _id }, { db, me }) {
    if(!me) return null
    return db.collection('trust').findOne( { _id: ObjectID(_id) } )
  },

  /*feedbacks: function(parent, { all, status }, { db, me }) {
    if(!me || !me.roles || !me.roles.includes('admin')) return false
    if(!!all) 
      return db.collection('feedback').find({ }, { sort: { created: -1 }}).toArray()
    else 
      return db.collection('feedback').find({ status }, { sort: { created: -1 }}).toArray()
  },*/

  messages: function(parent, { all, status }, { db, me }) {
    if(!me || !me.roles || !me.roles.includes('admin')) return false
    if(!!all) 
      return db.collection('message').find({ }, { sort: { created: -1 }}).toArray()
    else 
      return db.collection('message').find({ status }, { sort: { created: -1 }}).toArray()
  },

  address: (parent, { _id }, { db }) => // ???  danger. Check owner.
    db.collection('address').findOne( { _id } ),

  addresses: (parent, { withBalance, walletId }, { db, me }) => {
    if(withBalance)
      return  db.collection('address').find( { parentId: ObjectID(walletId), balance: { $gt: 0 } } ).toArray()
    else
      return db.collection('address').find( { parentId: ObjectID(walletId) } ).toArray()
  },

  contacts: function(parent, { all, status }, { db, me }) {
    //console.log("me:", me.roles)
    if(!me.roles ||! me.roles.includes('admin'))
      return []
    if(!!all) 
      return db.collection('contact').find({ }, { sort: { created: -1 }}).toArray()
    else 
      return db.collection('contact').find({ status }, { sort: { created: -1 }}).toArray()
  },


  multisigs: (parent, args, { db, me }) => {
    if(!me) return []
    return db.collection('multisig').find( { 
            $or: [ { signers: { $elemMatch: { userId: me.email_hash } } },
                   { creatorId: me.email_hash } ] }, 
            { sort: { created: -1 }} ).toArray()
  },

  multisig: (parent, args, { db, me }) => {
    //console.log("query mulstsig me:", me)
    if(!me) return {}
    return db.collection('multisig').findOne( { 
            $or: [ { _id: ObjectID(args._id), signers: { $elemMatch: { userId: me.email_hash } } },
                   { _id: ObjectID(args._id), creatorId: me.email_hash } ] })
  },

  smartcontracts: async function(parent, args, { db, me }) {
    //console.log("smartcontracts me:", me)
    if(!me) return []
    const conds = await db.collection('smartcontract').find( { 
            $or: [ { signers: { $elemMatch: { userId: me.email_hash } } },
                   { creatorId: me.email_hash } ] }, 
            { sort: { created: -1 }} ).toArray()
    //console.log("query smartcontracts:", conds)
    return conds
  },

  smartcontract: (parent, { _id }, { db, me }) => {
    if(!me) return {}
    return db.collection('smartcontract').findOne( { 
            $or: [ { _id: ObjectID(_id), signers: { $elemMatch: { userId: me.email_hash } } },
                   { _id: ObjectID(_id), creatorId: me.email_hash } ] })
  },

  alerts: (parent, args, { db, me }) => {
    if(!me) return []
    return db.collection('alert').find( { userId: me.email_hash } ).toArray()
  },

  recurringpays: (parent, args, { db, me }) => {
    if(!me) return []
    return db.collection('recurringpay').find( { userId: me.email_hash }, { sort: { created: -1 } } ).toArray()
  },

  recurringpay: (parent, { _id }, { db, me }) =>
    db.collection('recurringpay').findOne( { _id: ObjectID(_id), userId: me.email_hash } ),

  payrequests: (parent, args, { db, me }) => {
    if(!me) return []
    return db.collection('payrequest').find( { $or: [ { userId: me.email_hash },
                                                      { payerId: me.email_hash } ] }, { sort: { created: -1 } }).toArray()
  },

  payrequest: (parent, { _id }, { db, me }) =>
    db.collection('payrequest').findOne( { _id: ObjectID(_id), userId: me.email_hash } ),

  aftermessages: (parent, args, { db, me }) => {
    if(!me) return []
    return db.collection('aftermessage').find( { $or: [ { senderId: me.email_hash },
                                                      { beneficiaryId: me.email_hash, status: 1 },
                                                      { thirdpartyUserId: me.email_hash } ] }, { sort: { created: -1 } }).toArray()                                                 
  },

  chats: (parent, args, { db, me }) => {
    if(!me) return []
    return db.collection('chat').find({ membersId: me.email_hash }, { sort: { name: -1 } }).toArray()                   
  },

  // polls
  polls: (parent, args, { db, me }) => {
    if(!me || !me.roles || !me.roles.includes('bapp')) return []
    return db.collection('poll').find( {}, { sort: { created: -1 } } ).toArray()
  },

  poll: (parent, { _id }, { db, me }) => {
    if(!me || !me.roles || !me.roles.includes('bapp')) return null
    return db.collection('poll').findOne( { _id: ObjectID(_id) } )
  },
 
  lightning: (parent, args, { db, me }) => { 
    if(!me) return null
    return db.collection('lightning').findOne( { userId: me.email_hash } )
  },

  bappLN: async(parent, args, { me, lnNode }) => {
    try {
      const info = await lnNode.lnService.getWalletInfo({lnd: lnNode.lnd})
      const {channels} = await lnNode.lnService.getChannels({lnd: lnNode.lnd})
      const {peers} = await lnNode.lnService.getPeers({lnd: lnNode.lnd}) ;
      const {utxos} = await lnNode.lnService.getUtxos({lnd: lnNode.lnd})
      const BappLN = {
        version: info.version,
        alias: info.alias,
        numPeers: info.peers_count,
        latestBlockAt: info.latest_block_at,
        pubkey: info.public_key,
        numChannels: [ info.pending_channels_count, info.active_channels_count ],
        utxos,
        channels,
        peers,
      }
      return BappLN
    } catch(e) {
      console.log("BappLN error:", e)
    }
  },
  lnUsers: async(parent, { paging }, { db, me }) => {
    if(!me || !me.roles || !me.roles.includes('bapp')) return null
    return db.collection('lightning').find( { }, 
          { sort: { refundSatoshis: -1 }}).skip(paging.page * paging.pagesize).limit( paging.pagesize ).toArray()
  },

  lnCancelling: async(parent, args, { db, me }) => {
    if(!me || !me.roles || !me.roles.includes('bapp')) return null
    return db.collection('lightning').find( { cancelSignature: { $exists: true } } ).toArray()
  },

  lnCancelled: async(parent, { paging }, { db, me }) => {
    if(!me || !me.roles || !me.roles.includes('bapp')) return null
    return db.collection('lncancelled').find( { } ).skip(paging.page * paging.pagesize).limit( paging.pagesize ).toArray()
  },

  lnpays: (parent, { filter }, { db, me }) => {
    if(!me) return []
    return db.collection('lnpay').find({ $or: [ { creatorId: me.email_hash },
                                                { payerId: me.email_hash } ] }, 
                                        { sort: { created: -1 }}).toArray()
  },

  decode: async(parent, { bolt11 }, { lnNode } ) => { console.log("decoding:", bolt11)
    try{
      const decoded = await lnNode.lnService.decodePaymentRequest({ lnd: lnNode.lnd, request: bolt11 } )
      console.log("decoded:", decoded)
      return decoded
    } catch(e) {
      console.log("Decode error:", e)
    }
  },

  lastBlock: (parent, args, { db, last_block }) => {
    //console.log("last_block:", last_block)
    return last_block
  },

  feesByte: (parent, args, { db, fees }) => { //console.log("          fees:", fees)
    return fees
    //db.collection('fee').findOne({ }),
  },

  fiat: (parent, args, {me, fiat }) => {
    if(!me) return 0
    return fiat
    //db.collection('fee').findOne({ }),
  },

  bars: (parent, args, {me, bars }) => {
    //if(!me) return 0
    //console.log("barssss:", bars)
    return bars
  },

  user: async(parent, {_id, token}, { db, jwtToken }) => {
    //if(!!_id || !!token) console.log("_id:", _id, "token:", token)
    //  console.log("query user _id:", _id, "token:", token)
    let user = null
    if(!!_id) {
      //console.log("login _id:", _id)
      const real_id = sha256(process.env.jwtToken + _id) 
      user = await db.collection('user').findOne({ _id: real_id})
      if(!!user)
        user._id = _id
    } else if(!!token) {
      let me
      try {
        me = await jwt.verify(token, jwtToken) || null // for some reason, me is not sent by conetext {db, me, ...}
      } catch(e) {
        console.log("error jwt")
      }
      user = await db.collection('user').findOne({ sessToken: token })
      //console.log("user:", user)
      if(!!user)
        user._id = me.email_hash
    }
    return user
  },

  // Thirdparty
  /*profile: (parent, { userId }, { db, me }) => {// console.log("call to profile:", me.nick)
    if(!me) return {}
    if(!userId)
      return db.collection('profile').findOne( { userId: me.email_hash } )
    return db.collection('profile').findOne( { userId } )
  },*/

  /*thirdparties: (parent, { countries, languages}, { db, me }) => {// console.log("call to thirdparties countries:", countries, "languages:", languages)
    if(!me) return []
    if(!countries.length || !languages.length) return []
    return db.collection('profile').find( { countries: { $all: countries }, languages: { $all: languages } } ).toArray()
  },*/

  // Thirdparty
  thirdparty: (parent, { id }, { db, me }) => {// console.log("call to profile:", me.nick)
    if(!me) return {}
    return db.collection('thirdparty').findOne( { _id: ObjectID(id) } )
  },

  thirdparties: (parent, args, { db, me }) => { //console.log("call to thirdparties")
    return db.collection('thirdparty').find( { } ).toArray()
  },

  paidService: (parent, { serviceId }, { db, me }) => {
    if(!me) return false
    return db.collection('paidservice').findOne( { userId: me.email_hash, serviceId, used: false } )
  },


  // admin ---------------------------------------

  paidServices: async(parent, { serviceId, paid, used, referrer }, { db, me }) => {
    if(!me || !me.roles || !me.roles.includes('bapp')) return []
    if(serviceId == -1)
      serviceId = null
    if(referrer == -1)
      referrer = null
    if(!paid) // granted
      return db.collection('paidservice').find( { ...!!serviceId && { serviceId }, granted: true, used, ...!!referrer && { referrer } } ).toArray()
    else // paid
      return db.collection('paidservice').find( { ...!!serviceId && { serviceId }, granted: { $exists: false }, used, ...!!referrer && { referrer } } ).toArray()
  },

  paidServicesInterval: async(parent, { serviceId, dateIni, dateEnd, referrer, origin }, { db, me }) => { console.log("new Date(dateIni):", dateIni, new Date(dateIni))
    if(!me || !me.roles || !me.roles.includes('bapp')) return []
    if(serviceId == -1)
      serviceId = null
    if(referrer == -1)
      referrer = null
    return db.collection('paidservice').find( { ...!!serviceId && { serviceId }, ...!!referrer && { referrer }, origin: { $exists: false }, granted: { $exists: false },
                                                ...!!origin && { origin }, date: { $gte: new Date(dateIni), $lt: new Date(dateEnd) } } ).toArray()
  },

  referred: async(parent, { referrer }, { db, me }) => {
    if(!me || !me.roles || !me.roles.includes('bapp')) return []
    const referred = []
    referrers = [ referrer ]
    while(referrers.length) {
      referrers = await db.collection('user').find( { referrer: { $in: referrers } }, { referral: 1 } ).toArray()
      referrers = referrers.map(r => r.referral)
      console.log("referrers:", referrers)
      if(!!referrers.length)
        referred.push(referrers.length)      
    }
    
    console.log("referred:", referred)
    return referred
  },

  bappSettings: async(parent, { names, filter }, { db, me }) => { console.log("bappSettings:", names, filter)
  if(!me) return []
    if(!names) { // all or filter
      return db.collection('dat').find( { ...!!filter && { name: { $regex: RegExp(filter) } } } ).toArray()
    } else { // names
      return db.collection('dat').find( { name: { $in: names } } ).toArray()
    }
  },


  bappStats: async(parent, { n }, { db }) => {
    if(!n) n = 6

    const db_stats = await db.collection('bappstat').find({ }, { sort: { date: -1 } }).limit(n).toArray()
    //console.log("db_stats:", db_stats)  

    // get current stats
    const now = new Date()
    const prev_month = new Date(now.getFullYear(), now.getMonth()-1, now.getDate())      
    const currentStats = await common.bapp_stats(prev_month, now, db)
    //console.log("currentStats:", currentStats)

    const stats = [...db_stats, currentStats] 
    //console.log("stats:", stats)   
    return stats
  },
  
  totalUsers: (parent, args, { db }) =>
    db.collection('user').estimatedDocumentCount(),

  allUsers: (parent, args, { db }) =>
    db.collection('user').find().toArray(),

  enc_dec: async(parent, { text, cyph }, { me, jwtToken }) => {
    if(!me || !me.roles || !me.roles.includes('bapp')) return ""
    if(!!text.length) return common.encrypt(text, jwtToken)
    return common.decrypt(cyph, jwtToken)
  },

  // Mongo Admin
  collections: async(parent, args, { db, me }) => {
    if(!me || !me.roles || !me.roles.includes('bapp')) return []
    const colls = []
    const cursor = await db.listCollections() 
    while(await cursor.hasNext() ) {
      coll = await cursor.next()
      colls.push(coll.name)
    }
    return colls.sort()
  },

  eval: async(parent, { cmd }, { db, me }) => { //console.log("cmd: ", cmd)
    if(!me || !me.roles || !me.roles.includes('bapp')) return []
    let cursor =  db //.collection(coll)
    while(true) { //console.log("while true") // !!! change to parser
      const paren1 = cmd.search("\\(")
      if(paren1 == -1) break
      const paren2 = cmd.search("\\)\\.")
      const fn = cmd.substr(1, paren1-1)
      let params = cmd.substr(paren1+1, paren2-paren1-1)

      params = params.replace(/%27/g, "'")

      //console.log("fn:", fn, params)
      cmd = cmd.substring(paren2+1)

      //console.log("before parsing called: ", "["+params+"]", typeof params)
      try {
        params = JSON.parse("["+params+"]")
      } catch(err) {
        console.log("error JSON.parse:", err)
      }
      //console.log("after parsed, before traverse params:", params)
      traverse(params).forEach(function (x) {
        if(!!x && x == "replacebynewobjectid") {
          this.update(ObjectID())
        } else if(!!x && typeof x == 'string' && x.match(/^[0-9a-fA-F]{24}$/) ) { //console.log("x -> objectId:", x)
          this.update(ObjectID(x))
        } else if(!!x && typeof x == 'string' && x.match(/^[0-9]{4}-((0[13578]|1[02])-(0[1-9]|[12][0-9]|3[01])|(0[469]|11)-(0[1-9]|[12][0-9]|30)|(02)-(0[1-9]|[12][0-9]))T(0[0-9]|1[0-9]|2[0-3]):(0[0-9]|[1-5][0-9]):(0[0-9]|[1-5][0-9])\.[0-9]{3}Z$/) ) {
          this.update(new Date(x))
        }
      })
      //console.log("")
      //console.log("---------------- before execute mongo fn: "+fn+"("+JSON.stringify(params, null, 4)+")")     
      cursor = await cursor[fn](...params)
    }
    if(typeof cursor.toArray === 'function') {// console.log("is function -> toArray")
      return cursor.toArray()
    }
    //console.log("Object.keys(cursor)[0]:", Object.keys(cursor)[0] == 's')
    if(!!Object.keys(cursor) && Object.keys(cursor).length && Object.keys(cursor)[0] == "s") {
      return [true]
    }
    //console.log("[cursor]")
    return [cursor]
  },

}


/*
      { $group : {
          _id: "$address",
          balances: {
            $accumulator: {
              init: function() {        // Set the initial state
                return {
                  confirmed: 0,
                  unconfirmed: 0
                }
              },
      
              accumulate: function(state, value, utxo_height, spent_tx ) {  // Define how to update the state
                if(!!spent_tx) return state // spent
                if(!!utxo_height) state.confirmed += value
                else state.unconfirmed += value
                return state;
              },
      
              accumulateArgs: ["$value", "$utxo_height", "spent_tx"],
      
              merge: function(state1, state2) {
                return {
                  confirmed: state1.confirmed + state2.confirmed,
                  confirmed: state1.unconfirmed + state2.unconfirmed,
                }
              },
      
              finalize: function(state) {                   // Adjust the state to only return field we need
                return state
              },
      
              lang: "js"
            }
          }
        }
      }
      */



      /* 
      await db.collection('lightning').aggregate([
      { $project : {
          _id : 1,
          userId : 1,
          inContract : 1,
          user_msats : 1,
          refundSatoshis : 1,
          gap: { $subtract: [ "$inContract", { $divide: [ "$user_msats", 1000] } ] }
      } }, 
      {$sort : {"gap" : -1} },
      //{ "$project" : { "_id" : 1, "task" : 1, "status" : 1 } }
      { $skip: paging.page * paging.pagesize },
      { $limit: paging.pagesize },
     ]).toArray() 
     */
