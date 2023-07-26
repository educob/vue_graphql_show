const { ObjectID } = require('mongodb')
const { GraphQLScalarType } = require('graphql')
const sha256 = require("js-sha256")
const common = require('../lib/common')

module.exports = {
  Wallet: {
    addresses: (parent, args, { db }) => 
      db.collection('address').find({ parentId: parent._id }).toArray(),        
    coins: async(parent, { paging, bytx }, { db }) => {
      let arr
      if(!!bytx) {  // Grouped by Tx.
        arr = await db.collection('address').aggregate([ 
          { $match: { parentId: parent._id }}, // address with field parentId = wallet._id
          { $project: { "_id": 0,  "addressId": "$_id" } },
          { $lookup: {
              from: "coin",
              localField: "addressId",
              foreignField: "address",
              as: "coin"
            }
          },
          { $unwind : "$coin" },
          { $project: {
            fields: {
              "$cond": {
                "if": { "$eq": ["$coin.spent_tx", null] },
                "then": [ { tx: "$coin.utxo_tx", addressId: "$addressId", _id: "$coin._id", time: { $arrayElemAt: ["$coin.times", 0] }, height: "$coin.utxo_height", val: "$coin.value", concept: "$coin.utxo_concept", icon: "$coin.utxo_icon", sender: "$coin.sender", pending_payment: "$coin.pending_payment", nicks: "$coin.nicks" } ],
                "else": [ { tx: "$coin.utxo_tx", addressId: "$addressId", _id: "$coin._id" , time: { $arrayElemAt: ["$coin.times", 0] }, height: "$coin.utxo_height", val: "$coin.value", concept: "$coin.utxo_concept", icon: "$coin.utxo_icon", sender: "$coin.sender" }, 
                          { tx: "$coin.spent_tx", addressId: "$addressId", _id: { $concat: [ { $toString: "$coin._id" }, "_" ] }, time: { $arrayElemAt: ["$coin.times", 1] }, height: "$coin.spent_height",
                          val : { $multiply: [ "$coin.value", -1 ] }, concept: "$coin.spent_concept", icon: "$coin.spent_icon", nicks: "$coin.nicks" } ]
              } }
          } },
          { $unwind : "$fields" },
          { $replaceRoot: { newRoot: "$fields" } },
          { $group: {  "_id": "$tx", "tx": { "$first": "$tx" }, "value": { $sum: "$val" }, "time": { "$first": "$time" }, "height": { "$first": "$height" }, "concept": { "$first": "$concept" }, 
                        "icon": { "$first":  "$icon" }, "nicks": { "$first":  "$nicks" }, "sender": { "$first":  "$sender" }, "pending_payment": { "$first":  "$pending_payment" } } },
          { $sort:{ "time": -1 } },
          { $skip: paging.page * paging.pagesize },
          { $limit: paging.pagesize },
        ]).toArray()
        //console.log("arr:", arr)
        return arr
      } else { // not grouped
        arr = db.collection('address').aggregate([ 
          { $match: { parentId: parent._id }}, // address with field parentId = wallet._id
          { $project: { "_id": 0,  "addressId": "$_id" } },
          { $lookup: {
              from: "coin",
              localField: "addressId",
              foreignField: "address",
              as: "coin"
            }
          },
          { $unwind : "$coin" },
          { $project: {
            fields: {
              "$cond": {
                "if": { "$eq": ["$coin.spent_tx", null] },
                "then": [ { addressId: "$addressId", _id: "$coin._id", tx: "$coin.utxo_tx", time: { $arrayElemAt: ["$coin.times", 0] }, height: "$coin.utxo_height", value: "$coin.value", concept: "$coin.utxo_concept", icon: "$coin.utxo_icon", sender: "$coin.sender", pending_payment: "$coin.pending_payment", nicks: "$coin.nicks" } ],
                "else": [ { addressId: "$addressId", _id: "$coin._id" , tx: "$coin.utxo_tx", time: { $arrayElemAt: ["$coin.times", 0] }, height: "$coin.utxo_height", value: "$coin.value", concept: "$coin.utxo_concept", icon: "$coin.utxo_icon", sender: "$coin.sender" }, 
                          { addressId: "$addressId", _id: { $concat: [ { $toString: "$coin._id" }, "_" ] }, tx: "$coin.spent_tx", time: { $arrayElemAt: ["$coin.times", 1] }, height: "$coin.spent_height",
                            value : { $multiply: [ "$coin.value", -1 ] }, concept: "$coin.spent_concept", icon: "$coin.spent_icon", nicks: "$coin.nicks" } ]
              } }
          } },
          { $unwind : "$fields" },
          { $replaceRoot: { newRoot: "$fields" } },
          { $sort:{ "time": -1 } },
          { $skip: paging.page * paging.pagesize },
          { $limit: paging.pagesize },
          //{ $count: "totalCount" }
        ]).toArray()
    }
      return arr
    }, // Wallet confirmed utoxs
    addresses_confirmed_utxos: async (parent, args, { db }) => {// console.log("addresses_confirmed_utxos")
      let arr
      arr = await db.collection('address').aggregate([ 
        { $match: { parentId: parent._id, balance: { $gt: 0 } }}, // address with field parentId = wallet._id
        { $project: { "_id": 1, "name": 1, "index": 1, "balance": 1, "pkCypher": 1 } },
        { $lookup: {
            from: "coin",
            let: { addressId: "$_id"},
            pipeline: [
              { $match:
                { $expr:
                  { $and:
                    [
                      { $eq: [ "$address", "$$addressId" ] }, // related to address
                      { $ne: [ "$utxo_height", null ] }, // confirmed
                      { $eq: [ "$spent_tx", null ] }, // unspent
                    ]
                  }
                }
              }
            ],
            as: "confirmed_utxos"
          }
        },
        { $sort:{ "times": -1 } },
      ]).toArray()
      //console.log("wallet confirmed_utxos: ", arr)
      return arr
    },
    xpub: (parent, args, { db, jwtToken }) => {
      if(!parent.xpub) return null
      return common.decrypt(parent.xpub, jwtToken)
    },
    address: (parent, { addressId }, { db }) =>
      db.collection('address').findOne({ _id: addressId }),
  },

  Address: {
    wallet: (parent, args, { db, me }) =>  db.collection('wallet').findOne({ _id: parent.parentId, userId: me.email_hash }),
    coins: (parent, { paging, bytx }, { db }) => {
      let coins
      if(!!bytx) { // Grouped by Tx.
        coins = db.collection('coin').aggregate([ 
          { $match: { address: parent._id }},
          { $project: {
            fields: {
              "$cond": {
                "if": { "$eq": ["$spent_tx", null] }, // utxo
                "then": [ { _id: "$_id", tx: "$utxo_tx", time: { $arrayElemAt: ["$times", 0] }, height: "$utxo_height", val: "$value", concept: "$utxo_concept", icon: "$utxo_icon", sender: "$sender", pending_payment: "$pending_payment" } ],
                "else": [ { _id: "$_id", tx: "$utxo_tx", time: { $arrayElemAt: ["$times", 0] }, height: "$utxo_height", val: "$value", concept: "$utxo_concept", icon: "$utxo_icon", sender: "$sender" }, 
                          { _id: { $concat: [ { $toString: "$_id" }, "_" ] }, tx: "$spent_tx", time: { $arrayElemAt: ["$times", 1] }, height: "$spent_height", val : { $multiply: [ "$value", -1 ] },
                                    concept: "$spent_concept", icon: "$spent_icon", nicks: "$nicks" } ]
              } }
          } },
          { $unwind : "$fields" },
          { $replaceRoot: { newRoot: "$fields" } },
          { $group: {  "_id": "$tx", "tx": { "$first": "$tx" }, "value": { $sum: "$val" }, "time": { "$first": "$time" }, "height": { "$first": "$height" }, "concept": { "$first": "$concept" }, 
                        "icon": { "$first":  "$icon" }, "nicks": { "$first":  "$nicks" }, "sender": { "$first":  "$sender" }, "pending_payment": { "$last":  "$pending_payment" } } },
          { $sort:{ "time": -1 } },
          { $skip: paging.page * paging.pagesize },
          { $limit: paging.pagesize },
        ]).toArray()
      } else { // not grouped
        coins = db.collection('coin').aggregate([ 
          { $match: { address: parent._id }},
          { $project: {
            fields: {
              "$cond": {
                "if": { "$eq": ["$spent_tx", null] },
                "then": [ { _id: "$_id", tx: "$utxo_tx", time: { $arrayElemAt: ["$times", 0] }, height: "$utxo_height", value: "$value", concept: "$utxo_concept", icon: "$utxo_icon", sender: "$sender", pending_payment: "$pending_payment" } ],
                "else": [ { _id: "$_id", tx: "$utxo_tx", time: { $arrayElemAt: ["$times", 0] }, height: "$utxo_height", value: "$value", concept: "$utxo_concept", icon: "$utxo_icon", sender: "$sender" }, 
                          { _id: { $concat: [ { $toString: "$_id" }, "_" ] }, tx: "$spent_tx", time: { $arrayElemAt: ["$times", 1] }, height: "$spent_height", value : { $multiply: [ "$value", -1 ] },
                                    concept: "$spent_concept", icon: "$spent_icon", nicks: "$nicks" } ]
              } }
          } },
          { $unwind : "$fields" },
          { $replaceRoot: { newRoot: "$fields" } },
          { $sort:{ "time": -1 } },
          { $skip: paging.page * paging.pagesize },
          { $limit: paging.pagesize },
        ]).toArray()
      }
      //coins.then(data =>  console.log("address coins: ", data))
      return coins
    },

    utxos: (parent, args, { db }) => {
      return db.collection('coin').find({ address: parent._id, spent_tx: null }).toArray()
    },

    confirmed_utxos: (parent, args, { db }) => { // excludes utxos in pending payments (multisig, cond) & unconfirmed
      return db.collection('coin')
        .find({ address: parent._id, spent_tx: null, utxo_height: {$ne : null}, pending_payment: { $exists: false } }).toArray()
    },
  },

  Utxo: {
    utxo_time: (parent, args, { db, jwtToken }) =>  parent.times[0]
  },

  Multisig: {
    address: (parent, args, { db }) => {
      return db.collection('address').findOne({ _id: parent.scriptAddressId })
    },
    payments: (parent, args, { db }) => {
      return db.collection('msigpayment')
        .find({ multisigId: parent._id.toString() }, 
        { sort: { created: -1 }}).toArray()
    },
    output: (parent, args, { db, jwtToken }) => {
      if(!parent.output) return null
      return Buffer.from(common.decrypt(parent.output, jwtToken), 'hex')
    },
    witness: (parent, args, { db, jwtToken }) => {
      if(!parent.witness) return null
      return Buffer.from(common.decrypt(parent.witness, jwtToken), 'hex')
    },
  },

  Smartcontract: {
    address: (parent, args, { db }) => {
      return db.collection('address').findOne({ _id: parent.scriptAddressId })
    },
    payments: (parent, args, { db }) => {
      return db.collection('payment')
        .find({ scriptId: parent._id.toString() }, 
        { sort: { created: -1 }}).toArray()
    },
    output: (parent, args, { db, jwtToken }) => {
      if(!parent.output) return null
      return Buffer.from(common.decrypt(parent.output, jwtToken), 'hex')
    },
    witness: (parent, args, { db, jwtToken }) => {
      if(!parent.witness) return null
      return Buffer.from(common.decrypt(parent.witness, jwtToken), 'hex')
    },
  },

  Inheritance: {
    address: (parent, args, { db }) => { //console.log("query inheritance.address parent:", parent)
      return db.collection('address').findOne({ _id: parent.scriptAddressId })
    },
    output: (parent, args, { db, jwtToken }) => {
      if(!parent.output) return null
      return Buffer.from(common.decrypt(parent.output, jwtToken), 'hex')
    },
    witness: (parent, args, { db, jwtToken }) => {
      if(!parent.witness) return null
      return Buffer.from(common.decrypt(parent.witness, jwtToken), 'hex')
    },
    path: (parent, args, { db, jwtToken }) => {
      if(!parent.path) return null
      return JSON.parse(common.decrypt(parent.path, jwtToken))
    },
    aftermessages: (parent, args, { db }) => {
      return db.collection('aftermessage').find({ parentId: parent._id }).toArray()
    },
  },

  Trust: {
    address: (parent, args, { db }) => { //console.log("trust address:", parent.scriptAddressId)
      return db.collection('address').findOne({ _id: parent.scriptAddressId } )
    },
    output: (parent, args, { db, jwtToken }) => {
      if(!parent.output) return null
      return Buffer.from(common.decrypt(parent.output, jwtToken), 'hex')
    },
    witness: (parent, args, { db, jwtToken }) => {
      if(!parent.witness) return null
      return Buffer.from(common.decrypt(parent.witness, jwtToken), 'hex')
    },
  },

  RecurringPay: {
    payments: (parent, { paging }, { db }) => {
      return db.collection('recurringpaypay')
        .find({ scriptId: parent._id.toString() }, 
        { sort: { created: -1 }}).skip(paging.page * paging.pagesize).limit( paging.pagesize ).toArray()
    },
  },

  Aftermessage: {
    message: (parent, args, { jwtToken }) => {
      return common.decrypt(parent.message, jwtToken)
    },
    thirdparty: (parent, args, { db }) => {
      if(!parent.thirdpartyId) return null
      return db.collection('thirdparty').findOne({ _id: ObjectID(parent.thirdpartyId) } )
    },
  },

  Lightning: {
    pays: (parent, args, { db, me }) => {
      return db.collection('lnpay').find({ $or: [ { creatorId: me.email_hash },
                                                  { payerId: me.email_hash } ] }, 
                                          { sort: { date: -1 }}).toArray()
    },
    bappWalletId: (parent, args, {  me }) => {
      if(!me || !me.roles || !me.roles.includes('admin')) return false
      return common.ln_wallet()

    },
  },

  PaidService: {
    referrerPercentage: async(parent, args, { db }) => { 
      let referrer = await db.collection('referrer').findOne( { referrer: parent.referrer } )
      if(!referrer)
        referrer = await db.collection('referrer').findOne( { referrer: 0 } ) // general  percentage
      return referrer.percentage      
    },
    referrerAddress: async(parent, args, { db }) => {
      let user = await db.collection('user').findOne( { referral: parent.referrer } )
      if(!!user)
        return user.defaultAddress      
      return null
    },
  },


  User: {
    opts: async(parent, args, { db }) => {
      const opts = await db.collection('opt').find({ userId: parent._id }).toArray()
      return opts
    },
    donation_address: () => {
      if(process.env.BITCOIN_NETWORK == 'mainnet') return 'bc1q2l7j4l43hcy3pfj32fcnvg0kqtezgaz2v7hrw7'
      return '2NCnAr7Yr1Nkttw198bbzqDXEcEtMvz12UF'
    },
    fee_address: () => {
      if(process.env.BITCOIN_NETWORK == 'mainnet') return '3Q4w57Jq5msDKe6vQDGzhThamvX2o6BFtJ'
      return '2N61krUwZCyqaJpTe7RnQyHDwXbnox8yzj1'
    },
    stats: async(parent, args, { db }) => {
      const stats = []
      // wallets
      const wallets_count = await db.collection('wallet').find( {userId: parent._id } ).count()
      stats.push( { name: 'wallets', value: wallets_count } )
      // after messages
      const am_count = await db.collection('aftermessage').find( { $or: [ { senderId: parent._id },
                                                                     { thirdpartyUserId: parent._id } ] } ).count()
      stats.push( { name: 'aftermessages', value: am_count } )
      // inheritances
      const inh_count = await db.collection('inheritance').find( { 
                                          $or: [ { testatorId: parent._id },
                                                 { thirdpartyUserId: parent._id } ] } ).count()
      stats.push( { name: 'inheritances', value: inh_count } )
      return stats
    },
  },


  DateTime: new GraphQLScalarType({
    name: 'DateTime',
    description: 'A valid date time value.',
    parseValue: value => new Date(value),
    serialize: value => new Date(value).toISOString(),
    parseLiteral: ast => ast.value
  }),

  Any: new GraphQLScalarType({
    name: "Any",
    description: "Literally anything",
    serialize(value) { return value },
    parseValue(value) { return value },
    parseLiteral(ast) { return ast.value }
  }),


}
