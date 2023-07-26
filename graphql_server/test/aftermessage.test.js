const mongodb = require('mongodb');
const core = require('./lib/core.js')
const util = require('./lib/utils.js')


describe('After Message', () => {
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

  it('Should receive message after timetrigger', async () => {
    const alice = await core.createUser(util.alice.email, util.alice.nick, 100, `${util.alice.nick} Wallet 1`, 1)
    const bob = await core.createUser(util.bob.email, util.bob.nick, 100, `${util.bob.nick} Wallet 1`, 1)
    // create aftermessage
    const message = "Pot Ato";
    const password  = "pass222"
    await core.saveAftermessage(alice.token, "jest test", message, alice, bob, 1, new Date(), 180, password )
    // check message
    let aftermessages = await core.aftermessages(alice.token)
    let aftermessage = aftermessages[0]
    let key = util.nHash(bob.liam + password)
    let decrypted = util.frontDecrypt(aftermessage.message, key)
    expect(decrypted).toBe(message)
    // update aftermessage
    const newMessage = "Pot Ato es la niña mas mala que jamás existió"
    await core.updateAftermessage(alice.token, aftermessage._id, newMessage, bob, password )
    // john2
    await core.dailyjob()
    aftermessages = await core.aftermessages(bob.token)
    expect(aftermessages.length).toBe(0)

    // lastAccess 179 days
    let backDate = util.pastDate(179);
    await db.collection('user').updateOne({_id: alice.__id }, { $set: { last_access: backDate } } )
    await core.dailyjob()
    aftermessages = await core.aftermessages(bob.token)
    expect(aftermessages.length).toBe(0)

    // lastAccess 181 days
    backDate = util.pastDate(181);
    await db.collection('user').updateOne({_id: alice.__id }, { $set: { last_access: backDate } } )
    await core.dailyjob()
    aftermessages = await core.aftermessages(bob.token)
    expect(aftermessages.length).toBe(1)
    aftermessage = aftermessages[0]
    key = util.nHash(bob.liam + password)
    decrypted = util.frontDecrypt(aftermessage.message, key)
    expect(decrypted).toBe(newMessage)
  }, 100000)

});


