import qs from 'qs';
import sha256 from "js-sha256"
import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';

import { Storage } from './Storage';
import { store } from '../store/store'
import { setToken, setInheritances, setInheritance, setThirdparty, setDeceased, } from '../store/user/slice';
import { setFee, setFeeNextUpdate, setJobsTimer, setIsEmulator, setUupgrade } from '../store/app/slice';
import { checkBalance, checkPsbtHash, checkFees, createInheritanceScript, setNetwork } from '../utils/bitcoin'
import { callMother } from './util'


module.exports = {
  // when it comes from background & after register
  async init() {
    if (Platform.OS === 'android') {
      const isEmulator = await DeviceInfo.isEmulator()
      if(isEmulator)
        store.dispatch(setIsEmulator( true ));
    }
    const deceased = await Storage.getBool('deceased')
    if(deceased)
      store.dispatch(setDeceased( true ))
    const token = await Storage.get('token')  
    if(!!token) 
      store.dispatch(setToken( token ))
    // load inheritances from storage
    const inheritances = await Storage.getInheritances()
    //console.log("inheritances:", JSON.stringify(inheritances, null, 4));
    //console.log("Storage inheritances:", inheritances)
    store.dispatch(setInheritances( inheritances ));
    const thirdparty = await Storage.getThirdparty()
    if(!!thirdparty._id) {
      setNetwork(thirdparty.network)
      store.dispatch(setThirdparty( thirdparty ));
    }
    const fee = await Storage.getNumber('fee')
    if(!!fee) {
      store.dispatch(setFee( fee ));
      const feeNextUpdate = await Storage.get('feeNextUpdate')
      store.dispatch(setFeeNextUpdate( feeNextUpdate ));
    }

  },

  runJobs: async () => { // console.log("runJobs")
    let timeout = 60000
    if(!!store.getState().app.isEmulator)
      timeout = 30000
    // clear timer if needed
    let jobsTimer = store.getState().app.jobsTimer
    clearTimeout(jobsTimer);
    // ask mother for notifications
    await getNotifications()
    await checkBalance()
    await checkPsbtHash()
    await checkFees()
    jobsTimer = setTimeout(async function() {
      module.exports.runJobs()
    }, timeout);
    store.dispatch(setJobsTimer(jobsTimer))
  },

  code: {
    clientDeceased: 1,
    clientConfirmedDeceased: 2,
    // Notifications -----
    // inheritance
    newInhertance: 'newInheritance',
    updatedInhertance: 'updatedInhertance',
    inheritanceExecuted: 'inheritanceExecuted', // to testator who has died 
    resetPin: 'resetPin',
    reinstallInheritance: 'reinstallInheritance',
    // client
    deceased: 'deceased',
    resucitate: 'resucitate',
    // app
    upgrade: 'upgrade',
    // User
    userMessage: 40,
    afterMessageSent: 41
  },

}


async function getNotifications() {
  const token = store.getState().user.token
  if(!token) return
  const body = `query { notifications ( token: "${token}" ) {
    _id
    type
    clientId
    body
    logEntryId
    created
  } }`
  const notifications = await callMother('notifications', body) //, token)
  //if(!!notifications.length)
  //  console.log("✨ ✨ ✨ ✨ ✨ ✨ ✨  notifications:", notifications)
  await processNotifications(notifications, token) 
}


async function processNotifications(notifications, token) {
  if(!notifications) return
  for(const notification of notifications) { console.log("✨ ✨ ✨ ✨ ✨ ✨ ✨ notification received:", notification.type)
    // NEW INHERITANCE -------------------------------------------
    if(notification.type == module.exports.code.newInhertance) {
      await processNewInheritanceNotification(notification, token)
    // Updated inheritnace
    } else if(notification.type == module.exports.code.updatedInhertance) {
      await processInheritanceChangesNotification(notification, token)
    // Reinstall Inheritnace
    } else if(notification.type == module.exports.code.reinstallInheritance) {
      await processReinstallInheritanceNotification(notification, token)
    } else if(notification.type == module.exports.code.deceased) {
      await processDeceasedNotification(notification, token)
    } else if(notification.type == module.exports.code.upgrade) {
      await processUpgradeNotification(notification, token)
    }
  }
}


// INHERTIANCE CHANGES ------------------------
async function processInheritanceChangesNotification(notification, token) { 
  const body = JSON.parse(notification.body)
  //console.log("notification:", JSON.stringify(body, null, 4))
  let inheritances = store.getState().user.inheritances
  const inheritance = inheritances[body.inheritanceId]
  const copy = JSON.parse(JSON.stringify(inheritance))
  copy.beneficiariesChanges = body.beneficiariesChanges
  copy.proposedBeneficiaries = body.proposedBeneficiaries
  copy.logEntryId = notification.logEntryId
  store.dispatch(setInheritance( copy ))
  await Storage.setInheritances(store.getState().user.inheritances)
  await acknowledgeNotification(notification, token)
}

// NEW INHERITANCE -------------------------------------------
async function processNewInheritanceNotification(notification, token) {
  const network = store.getState().user.thirdparty.network
  const body = JSON.parse(notification.body)
  const { scriptAddressId } = await createInheritanceScript( { index: body.index, kp: body.kp} )
  let inheritances = store.getState().user.inheritances
  // this is necesary to modify redux object
  const newInheritance = {
    _id: body.inheritanceId,
    name: body.name,
    index: body.index,
    kp: body.kp,
    scriptAddressId,
    beneficiaries: [],
    //beneficiariesChanges: { added: body.beneficiaries },  
    proposedBeneficiaries: body.beneficiaries,
    logEntryId: notification.logEntryId,
    balance: 0,
    unconfirmed: 0,
    network
  }
  //console.log("New inheritance: ", newInheritance)
  store.dispatch(setInheritance( newInheritance ))
  await Storage.setInheritances(store.getState().user.inheritances)
  await acknowledgeNotification(notification, token)
}

// Reinstall INHERITANCE -------------------------------------------
async function processReinstallInheritanceNotification(notification, token) {
  const network = store.getState().user.thirdparty.network
  const body = JSON.parse(notification.body)
  const { scriptAddressId } = await createInheritanceScript( { index: body.index, kp: body.kp} )
  let inheritances = store.getState().user.inheritances
  // this is necesary to modify redux object
  const newInheritance = {
    _id: body.inheritanceId,
    name: body.name,
    index: body.index,
    kp: body.kp,
    scriptAddressId,
    beneficiaries: body.beneficiaries,
    balance: 0,
    network
  }
  //console.log("Reinstall inheritance: ", newInheritance)
  store.dispatch(setInheritance( newInheritance ))
  await Storage.setInheritances(store.getState().user.inheritances)
  await acknowledgeNotification(notification, token)
}

// Deceased
async function processDeceasedNotification(notification, token) {
  store.dispatch(setDeceased( true ))
  await Storage.setBool('deceased', true)
  await acknowledgeNotification(notification, token)
}

// upgrade app
async function processUpgradeNotification(notification, token) {
  store.dispatch(setUupgrade( true ))
  await Storage.setBool('setUupgrade', true)
  await acknowledgeNotification(notification, token)
}

async function acknowledgeNotification(notification, token) {
  // callMother acknowleNotification 
  const body = `mutation { acknowledgeNotification ( clientId: "${notification.clientId}", notificationId: "${notification._id}", token: "${token}" ) }`
  callMother('acknowledgeNotification', body) //, token)
}