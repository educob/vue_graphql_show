const { ObjectID } = require('mongodb')
const bitcoin = require('bitcoinjs-lib')
const core = require('./lib/core')
const util = require('./lib/utils')
const moment = require('moment')


describe('Bapp init test', () => {
  let db

  beforeAll( async() =>  {
    db = await core.db()
  })

  beforeEach( async() =>  {
    await core.reset()
  }, 30000)

  afterAll( async() => {
    await db.collection('address').deleteMany( { name: 'Trust BackAddress: Bob:' } )
    await core.dbClose()
  });

  it('test time trust in the past with no funds', async () => {
    const alice = await core.createUser(util.alice.email, util.alice.nick, 100, `${util.alice.nick} Wallet 1`, 1)
    const bob = await core.createUser(util.bob.email, util.bob.nick, 100, `${util.bob.nick} Wallet 1`, 1)
    // create Trust
    const beneficiary = { userId: bob._id, nick: bob.nick }
    const executionDate = util.lockTime(util.pastDate(10))
    let timetrust = await core.newTimeTrust("my timetrust", beneficiary, executionDate, alice.wallet._id, alice.token )
    await core.trustSetPubkey(timetrust._id, bob.wallet._id, bob.token)
    // testator alerts
    let alert = await db.collection('alert').findOne( { userId: alice._id  } )
    expect(alert.code).toBe(61)
    await db.collection('alert').deleteOne( { userId: alice._id } )
    await util.sleep(200)
    // dailyjob -> trust no tx
    await core.dailyjob()
    timetrust = await db.collection('trust').findOne( { testatorId: alice._id  } )
    expect(timetrust.status).toBe(4)
    // alerts
    alert = await db.collection('alert').findOne( { userId: bob._id  } )
    expect(alert.code).toBe(68)
  }, 100000)

  it('test time trust at future date', async () => {
    const alice = await core.createUser(util.alice.email, util.alice.nick, 100, `${util.alice.nick} Wallet 1`, 1)
    const bob = await core.createUser(util.bob.email, util.bob.nick, 100, `${util.bob.nick} Wallet 1`, 1)
    // create Trust
    const beneficiary = { userId: bob._id, nick: bob.nick }
    const executionDate = util.lockTime(util.futureDate(10))
    let timetrust = await core.newTimeTrust("my timetrust", beneficiary, executionDate, alice.wallet._id, alice.token )
    await core.trustSetPubkey(timetrust._id, bob.wallet._id, bob.token)
    // testator alerts
    let alert = await db.collection('alert').findOne( { userId: alice._id  } )
    expect(alert.code).toBe(61)
    await db.collection('alert').deleteOne( { userId: alice._id } )
    await util.sleep(200)
    // fund trust
    timetrust = await db.collection('trust').findOne( { testatorId: alice._id  } )
    await core.faucet(timetrust.scriptAddressId)
    await core.mine(6, 500)
    // dailyjob -> trust.tx
    await core.dailyjob()
    timetrust = await db.collection('trust').findOne( { testatorId: alice._id  } )
    expect(timetrust.tx).toBeFalsy()
    expect(timetrust.status).toBe(1)
    // alerts
    const alerts = await db.collection('alert').find( { userId: bob._id  } ).toArray()
    expect(alerts.length).toBe(0)
  }, 100000)

  it('test time trust at executionDate for beneficiary', async () => {
    const alice = await core.createUser(util.alice.email, util.alice.nick, 100, `${util.alice.nick} Wallet 1`, 1)
    const bob = await core.createUser(util.bob.email, util.bob.nick, 100, `${util.bob.nick} Wallet 1`, 1)
    // create Trust
    const beneficiary = { userId: bob._id, nick: bob.nick }
    const executionDate = util.lockTime(util.pastDate(10))
    let timetrust = await core.newTimeTrust("my timetrust", beneficiary, executionDate, alice.wallet._id, alice.token )
    await core.trustSetPubkey(timetrust._id, bob.wallet._id, bob.token)
    // testator alerts
    let alert = await db.collection('alert').findOne( { userId: alice._id  } )
    expect(alert.code).toBe(61)
    await db.collection('alert').deleteOne( { userId: alice._id } )
    await util.sleep(200)
    // fund trust
    timetrust = await db.collection('trust').findOne( { testatorId: alice._id  } )
    await core.faucet(timetrust.scriptAddressId)
    await core.mine(6, 500)
    // dailyjob -> trust.tx
    await core.dailyjob()
    timetrust = await db.collection('trust').findOne( { testatorId: alice._id  } )
    expect(timetrust.tx).toBeTruthy()
    // alerts
    alert = await db.collection('alert').findOne( { userId: bob._id  } )
    expect(alert.code).toBe(62)
    // sign trust payment
    await core.signTrustPayment(timetrust, bob.wallet.mnemonic, 1, bob.token)
    await core.mine(6, 1200)
    // testator alerts
    alert = await db.collection('alert').findOne( { userId: alice._id  } )
    expect(alert.code).toBe(63)
    // check no balance on bob.wallet
    const wallet = await db.collection('wallet').findOne( { userId: bob._id  } )
    expect(wallet.balance).toBeGreaterThan(0)
  }, 100000)

  it('test time trust at testatorDate ', async () => {
    const alice = await core.createUser(util.alice.email, util.alice.nick, 100, `${util.alice.nick} Wallet 1`, 1)
    const bob = await core.createUser(util.bob.email, util.bob.nick, 100, `${util.bob.nick} Wallet 1`, 1)
    // create Trust
    const beneficiary = { userId: bob._id, nick: bob.nick }
    const executionDate = util.lockTime(util.pastDate(6*31)) // over six months have passed
    let timetrust = await core.newTimeTrust("my timetrust", beneficiary, executionDate, alice.wallet._id, alice.token )
    await core.trustSetPubkey(timetrust._id, bob.wallet._id, bob.token)
    // testator alerts
    let alert = await db.collection('alert').findOne( { userId: alice._id  } )
    expect(alert.code).toBe(61) // trust address created
    await db.collection('alert').deleteOne( { userId: alice._id } )
    await util.sleep(200)
    // fund trust
    timetrust = await db.collection('trust').findOne( { testatorId: alice._id  } )
    await core.faucet(timetrust.scriptAddressId)
    await core.mine(6, 500)
    // dailyjob -> trust.tx. status=2
    await core.dailyjob()
    timetrust = await db.collection('trust').findOne( { testatorId: alice._id  } )
    expect(timetrust.tx).toBeTruthy()
    expect(timetrust.status).toBe(2)
    // beneficiary alerts
    alert = await db.collection('alert').findOne( { userId: bob._id  } )
    expect(alert.code).toBe(62) // beneficiary sing to receive
    // dailyjob -> trust.tx. status=10
    await core.dailyjob()
    timetrust = await db.collection('trust').findOne( { testatorId: alice._id  } )
    expect(timetrust.tx).toBeTruthy()
    expect(timetrust.status).toBe(10)
    // testator alerts
    alert = await db.collection('alert').findOne( { userId: alice._id  } )
    expect(alert.code).toBe(64) // beneficiary not executed
    // sign trust payment
    await core.signTrustPayment(timetrust, alice.wallet.mnemonic, 1, alice.token)
    await core.mine(6, 2200)
    // check no balance on bob.wallet
    const wallet = await db.collection('wallet').findOne( { userId: alice._id  } )
    expect(wallet.balance).toBeGreaterThan(0)
  }, 100000)

  it('test time trust at backDate ', async () => {
    const alice = await core.createUser(util.alice.email, util.alice.nick, 100, `${util.alice.nick} Wallet 1`, 1)
    const bob = await core.createUser(util.bob.email, util.bob.nick, 100, `${util.bob.nick} Wallet 1`, 1)
    const bapp =  await core.bappLogin()
    // create Trust
    const beneficiary = { userId: bob._id, nick: bob.nick }
    const executionDate = util.lockTime(util.pastDate(12*31)) // over six months have passed
    let timetrust = await core.newTimeTrust("my timetrust", beneficiary, executionDate, alice.wallet._id, alice.token )
    await core.trustSetPubkey(timetrust._id, bob.wallet._id, bob.token)
    // testator alerts
    let alert = await db.collection('alert').findOne( { userId: alice._id  } )
    expect(alert.code).toBe(61) // trust address created
    await db.collection('alert').deleteOne( { userId: alice._id } )
    await util.sleep(200)
    // fund trust
    timetrust = await db.collection('trust').findOne( { testatorId: alice._id  } )
    await core.faucet(timetrust.scriptAddressId)
    await core.mine(6, 500)
    // dailyjob -> trust.tx. status=2
    await core.dailyjob()
    timetrust = await db.collection('trust').findOne( { testatorId: alice._id  } )
    expect(timetrust.tx).toBeTruthy()
    expect(timetrust.status).toBe(2)
    // beneficiary alerts
    alert = await db.collection('alert').findOne( { userId: bob._id  } )
    expect(alert.code).toBe(62) // beneficiary sing to receive
    // dailyjob -> trust.tx. status=10. testatorDate
    await core.dailyjob()
    timetrust = await db.collection('trust').findOne( { testatorId: alice._id  } )
    expect(timetrust.tx).toBeTruthy()
    expect(timetrust.status).toBe(10)
    // testator alerts
    alert = await db.collection('alert').findOne( { userId: alice._id  } )
    expect(alert.code).toBe(64) // beneficiary not executed
    // dailyjob -> trust.tx. status=20. backDate
    await core.dailyjob()
    timetrust = await db.collection('trust').findOne( { testatorId: alice._id  } )
    expect(timetrust.tx).toBeTruthy()
    expect(timetrust.status).toBe(20)
    // bapp alerts
    alert = await db.collection('alert').findOne( { userId: bapp._id  } )
    expect(alert.code).toBe(65) // testator_not_executed
    // sign trust payment
    const backAddress = await db.collection('address').findOne( { _id: timetrust.backAddressId } )
    await core.signTrustPayment(timetrust, util.bapp.mnemonic, backAddress.index, bapp.token)
    await core.mine(6, 2200)
    // check increased balance on bappWAllet
    const addressAfter = await db.collection('address').findOne( { _id: timetrust.backAddressId } )
    expect(addressAfter.balance).toBeGreaterThan(backAddress.balance)
  }, 100000)

});


