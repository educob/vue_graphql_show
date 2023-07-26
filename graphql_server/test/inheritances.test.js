const { ObjectID } = require('mongodb')
const bitcoin = require('bitcoinjs-lib')
const core = require('./lib/core')
const util = require('./lib/utils')

let db

describe('Bapp Inheritances test', () => {

  beforeAll( async() =>  {
    db = await core.db()
  })

  beforeEach( async() =>  {
    await core.reset()
  }, 30000)

  afterAll( async() => {
    await core.dbClose()
  });

  it.only("create simple 3rdParty Inheritance", async () => {
    const { alice, bob, bitpassStaff, inheritance } = await createThirdpartySimpleInheritance()
  }, 100000)


  it('testator can spend', async () => {
    const { users, bapp, inheritance, } = await createGreatFamilyInheritance()
    // sign testator inheritance payment
    const recipients = [ { address: users.bob.address, satoshis: 500000 } ]
    // alice address index would be 1 if inheritance is created properly
    await core.signTestatorInheritancePayment(inheritance, users.alice.wallet.mnemonic, 0, recipients, users.alice.token)
    await core.mine(6, 1200)
    // check no balance on bobWAllet
    const bobWallet = await db.collection('wallet').findOne( { userId: users.bob._id  } )
    expect(bobWallet.balance).toBeGreaterThan(0)
  }, 100000)

  it('Level 1 not active', async () => {
    const { users, bapp } = await createGreatFamilyInheritance()
    // alice didn't log in in over 6 months
    backDate = util.pastDate(182);
    await db.collection('user').updateOne({_id: users.alice.__id }, { $set: { last_access: backDate } } )
    // Level 1 not active
    await db.collection('user').updateOne({_id: users.alicegirl.__id }, { $set: { last_access: backDate } } )
    await db.collection('user').updateOne({_id: users.aliceson.__id }, { $set: { last_access: backDate } } )
    await db.collection('user').updateOne({_id: users.bob.__id }, { $set: { last_access: backDate } } )
    await db.collection('user').updateOne({_id: users.charlie.__id }, { $set: { last_access: backDate } } )
    await core.dailyjob()
    inheritances = await core.inheritances(users.alice.token)
    inheritance = inheritances[0]
    // check activeHeirs & status
    const expected = [  { _id: users.alicegrandson._id, percentage: 57},
                        { _id: users.bobfriend._id, percentage: 7 },
                        { _id: users.bobfriend2._id, percentage: 7 },
                        { _id: users.charlielawyer._id, percentage: 29 }
    ]
    expect(check_heirs(inheritance.activeHeirs, expected)).toBeTruthy()
    expect(inheritance.status).toBe(2)
    // testator alert
    alert = await db.collection('alert').findOne( { userId: users.alice._id  } )
    expect(alert.code).toBe(15)
    // bapp alert
    alert = await db.collection('alert').findOne( { userId: bapp._id  } )
    expect(alert.code).toBe(16)
    // AliceSon no alert
    alert = await db.collection('alert').findOne( { userId: users.aliceson._id  } )
    expect(!!alert).toBeFalsy()
    // bapp signs tx:
    const bappAddress = await db.collection('address').findOne( { _id: inheritance.signers[0].addressId } )
    await core.signInheritancePayment(inheritance, util.bapp.mnemonic, bappAddress.index, bapp._id, bapp.token)
    await util.sleep(10)
    // 1. alicegrandson signs
    alert = await db.collection('alert').findOne( { userId: users.alicegrandson._id  } )
    expect(alert.code).toBe(16)
    await core.signInheritancePayment(inheritance, users.alicegrandson.wallet.mnemonic, 1, users.alicegrandson._id, users.alicegrandson.token)
    // 1. bobFriend signs
    alert = await db.collection('alert').findOne( { userId: users.bobfriend._id  } )
    expect(alert.code).toBe(16)
    await core.signInheritancePayment(inheritance, users.bobfriend.wallet.mnemonic, 1, users.bobfriend._id, users.bobfriend.token)
    // tx should be sent
    await util.sleep(100)
    await core.mine(6, 2200)
    // check bob balance
    alert = await db.collection('alert').findOne( { userId: users.bobfriend._id  } )
    expect(alert.code).toBe(17)
    const bobFriendWallet = await db.collection('wallet').findOne( { userId: users.bobfriend._id  } )
    expect(bobFriendWallet.balance).toBeGreaterThan(0)
  }, 100000)


  it('AliceSon not active', async () => {
    const { users, bapp } = await createGreatFamilyInheritance()
    // alice didn't log in in over 6 months
    backDate = util.pastDate(182);
    await db.collection('user').updateOne({_id: users.alice.__id }, { $set: { last_access: backDate } } )
    // aliceSon not active
    await db.collection('user').updateOne({_id: users.aliceson.__id }, { $set: { last_access: backDate } } )
    await core.dailyjob()
    inheritances = await core.inheritances(users.alice.token)
    inheritance = inheritances[0]
    // check activeHeirs & status
    const expected = [  { _id: users.alicegirl._id, percentage: 57},
                        { _id: users.bob._id, percentage: 14 },
                        { _id: users.charlie._id, percentage: 29 }
    ]
    expect(check_heirs(inheritance.activeHeirs, expected)).toBeTruthy()
    expect(inheritance.status).toBe(2)
    // testator alert
    alert = await db.collection('alert').findOne( { userId: users.alice._id  } )
    expect(alert.code).toBe(15)
    // bapp alert
    alert = await db.collection('alert').findOne( { userId: bapp._id  } )
    expect(alert.code).toBe(16)
    // AliceSon no alert
    alert = await db.collection('alert').findOne( { userId: users.aliceson._id  } )
    expect(!!alert).toBeFalsy()
    // bapp signs tx:
    const bappAddress = await db.collection('address').findOne( { _id: inheritance.signers[0].addressId } )
    await core.signInheritancePayment(inheritance, util.bapp.mnemonic, bappAddress.index, bapp._id, bapp.token)
    await util.sleep(10)
    // 1. aliceGirl signs
    alert = await db.collection('alert').findOne( { userId: users.alicegirl._id  } )
    expect(alert.code).toBe(16)
    await core.signInheritancePayment(inheritance, users.alicegirl.wallet.mnemonic, 1, users.alicegirl._id, users.alicegirl.token)
    // tx should be sent
    await util.sleep(100)
    await core.mine(6, 2200)
    // check bob balance
    alert = await db.collection('alert').findOne( { userId: users.bob._id  } )
    expect(alert.code).toBe(17)
    const bobWallet = await db.collection('wallet').findOne( { userId: users.bob._id  } )
    expect(bobWallet.balance).toBeGreaterThan(0)
  }, 100000)

  it('Bob not active', async () => {
    const { users, bapp } = await createGreatFamilyInheritance()
    // alice didn't log in in over 6 months
    backDate = util.pastDate(182);
    await db.collection('user').updateOne({_id: users.alice.__id }, { $set: { last_access: backDate } } )
    // aliceGirl ot ac tive
    await db.collection('user').updateOne({_id: users.bob.__id }, { $set: { last_access: backDate } } )
    await core.dailyjob()
    inheritances = await core.inheritances(users.alice.token)
    inheritance = inheritances[0]
    // check activeHeirs & status
    const expected = [  { _id: users.alicegirl._id, percentage: 40 },
                        { _id: users.aliceson._id, percentage: 30 },
                        { _id: users.bobfriend._id, percentage: 5 },
                        { _id: users.bobfriend2._id, percentage: 5 },
                        { _id: users.charlie._id, percentage: 20 }
    ]
    expect(check_heirs(inheritance.activeHeirs, expected)).toBeTruthy()
    expect(inheritance.status).toBe(2)
    // testator alert
    alert = await db.collection('alert').findOne( { userId: users.alice._id  } )
    expect(alert.code).toBe(15)
    // bapp alert
    alert = await db.collection('alert').findOne( { userId: bapp._id  } )
    expect(alert.code).toBe(16)
    // aliceGirl no alert
    alert = await db.collection('alert').findOne( { userId: users.alicegirl._id  } )
    expect(!!alert).toBeFalsy()
    // bapp signs tx:
    const bappAddress = await db.collection('address').findOne( { _id: inheritance.signers[0].addressId } )
    await core.signInheritancePayment(inheritance, util.bapp.mnemonic, bappAddress.index, bapp._id, bapp.token)
    await util.sleep(10)
    // bob has no alert
    inheritances = await core.inheritances(users.alice.token)
    inheritance = inheritances[0]
    alert = await db.collection('alert').findOne( { userId: users.bob._id  } )
    expect(!!alert).toBeFalsy()
    // 1. alice son signs
    alert = await db.collection('alert').findOne( { userId: users.aliceson._id  } )
    expect(alert.code).toBe(16)
    await core.signInheritancePayment(inheritance, users.aliceson.wallet.mnemonic, 1, users.aliceson._id, users.aliceson.token)
    await util.sleep(10)
    // 2. charlie  signs
    alert = await db.collection('alert').findOne( { userId: users.charlie._id  } )
    expect(alert.code).toBe(16)
    await core.signInheritancePayment(inheritance, users.charlie.wallet.mnemonic, 1, users.charlie._id, users.charlie.token)
    await util.sleep(10)
    // tx should be sent
    await core.mine(6, 2200)
    // check bob no alert & balance empty
    alert = await db.collection('alert').findOne( { userId: users.bob._id  } )
    expect(!!alert).toBeFalsy()
    const bobWallet = await db.collection('wallet').findOne( { userId: users.bob._id  } )
    expect(bobWallet.balance).toBe(0)
    // check charlie balance
    alert = await db.collection('alert').findOne( { userId: users.charlie._id  } )
    expect(alert.code).toBe(17)
    const charlieWallet = await db.collection('wallet').findOne( { userId: users.charlie._id  } )
    expect(charlieWallet.balance).toBeGreaterThan(0)
  }, 100000)

  it('AlisonGirl not active', async () => {
    const { users, bapp } = await createGreatFamilyInheritance()
    // alice didn't log in in over 6 months
    backDate = util.pastDate(182);
    await db.collection('user').updateOne({_id: users.alice.__id }, { $set: { last_access: backDate } } )
    // aliceGirl ot ac tive
    await db.collection('user').updateOne({_id: users.alicegirl.__id }, { $set: { last_access: backDate } } )
    await core.dailyjob()
    inheritances = await core.inheritances(users.alice.token)
    inheritance = inheritances[0]
    // check activeHeirs & status
    const expected = [  { _id: users.alicegrandson._id, percentage: 40 },
                        { _id: users.aliceson._id, percentage: 30 },
                        { _id: users.bob._id, percentage: 10 },
                        { _id: users.charlie._id, percentage: 20 }
    ]
    expect(check_heirs(inheritance.activeHeirs, expected)).toBeTruthy()
    expect(inheritance.status).toBe(2)
    // testator alert
    alert = await db.collection('alert').findOne( { userId: users.alice._id  } )
    expect(alert.code).toBe(15)
    // bapp alert
    alert = await db.collection('alert').findOne( { userId: bapp._id  } )
    expect(alert.code).toBe(16)
    // aliceGirl no alert
    alert = await db.collection('alert').findOne( { userId: users.alicegirl._id  } )
    expect(!!alert).toBeFalsy()
    // bapp signs tx:
    const bappAddress = await db.collection('address').findOne( { _id: inheritance.signers[0].addressId } )
    await core.signInheritancePayment(inheritance, util.bapp.mnemonic, bappAddress.index, bapp._id, bapp.token)
    await util.sleep(10)
    // aliceGirl has no alert
    inheritances = await core.inheritances(users.alice.token)
    inheritance = inheritances[0]
    alert = await db.collection('alert').findOne( { userId: users.alicegirl._id  } )
    expect(!!alert).toBeFalsy()
    // 1. alice son signs
    alert = await db.collection('alert').findOne( { userId: users.aliceson._id  } )
    expect(alert.code).toBe(16)
    await core.signInheritancePayment(inheritance, users.aliceson.wallet.mnemonic, 1, users.aliceson._id, users.aliceson.token)
    await util.sleep(10)
    // 2. bob  signs
    alert = await db.collection('alert').findOne( { userId: users.bob._id  } )
    expect(alert.code).toBe(16)
    await core.signInheritancePayment(inheritance, users.bob.wallet.mnemonic, 1, users.bob._id, users.bob.token)
    await util.sleep(10)
    // tx should be sent
    await core.mine(6, 2200)
    // check bob balance
    alert = await db.collection('alert').findOne( { userId: users.bob._id  } )
    expect(alert.code).toBe(17)
    const bobWallet = await db.collection('wallet').findOne( { userId: users.bob._id  } )
    expect(bobWallet.balance).toBeGreaterThan(0)
  }, 100000)

  it('Every Heir receives inheritance', async () => {
    const { users, bapp } = await createGreatFamilyInheritance()
    // alice didn't log in in over 6 months
    backDate = util.pastDate(182);
    await db.collection('user').updateOne({_id: users.alice.__id }, { $set: { last_access: backDate } } )
    await core.dailyjob()
    inheritances = await core.inheritances(users.alice.token)
    inheritance = inheritances[0]
    // check activeHeirs & status
    const expected = [  { _id: users.alicegirl._id, percentage: 40 },
                        { _id: users.aliceson._id, percentage: 30 },
                        { _id: users.bob._id, percentage: 10 },
                        { _id: users.charlie._id, percentage: 20 }
    ]
    expect(check_heirs(inheritance.activeHeirs, expected)).toBeTruthy()
    expect(inheritance.status).toBe(2)
    // testator alert
    alert = await db.collection('alert').findOne( { userId: users.alice._id  } )
    expect(alert.code).toBe(15)
    // bapp alert
    alert = await db.collection('alert').findOne( { userId: bapp._id  } )
    expect(alert.code).toBe(16)
    // bob no alert
    alert = await db.collection('alert').findOne( { userId: users.bob._id  } )
    expect(!!alert).toBeFalsy()
    // bapp signs tx:
    const bappAddress = await db.collection('address').findOne( { _id: inheritance.signers[0].addressId } )
    await core.signInheritancePayment(inheritance, util.bapp.mnemonic, bappAddress.index, bapp._id, bapp.token)
    // 1. alice girl signs
    inheritances = await core.inheritances(users.alice.token)
    inheritance = inheritances[0]
    alert = await db.collection('alert').findOne( { userId: users.alicegirl._id  } )
    expect(alert.code).toBe(16)
    await core.signInheritancePayment(inheritance, users.alicegirl.wallet.mnemonic, 1, users.alicegirl._id, users.alicegirl.token)
    // 2. alice son signs
    alert = await db.collection('alert').findOne( { userId: users.aliceson._id  } )
    expect(alert.code).toBe(16)
    await core.signInheritancePayment(inheritance, users.aliceson.wallet.mnemonic, 1, users.aliceson._id, users.aliceson.token)
    await core.mine(6, 2200)
    // check bob balance
    alert = await db.collection('alert').findOne( { userId: users.bob._id  } )
    expect(alert.code).toBe(17)
    const bobWallet = await db.collection('wallet').findOne( { userId: users.bob._id  } )
    expect(bobWallet.balance).toBeGreaterThan(0)
  }, 100000)

});

