//import {logger} from 'react-native-logs';

//const log = logger.createLogger();

let blockchain

module.exports = {
  networkName: 'Mainnet',

  setNetwork: function (networkName) {
    module.exports.networkName = networkName
    if(networkName === 'Regtest') {
      blockchain = require('../test/util')
    } else {
      blockchain = require("./blockcypher")
      blockchain.setNetwork(networkName)
    }    
  },

  // fetches address utxos
  getAddressUTXOs: async (addressId) => { //console.log("blockchain getAddressUTXOs:", addressId)
    return blockchain.getAddressUTXOs(addressId)
  },

  getAddressBalance: async (addressId) => { //log.debug(`getAddressBalance: ${addressId}`)
    return blockchain.getAddressBalance(addressId)
  },

  // fetches Miner Fees
  getFees: async () => {
    return blockchain.getFees()
  },

  broadcastTx: async (tx_hex) => {
    return blockchain.broadcastTx(tx_hex)
  },

  fundTestAddress: async (addressId) => { //console.log("blockchain fundTestAddress:", addressId)
    return blockchain.fundAddress(addressId)
  },

}
