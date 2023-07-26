const { withFilter } = require('graphql-subscriptions')

module.exports = {

  newBlock: { // OK
    subscribe: (parent, args, { pubsub }) => pubsub.asyncIterator('new-block') 
  },

  newWallet: { // OK
    subscribe: withFilter(
      (parent, args, { pubsub }) => pubsub.asyncIterator('new-wallet'),
      ( { newWallet }, { userId }) => {
        return  Boolean( userId === newWallet.userId )
      },
    )
  }, 

  newAddress: { // NOT OK
    subscribe: withFilter(
      (parent, args, { pubsub }) => pubsub.asyncIterator('new-address'),
      ( { newAddress }, { parentId }) => {
        //console.log("subscription newAddress:", newAddress, typeof newAddress.parentId, "parentId:", parentId, typeof parentId)
        return Boolean( parentId == newAddress.parentId.toString() )
      },
    )
  },


  lnFunded: { // OK
    subscribe: withFilter(
      (parent, args, { pubsub }) => pubsub.asyncIterator('ln-funded'),
      ( { lnFunded }, { lightningId }) => { // it can be an address or a wallet
        return Boolean( lnFunded._id == lightningId )
      },
    )
  },

  newCoin: { // OK
    subscribe: withFilter(
      (parent, args, { pubsub }) => pubsub.asyncIterator('new-coin'),
      ( { newCoin }, { scriptId }) => { // it can be an address or a wallet
        if(scriptId == '5f5354cec332b33a327dc450') console.log("subsc: newCoin:", newCoin, "scriptId", scriptId)
        return Boolean( newCoin.addressId == scriptId || newCoin.walletId == scriptId )
      },
    )
  },

  newAlert: { // OK
    subscribe: withFilter(
      (parent, args, { pubsub }) => pubsub.asyncIterator('new-alert'),
      ( { newAlert }, { userId }) => {
        //console.log("subscription newAlert:", newAlert, userId)
        return Boolean( userId == newAlert.userId )
      },
    )
  },

  alertDeleted: { // OK
    subscribe: withFilter(
      (parent, args, { pubsub }) => pubsub.asyncIterator('alert-deleted'),
      ( { alertDeleted }, { userId }) => {
        //console.log("alertDeleted:", alertDeleted, "userId:", userId)
        return Boolean( userId == alertDeleted.userId )
      },
    )
  },


  newMultisig: { // OK. maybe should be deleted in favor of "newScript" (not coded)
    subscribe: withFilter(
      (parent, args, { pubsub }) => pubsub.asyncIterator('new-multisig'),
      ( { newMultisig },{ userId }) => {
        return Boolean( newMultisig.signers.some( s => s.userId == userId) )
      },
    )
  },

  newSmartcontract: { // OK. maybe should be deleted in favor of "newScript" (not coded)
    subscribe: withFilter(
      (parent, args, { pubsub }) => pubsub.asyncIterator('new-smartcontract'),
      ( { newSmartcontract } ,{ userId }) => {
        return Boolean( newSmartcontract.signers.some( s => s.userId == userId) )
      },
    )
  },

  newInheritance: { // OK
    subscribe: withFilter(
      (parent, args, { pubsub }) => pubsub.asyncIterator('new-inheritance'),
      ( { newInheritance }, { userId }) => {
        return Boolean( newInheritance.testatorId == userId )
      },
    )
  },

  scriptPubkeySet: { // OK
    subscribe: withFilter(
      (parent, args, { pubsub }) => pubsub.asyncIterator('script-pubkey-set'),
      ({ scriptPubkeySet, scriptId }, args ) => {
        //console.log("scriptPubkeySet:", scriptPubkeySet, "scriptId:", scriptId)
        return Boolean( scriptId == args.scriptId )
      },
    )
  },

  paymentSigned: { // OK
    subscribe: withFilter(
      (parent, args, { pubsub }) => pubsub.asyncIterator('payment-signed'),
      ({ paymentSigned, scriptId }, args ) => {
        //console.log("paymentSigned:", paymentSigned, "scriptId:", scriptId)
        return Boolean( scriptId == args.scriptId )
      },
    )
  },

  newMultisigPayment: { // OK
    subscribe: withFilter(
      (parent, args, { pubsub }) => pubsub.asyncIterator('new-multisig-payment'),
      ( { newMultisigPayment }, { multisigId } ) => {
        //console.log("newMultisigPayment:", newMultisigPayment)
        return Boolean( multisigId == newMultisigPayment.multisigId )
      },
    )
  },
  
  newPayment: { // OK
    subscribe: withFilter(
      (parent, args, { pubsub }) => pubsub.asyncIterator('new-payment'),
      ( { newPayment }, { scriptId }) => {
        return Boolean(scriptId == newPayment.scriptId )
      },
    )
  },

  newRecurringPayment: { // OK
    subscribe: withFilter(
      (parent, args, { pubsub }) => pubsub.asyncIterator('new-time-payment'),
      ( { newRecurringPayment }, { scriptId }) => {
        return Boolean(scriptId == newRecurringPayment.scriptId )
      },
    )
  },

  paymentDeleted: { // OK
    subscribe: withFilter(
      (parent, args, { pubsub }) => pubsub.asyncIterator('payment-deleted'),
      ( { paymentDeleted, scriptId }, args ) => {
        //console.log("paymentDeleted:", paymentDeleted)
        //console.log("args.scriptId == scriptId:", args.scriptId == scriptId)
        return Boolean(args.scriptId == scriptId )
      },
    )
  },

  txBroadcasted: { // OK
    subscribe: withFilter(
      (parent, args, { pubsub }) => pubsub.asyncIterator('tx-broadcasted'),
      ( { txBroadcasted, scriptId }, args ) => {
        console.log("txBroadcasted:", txBroadcasted)
        //console.log("args.scriptId == scriptId:", args.scriptId == scriptId)
        return Boolean(args.scriptId == scriptId )
      },
    )
  },

  // recurringpays
  newRecurringPay: {
    subscribe: withFilter(
      (parent, args, { pubsub }) => pubsub.asyncIterator('new-recurringpay'),
      ( { newRecurringPay }, { userId }) => {
        //console.log("subscription newRecurringPay:", newRecurringPay)
        return Boolean( userId == newRecurringPay.userId )
      },
    )
  },


  newContact: { // OK. maybe should be deleted in favor of "newScript" (not coded)
    subscribe: (parent, args, { pubsub }) => pubsub.asyncIterator('new-contact') 
  },

  recurringpayDeleted: {
    subscribe: withFilter(
      (parent, args, { pubsub }) => pubsub.asyncIterator('recurringpay-deleted'),
      ( { recurringpayDeleted }, { userId }) => {
        return Boolean( userId == recurringpayDeleted.userId )
      },
    )
  },

  // payrequests
  newPayrequest: {
    subscribe: withFilter(
      (parent, args, { pubsub }) => pubsub.asyncIterator('new-payrequest'),
      ( { newPayrequest }, { userId }) => {
        //console.log("subscription newPayrequest:", newPayrequest, "userId:", userId)
        return Boolean( userId == newPayrequest.payerId && !!newPayrequest.paid||  userId == newPayrequest.userId)
      },
    )
  },

  aftermessageReceived: {
    subscribe: withFilter(
      (parent, args, { pubsub }) => pubsub.asyncIterator('aftermessage-received'),
      ( { aftermessageReceived }, { userId }) => {
        //console.log("subscription aftermessageReceived:", aftermessageReceived, "userId:", userId)
        return Boolean(userId == aftermessageReceived.beneficiaryId)
      },
    )
  },

  /*aftermessageCreated: {
    subscribe: withFilter(
      (parent, args, { pubsub }) => pubsub.asyncIterator('aftermessage-created'),
      ( { aftermessageCreated }, { userId }) => {
        //console.log("subscription aftermessageReceived:", aftermessageReceived, "userId:", userId)
        return Boolean(userId == aftermessageReceived.beneficiaryId)
      },
    )
  },*/

  payrequestDeleted: {
    subscribe: withFilter(
      (parent, args, { pubsub }) => pubsub.asyncIterator('payrequest-deleted'),
      ( { payrequestDeleted }, { userId }) => {
        console.log("payrequestDeleted:", payrequestDeleted, "userId:", userId)
        return Boolean( userId == payrequestDeleted.userId )
      },
    )
  },

  payrequestPaid: {
    subscribe: withFilter(
      (parent, args, { pubsub }) => pubsub.asyncIterator('payrequest-paid'),
      ( { payrequestPaid, creatorId }, { userId }) => {
        console.log("payrequestPaid:", payrequestPaid, "userId:", userId, "creatorId:", creatorId)
        return Boolean( userId == creatorId )
      },
    )
  },

  newLnPay: {
    subscribe: withFilter(
      (parent, args, { pubsub }) => pubsub.asyncIterator('new-lnpay'),
      ( { newLnPay, subscriberId }, { userId }) => {
        ///¡console.log("subs newLnPay:", newLnPay, "userId:", userId)
        return Boolean( userId == subscriberId )
      },
    )
  },

  lnPayReceived: {
    subscribe: withFilter(
      (parent, args, { pubsub }) => pubsub.asyncIterator('lnpay-received'),
      ( { lnPayReceived, subscriberId }, { userId }) => {
        //console.log("subscribe lnPayReceived:", lnPayReceived, "userId:", userId)
        return Boolean( userId == subscriberId )
      },
    )
  },

  newChatMessage: {
    subscribe: withFilter(
      (parent, args, { pubsub }) => pubsub.asyncIterator('chat-message'),
      ( { newChatMessage, subscriberId }, { userId }) => {
        ///¡console.log("subs newLnPay:", newLnPay, "userId:", userId)
        console.log("notification: ", subscriberId.substr(0, 8), userId.substr(0, 8))
        console.log("")
        return Boolean( subscriberId == userId )
      },
    )
  },

  ping: {
    subscribe: withFilter(
      (parent, args, { pubsub }) => pubsub.asyncIterator('ping'),
      ( { ping, pingUserId }, { userId }) => {
        console.log("ping:", ping, "userId:", userId)
        return Boolean( userId == pingUserId )
      },
    )
  },

  newFeedback: { // OK. maybe should be deleted in favor of "newScript" (not coded)
    subscribe: (parent, args, { pubsub }) => pubsub.asyncIterator('new-feedback') 
  },


  
  newUser: {
    subscribe: (parent, args, { pubsub }) => pubsub.asyncIterator('user-added')
  },

}