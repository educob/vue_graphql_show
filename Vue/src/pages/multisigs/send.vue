<template>
  <div v-if="multisig" id="board2">

    <!---------- Header ---------->
    <div class="header" id="header" >
      <img class="logo" src="statics/img/multisig.svg" />
      <div class="rows" style="width:fit-content">
        <span style="color:gray;font-size:20px"> {{ multisig.name }} </span>
        <div style="display:flex">
          <span class="amount" style="font-size:20px;" >{{ multisig.address.balance | formatSatoshis }}</span> 
          <span v-if="!!multisig.address.unconfirmedBalance" class="amount" style="font-size:16px">({{ multisig.address.unconfirmedBalance | formatSatoshis }})</span>
        </div>
        <div v-if="$fiat()" style="display:flex" class="hcenter">
          <span class="fiat" style="color:gray;font-size:20px">{{ multisig.address.balance | formatFiat($fiat(), true)}}</span>
          <span v-if="!!multisig.address.unconfirmedBalance" class="fiat" style="color:gray;font-size:16px">({{ multisig.address.unconfirmedBalance | formatFiat($fiat(), true)}})</span>
        </div>
      </div>
    </div>

    <!---------- Header 2 ---------->
    <div class="header" id="header2" >
      <img class="logo" src="statics/img/send.svg" />
      <div class="rows">
        <span class="desc" style="color:gray;font-size:20px"> {{ $t("Sending Amount") }}</span>
        <span class="amount" style="font-size:20px">{{ sendingamount | formatSatoshis }}</span>
        <span v-if="$fiat()" class="fiat" style="color:gray;font-size:20x">{{ sendingamount | formatFiat($fiat())}}</span>
      </div>
    </div>
    
    <!---------- Left panel ---------->
    <div class="panel" id="left_panel" style="position:relative;margin-top:10px">
      <p class="title">{{ $t("Transaction Details") }}</p>
      <!-- recipients +1 -->
      <span class="title2" style="margin-left:0">{{ $t("Recipients") }}:</span>
      <recipients v-if="multisig && multisig.address" :available_funds="available_funds" :total_fee="total_fee" :key="updateKey" 
              :value="fixed_recipients"  :fixedInput="!!fixedInput"/>
      <!-- utxos -->
      <div v-if="$userSetting('show-deposit-selection')" style="margin:2px">
        <div style="display:flex"> 
          <q-btn :disabled="is_use_total_balance_active" @click="toggle_manual_utxo_selection()" flat round 
                      :icon="(!manual_utxo_selection || is_use_total_balance_active) ? 'mdi-checkbox-blank-outline' : 'mdi-checkbox-marked'" :style="!manual_utxo_selection || is_use_total_balance_active ? 'color:gray' : 'color:red' " />    
          <span style=";padding-top:10px;color:gray">{{ $t("Manual Deposit Selection") }}</span>
          <q-space />
          <q-input disable :label="$t('Total selected')" :value="totalSelectedformatted()" style="max-width:100px;margin-left:15px;margin-top:-5px"/>          
          <q-btn @click="$toggleUserSetting('show-deposit-selection')" flat round icon="mdi-eye-off" size="sm" color="primary" style="margin-top:10px" >
            <q-tooltip styñe="display:flex">{{ $t("Hide this section") }}</q-tooltip>
          </q-btn>
        </div>
        <q-expansion-item expand-separator>
          <template v-slot:header>
            <div class="addrbalance" style="display:flex">
              <q-icon name="mdi-qrcode" size="sm" color="primary" class="vcenter" />
              <div class="rows" style="margin-left:5px">
                <span >{{ multisig.address.name }}</span>
                <span class="ellipsis" style="font-size:0.8em">{{ multisig.address._id }}</span>               
              </div>
              <div class="rows">
                <span style="color:var(--light-blue);margin-left:5px">{{ multisig.address.balance | formatSatoshis }}</span>
                <span style="color:var(--light-blue);margin-left:5px">{{ multisig.address.balance | formatFiat($fiat()) }}</span>
              </div>
            </div>
          </template>
          <utxos  :utxos="utxos" :manual_utxo_selection=manual_utxo_selection />
        </q-expansion-item>
      </div>

      <!-- fees -->
      <div style="margin:2px 0 2px 0">
        <fees :tx_bytes="tx_bytes" :key="1 + updateKey" />
      </div>

      <!-- icon  -->
      <div style="border-radius: 10px;border: 1px solid #ddd;padding-left:10px" >
        <div style="display:flex;margin-top:10px">
          <img :src="`statics/svg/${icon}`" class="icon" @click="!!fixedInput ? '' : showIconSelector=true"
                      style="transform:translate(0px,-5px);filter:none;margin-right:10px" :disabled="fixedInput" />
          <div class="vcenter">
            <span v-if="!fixedInput" >{{ $t("Select Icon") }}</span>
          </div>
        </div>

        <!-- concept -->
        <div style="margin:0 5px 0 0;display:flex">
          <q-input v-model="concept" :label="$t('Concept')" dense  style="width:350px" :bg-color="$no_empty(concept)" class="concept" 
                :readonly="fixedInput" />
        </div>
      </div>

      <div class="button" @click="save_payment()" style="display:flex;margin-top:10px;margin-left:10px" >
        <img src="statics/img/save.svg" width="25" height="25"  />
        <span class="vcenter" style="margin-left:10px;margin-right:10px">{{ $t("Save") }}</span>
      </div>

    </div>

    <!------------ right panel ------------>
    <div id="right_panel">
      <!-- coins -->
      <coinList v-if="multisig.address && multisig.address.coins.length" :coins="multisig.address.coins" :show_load_more="show_load_more && multisig.address.coins.length >= pagesize"
                  @showMore="showMore()" style="margin-top:10px" />
    </div>

    <!-- Icon Selector -->
    <iconSelector v-if="showIconSelector" @close="showIconSelector=false" />

    <!-- select change address -->
    <selectWalletAddress v-if="!!change_dialog" @addressSelected="changeaddressSelectedHandler" @close="change_dialog=false" />

  </div>
