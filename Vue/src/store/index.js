import Vue from 'vue'
import Vuex from 'vuex'

import misc from './misc'
import user from './user'

Vue.use(Vuex)

/*
 * If not building with SSR mode, you can
 * directly export the Store instantiation
 */

export default function (/*{ ssrContext }*/ ) {
  const Store = new Vuex.Store({
    actions: {
      async get({
        commit
      }) {
        console.log("hola")
      }
    },
    modules: {
      misc,
      user
    },
    // enable strict mode (adds overhead!)
    // for dev mode only
    strict: process.env.DEV
  })

  //console.log("store ssrContext:", Object.keys(ssrContext))

  return Store
}
