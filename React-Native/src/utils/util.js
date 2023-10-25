import qs from 'qs';
import sha256 from "js-sha256"
import { Linking } from 'react-native';
import CryptoJS from 'crypto-js';
import { store } from '../store/store'



module.exports = {

  sleep: (ms) => {
    return new Promise(resolve=>{
        setTimeout(resolve,ms)
    })
  },

  /*clone: (obj) => {
    return JSON.parse(JSON.stringify(obj))
  },*/

  futureDate: (days, asString=false) => {
    const future = new Date()
    future.setDate( future.getDate() + days );
    if(!!asString) return future.toString()
    return future
  },

  // call Bitpass
  async callMother(method, body, token=null, debug=false) {
    let url = 'https://xxx:443'
    if( !!store.getState().app.isEmulator )
      url = 'http://192.168.1.101:4002/graphql'

    try {
      return await fetch(url, { 
        method: 'post', 
        body: JSON.stringify( { query: body } ), 
        headers: { 
          'Content-Type': 'application/json',
          ...!!token && { 'authorization': token }
        }, 
      }).then(res => res.json()) 
      .then(json => {
        if(!!debug || !json.data)
          console.log("callMother", method, "json:", JSON.stringify(json, null, 4))
        if(!!json.data)
          return json.data[method]
      })
    } catch(err) {
      console.log(`callMother(${method}):`, body)
      console.log("callMother error:", err)
      return false
    }
  },

  async sendEmail(to, subject, restoreCode) { //body, options = {}) {
    //const { cc, bcc } = options;

    let url = `mailto:${to}`;
    const body = `
      Account created!

      Your account restore code:
      ${restoreCode}

      Keep your restore code and password safe.

      You cannot restore the account without them.
          
      Cheers!
      
      ps: The eamil was sent from the app so you know you are the only one who has it.`

    // Create email link query
    const query = qs.stringify({
        subject: subject,
        body: body,
        //cc: cc,
        //bcc: bcc
    });

    if (query.length) {
        url += `?${query}`;
    }
    try {
      // check if we can use this link
      //console.log("url:", url)
      /*const canOpen = await Linking.canOpenURL(url);

      if (!canOpen) {
        //  throw new Error('Provided URL can not be handled:', url);
        console.log("----canOpen:", canOpen)
      }*/

      return Linking.openURL(url);
    } catch(err) {
      console.log("SendEmail error:", err)
    }
  },

  // Encrypt
  encrypt: (msg, key) => {
    return ...
  },

  // Decrypt
  decrypt: (ciphertext, key) => {
    const bytes = ...
    return ...
  },

  formatDate: (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const monthIndex = date.getMonth();
    const year = date.getFullYear();
    let hours = date.getHours();
    let minutes = date.getMinutes();
  
    if (minutes < 10) {
      minutes = `0${minutes}`;
    }

    if (hours < 10) {
      hours = `0${hours}`;
    }
  
    const monthNames = [
      "Jan", "Feb", "Mar",
      "Apr", "May", "Jun",
      "Jul", "Aug", "Sep",
      "Oct", "Nov", "Dec"
    ];
  
    return `${day} ${monthNames[monthIndex]} ${year}. ${hours}:${minutes}`;
  }

}
