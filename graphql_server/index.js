const express = require('express')
const { createServer } = require('http')
const { ApolloServer } = require('apollo-server-express')
const { MongoClient } = require('mongodb')
const { readFileSync } = require('fs')
const depthLimit = require('graphql-depth-limit')
const { createComplexityLimitRule } = require('graphql-validation-complexity')
const CronJob = require('cron').CronJob
const { Decimal } = require('decimal.js')
const bitcoin = require('bitcoinjs-lib')
const zmq = require('zeromq')
const Client = require('bitcoin-core')
const { ObjectID } = require('mongodb')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const { RedisPubSub } = require('graphql-redis-subscriptions')
const resolvers = require('./resolvers')
const sha256 = require("js-sha256")
const request = require('request')
const nodemailer = require("nodemailer")

const alerts = require('./lib/alerts')
const common = require('./lib/common')


// LND
const lnService = require('ln-service');


// https://redis.io/commands/hdel
/*const Redis = require("ioredis")
var redis = Redis.createClient();
redis.on('connect', function() {
  console.log('Redis client connected')
})
redis.on('error', function (err) {
  console.log('Redis something went wrong ' + err);
})

async function adios() {
  try {
  redis.hmset("lightning", "k1", 15)
//  redis.expire("key4", 1)

  const var2 = await redis.hget("lightning", "k1")
  console.log("var:", var2)
  console.log("len:", await redis.hgetall("lightning")) 

  await redis.hdel("lightning", tx.txid)
  } catch(e) {
    console.log("error:", e)
  }
}*/

//console.log("BITCOIN_RPCPORT:", process.env.BITCOIN_RPCPORT)
//var fs = require('fs');
//var files = fs.readdirSync('/lightning')
//console.log("filesssssssssssssss:", files)


let btcNode = new Client( { host: process.env.BITCOIN_HOST, username: process.env.BITCOIN_USER, password: process.env.BITCOIN_PASSWORD, port: process.env.BITCOIN_RPCPORT, timeout: 30000 } ) // https://chainquery.com/bitcoin-cli
 
/*
start_btcNode()
 
async function start_btcNode() { // address = bcrt1qjpsv06cs65qasjtz05xc7xjeftknc2e9pr29pw
  if(process.env.BITCOIN_NETWORK != 'regtest') return
 
  try {
    const address = await btcNode.getNewAddress()
    console.log("node wallet address:", address)
   
  } catch(e) {
    console.log("btcNode.getNewAddress:", e)
  }
}*/
 


// lnd
let lnd_Obj