</template>

<script>
let bitcoin = require('bitcoinjs-lib')
let bip39 = require('bip39')
let bip32 = require('bip32')
import { Decimal } from 'decimal.js'
import gql from 'graphql-tag'
import Vue from 'vue'
import selectModal from 'src/components/Modal' // passphrase
import fees from 'src/components/fees'
import coinList from 'src/components/coinList'
import recipients from 'src/components/recipients'
import selectWalletAddress from 'src/components/selectWalletAddress'
import utxos from 'src/components/utxos'
import { send } from 'src/mixins/send'
import iconSelector from 'src/components/iconSelector'

export default {
  data() {
    return {
      updateKey: 0, // refreshes components
      utxos: [],
      dialog: false,
      noEmpty: [ v => !!v || this.$t("Field required") ],
      modal: { title:"Sign the transaction", subtitle:"This action will send funds", buttons:this.$store.getters['misc/yes_no_buttons'], dialog:false },
      tx: null,
      sendingamount: 0,
      totalSelected: 0,
      change_dialog: false,
      change_address: '', // should be by default 1st address used
      concept: '',
      icon: '0.svg',
      total_fee: 0,
      fees_per_byte: 0,
      tx_bytes: 0,
      manual_total_fee: false,
      change: null,
      is_use_total_balance_active: false,
      recipients: [],
      donation: 0,
      //show_new_change_address: true,
      page: 0,
      pagesize: 15,
      show_load_more: true,
      showIconSelector: false,
      subscribed: false,
      // pay request/recurring pay
      fixed_recipients: null,
      payment: {},
      alert: {},
      fixedInput: false,
      collection: null,
      paydata: null,
      // send mixin
      module: 'multisig',
      manual_utxo_selection: false,
    }
  },
  mixins: [send],
  props: {
    addr: [Object],
  },
  components: {
    selectModal,
    fees,
    selectWalletAddress,
    utxos,
    recipients,
    coinList,
    iconSelector
  },
  created() {
  },
  computed: {
    available_funds() {
      if(!this.multisig.address) return 0
      return this.multisig.address.confirmed_utxos.reduce((balance, utxo) => balance + utxo.value, 0)
    },
  },
  mounted() {
    if(this.$route.params.payId) {
      this.$preprocess_pay(this, this.$route.params)
    }
  },
  watch: {
    $route(to, from) {
      if(!!to.params.payId)
        this.$preprocess_pay(this, to.params)
    },
    'multisig.address'(val) {
      if(!val) return
      //console.log("watch multisig.address")
      this.utxos = this.$addressUtxos(val)
    },
  },
  methods: {    
    async save_payment() {
      // spend utxos
      const script = Buffer.from(this.multisig.output)
      const witnessScript = Buffer.from(this.multisig.witness)

      const recipients = this.recipients.map( r => r.address )
      const satoshis = this.recipients.map( r => r.satoshis )
      const nicks = this.$nicks(this.recipients)
      const multisig = this.multisig
      const concept = this.concept
      const icon = this.icon
      const collection = this.collection
      const utxos = this.utxos

      const total_sending = satoshis.reduce( (sum, sats) => sum + sats, 0)
      const psbt = new bitcoin.Psbt({ network: this.$bitcoin_network() })
                            //console.log("recipients:", recipients, "nicks:", nicks)
      // recipients
      recipients.forEach( (recipient, i) => {// console.log("adding output:", recipient, satoshis[i]) 
        psbt.addOutput({ address: recipient, value: satoshis[i] })
      })
      // donation
      if(this.donation > 0) {
        //console.log("donation this.$store.getters['user/donation_address']:", this.$store.getters['user/donation_address'])
        psbt.addOutput({ address: this.$store.getters['user/donation_address'], value: this.donationf })
      }
      // change
      if(!!this.change) {// console.log("change output selected:", this.totalSelected, "sending:", this.sendingamount, "fee:", this.total_fee, "amount:", this.totalSelected - this.sendingamount - this.total_fee)
        //console.log("change2:", { address: this.multisig.address._id, value: this.totalSelected - this.sendingamount - this.total_fee })
        psbt.addOutput({ address: this.multisig.address._id, value: this.totalSelected - this.sendingamount - this.total_fee })    
      }
      // spend utxos
      utxos.forEach( utxo => {
        if(!utxo.selected) return
        psbt.addInput({ hash: utxo.utxo_tx, index: utxo.utxo_n,  
          witnessScript,
          witnessUtxo: {
            script, 
            value: utxo.value,
          }}
        )
      })
      const tx = psbt.toBase64()
      //const data = JSON.stringify(this.data)
      const sender = this.multisig.name
      this.$apolloClient().mutate({ // saveMultisigPayment
        mutation: gql`mutation saveMultisigPayment($input: MultisigPaymentInput!) {
          saveMultisigPayment(input: $input) {
            _id
            created
          }
        }`,
        variables: {
          input: {
            satoshis: total_sending,
            txextrainfo: { concept, icon, nicks, sender },
            multisigId: multisig._id,
            tx,
            utxos: utxos.filter(u => u.selected).map( utxo => { return { _id: utxo._id, tx: utxo.utxo_tx, n: utxo.utxo_n } }),
            //collection,
            //data,
          }
        },
      }).then( ({data}) => {
        //console.log("saveMultisigPayment:", data)
        //this.$refs.form.reset()
        const multisigPaymentId = data.saveMultisigPayment._id
        this.$go_to(`/multisigs/${multisig._id}`)
      }).catch((error) => {
        console.error("mutation newMultisig payment error", error)  // eslint-disable-line no-console
      })            
    },
    changeaddressSelectedHandler([wallet, address]) { // called by emit event in selectWalletAddress component
      this.change_dialog = false
      this.change_address = address._id
      //this.$setUserOpt('change-address', this.change_address)
    },
    /*async new_change_address() {
      const address = await this.$newAddress(this.wallet, "Change address:" + this.concept)
      this.change_address = address._id
      this.$setUserOpt('change-address', this.change_address)
      this.show_new_change_address = false
    },*/
    showMore () {
      this.page++
      // Fetch more data and transform the original result
      this.$apollo.queries.multisig.fetchMore({
        variables: {
          _id: this.$route.params.id,
          paging: { page: this.page, pagesize:this.pagesize }
        },
        // Transform the previous result with new data
        updateQuery: ( { multisig }, { fetchMoreResult } ) => {
          const more_coins = fetchMoreResult.multisig.address.coins
          //console.log("more_coins:", more_coins)
          if(!more_coins.length) this.show_load_more = false
          more_coins.forEach( c => {
            const pos = multisig.address.coins.findIndex((elem, i, array) => elem._id == c._id)
            if(pos == -1) 
              multisig.address.coins.push(c)
          })
          return { multisig }
        },
      })
    },
    recipients_addrs(change) { console.log("rec addresses change:", this.change )
      const addrs = this.recipients.map(r => r.address)
      if(this.donation > 0)
        addrs.push(this.$store.getters['user/donation_address'])
      if(!!change)
        addrs.push(this.multisig.address._id)
      //console.log("recipients addrs: ", addrs.length, addrs)
      return addrs
    },
    balance() {
      return this.multisig.address.balance
    },
  },
  apollo: {
    $client() { return this.$apolloClientName() },
    multisig: {
      query: gql`query ($_id: ID!, $paging: Paging!, $bytx: Boolean) {
        multisig(_id: $_id) {
          _id
          name
          M
          N
          creatorId
          scriptAddressId
          output
          witness
          address {
            _id
            name
            balance
            unconfirmedBalance
            confirmed_utxos {
              _id # database id
              utxo_tx
              utxo_n
              utxo_time
              utxo_concept
              utxo_icon
              value
            }
            coins(paging: $paging, bytx: $bytx) {
              _id # _id/_id + _
              time
              height
              value
              concept
              icon
              nicks
              sender
              tx
            }
          }
          signers {
            userId
            nick
            addressId
          }
          payments {
            _id
            satoshis
            concept
            icon
            nicks
            created
            multisigId
            broadcasted
            tx
            signers {
              userId
              nick
            }
          }
        }
      }`,
      variables() {
        return {
          _id: this.$route.params.id,
          paging: { page: 0, pagesize: this.pagesize },
          bytx: !!this.$userSetting('group-utxos-by-tx')
        }
      },
      fetchPolicy: 'network-only',
      skip () {
        return !this.$route.params || !this.$route.params.id
      },
      result({ data, loading, networkStatus }) {
        const self = this
        if(!data.multisig || !this.$loggedIn()) return
        if(this.subscribed) return
        this.subscribed = true
        //console.log("data.multisig.scriptAddressId:", data.multisig.scriptAddressId)
        this.$apollo.queries.multisig.subscribeToMore({ // newCoin
          document: gql`subscription newCoin($scriptId: String!) {
            newCoin(scriptId: $scriptId) {
              _id
              time
              height
              value
              concept
              icon
              nicks
              sender
              addressConfirmedBalance
              addressUnconfirmedBalance
              tx
            }
          }`,
          variables: {
            scriptId: data.multisig.scriptAddressId,
          }, // newCoin
          updateQuery: ( { multisig }, { subscriptionData }) => {
            const newCoin = subscriptionData.data.newCoin
            console.log('newCoin in multisig.Id', newCoin)
            const self = this
            newCoin.__typename = "Coin"
            if(!!newCoin.addressConfirmedBalance || !!newCoin.addressUnconfirmedBalance) {
              Vue.set(multisig.address, 'balance', newCoin.addressConfirmedBalance)
              Vue.set(multisig.address, 'unconfirmedBalance', newCoin.addressUnconfirmedBalance)
            } 
            // coins
            if(multisig.address.coins.length) {
              let pos
              if(self.$userSetting('group-utxos-by-tx'))
                pos = multisig.address.coins.findIndex(coin => coin.tx == newCoin.tx)
              else
                pos = multisig.address.coins.findIndex(coin => coin._id == newCoin._id)
              if(pos == -1) { // add at the beginning
                Vue.set(multisig.address, 'coins', [newCoin, ...multisig.address.coins] )
                //console.log("previous coin pos:", pos, self.$userSetting('group-utxos-by-tx'))
              } else { // replace
                const coin = multisig.address.coins[pos]
                if(self.$userSetting('group-utxos-by-tx')) {
                  coin.value += newCoin.value
                  coin.height = newCoin.height
                } else  
                  self.$mergeObjs(coin, newCoin)
              }
            } else {
              console.log("1st coin")
              Vue.set(multisig.address, 'coins', [newCoin] )
            }
            // usable_utxo management
            if(!newCoin._id.endsWith('_') && !newCoin.height) return { multisig } // unconfirmed utxo -> no usable_utxo
            //console.log("confirmed utxo o spent:", newCoin)
            //console.log("is it confirmed utxo:", newCoin._id)
            if(!newCoin._id.endsWith('_')) { // confirmed utxo -> upsert
              console.log("confirmed utxo -> upsert")
              const utxo = { 
                _id: newCoin._id, 
                utxo_tx: newCoin._id.substring(0, 64),
                utxo_n: parseInt(newCoin._id.substring(64)),
                utxo_time: newCoin.time, 
                value: parseInt(new Decimal(newCoin.value)),
                utxo_concept: newCoin.concept,
                utxo_icon: newCoin.icon,
                __typename: 'Utxo'
              }
              //console.log("confirmed utxo:", utxo)
              //console.log("    before utxos length:", multisig.address.confirmed_utxos.length)
              self.$arrayUpsert(multisig.address.confirmed_utxos, utxo, (elem, i, array) => elem._id == newCoin._id)
              //console.log("    afterrrr utxos length:", multisig.address.confirmed_utxos.length)
            } else { // spent(unconfirmed or confirmed) -> remove
              //console.log("spent. remove utxo", multisig.address.confirmed_utxos.length)
              let confirmed_utxos = multisig.address.confirmed_utxos.filter( utxo => utxo._id != newCoin._id.slice(0, -1))
              Vue.set(multisig.address, "confirmed_utxos", confirmed_utxos)
              //Vue.prototype.$arrayRemove(address.confirmed_utxos, (elem, i, array) => elem._id == newCoin._id.slice(0, -1))
              //console.log("after remove utxo", multisig.address.confirmed_utxos.length)
            }
            self.utxos = self.$addressUtxos(multisig.address)
            return { multisig }
          }
        })
      }
    }
  },
  provide: function () {
    return { 
      feesHandler: this.feesHandler,
      toggle_utxo: this.toggle_utxo,
      update_selected_utxos: this.update_selected_utxos,
      set_use_total_balance: this.set_use_total_balance,
      set_recipients: this.set_recipients, // called when mounting "recipients". this.recipients is always updated.
      set_icon: this.set_icon,
    }
  },
}

</script> 


<style>



</style>