// common functions ------------------
async function createGreatFamilyInheritance () {
  const users =  await core.createAllUsers()
  const bapp =  await core.bappLogin()
  // create Bapp signing wallet address
  const fields = { name: "Inheritance: Alice", process: true }
  const { wallet, address } = await core.generateBappAddress(fields)
  // create inheritance plan
  let inheritance = await core.createGreatFamilyInheritance(users.alice, address._id)
  const signers = [ users.aliceson, users.alicegirl, users.alicegrandson, users.bob, users.bobfriend, users.bobfriend2, users.charlie, users.charlielawyer ]
  for(const signer of signers) {
    await core.inheritanceSetPubkeyAndAddress(inheritance._id, signer.wallet._id, "", signer.token)
  }
  // testator alerts
  let alert = await db.collection('alert').findOne( { userId: users.alice._id  } )
  expect(alert.code).toBe(14)
  await db.collection('alert').deleteOne( { userId: users.alice._id } )
  await util.sleep(200)
  // read inheritance
  let inheritances = await core.inheritances(users.alice.token)
  inheritance = inheritances[0]
  await core.faucet(inheritance.scriptAddressId)
  await core.faucet(inheritance.scriptAddressId)
  await core.faucet(inheritance.scriptAddressId)
  await util.sleep(500)
  await core.mine(6, 800)
  // activte inheritance
  await core.setInheritanceStatus(inheritance._id, 1, users.alice.token)
  await core.setInheritanceTimeTrigger(inheritance._id, 180, users.alice.token)
  return { users, bapp, inheritance }
}