try {
  if(process.env.BITCOIN_NETWORK == 'regtest') {
    // laptop
    /*lnd_Obj = lnService.authenticatedLndGrpc({
      cert: ' LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUNKRENDQWNxZ0F3SUJBZ0lRQTBqcnUyZXNvdFp6MENFRUsxYjZzVEFLQmdncWhrak9QUVFEQWpBNE1SOHcKSFFZRFZRUUtFeFpzYm1RZ1lYVjBiMmRsYm1WeVlYUmxaQ0JqWlhKME1SVXdFd1lEVlFRREV3eGxNRFppTnpsagpaRFF6TUdFd0hoY05Nakl4TURBeE1qQTFPVFU1V2hjTk1qTXhNVEkyTWpBMU9UVTVXakE0TVI4d0hRWURWUVFLCkV4WnNibVFnWVhWMGIyZGxibVZ5WVhSbFpDQmpaWEowTVJVd0V3WURWUVFERXd4bE1EWmlOemxqWkRRek1HRXcKV1RBVEJnY3Foa2pPUFFJQkJnZ3Foa2pPUFFNQkJ3TkNBQVR0TVBLSEZkV3Z4VEFsQ3NDYU9TWlFrbGtobjVZVwpHclNsZEZoUnlCZjJPdHRCNXNpT1VjWlVWUzJWYWgrNnpzWjB6NXIybEZkVTMrcVVaekloM3R5a280RzFNSUd5Ck1BNEdBMVVkRHdFQi93UUVBd0lDcERBVEJnTlZIU1VFRERBS0JnZ3JCZ0VGQlFjREFUQVBCZ05WSFJNQkFmOEUKQlRBREFRSC9NQjBHQTFVZERnUVdCQlRTRlBpaGozbkg0bTFRWWJVNFhmaURBbkFyM1RCYkJnTlZIUkVFVkRCUwpnZ3hsTURaaU56bGpaRFF6TUdHQ0NXeHZZMkZzYUc5emRJSUVkVzVwZUlJS2RXNXBlSEJoWTJ0bGRJSUhZblZtClkyOXVib2NFZndBQUFZY1FBQUFBQUFBQUFBQUFBQUFBQUFBQUFZY0VyQklBQWpBS0JnZ3Foa2pPUFFRREFnTkkKQURCRkFpQUwrazBRV1hTZVdteTR1QWIreUE5OFdzUmI3bjhtYmFvU2NWN2Fxbm5ZV2dJaEFQQXNBL1hkNDZnNwpLbUxSVC9aM1B2dHpQelJPdTMwZXhPa09hK3lablV3bQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg==',
      macaroon: 'AgEDbG5kAvgBAwoQTobzjjuFavEgtTR+Vi6ksxIBMBoWCgdhZGRyZXNzEgRyZWFkEgV3cml0ZRoTCgRpbmZvEgRyZWFkEgV3cml0ZRoXCghpbnZvaWNlcxIEcmVhZBIFd3JpdGUaIQoIbWFjYXJvb24SCGdlbmVyYXRlEgRyZWFkEgV3cml0ZRoWCgdtZXNzYWdlEgRyZWFkEgV3cml0ZRoXCghvZmZjaGFpbhIEcmVhZBIFd3JpdGUaFgoHb25jaGFpbhIEcmVhZBIFd3JpdGUaFAoFcGVlcnMSBHJlYWQSBXdyaXRlGhgKBnNpZ25lchIIZ2VuZXJhdGUSBHJlYWQAAAYgIGgV12utqP/WDrwMZef0Q++SdGTF9qBzOcIUV9hyUMM=',
      socket: 'localhost:9902',
    });*/
    lnd_Obj = lnService.authenticatedLndGrpc({
      cert: 'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUNKRENDQWN1Z0F3SUJBZ0lSQUxjQnJHcXFWcWZzNzVlc05xaFRzRjh3Q2dZSUtvWkl6ajBFQXdJd09ERWYKTUIwR0ExVUVDaE1XYkc1a0lHRjFkRzluWlc1bGNtRjBaV1FnWTJWeWRERVZNQk1HQTFVRUF4TU1Nek5tTXpjeApNMkkwWW1NMU1CNFhEVEl5TVRFd05EQTRNRGN3TlZvWERUSXpNVEl6TURBNE1EY3dOVm93T0RFZk1CMEdBMVVFCkNoTVdiRzVrSUdGMWRHOW5aVzVsY21GMFpXUWdZMlZ5ZERFVk1CTUdBMVVFQXhNTU16Tm1NemN4TTJJMFltTTEKTUZrd0V3WUhLb1pJemowQ0FRWUlLb1pJemowREFRY0RRZ0FFamNOcEg0NWJHV01mSFBVS0NiTXY5OFJEdXhuQwpLWCtqNEZEY0lITkltWGNILzlYZENxM1pCTi9ncG82azd2ZEtYNUtGZ0FYRGd1RThhZFJiVXp2YnNhT0J0VENCCnNqQU9CZ05WSFE4QkFmOEVCQU1DQXFRd0V3WURWUjBsQkF3d0NnWUlLd1lCQlFVSEF3RXdEd1lEVlIwVEFRSC8KQkFVd0F3RUIvekFkQmdOVkhRNEVGZ1FVaURUdkQwZnVIN3U3VnY4aUdNNkFPdldUWGNvd1d3WURWUjBSQkZRdwpVb0lNTXpObU16Y3hNMkkwWW1NMWdnbHNiMk5oYkdodmMzU0NCSFZ1YVhpQ0NuVnVhWGh3WVdOclpYU0NCMkoxClptTnZibTZIQkg4QUFBR0hFQUFBQUFBQUFBQUFBQUFBQUFBQUFBR0hCS3dUQUFNd0NnWUlLb1pJemowRUF3SUQKUndBd1JBSWdjWXhCSkVpY1QrMTczZmNuc2krYm9paFJOOGdWaElqM2FCY3MybzRrWFVRQ0lCWTBUbFNBWmdkMApLL2d1UzZiYzQzMTN0aFE4VzRUNm1PM092OHc2SVFzSwotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg==',
      macaroon: 'AgEDbG5kAvgBAwoQsb/bS+mRR9H7fMzUTUMqVhIBMBoWCgdhZGRyZXNzEgRyZWFkEgV3cml0ZRoTCgRpbmZvEgRyZWFkEgV3cml0ZRoXCghpbnZvaWNlcxIEcmVhZBIFd3JpdGUaIQoIbWFjYXJvb24SCGdlbmVyYXRlEgRyZWFkEgV3cml0ZRoWCgdtZXNzYWdlEgRyZWFkEgV3cml0ZRoXCghvZmZjaGFpbhIEcmVhZBIFd3JpdGUaFgoHb25jaGFpbhIEcmVhZBIFd3JpdGUaFAoFcGVlcnMSBHJlYWQSBXdyaXRlGhgKBnNpZ25lchIIZ2VuZXJhdGUSBHJlYWQAAAYgrd1Q02XLPr3JjFAdCzllw4Fc5YRnGuE4VpYLGIjnQBY=',
      socket: 'localhost:9902',
    });
  } else if(process.env.BITCOIN_NETWORK == 'testnet') {  
    lnd_Obj = lnService.authenticatedLndGrpc({
      cert: 'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUNOakNDQWR5Z0F3SUJBZ0lRYzVaLy9lQXVtbFdqN2ZkU3hnVUNHakFLQmdncWhrak9QUVFEQWpBNE1SOHcKSFFZRFZRUUtFeFpzYm1RZ1lYVjBiMmRsYm1WeVlYUmxaQ0JqWlhKME1SVXdFd1lEVlFRREV3dzROemRsT1dJNQpZVFF4WXpjd0hoY05Nakl4TURFNU1qTXdNVEF5V2hjTk1qTXhNakUwTWpNd01UQXlXakE0TVI4d0hRWURWUVFLCkV4WnNibVFnWVhWMGIyZGxibVZ5WVhSbFpDQmpaWEowTVJVd0V3WURWUVFERXd3NE56ZGxPV0k1WVRReFl6Y3cKV1RBVEJnY3Foa2pPUFFJQkJnZ3Foa2pPUFFNQkJ3TkNBQVRndUl6L1d4UVVCekN5eVhFTjkzbU4yNi9RTTJ0aQpSWkRlaXNPRThxdlFadUxOa1ByOHJXUE5DMHd6bXhUdGZPQ0xEd0R1NEhFZ1hHTzQ3b2JMbXFla280SEhNSUhFCk1BNEdBMVVkRHdFQi93UUVBd0lDcERBVEJnTlZIU1VFRERBS0JnZ3JCZ0VGQlFjREFUQVBCZ05WSFJNQkFmOEUKQlRBREFRSC9NQjBHQTFVZERnUVdCQlNHWk9KQ29ISTQ4d0tOaFhuNXpDU3FKZUtFMkRCdEJnTlZIUkVFWmpCawpnZ3c0TnpkbE9XSTVZVFF4WXplQ0NXeHZZMkZzYUc5emRJSUtkR1Z6ZEc1bGRHeHVaSUlFZFc1cGVJSUtkVzVwCmVIQmhZMnRsZElJSFluVm1ZMjl1Ym9jRWZ3QUFBWWNRQUFBQUFBQUFBQUFBQUFBQUFBQUFBWWNFckJZQUJZY0UKckJZQUJ6QUtCZ2dxaGtqT1BRUURBZ05JQURCRkFpRUEwbTZ2d053cDNXTThGSDE3aERUTVVoM1M1VU9NOEJLcwpob011SmdaeDBVb0NJRXovczNETUNVbEUvMnA5MldCUmpRczhpMUJJc05ESHZIdU9kTmNwK29hNgotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg==',
      macaroon: 'AgEDbG5kAvgBAwoQyHT4kbybbvSjKSAqalp9eRIBMBoWCgdhZGRyZXNzEgRyZWFkEgV3cml0ZRoTCgRpbmZvEgRyZWFkEgV3cml0ZRoXCghpbnZvaWNlcxIEcmVhZBIFd3JpdGUaIQoIbWFjYXJvb24SCGdlbmVyYXRlEgRyZWFkEgV3cml0ZRoWCgdtZXNzYWdlEgRyZWFkEgV3cml0ZRoXCghvZmZjaGFpbhIEcmVhZBIFd3JpdGUaFgoHb25jaGFpbhIEcmVhZBIFd3JpdGUaFAoFcGVlcnMSBHJlYWQSBXdyaXRlGhgKBnNpZ25lchIIZ2VuZXJhdGUSBHJlYWQAAAYg6JM+yZz2NSPoRNo4ObdXac3ue6sY0yhltIcpXTm05Nw=',
      socket: 'testnetlnd:9912',
    });
  } else if(process.env.BITCOIN_NETWORK == 'xxxmainnet') {
    lnd_Obj = lnService.authenticatedLndGrpc({
      cert: 'xxx',
      macaroon: 'xxx',
      socket: 'localhost:10009',
    });
  }
} catch (e) {
  console.log("lnNode error: ", e)
}


let lnNode

if(process.env.BITCOIN_NETWORK != 'mainnet') { 
  lnNode = { lnService, lnd: lnd_Obj.lnd }

  let call = lnService.subscribeToInvoices( { lnd: lnd_Obj.lnd } );
  call.on('invoice_updated', function(invoice) {
    lnPayRecieved(invoice)
  })
}

