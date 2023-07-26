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
    await core.dbClose()
  });

  it.only('Create all users', async () => { return
    const users =  await core.createAllUsers(true)
  }, 100000)


  it.skip('Create user to add to util', async () => {
    const email = "annlawyer"
    const nick = "Ann Lawyer"
    const alice = await core.createUser(uemail, nick, 100, `${nick} Wallet 1`)
    console.log("user:", user)
  });

  it('test wallet spending bitcoins', async () => {
    const alice = await core.createUser(util.alice.email, util.alice.nick, 100, `${util.alice.nick} Wallet 1`, 2)
    const bob = await core.createUser(util.bob.email, util.bob.nick, 100, `${util.bob.nick} Wallet 1`)
    // fund Alice
    await core.faucet(aliceWallet.addresses[0]._id)
    await core.mine(6, 500)
    // send to bob
    const amount = 72000
    let aliceWallets = await core.wallets(alice.token)
    const utxos = aliceWallets[0].addresses_confirmed_utxos
    const recipients = [ { address: bob.wallet.addresses[0]._id, satoshis: amount } ]
    const changeAddress = aliceWallet.addresses[1]._id
    try {
      await core.walletSend(aliceWallet, utxos, recipients, changeAddress, alice.token )
    } catch(e) {
      console.log("walletSend error:", e)
    }
    await core.mine(6, 500)
    // checks
    aliceWallets = await core.wallets(alice.token)
    const bobWallets = await core.wallets(bob.token)
    expect(bob.wallets[0].balance).toBe(amount)
  }, 100000)




});