function check_heirs(heirs, expected) {
  return heirs.every( h => {
    return expected.some(e => e._id == h.userId && h.percentage == e.percentage)
  })
}

  // common functions ------------------
async function createThirdpartySimpleInheritance () {
  const alice = await core.createUser(util.alice.email, util.alice.nick, 100, `${util.alice.nick} Wallet 1`, 1)
  const bob = await core.createUser(util.bob.email, util.bob.nick, 100, `${util.bob.nick} Wallet 1`, 1)
  const { user: bitpassStaff, token: bitpassToken } =  await core.login('interservstaff1@gmail.com')
  bitpassStaff.token = bitpassToken
  // create inheritance plan
  let inheritance = await core.createThirdpartySimpleInheritance()

  db.collection("alert").insertOne( {userId: "300db02db75af922c759f08a0efa5a400128eac1f531b802697450b5c6da6e9f", code: 81,"entryId": inheritance._id,
        created: "2022-12-05T19:07:52.056Z", aux1: "Alice", aux2: 1, aux3: "3rdParty Simple"} )
  await core.inheritanceSetPubkeyAndAddress(inheritance._id, alice.wallet._id, "", alice.token)
  await core.inheritanceSetPubkeyAndAddress(inheritance._id, bob.wallet._id, "", bob.token)
  // testator alerts
  let alert = await db.collection('alert').findOne( { userId: alice._id  } )
  expect(alert.code).toBe(83)
  await db.collection('alert').deleteOne( { userId: alice._id, code: 83 } )
  await util.sleep(200)
  // read inheritance
  let inheritances = await core.inheritances(alice.token)
  inheritance = inheritances[0]
  const { tree } = await db.collection('inheritance').findOne( { _id: ObjectID(inheritance._id)})
  expect(!!inheritance.scriptAddressId).toBeTruthy()
  await core.faucet(inheritance.scriptAddressId)
  await util.sleep(500)
  await core.mine(6, 800)
  // activte inheritance
  await core.setInheritanceStatus(inheritance._id, 1, alice.token)
  await core.setInheritanceTimeTrigger(inheritance._id, 180, alice.token)
  await core.executeInheritance(inheritance._id, tree, bitpassToken)
  inheritances = await core.inheritances(alice.token)
  inheritance = inheritances[0]
  // check activeHeirs & status
  const expected = [  { _id: bob._id, percentage: 100}
  ]
  expect(check_heirs(inheritance.activeHeirs, expected)).toBeTruthy()
  expect(inheritance.status).toBe(2)
  // testator alert
  alert = await db.collection('alert').findOne( { userId: alice._id  } )
  expect(alert.code).toBe(84)
  // thirdParty alert
  alert = await db.collection('alert').findOne( { userId: bitpassStaff._id  } )
  expect(alert.code).toBe(85)

  return { alice, bob, bitpassStaff, inheritance }
}