async function lnPayRecieved(invoice) { // always received externally
  if(!invoice.is_confirmed) return
  const received_mtokens = parseInt(invoice.received_mtokens)
  const res = await db.collection('lnpay').findOneAndUpdate( { id: invoice.id },
                                            { $set: { paid: new Date() } }, 
                                            { returnOriginal: false } )
  if(!res.value) {  // log something
    console.log("lnpay res:", res)
    return
  }
  const lnPay = res.value
  console.log('lnPayReceived:', JSON.stringify(lnPay, null, 4))

  const lightning = await db.collection('lightning').findOneAndUpdate( { userId: lnPay.creatorId },
                                                                      { $inc: { user_msats: received_mtokens } }, 
                                                                      { returnOriginal: false } )
  if(!lightning.value) {
    console.log("lightning not found:", lightning)
    return // invoice not issued by bapp user
  }
  //await pubsub.publish('lnpay-received', { lnPayReceived: lnPayReceived.value, subscriberId: userId })
  await pubsub.publish( 'new-lnpay', { newLnPay: lnPay, subscriberId: lnPay.creatorId } ) 
}



const jwtToken = process.env.jwtToken
if(!jwtToken) console.log("Must: export jwtToken=xxx")
let last_block = 0

//const bitcapp = jwt.sign( {_id: 'Bitcapp' }, jwtToken) 
//console.log("Bitcapp:", bitcapp)
 // bitcapp = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiJCaXRjYXBwIiwiaWF0IjoxNjA2MTI4MjU2fQ.OgmaKOjAyaKiNBRn8JHwXD_Xpv_V9z7i43G36AWOaPY'

// error handler
var	myDomain	=	require('domain').create()
myDomain.on('error',	function(err)	{
  console.log('Error	ignored!:', err)
})

// extra information when broadcasting tx that will be saved when tx is notified.
txs_extrainfo = {}
autologin_codes = {} // code: { userId, created }
fees = { fastest:0, halfhour:0, hour:0, hours24:0 }
if(process.env.BITCOIN_NETWORK == 'regtest') 
  fees = { fastest:200, halfhour:180, hour: 150, hours24: 50 }

let fiat = {}
let bars
let currentBar

// bitcoind --datadir=/media/r2d2/ssd_2/testnet/bitcoin -deprecatedrpc=generate 
// source regtest.env

// ports: netstat -plan | grep bitcoin
// ~/opt/lightning/lightningd/lightningd --log-level=debug:plugin --conf=/home/r2d2/.lightning/regtest/ln.conf --encrypted-hsm --plugin=/home/r2d2/bapp/graphql/ln_plugin/ln_regtest.py
// ~/opt/lightning/lightningd/lightningd --log-level=debug:plugin --conf=/home/r2d2/.lightning/testnet/ln.conf --plugin=/home/r2d2/bapp/graphql/ln_plugin/ln_testnet.py
// ~/opt/lightning/cli/lightning-cli --conf=/home/r2d2/.lightning/regtest/ln.conf 

// bitcoin-cli --datadir=data  getnetworkinfo stop getblockchaininfo
let mailer = nodemailer.createTransport({ 
  host: "SSL0.OVH.NET",
  port: 587,
  secure: false, // true for 465, false for 587
  auth: {
    user: common.decrypt("4f3ddf89d2bf646555d263085f09ecf1:9f12b9d1ca743e6e69508625e8ab343c589935", jwtToken),
    pass: common.decrypt("0ef89fdbd85d2946ad110e4594000cc9:2f4b509c2d730260f975", jwtToken)
  },
})

var typeDefs = readFileSync('./typeDefs.graphql', 'UTF-8')

const pubsub = new RedisPubSub({
  connection: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    retry_strategy: options => {
      // reconnect after upto 3000 milis
      return Math.max(options.attempt * 10, 20000)
    }
  }
})

let mongo_client
let db

let mongo_chain // a promise to start a chain of mongo updates

async function start() {
  const app = express()

  // https://mongodb.github.io/node-mongodb-native/3.2/tutorials/connect/authenticating/
  // https://medium.com/rahasak/enable-mongodb-authentication-with-docker-1b9f7d405a94
  const user = encodeURIComponent('bapp_user')
  const password = encodeURIComponent('secretpass4bapp_user')
  const authMechanism = 'DEFAULT'
  // mongodb+srv://<username>:<password>@cluster0.kmday.mongodb.net/test

  //`mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}/${process.env.BITCOIN_NETWORK}`
  let MONGO_URL
  /*if(false && process.env.BITCOIN_NETWORK == 'mainnet') {
    MONGO_URL = 'mongodb://bapp_user_mainnet_00:c4ny9Ca0OnAIE1pW@bapp-shard-00-00.kazse.mongodb.net:27017,bapp-shard-00-01.kazse.mongodb.net:27017,bapp-shard-00-02.kazse.mongodb.net:27017/mainnet?ssl=true&replicaSet=atlas-xi8zbm-shard-0&authSource=admin&retryWrites=true&w=majority'
    //MONGO_URL = 'mongodb+srv://bapp_user_mainnet_00:c4ny9Ca0OnAIE1pW@cluster0.kmday.mongodb.net/mainnet'
    //MONGO_URL = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}/${process.env.BITCOIN_NETWORK}?retryWrites=true&w=majority`
  } else */
    MONGO_URL = `mongodb://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.BITCOIN_NETWORK}?retryWrites=true&w=majority`
    // mainnet MONGO_URL = "mongodb://bapp_user:bapp_password_user_27000@mainnetdb/mainnet?retryWrites=true&w=majority"
    //MONGO_URL = 'mongodb+srv://bapp_user_mainnet_00:c4ny9Ca0OnAIE1pW@cluster0.kmday.mongodb.net/mainnet'
    //MONGO_URL = 'mongodb://bapp_user_mainnet_00:c4ny9Ca0OnAIE1pW@bapp-shard-00-00.kazse.mongodb.net:27017,bapp-shard-00-01.kazse.mongodb.net:27017,bapp-shard-00-02.kazse.mongodb.net:27017/mainnet?ssl=true&replicaSet=atlas-xi8zbm-shard-0&authSource=admin&retryWrites=true&w=majority'
     // https://www.shapeblock.com/docker-mongodb/
  // https://hackernoon.com/securing-mongodb-on-your-server-1fc50bd1267b
  //console.log("MONGO_URL:", MONGO_URL)
  try {
    mongo_client = await MongoClient.connect(MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true })
    db = mongo_client.db() // db.getCollection('coin').createIndex( { times: 1 } ) // db.getCollection('coin').ensureIndex({"times":1},{"unique":true})
  } catch (error) {
    //console.log("MONGO_URL:", MONGO_URL)
    console.log(`
      Mongo DB error:`, error)
    process.exit(1)
  }
  // remove from here !!!
  blockchain_job()
  daily_job()

  bars = await db.collection('bar').find({}, { sort: {day: -1} } ).limit(45).toArray()
  bars = bars.reverse()
  if(!!bars.length) 
    currentBar = bars[bars.length - 1]

  fees_fiat_job()

  mongo_chain = mongo_chain_start()

  const apolloServer = new ApolloServer({
    typeDefs,
    resolvers,
    engine: true,
    cacheOptions: (response, request) => { // note that response is the first argument
      return { ttl: 0 }
   },
    validationRules: [
      depthLimit(5),
      createComplexityLimitRule(15500, {
      //  onCost: cost => console.log('query cost: ', cost)
      })
    ],
    context: async ({ req, res }) => {
      let me 
      if(!!req && !!req.headers) {
        /*Object.keys(req.headers).forEach( h => {
          if(!['origin', 'referer', 'accept-language', 'accept', 'content-type', 'accept-encoding', 'connection', 'content-length', 'host', 'user-agent', 'sec-fetch-site', 'sec-fetch-mode'].includes(h))
            console.log("     ", h,":", req.headers[h].substring(0,125))
        })*/
        if(!!req.headers.authorization) {
          const token = req.headers.authorization// ; console.log("token:", token)
          try {
            me = await jwt.verify(token, jwtToken) || null
            //console.log("me:", me)
          } catch(e) {
            console.log("jwt.verify error:", error)
          }
        }
      }
      //if (!user) throw new AuthenticationError('you must be logged in')
      // in resolver: if (!context.user || !context.user.roles.includes('admin')) return null
      return { db, me, pubsub, btcNode, lnNode, bcrypt, jwt, fiat, bars, jwtToken, txs_extrainfo, autologin_codes, last_block, fees, mailer, daily_job }
    },
    introspection: false
  })

  apolloServer.applyMiddleware({ 
    app,
    bodyParserConfig: { limit: 1000000 },
  })

  const httpServer = createServer(app)
  apolloServer.installSubscriptionHandlers(httpServer)
  //httpServer.timeout = 50000

  httpServer.listen({ port: process.env.GRAPHQL_PORT }, () => {
      //console.log(`GraphQL Server running at http://localhost:${process.env.GRAPHQL_PORT}${apolloServer.graphqlPath}`)
    } 
  )

}  



