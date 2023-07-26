const sha256 = require("js-sha256")
const bip39 = require('bip39')
const bitcoin = require('bitcoinjs-lib')
const bip32 = require('bip32')
const bip65 = require('bip65')
const crypto = require('crypto')
const moment = require('moment')

module.exports = {
  tx_fee: 50000,

  pastDate: (days) => {
    const past = new Date()
    past.setDate( past.getDate() - days );
    return past
  },

  futureDate: (days) => {
    const future = new Date()
    future.setDate( future.getDate() + days );
    return future
  },

  lockTime: (date, time='00:00') => {
    // this line is not part of Vue.prototype.$lockTime
    date = moment(date).format().substring(0, 10)
    const today  = new Date()
    //today.setHours(0,0,0,0) // beginning of day
    const script_date = new Date(date+'T'+time+":00") // something less ugly !!!
    //script_date.setHours(0,0,0,0) // beginning of day
    let secs = Math.floor((script_date - today)/1000)
    //if(secs < 0) secs = 0
    //console.log("Math.floor(Date.now() / 1000) + secs:", Math.floor(Date.now() / 1000) + secs, secs)
    return bip65.encode( { utc: Math.floor(Date.now() / 1000) + secs } )
  },

  liam: (email) => {
    const temp = [...email.toLowerCase()].reverse().join("")
    return sha256(temp.replace('@', 'arroba'))
  },

  frontEncrypt: (input, key) => {
    if(key.length < 32) key = key.padEnd(32,".") // dman createDecipheriv
    else if(key.length > 32) key = key.substring(0, 32)
    let iv = crypto.randomBytes(16)
    let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
    let encrypted = cipher.update(input);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex')
  },

  frontDecrypt: function(input, key) {
    if(key.length < 32) key = key.padEnd(32,".")
    else if(key.length > 32) key = key.substring(0, 32)
    //console.log("key:", key, key.length)
    let textParts = input.split(':')
    let iv = Buffer.from(textParts.shift(), 'hex')
    let encryptedText = Buffer.from(textParts.join(':'), 'hex')
    let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv)
    let decrypted = decipher.update(encryptedText)
    decrypted = Buffer.concat([decrypted, decipher.final()])
    return decrypted.toString()
  },

  mnemonic: () => {
    let randomBytes = crypto.randomBytes(32)
    return bip39.entropyToMnemonic(randomBytes.toString('hex'))
  },

  getAddressKeypair(mnemonic, index, passphrase="pass111") {
    const seed = bip39.mnemonicToSeedSync(mnemonic, passphrase)
    const root = bip32.fromSeed(seed, bitcoin.networks.regtest)
    const keyPair = root.derivePath("m/84'/1'/0'/0/" + index)
    return keyPair
  },

  nHash: (text) => {
    let hash = text
    for(let n=0; n<50000; n++) {
      hash = sha256(hash)
    }
    return hash
  },

  stringify(obj) {
    const json = JSON.stringify(obj);  // {"name":"John Smith"}
    return json.replace(/"([^"]+)":/g, '$1:')
  },

  select_utxos(utxos, satoshis) {// console.log("selecting utxos:", utxos)
    let totalSelected = 0
    for(const utxo of utxos) {
      utxo.selected = true
      totalSelected += utxo.value
      if(totalSelected > satoshis + this.tx_fee)
        break
    }
    let change = 0
    if(totalSelected > satoshis + this.tx_fee)
      change = totalSelected - satoshis - this.tx_fee
    return {  utxos: utxos.filter(utxo => !!utxo.selected), 
              totalSelected, 
              fee: this.tx_fee, 
              change 
            }
  },

  wallet_select_utxos(addresses, satoshis) {// console.log("selecting utxos:", utxos)
    let totalSelected = 0
    const utxos = []
    for(const address of addresses) {
      for(const utxo of address.confirmed_utxos) {
        utxo.selected = true
        utxo.index = address.index
        totalSelected += utxo.value
        utxos.push(utxo)
        if(totalSelected > satoshis + this.tx_fee)
          break
      }
    }
    let change = 0
    if(totalSelected > satoshis + this.tx_fee)
      change = totalSelected - satoshis - this.tx_fee
    return {  utxos, 
              totalSelected, 
              fee: this.tx_fee, 
              change 
            }
  },

  pp: (title, obj) => {
    console.log(title, JSON.stringify(obj, null, 4))
  },

  users: () => {
    return {
      alice: module.exports.alice,
      bob: module.exports.bob,
      charlie: module.exports.charlie,
      aliceson: module.exports.aliceson,
      alicegirl: module.exports.alicegirl,
      alicegrandson: module.exports.alicegrandson,
      bobfriend: module.exports.bobfriend,
      bobfriend2: module.exports.bobfriend2,
      charlielawyer: module.exports.charlielawyer,
      annlawyer: module.exports.annlawyer,
    }
  },

  alice: { 
    _id: '0beaac69d53e38d275aadd405b7f414dee8c268979fdcd8381ce1434328f91de',
    nick: "Alice",
    __id: '6458f7b3c5a202da71884080c776f6f4984e582d48d3959b50f0cb1da59b4118',
    liam: 'a3613c1085a7461edc7f0c068f2849f915ef745923bdebfa80287a74946cf247',
    email: 'alice@gmail.com'
  },

  bob: {
    _id: '300db02db75af922c759f08a0efa5a400128eac1f531b802697450b5c6da6e9f',
    nick: "Bob",
    __id: 'db86d9f5cf9407c0cf5cc9e289820959da34efc2f4723b686c9a79c4f59b457f',
    liam: '8a524d9ed79ec230ca64e7dba0c5b89316180e6828eb4a7becd7e3901c6151cc',
    email: 'bob@gmail.com' 
  }, 

  charlie: {
    _id: "cca8120950e7f43ad7de77f0de28015adbfae718bbd817059fabff540b946b41",
    nick: "Charlie",
    __id: "9a9a76dc9dcab3cd18b5c4a00451ae2766fbed45f4f0b88ba124268b8ec4dbe8",
    liam: "f26ec24a293f6ceebeeb65ea71b0cd7b60cebf82b6f8969ac44f40f2e10d2e4c",
    email: "charlie@gmail.com"
  },

  aliceson: { 
    _id: 'b89e5d97279c61e995eb85372f014ae46a416bb3d73b3a1620e7ac7966aa9905',
    nick: "Alice Son",
    __id: '074db845aef12df28f9991672c906eef65ead86619169edc980b33eb05887910',
    liam: '89c14d5a65ee0d1b36db1d4ff4f7c3d876e4c0d075f9ab831a46323926081216',
    email: 'aliceson@gmail.com' 
  },

  alicegirl: { 
    _id: '002e47f70d659f8e09351771455d3941ffaff6be8c7efa877f774df5423d7a37',
    nick: "Alice Girl",
    __id: 'b9a45f2b1be6e47b4661900318e8ab73969c0579b37ec1279c03b1d1562b73a9',
    liam: 'f7e743457c67f59eba4634b8d65e424235f957daf9f4850b817d846057b8d4aa',
    email: 'alicegirl@gmail.com' 
  },

  alicegrandson: { 
    _id: '3a8376d114b8f107aa3f4bcf80f1d6f223149199b617f64c1a8e04f6487071ce',
    nick: "Alice Grand Son",
    __id: '9d326d6b5db5a5a0caade0429ceb3b88e215613d5c0ee9c02abec19d7d67bb90',
    liam: '9b955185e622595a56845541a9bd389f6004adc0c42c3789cf9e5c554544d778',
    email: 'alicegrandson@gmail.com' 
  },

  bobfriend: {
    _id: '5f72c4ad2598301f5f0a47cee1a1fac0335be9b82e649c003b13f975aeb1647a',
    nick: "Bob Friend",
    __id: 'de512e4ddb82bbd9495b83bb1a189ee381d2519d2328e832b98c50b3e0a18183',
    liam: 'cf326316868d4ef59329caf9870b6b01059269952a74df702903dd403a013070',
    email: 'bobfriend@gmail.com' 
  },

  bobfriend2: {
    _id: 'e8f799297a8eee4a6b0d7f2fb4ae322c37821268ead3500302b03101f6249790',
    nick: "Bob Friend 2",
      __id: '69817311ab34eaf15d6ca6ca7b75919db67a7a052275a120397aa55ccd8f51ae',
      liam: '678ad23531d6b0d9ecef8a24d74c4917a526cbf1625107e93f9ce08e28068b4a',
      email: 'bobfriend2@gmail.com'
  },

  charlielawyer: {
    _id: 'ba92904c15c98bbb1669cde77d8835421253cc31583dbab085157ffe6d2975b8',
    nick: "Charlie Lawyer",
    __id: 'a9114e463da5723687b067fad4a8271a8247ec6326d9361096c058bea3770dcd',
    liam: 'f1fa2125873fda40b462822a75e95b2cb5ec1a1037fea36097df344a6fd3da09',
    email: 'charlielawyer@gmail.com'
  },

  annlawyer: {
    _id: 'd71123f6576b00c843f685bd178c487410d2b190d69dba52c190879cb799a48e',
    nick: "Ann Lawyer",
    __id: 'c0a29b953375364517ecfd21f8c0dc45767ba49e7623b3cd7a91b55cd22dd014',
    liam: 'c8bcf684362b27be4dac5dac30a6e38e68fd28ac3009937a48b743a9870a4c6a',
    email: 'annlawyer@gmail.com' 
  },




  bapp: {
    _id: "e68a6459450d0c02ee22d55c0ee28fa56d8653b2104e50c394ce2496de33f684",
    __id: "",
    liam: "ecaf15c1cdb0a53a142fc74d0ad30a44b2f449c7574247536d22494b45babb1c",
    email: "bapp@bapp.plus",
    mnemonic: "client city fit degree tone coffee connect ecology success common lava maze hint carry hire gallery choose talent step height limit impact million edit",
    walletId: "63920f85707dfb44464c7a99"
  },

  jwt: "bapp_jwt_kings_encryption_best_*",

  sleep: (ms) => {
    return new Promise(resolve=>{
        setTimeout(resolve,ms)
    })
  },

}