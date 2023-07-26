const { ObjectID } = require('mongodb')
const bitcoin = require('bitcoinjs-lib')
const core = require('./lib/core')
const util = require('./lib/utils')
const moment = require('moment')

let db

describe('Bapp init test', () => {

  beforeAll( async() =>  {
    db = await core.db()
  })

  beforeEach( async() =>  {
    await core.reset()
  }, 30000)

  afterAll( async() => {
    await core.dbClose()
  });

  it('test multisig 1-2', async () => {
    const alice = await core.createUser(util.alice.email, util.alice.nick, 100, `${util.alice.nick} Wallet 1`, 1)
    const bob = await core.createUser(util.bob.email, util.bob.nick, 100, `${util.bob.nick} Wallet 1`, 1)
    const charlie = await core.createUser(util.charlie.email, util.charlie.nick, 100, `${util.charlie.nick} Wallet 1`, 1)
    // create Multisig
    const signers = [
      { userId: alice._id, nick: alice.nick, addressId: alice.wallet.addresses[0]._id },
      { userId: bob._id, nick: bob.nick, addressId: null },
    ]
    let multisig = await core.saveMultisig("my multisig", 1, 2, signers, alice.token )
    await core.multisigSetPubkey(multisig._id, bob.wallet.addresses[0]._id, bob.token)
    const multisigs = await core.multisigs(bob.token)
    multisig = multisigs[0]
    // fund multisig
    await core.faucet(multisig.scriptAddressId)
    await core.mine(6, 500)
    // create multisig payment
    const recipients = [ { address: charlie.wallet.addresses[0]._id, satoshis: 500000 } ]
    const msigpayment = await core.saveMultisigPayment(multisigs[0], recipients, alice.token)
    // sign payment
    const keypair = await util.getAddressKeypair(alice.wallet.mnemonic, 0) 
    await core.multisigPaymentSign(multisig, msigpayment, alice, keypair, alice.token )
    await core.mine(6, 1000)
    // check charlies wallet
    charlieWallets = await core.wallets(charlie.token)
    const wallet = charlieWallets[0]
    const address = wallet.addresses[0]
    expect(address.balance).toBe(500000)
  }, 100000)

  it('test multisig 2-3', async () => {
    const alice = await core.createUser(util.alice.email, util.alice.nick, 100, `${util.alice.nick} Wallet 1`, 1)
    const bob = await core.createUser(util.bob.email, util.bob.nick, 100, `${util.bob.nick} Wallet 1`, 1)
    const charlie = await core.createUser(util.charlie.email, util.charlie.nick, 100, `${util.charlie.nick} Wallet 1`, 1)
    // create Multisig
    const signers = [
      { userId: alice._id, nick: alice.nick, addressId: alice.address },
      { userId: bob._id, nick: bob.nick, addressId: null },
      { userId: charlie._id, nick: charlie.nick, addressId: null },
    ]
    let multisig = await core.saveMultisig("my multisig", 2, 3, signers, alice.token )
    await core.multisigSetPubkey(multisig._id, bob.address, bob.token)
    await core.multisigSetPubkey(multisig._id, charlie.address, charlie.token)
    let multisigs = await core.multisigs(bob.token)
    multisig = multisigs[0]
    // fund multisig
    await core.faucet(multisig.scriptAddressId)
    await core.mine(6, 500)
    // create multisig payment
    const amount = 500000
    const recipients = [ { address: charlie.address, satoshis: amount } ]
    let msigpayment = await core.saveMultisigPayment(multisigs[0], recipients, alice.token)
    // alice signs payment
    const aliceKeypair = await util.getAddressKeypair(alice.wallet.mnemonic, 0) 
    await core.multisigPaymentSign(multisig, msigpayment, alice, aliceKeypair, alice.token )
    // bob signs payment
    const bobKeypair = await util.getAddressKeypair(bob.wallet.mnemonic, 0) 
    await core.multisigPaymentSign(multisig, msigpayment, bob, bobKeypair, bob.token )
    await core.mine(6, 1000)
    // check charlies wallet
    charlieWallets = await core.wallets(charlie.token)
    const wallet = charlieWallets[0]
    const address = wallet.addresses[0]
    expect(address.balance).toBe(amount)
  }, 100000)

  it('test multisig 4-4', async () => {
    const alice = await core.createUser(util.alice.email, util.alice.nick, 100, `${util.alice.nick} Wallet 1`, 1)
    const bob = await core.createUser(util.bob.email, util.bob.nick, 100, `${util.bob.nick} Wallet 1`, 1)
    const charlie = await core.createUser(util.charlie.email, util.charlie.nick, 100, `${util.charlie.nick} Wallet 1`, 1)
    const alicegirl = await core.createUser(util.alicegirl.email, util.alicegirl.nick, 100, `${util.alicegirl.nick} Wallet 1`, 1)
    // create Multisig
    const signers = [
      { userId: alice._id, nick: alice.nick, addressId: alice.address },
      { userId: bob._id, nick: bob.nick, addressId: null },
      { userId: charlie._id, nick: charlie.nick, addressId: null },
      { userId: alicegirl._id, nick: alicegirl.nick, addressId: null },
    ]
    let multisig = await core.saveMultisig("my multisig", 4, 4, signers, alice.token )
    await core.multisigSetPubkey(multisig._id, bob.address, bob.token)
    await core.multisigSetPubkey(multisig._id, charlie.address, charlie.token)
    await core.multisigSetPubkey(multisig._id, alicegirl.address, alicegirl.token)
    let multisigs = await core.multisigs(bob.token)
    multisig = multisigs[0]
    // fund multisig
    await core.faucet(multisig.scriptAddressId)
    await core.mine(6, 500)
    // create multisig payment
    const amount = 500000
    const recipients = [ { address: charlie.address, satoshis: amount } ]
    let msigpayment = await core.saveMultisigPayment(multisigs[0], recipients, alice.token)
    // alice signs payment
    const aliceKeypair = await util.getAddressKeypair(alice.wallet.mnemonic, 0) 
    await core.multisigPaymentSign(multisig, msigpayment, alice, aliceKeypair, alice.token )
    // bob signs payment
    const bobKeypair = await util.getAddressKeypair(bob.wallet.mnemonic, 0) 
    await core.multisigPaymentSign(multisig, msigpayment, bob, bobKeypair, bob.token )
    // charlie signs payment
    const charliebKeypair = await util.getAddressKeypair(charlie.wallet.mnemonic, 0) 
    await core.multisigPaymentSign(multisig, msigpayment, charlie, charliebKeypair, charlie.token )
    // alicegirl signs payment
    const alicegirlKeypair = await util.getAddressKeypair(alicegirl.wallet.mnemonic, 0) 
    await core.multisigPaymentSign(multisig, msigpayment, alicegirl, alicegirlKeypair, alicegirl.token )
    await core.mine(6, 1000)
    // check charlies wallet
    charlieWallets = await core.wallets(charlie.token)
    const wallet = charlieWallets[0]
    const address = wallet.addresses[0]
    expect(address.balance).toBe(amount)
  }, 100000)

});