// Daily Job
const daily_cron = new CronJob('0 0 1 * * *', daily_job) // 1 in the morning. each minute: 0 */1 * * * *: seconds, minutes, hours day_of_month(1-31), months(0-11), day-fo-week(0-6)
daily_cron.start()

async function daily_job() { 
  console.log("daily_job:", new Date())
  // Recurring Pay 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 
  let now = new Date()
  //console.log("now:", now)
  const recurringpays = await db.collection('recurringpay').find( { nextDate: { $lt: now } }).toArray()  // inheritance active
  if(!!recurringpays.length)
    console.log("RecurringPay payments for today: ", recurringpays.length)
  recurringpays.forEach( async function(pay) {
    console.log("recurringpay:", pay)                                  // aux1 = stringify(pay) so no findOne in frontend
    alerts.newAlert(db, pubsub, pay.userId, alerts.codes.recurringpay.pay, pay._id, aux1=pay.concept, aux2=pay.total, aux3=JSON.stringify(pay))
    console.log("recurringpay._id:", pay._id)
    await db.collection('recurringpay').updateOne( { _id: pay._id }, 
                                                { $set: { nextDate: common.next_recurring_date(pay.type, pay.day, pay.month) } } )
  })


  // Inheritance 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1
  // active (status=1) that expire -> status = 2

  const inheritances = await db.collection('inheritance').find( { status: 1, isThirdParty: { '$exists' : false } }).toArray()  // inheritance active
  //if(!!inheritances.length)
  //  console.log("inheritance job in status=1. Found: ", inheritances.length)  
  inheritances.forEach( async function(inheritance) {
    const testatorId = sha256(jwtToken + inheritance.testatorId)
    const testator = await db.collection('user').findOne( { _id: testatorId } )  // inheritance active
    //console.log("inheritance trigger: ", now > inheritance.timetrigger * 24*60*60*1000 + testator.last_access.getTime())
    if(!!testator && now > inheritance.timetrigger * 24*60*60*1000 + testator.last_access.getTime()) { // timetrigger elapsed
      // process
      console.log(`************************************************** inheritance ${inheritance.name} timetrigger expired.`)
      const tree = inheritance.tree
      // purge INACTIVE heirs
      const stack = [ ...tree.children ]
      while (stack.length) { // remove inactive users from tree
        const node = stack.pop()
        //console.log("---------------------node poped:", node.nick, 'Children:', node.children.length)
        let user = await db.collection('user').findOne({ _id: sha256(process.env.jwtToken + node.userId) })
        //console.log(user.nick, "access:", user.last_access.toString().substring(0, 11), node.percentage, "%. inactive:", now > (user.last_access.getTime() + 1*24*60*60*1000))
        if(now > (user.last_access.getTime() + common.inheritance_inactivity_time*24*60*60*1000)) { // inactive user
          const parentNode = common.findTreeNode(tree, node.parentId)
          const pos = parentNode.children.findIndex((elem, i, array) => elem.id == node.id)
          parentNode.children.splice(pos, 1) // remove child.
          if(!!node.children.length) { // has chrandhildren
            let remaining = node.percentage
            node.children.forEach( (child, i) => { // children go to grandfather
              const old_per = child.percentage
              child.parentId = parentNode.id
              if( i <= node.children.length - 2) {
                child.percentage = Math.round(child.percentage * node.percentage / 100)
                remaining -= child.percentage
                //console.log(i, child.nick, old_per,"%->", child.percentage, "%")
              } else { // last sibling
                child.percentage = remaining
                //console.log("last sibling: ", child.nick, old_per,"%->", child.percentage, "%")
              }
              parentNode.children.splice(pos, 0, child) // insert child to grandpa
            })
          } else { // no grandchildren
            let remaining = 100
            let total_percentage = parentNode.children.reduce( (acc, c) => acc + c.percentage, 0)
            parentNode.children.forEach( (child, i) => { 
              const old_per = child.percentage
              if( i <= parentNode.children.length - 2) {
                child.percentage += Math.round(child.percentage * node.percentage / total_percentage) 
                remaining -= child.percentage
                //console.log(i, child.nick, old_per,"%->", child.percentage, "%")
              } else { // last sibling
                child.percentage = remaining
                //console.log(i, "last:", child.nick, old_per,"%->", child.percentage, "%")
              }
            }) 
          }
          if(!!node.children) stack.push(...node.children)
        }
      }
      await common.buildInheritanceTx(db, pubsub, jwtToken, inheritance, { userId: inheritance.thirdpartyUserId, addressId: inheritance.thirdpartyAddressId }, fees)
      // update timetrigger of depending aftermessages
      await db.collection('aftermessage').updateMany( { parent_id: inheritance._id.toString() }, { $set: { timetrigger: 1 } } )
    }
  })

  // after messages
  // status: 0 => 1
  const aftermessages = await db.collection('aftermessage').find( { status: 0, thirdpartyUserId: { $exists: false } }).toArray()  // inheritance active
  //if(!!aftermessages.length)
  //  console.log("aftermessages job in status=0. Found: ", aftermessages.length)
  aftermessages.forEach( async function(aftermessage) {
    const creatorId = sha256(jwtToken + aftermessage.senderId)
    const creator = await db.collection('user').findOne( { _id: creatorId } ) // ; console.log("creator:", creator)
    if(!creator) return
    if(aftermessage.type==1 && now > aftermessage.timetrigger * 24*60*60*1000 + creator.last_access.getTime() ||
      (aftermessage.type==2 && now > aftermessage.date )) { // timetrigger elapsed
      //console.log("******************************** Sending aftermessages", aftermessage.name, "type:", aftermessage.type, "access:", creator.last_access, "am.date:", aftermessage.date, "trigger:", aftermessage.timetrigger )
      // process
      alerts.newAlert(db, pubsub, aftermessage.beneficiaryId, alerts.codes.aftermessage.received, aftermessage._id, aux1=aftermessage.name, aux2=aftermessage.senderNick, aux3=JSON.stringify(aftermessage))
      //console.log("aftermessage._id:", aftermessage._id)
      await db.collection('aftermessage').updateOne( { _id: aftermessage._id },
                                                 { $set: { status: 1, received: new Date() } } )
      await pubsub.publish('aftermessage-received', { aftermessageReceived: aftermessage } )                                        
    }
  })

  // trusts
  // bapp Date 1 1 1 1 1
  let trusts = await db.collection('trust').find( { status: 10, backDate: { $lt: utcNow() } }).toArray()  // trust not executed by beneficiary after 2 months
  for(const trust of trusts) {
   // console.log("time trust._id:", trust._id)
    const path = {
      "lockTime": trust.backDate,
      "steps": [
      ]
    }
    const tx = await common.buildTrustTx(db, jwtToken, trust, trust.backDate, [ { addressId: trust.backAddressId, percentage: 100 } ], path, fees )
    await db.collection('trust').updateOne( { _id: trust._id }, { $set: { status: 20, backDateActivated: new Date(), path, tx } } )
    alerts.newAlert(db, pubsub, trust.backUserId, alerts.codes.trust.testator_not_executed, trust._id, aux1=trust.testatorNick, aux2=trust.name, aux3=trust.backAddressId )
    //console.log("trust testator activated:", trust.name)
  }
  // testatorDate 2 2 2 2 
  trusts = await db.collection('trust').find( { status: 2, testatorDate: { $lt: utcNow() } }).toArray()  // trust not executed by beneficiary after 2 months
  for(const trust of trusts) {
    //console.log("time trust._id:", trust._id)
    const path = {
      "lockTime": trust.testatorDate,
      "steps": [
      ]
    }
    const tx = await common.buildTrustTx(db, jwtToken, trust, trust.testatorDate, [ { addressId: trust.testatorAddressId, percentage: 100 } ], path, fees )
    await db.collection('trust').updateOne( { _id: trust._id }, { $set: { status: 10, testatorDateActivated: new Date(), path, tx } } )
    alerts.newAlert(db, pubsub, trust.testatorId, alerts.codes.trust.beneficiary_not_executed, trust._id, aux1=trust.beneficiary.nick, aux2=trust.name, aux3=trust.testatorAddressId )
    //console.log("trust testator activated:", trust.name)
  }
  // beneficiaryDate 3 3 3 3 3
  trusts = await db.collection('trust').find( { status: 1, executionDate: { $lt: utcNow() } }).toArray()  // trust active
  for(const trust of trusts) { //
    //console.log("time trust._id:", trust._id)
    const path = {
      "lockTime": trust.executionDate,
      "steps": [
      ]
    }
    let status = 2 // unless there are no funds
    let alertCode = alerts.codes.trust.execution_beneficiary
    const tx = await common.buildTrustTx(db, jwtToken, trust, trust.executionDate, [ { ...trust.beneficiary, percentage: 100 } ], path, fees )
    //console.log("tx:Ç", tx)
    if(!tx) { // no funds
      status = 4
      alertCode = alerts.codes.trust.execution_no_funds
    }
    await db.collection('trust').updateOne( { _id: trust._id }, { $set: { status, activated: new Date(), path, tx } } )
    alerts.newAlert(db, pubsub, trust.beneficiary.userId, alertCode, trust._id, aux1=trust.testatorNick, aux2=trust.name, aux3=trust.beneficiary.addressId )
   // console.log("trust activated:", trust.name)
  }

  // monthly stats
  const row = await db.collection('dat').findOne( { name: 'nextStatsDate' } )
  if(!row) return
  const nextStatsDate = row.value
  if(now > nextStatsDate) { // console.log("Processing bapp monthly stats") // month stats
    const prev_month = new Date(now.getFullYear(), now.getMonth()-1, 1)
    prev_month.setHours(0, 0, 0)
    const stats = await common.bapp_stats(prev_month, nextStatsDate, db)
    await db.collection('bappstat').insertOne( stats )
    // next stats date
    const nextDate = new Date(now.getFullYear(), now.getMonth()+1, 1)
    nextDate.setHours(0, 0, 0)
    await db.collection('dat').updateOne( { name: 'nextStatsDate' }, { $set: { value: nextDate } } )
  }
} 

// FEES
const fee_fiat_cron = new CronJob('0 */3 * * * *', fees_fiat_job) // each minute: 0 */1 * * * *
fee_fiat_cron.start()

async function fees_fiat_job() { // how to solve fiber problem
  // fita prices 
  request('https://api.kraken.com/0/public/Ticker?pair=XBTEUR,XBTUSD,XBTAUD,XBTCHF,XBTGBP,XBTJPY', async function (error, response, body) {
    if(response && response.statusCode == 200) { // Print the response status code if a response was received
      const body_o = JSON.parse(body)
      if(!body_o.result) return
      const result = body_o.result
      if(result.XXBTZUSD && result.XXBTZUSD.a)
        fiat.USD = body_o.result.XXBTZUSD.a[0]
      if(result.XXBTZEUR && result.XXBTZEUR.a)
        fiat.EUR = body_o.result.XXBTZEUR.a[0]
      if(result.XXBTZGBP && result.XXBTZGBP.a)
        fiat.GBP = body_o.result.XXBTZGBP.a[0]
      if(result.XXBTZJPY && result.XXBTZJPY.a)
        fiat.JPY = body_o.result.XXBTZJPY.a[0]
      if(result.XBTCHF && result.XBTCHF.a)
        fiat.CHF = body_o.result.XBTCHF.a[0]
      if(result.XBTAUD && result.XBTAUD.a)
        fiat.AUD = body_o.result.XBTAUD.a[0]
    }

    // update BAR prices
    if(!currentBar) {
      currentBar = { open: fiat.USD, high: fiat.USD, low: fiat.USD, close: fiat.USD, day: common.today00() }
      const { insertedId } =  await db.collection('bar').insertOne( currentBar )
      currentBar._id = insertedId
      bars = [ currentBar ]
    } else { // update bar
      const now = new Date()
      if(now.getDate() != currentBar.day.getDate()) {
        await db.collection('bar').updateOne({ _id: currentBar._id }, { $set: { close: fiat.USD } } )
        currentBar = { open: fiat.USD, high: fiat.USD, low: fiat.USD, close: fiat.USD, day: common.today00() }
        const { insertedId } =  await db.collection('bar').insertOne( currentBar )
        currentBar._id = insertedId
        bars.push(currentBar)
        if(bars.length > 30)
          bars.splice(0, 1)
      } else {
        currentBar.close = fiat.USD
        if(currentBar.close > currentBar.high)
          await db.collection('bar').updateOne({  _id: currentBar._id }, { $set: { high: fiat.USD } } )
        if(currentBar.close < currentBar.low)
          await db.collection('bar').updateOne({  _id: currentBar._id }, { $set: { low: fiat.USD } } )
        bars[bars.length - 1] = currentBar
      }
    }

    //if(error) console.log("kraken fees get error:", error)
  })
  if(process.env.BITCOIN_NETWORK == 'regtest') return
  try {
    let feerate = await btcNode.estimateSmartFee(1)   //console.log("feerate:", feerate); return
    fees.fastest = parseInt(feerate.feerate * 100000) // in satoshis/kbyte
    feerate = await btcNode.estimateSmartFee(3)
    fees.halfhour = parseInt(feerate.feerate  * 100000)
    feerate = await btcNode.estimateSmartFee(6) 
    fees.hour = parseInt(feerate.feerate * 100000)
    feerate = await btcNode.estimateSmartFee(6*24) 
    fees.hours24 = parseInt(feerate.feerate * 100000)
    //console.log("fees:", fees)
  } catch(e) {
    console.log("fees error:", e)
  }
}

                 //   BLOCKCHAIN
//const blockchain_cron = new CronJob('*/10 * * * * *', blockchain_job) // each minute: 0 */1 * * * *
//blockchain_cron.start()

const network = common.bitcoin_network
var block_busy = false

//common.forget_password_email('educobian@gmail.com', 'bapp.plus/xxxx', '122.22.33.22', "july 20")

async function blockchain_job() {  // blockchain job
  if(!db) return
  //blockchain_cron.stop() // no need to restart job.
  await process_blocks(null, true) // in case server down a lot of time process old blocks
  console.log("blocks up to date")
  //__zmq______--------------__________ TX notification__________--------------___________-
  let tx_sock = zmq.socket('sub')
  //let tx_addr = 'tcp://127.0.0.1:'+process.env.BITCOIN_TX_NOTIFY
  let tx_addr = `tcp://${process.env.BITCOIN_HOST}:${process.env.BITCOIN_TX_NOTIFY}`
  tx_sock.connect(tx_addr)
  tx_sock.subscribe('rawtx')
  tx_sock.on('message', function(topic, message) { 
    //let rawTx = message.toString('hex'); // Message is a buffer. But we want it as a hex string.    
    let tx = bitcoin.Transaction.fromBuffer(message) // Use bitcoinjs-lib to decode the raw transaction.
    const tx_id = tx.getId() //btcNode.getTransactionByHash(tx_id, { extension: 'json', summary: false }, (err, res) => {  })
    //console.log(FgWhite, "********** tx notified id: ", tx_id) 
    //console.log("tx:", tx)   
    //console.log("txs_extrainfo in tx notified:", Object.values(txs_extrainfo)) 
    const { concept, icon, nicks, sender } = txs_extrainfo[tx_id] || { concept: undefined, icon: undefined, nicks: undefined, sender: undefined}
    delete txs_extrainfo[tx_id] 
    const now = utcNow()
    tx.outs.forEach( (vout, index) => { //console.log("tx new utxo:", tx_id, index) // utxos
      try {
        //console.log("tx received. vout.script:", vout.script)
        let address = bitcoin.address.fromOutputScript(vout.script, network)
        //console.log("out: -----> Tx address: ", address, vout.value, index)
        const newCoin = { // UTXO TX
            filter: { _id: tx_id + index }, 
            update: {  $set: { utxo_tx: tx_id, utxo_n: index, address, value: vout.value, utxo_height: null, spent_tx: null, ...!!sender && { sender },
              ...!!concept && { utxo_concept: concept }, ...!!icon && { utxo_icon: icon } }, $push: { times: { $each: [ now ], $slice: -1 } } }
        }
        chain_op( process_coin(newCoin, false) )
      } catch (e) { // console.log("====> OP_return found")
        if(!!e.ERROR && !e.ERROR.contains('OP_CHECKSIG has no matching Address') && !e.ERROR.contains('OP_RETURN'))
          console.log("utxo error: ", e)
      }
    })
    tx.ins.forEach( vin => { // Spend TX
      if(vin.index == 4294967295) return
      let vin_id = vin.hash.reverse().toString('hex')
      //console.log("tx spending utxo:", vin_id, vin.index) 
      const newCoin = {
          filter: { _id: vin_id + vin.index },
          update: { $set: { utxo_tx: vin_id, utxo_n: vin.index,  spent_tx: tx_id, spent_height: null, ...!!nicks && { nicks },
              ...!!concept && { spent_concept: concept }, ...!!icon && { spent_icon: icon }  },
                            $push: { times: { $each: [ now - 1 ], $slice: 2, $position: 1 } } } // now - 1, so spent is shown before utxo
      }
      chain_op( process_coin(newCoin, false) )
    })
  })
  ////////// MEMPOOL /////////////////
/*  const pool = await btcNode.getMemoryPoolContent()
  for(let tx_id in pool) { // pool is an object (not an array)
    const tx = await btcNode.getTransactionByHash(tx_id, { extension: 'json', summary: false })
    //let bulk = await db.collection('tx').initializeOrderedBulkOp()
    tx.vin.forEach( vin => {
//      console.log("vin_id: ", vin.txid, ". index: ", vin.vout)
      //process_spend(vin.txid, vin.vout, tx.txid)
    })
    tx.vout.forEach( (vout, index) => {
      if(!!vout.scriptPubKey.addresses) {
        if(vout.scriptPubKey.addresses.length != 1) {
          console.log("----==== ---- ===== ----- ==== >", tx)
          console.log("vout.scriptPubKey: ", vout.scriptPubKey)
        }
//        console.log("out: -----> Tx address: ", vout.scriptPubKey.addresses.length, vout.value)
        process_utxo(vout.scriptPubKey.addresses[0], tx.txid, index, vout.value)
      }
      //else
      //  console.log("NO ADDRESS: -----> : ", vout.scriptPubKey, vout.value)
    })
    //await bulk.execute()
  } */
  ///////////////////// BLOCK notification /////////////////////////////////////////////////////////////
  let block_sock = zmq.socket('sub')
  let block_addr = `tcp://${process.env.BITCOIN_HOST}:${process.env.BITCOIN_BLOCK_NOTIFY}`
  //let block_addr = 'tcp://127.0.0.1:'+process.env.BITCOIN_BLOCK_NOTIFY
  block_sock.connect(block_addr)
  // Subscribe to "rawblock", "hashblock", "rawtx", or "hashtx"
  block_sock.subscribe('hashblock')
  block_sock.on('message', function(topic, message) { // block received. ***********************************************
    //console.log(FgWhite, "**** Block", message.toString('hex'), "notified ********")
    if(block_busy) return // it will be processed eventually in process_blocks()
    process_blocks(message.toString('hex'), false)
  }) 
}

// hash come from the node.
async function process_blocks(hash, is_bulk=false) { //console.log("process block:")// hash in hex
  const notified = !!hash
  //console.log("process_blocks hash:", hash) 
  if(!hash) { // 1st time called
    last_block = await db.collection('block').findOne({}, {sort: {height: -1} } )
    //console.log("lastdbblock in db:", lastdbblock)
    if(!!last_block) { // database block. https://bitcointalk.org/index.php?topic=4828066.0
      let old_block = await btcNode.getBlockByHash(last_block._id, { extension: 'json'})
      if(!old_block.nextblockhash)
        return // database is upto date.
      hash = old_block.nextblockhash // lsat block on db return by node. Let's process the next block
      console.log("block._id:", last_block._id, "->", hash)      
    } else { // empty db.
      //  console.log("Starting Blockchain job. Last block in db:", block.height)
      console.log("no block on db")
      const genesis_hash = { 'mainnet': '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f', 'regtest': '0f9188f13cb7b2c71f2a335e3a4fc328bf5beb436012afca590b1a11466e2206',
                            'testnet': '000000000933ea01ad0ee984209779baaec3ced90fa3f408719526f8d77f4943'}
      last_block = await btcNode.getBlockByHash(genesis_hash[process.env.BITCOIN_NETWORK], { extension: 'json'}) // genesis block. Long live Satoshi
      hash = last_block.hash
    }
  }
  block_busy = true // if busy and a block is notified ignore notification.
  let start = new Date()
  while(true) { // until no nextblockhash
    try {
      last_block = await btcNode.getBlockByHash(hash, { extension: 'json'})
      if(!!notified) console.log("****** Block ", last_block.height, hash, " *******")
    } catch(e) {
      console.log("Error btcNode.getBlockByHash(", hash, ")")
      await common.sleep(1000)
      continue
    }
    process_block(last_block, is_bulk)
// add sanity check block.prevhash == hash
    if(!!last_block.nextblockhash)
      hash = last_block.nextblockhash 
    else
      break
    const batch = 100
    if(last_block.height % batch == 0) {
      console.info("block", last_block.height, "processed in", (new Date() - start)/1000/batch, "s.")
      start = new Date()
    }
  }
  block_busy = false
}

function process_block(block, is_bulk) {
  //console.log("processing block:", block.height)
  //let txs = []
  block.tx.forEach( tx =>  {
    tx.vout.forEach( (vout, index) => { //console.log("block new utxo:", tx.txid, index) // utxo 
      //console.log("vout:  ", vout)
      if(!!vout.scriptPubKey.addresses) { // maybe not include > 1 addrs. ???
        const newCoin = {
            filter: { _id: tx.txid + index },
            update: { $set: { utxo_tx: tx.txid, utxo_n: index, address: vout.scriptPubKey.addresses[0], utxo_height: block.height, value: parseInt(Decimal.mul(vout.value, 100000000)), // utxo_time: block.time,
                           spent_tx: null }, $push: { times: { $each: [ block.time ], $slice: -1 } } }
        }
        chain_op( process_coin(newCoin, is_bulk) )
      }
    })
    tx.vin.forEach( vin => { // if(!!vin.txid) //console.log("block spending utxo:", vin.txid, vin.vout)// spend BLOCK
      if(!vin.coinbase) { // coinbase tx. no utxo spent.
        //console.log("11111111111111111111111  spent block height:", block.height)
        //console.log("tx.txid:", tx.txid, "vin:", vin)
        const newCoin = {
            filter: { _id: vin.txid + vin.vout },
            update: { $set: { utxo_tx: vin.txid, utxo_n: vin.vout, spent_tx: tx.txid, spent_height: block.height }, $push: { times: { $each: [ block.time - 1 ], $slice: 2, $position: 1 } } } // spent_time: block.time, 
        }
        chain_op( process_coin(newCoin, is_bulk) )
      }
    })
    
  })
 
  const newBlock = { _id:block.hash, prevhash:block.previousblockhash, nexthash:block.nextblockhash, 
              height:block.height, time:block.time, mediantime:block.mediantime, processed: new Date()}
  chain_op( db.collection('block').insertOne( newBlock ) )
  if(!is_bulk)
    chain_op( pubsub.publish('new-block', { newBlock }) )
  // update previous block's nexthash
  chain_op( db.collection('block').updateOne({_id: block.previousblockhash}, { $set: { nexthash: block.hash} }) )
  //chain_op( new Promise(()=>{ console.log("chain_op ------------- end of processblock:", block.height) }) )
  chain_op( new Promise(()=>{}) )  // process last block's update
  //console.log("---------------------------- end of processblock:", block.height) // this gets printed after the chain_op console.log("chain_op ...") above ???
  //console.log("")
}

async function process_coin(coin, is_bulk)  {// console.log("coin.update.$set.address:", coin.update.$set.address) // console.log("push.times.each:", coin.update.$push.times.$each[0])
  let address
  let nCoin
  const isUtxo = !!coin.update.$set.address
  if(!!isUtxo) { // utxo
    address = await db.collection('address').findOne( { _id: coin.update.$set.address } )
    //console.log("reading address: ", coin.update.$set.address, "found:", address)
    if(!address) return // no address in bapp
    await db.collection('coin').updateOne( coin.filter, coin.update, { upsert: true } )
    nCoin = { _id: coin.filter._id, time: coin.update.$push.times.$each[0], tx: coin.update.$set.utxo_tx, value: coin.update.$set.value, 
                    height: coin.update.$set.utxo_height, addressId: address._id, addressName: address.name, ...!!coin.update.$set.sender  && { sender: coin.update.$set.sender },
                    ...!!coin.update.$set.utxo_concept  && { concept: coin.update.$set.utxo_concept },
                    ...!!coin.update.$set.utxo_icon  && { icon: coin.update.$set.utxo_icon } }
    // process address
    if(!!nCoin.height) { // confirmed. mined
      if(!!address.isLightning && address.refund_tx != nCoin.tx) {
        console.log("confirmed isLightning:", address)
        const res = await db.collection('lightning').findOneAndUpdate({ _id: ObjectID(address.parentId), pending_funding: { $exists: true } }, { $unset: { pending_funding: "" },
                                                        $inc: { inContract: nCoin.value, user_msats: nCoin.value * 1000} }, { returnOriginal: false } )
        const lightning = res.value
        await pubsub.publish('ln-funded', { lnFunded: { _id: lightning._id, userId: lightning.userId, inContract: lightning.inContract, user_msats: lightning.user_msats } } )                                                                  
      } else if(!!address.process) { console.log("address to process::::::::::", address)// payment confirmed.
        if(!!address.serviceUserId) {
          //const _id = sha256(process.env.jwtToken + address.serviceUserId)
          //const { modifiedCount } = await db.collection('user').updateOne( { _id }, { $set: { subscription: address.serviceId, subscriptionDate: new Date() } } )
          const referrer = address.referrer
          await db.collection('paidservice').insertOne( { userId: address.serviceUserId, serviceId: address.serviceId, date: new Date(), used: false, value: nCoin.value, ...!!referrer && { referrer } } )
        } else if(!!address.thirdpartyUserId) { // console.log("paying third party:", address)
          const _id = sha256(process.env.jwtToken + address.thirdpartyUserId)
          const { modifiedCount } = await db.collection('user').updateOne( { _id }, { $set: { thirdpartyDate: new Date() } } )
        }
        await db.collection('address').updateOne( { _id: address._id }, { $unset: { process: "" } } )
      }
    } else { // tx notified. Not confirmed
      if(!!address.isLightning && address.refund_tx != nCoin.tx) { console.log("unconfirmed ln funding:", address)
        await db.collection('lightning').updateOne({ _id: ObjectID(address.parentId) }, { $set: { pending_funding: nCoin.value } } )
      }
    }
  } else if(!!coin.update.$set.spent_tx) { // spend
    let coin_db = await db.collection('coin').findOneAndUpdate(coin.filter, coin.update )// ; console.log("coin_db:", coin_db)
    if(!coin_db.value) return
    coin_db = coin_db.value  //; console.log("coin_db:", coin_db)
    address = await db.collection('address').findOne( { _id: coin_db.address } ) 
    if(!address) {  
      await db.collection('log').insertOne( { type: common.log.database.coin_no_address, status:0, coin: JSON.stringify(nCoin), created: new Date()  } )
      return
    }
    nCoin = { _id: coin.filter._id + "_", time: coin.update.$push.times.$each[0], tx: coin.update.$set.spent_tx, value: -coin_db.value, 
                height: coin.update.$set.spent_height, addressId: coin_db.address, addressName: address.name, ...!!coin.update.$set.nicks  && { nicks: coin.update.$set.nicks },
                    ...!!coin.update.$set.spent_concept  && { concept: coin.update.$set.spent_concept },
                    ...!!coin.update.$set.spent_icon  && { icon: coin.update.$set.spent_icon } }
  }
  // update address.balance
  //console.log("address:", address)
  let cursor = db.collection('coin').aggregate([ // address balance
    { $match: { address: address._id, spent_tx: { "$eq": null } } },
    { $group : {
        _id: "$address",
        balance: {
          $sum: {
            "$cond": {
              "if": { "$ne": ["$utxo_height", null] },
              "then": "$value",
              "else": 0
            } 
          }
        },
        unconfirmedBalance: {
          $sum: {
            "$cond": {
              "if": { "$eq": ["$utxo_height", null] },
              "then": "$value",
              "else": 0
            } 
          }
        }
      }
    }
  ])
  let item
  if(await cursor.hasNext() ) {
    item = await cursor.next()  //, console.log("item:", item)
  }
  if(!item) item = { balance: 0, unconfirmedBalance: 0 }
  await db.collection('address').updateOne({_id: address._id}, { $set: { balance: item.balance, unconfirmedBalance: item.unconfirmedBalance } })

  // ln refund tx.
  if(address.refund_tx == nCoin.tx)
    db.collection('lightning').updateOne({ scriptAddressId: address._id }, { $set: { inContract: item.balance + item.unconfirmedBalance },
                                            $unset: { refundSatoshis: "", refundTx: "", userSignature: "" } } )

  nCoin.addressConfirmedBalance = item.balance
  nCoin.addressUnconfirmedBalance = item.unconfirmedBalance
  // update wallet.balance
  if(!!address.index || !!address.pkCypher) { // address belongs to wallet
    nCoin.walletId = address.parentId
    nCoin.addressindex = address.index
    let cursor = db.collection('address').aggregate([ // wallet's balance
      { $match: { parentId: address.parentId } },
      { $group : {
          _id: "$parentId",
          balance: { $sum: "$balance" },
          unconfirmedBalance: { $sum: "$unconfirmedBalance" }
        }
      }
    ])
    if(!await cursor.hasNext() ) {
      console.log("************************************ cursor 2 doesn't have next")
      console.log("nCoin:", JSON.stringify(nCoin))
      console.log("address:", address)
    }
    const item = await cursor.next()
    //console.log("wallet balances:", item)
    const walletRes = await db.collection('wallet').findOneAndUpdate({_id: address.parentId }, { $set: { balance: item.balance, unconfirmedBalance: item.unconfirmedBalance } }, { returnOriginal: true } )
    
    // after message free over 5 cents
    /*const wallet = walletRes.value
    const isTestnet = process.env.BITCOIN_NETWORK == 'testnet'
    if( !isTestnet && !nCoin.height && !!isUtxo && (wallet.balance + wallet.unconfirmedBalance < 5000000) && (item.balance + item.unconfirmedBalance >= 5000000) ) {
      console.log("wallet:", wallet.balance, wallet.unconfirmedBalance, "old:", item.balance, item.unconfirmedBalance)
      await db.collection('paidservice').insertOne( { userId: wallet.userId, serviceId: common.service.aftermessage, date: new Date(), used: false, granted: true } )
      await alerts.newAlert(db, pubsub, wallet.userId, alerts.codes.user.free_service, ObjectID(), aux1=common.service.aftermessage )
    }*/
    nCoin.walletConfirmedBalance = item.balance
    nCoin.walletUnconfirmedBalance = item.unconfirmedBalance
  }
  if(!is_bulk) {
    await pubsub.publish('new-coin', { newCoin: nCoin } )
    console.log( ` -- newCoin:${!!isUtxo ? '0 0 0 0' : '1 1 1 1'}`, address._id, ". Wallet", nCoin.walletId, "_id:", nCoin._id, "height:", nCoin.value, nCoin.height, nCoin.tx.substring(0, 6))
  }
  
}


function utcNow() {
  return Math.floor(Date.now() / 1000)
}



start()

//// Mongo Chain /////
/*
Promise.resolve().then(() => { 1
hasResolved = true
})*/

function mongo_chain_start() {
  return new Promise(function(resolve, reject) {
    setTimeout(() => resolve(1), 0)
    resolve(true)
  })
}

function chain_op(op) {
  mongo_chain.then( data => op )
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




/* let inheritances = await db.collection('inheritance').aggregate([ 
    { $match: { status: 1 }}, // inheritance active
    { $project: { "_id":1, "name": 1, "timetrigger": 1, "signers": 1, "tree": 1, "testatorId": 1, "witness": 1, "scriptAddressId": 1 } },
    { $lookup:
      {
        from: "user",
        let: { testatorId: "$testatorId", timetrigger: "$timetrigger"},
        pipeline: [
          { $match:
            { $expr:  
              { $and:
                [
                  { $eq: [ "$_id", "$$testatorId" ] }, 
                  { $gt: [ new Date(), { $add: [ { $multiply: [ "$$timetrigger", 24*60*60*1000 ] }, "$last_access" ] } ] }, 
                ]
              }
            }
          },
        ],
        as: "user"
      }, 
    },
    { $unwind: "$user" }
  ]).toArray()  */

  /* testnet: {
    "_id" : "00000000000000ba794bfc7128a735642f7c28ab347e1c8166d6f9b7e8c52f49",
    "prevhash" : null,
    "nexthash" : null,
    "height" : 1747501,
    "time" : 1296688602,
    "mediantime" : 1296688602,
    "processed" : ISODate("2020-06-03T09:01:10.063Z")
}*/



  /*await db.collection('times').updateOne( { _id: '15' }, { $set: { status: 2 }, 
                                          $push: { times: { $each: [ 50 ], $slice: -1 } } 
                                        }, {upsert: true } )
  // https://docs.mongodb.com/manual/reference/operator/update/slice/
  // https://docs.mongodb.com/manual/reference/operator/update/position/                                            


  await db.collection('times').updateOne( { _id: '15' }, { $set: { status: 3 }, 
                                          $push: { times: { $each: [ 10 ], $slice: 2, $position: 1 } }
                                        }, {upsert: true } )*/
  // db.inventory.find( { "time.1": { $gt: 25 } } ) // 2nd time 
  // https://docs.mongodb.com/manual/tutorial/query-arrays/