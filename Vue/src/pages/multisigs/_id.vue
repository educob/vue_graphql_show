<template>
  <div v-if="multisig" id="board_single_header">
    <div id="buttons">
      <!-- left button -->

      <!-- middle button -->
      <div v-if="!!multisig.address && multisig.address.balance"  @click="go_to_send()" class="button" id="right_btn"  >
        <img src="statics/img/send.svg" width="25" height="25" />
        <div>
          <span>{{ $t("Send BTC") }}</span>
        </div>
      </div>
      <send_btn v-else id="right_btn" />

    </div>
    <!---------- Header ---------->
    <div class="header" id="header" >
      <img class="logo" :src="item_icon" />
      <div class="rows" style="width:fit-content">
        <!-- multisig name, edit -->
        <span style="color:gray;font-size:20px"> {{ multisig.name }} </span>
        <div v-if="multisig.address" style="display:flex" class="hcenter">
          <span class="amount" style="font-size:20px;">{{ multisig.address.balance | formatSatoshis }}</span> 
          <span v-if="!!multisig.address.unconfirmedBalance" class="amount" style="font-size:16px">({{ multisig.address.unconfirmedBalance | formatSatoshis }})</span>
        </div>
        <div v-if="multisig.address && $fiat()" style="display:flex" class="hcenter">
          <span class="fiat" style="color:gray;font-size:20px">{{ multisig.address.balance | formatFiat($fiat(), true)}}</span>
          <span v-if="!!multisig.address.unconfirmedBalance" class="fiat" style="color:gray;font-size:16px">({{ multisig.address.unconfirmedBalance | formatFiat($fiat(), true)}})</span>
        </div>
      </div>
    </div>

    <!---------- Left panel ---------->
    <div class="panel" id="left_panel" >
      <span class="title" style="margin-top:10px">{{ item_desc }}:</span></br>
      <span class="title1">{{ multisig.name }}</span><br/>
      <span class="title2" style="margin-left:0px">{{ $t("Signers") }}:</span>
      <span class="title1">{{ $t("%_of_%", { m: multisig.M, n: multisig.N }) }}</span>
      <!-- signers / pubkey -->
      <q-list v-if="!multisig.scriptAddressId" >
        <q-item class="signers_h card highlight" >
          <span class="align_left vcenter">Signer</span>
          <span class="align_left vcenter">{{ $t("Wallet Pending") }}</span>
          <span class="vcenter" style="text-align: right;margin-right:10px">{{ $t("Added") }}</span>
        </q-item>
        <q-item v-for="(signer, i) in multisig.signers" :key="signer.userId" class="signers card">
          <span class="vcenter" style="padding-top:5px">{{ signer.nick }}</span>
          <div v-if="isSigner(signer.userId) && !signer.addressId" class="vcenter">
            <q-btn flat dense color="primary" @click="openSelectedAddressDialog(i)" icon="mdi-key" />
            <span>{{ $t("Wallet Pending") }}</span>
          </div>
          <div v-else-if="!signer.addressId" class="vcenter">
            <q-btn flat disable dense  color="gray" icon="mdi-key" />
            <span>{{ $t("Wallet Pending") }}</span>
          </div>
          <span v-else />
          <q-icon v-if="!!signer.addressId" color="green" name="mdi-check-circle" size="sm" class="vcenter" />
        </q-item>
      </q-list>

      <!-- multisig address -->
      <div v-if="multisig.scriptAddressId" style="display:flex;margin-top:5px;margin-left:-10px">
        <q-btn round v-clipboard:copy="multisig.scriptAddressId" flat color="primary" icon="mdi-content-copy" />
        <span style="color:gray;font-size:0.9em">{{ multisig.scriptAddressId }}</span>
      </div>
      <!-- qr code -->  
      <div v-if="multisig.scriptAddressId" style="display:flex;justify-content:center" >
          <qrcode :value="multisig.scriptAddressId" style="" />
      </div>

      <!-- payments list ************************************ -->
      <div v-if="multisig.payments.length" style="margin-top:25px" >
        <!-- header -->
        <div class="card payment highlight">
          <div class="rows">
            <span style="color:var(--light-blue)">{{ $t("Amount") }}</span>
            <span style="color:gray">{{ $t("Status") }}</span>
          </div>
          <div> <!-- extra div or the nested div is on the center -->
            <div class="rows">
              <span>{{ $t("Recipients") }}</span>
              <span style="color:gray">{{ $t("Icon") }} {{ $t("Concept") }}</span>
            </div>
          </div>
          <div class="rows">
            <span class="created">{{ $t("Date") }}</span>
            <span style="color:gray">{{ $t("Signers") }}</span>
          </div>
        </div>
        <!-- rows -->
        <div v-for="pay in multisig.payments" :key="pay._id" class="payment card">
          <div class="rows">
            <span style="color:var(--light-blue);" class="vcenter">{{ pay.satoshis | formatSatoshis }}</span>
            <q-icon v-if="pay.broadcasted" color='green' name="mdi-earth" size="sm" />
            <img v-else class="click vcenter" @click="delete_payment1(pay)" src="statics/img/bin_red.svg" width="25" height="25" style=";filter:none" />
          </div>
          <!-- column 2: nicks / icon-concept -->
          <div class="ellipsis">
            <div class="rows">
              <span v-if="pay.nicks && pay.nicks.length==1" v-html="pay.nicks[0]" tyle="font-size:0.9em;"/> 
              <div v-else>  
                <tooltip :text="pay.nicks" />
              </div>
              <div style="display:flex">
                <img v-if="!!pay.icon" :src="`statics/svg/${pay.icon}`" width="25" height="25" style="filter:none"/>
                <span class="vcenter" style="margin-left:5px"> {{ pay.concept }}</span>
              </div>
            </div>
          </div>
          <!-- column 3 -->
          <div class="rows">
            <span style="color:#B676B1;font-size:0.9em" class="vcenter">{{ pay.created | formatDate }}</span>
            <!-- button with menu with signers -->
            <q-btn dense :color="pay.broadcasted ? 'green' : 'blue'"  size="12px" style="padding-left:15px;padding-right:15px">
              <span style="white-space:nowrap">{{ $t("% Signers", { signers: signedCount(pay) } ) }} </span>
              <q-menu>
                <q-list>
                  <q-item :disabled="!!pay.broadcasted || disableMenu(signer, pay)" v-for="(signer, i) in multisig.signers" :key="i" @click.native="signPayment1(signer, pay)" 
                                  :class="!!pay.broadcasted ? '' : 'click'">
                    <div  style="display:grid;grid-template-columns:25px 1fr">
                      <div style="margin-left:0px" class="vcenter">
                        <img v-if="!pay.broadcasted && isSigner(signer.userId) && !hasSigned(signer, pay)" class="lightblue" src="statics/img/signing.svg" width="20" height="20" /> 
                        <q-icon v-if="hasSigned(signer, pay)" color="green" name="mdi-check-circle" size="sm" />                   
                      </div>
                      <span>{{ signer.nick }}</span>
                    </div>
                  </q-item>
                </q-list>
              </q-menu>
            </q-btn>
          </div>     
        </div>
        <!-- footer -->
        <div class="card coin highlight"  style="margin-bottom:15px">
          <div></div>
          <div class="vcenter" >
            <span>{{ $t("Showing % Transactions", { txs: multisig.payments.length }) }}</span>
          </div>
          <div v-if="show_load_more" >
          <!--  <span style="margin-right:10px">{{ $t("More") }}</span>
            <q-btn round color="primary" @click="$emit('showMore')  " icon="mdi-fast-forward" size="sm" /> -->  
          </div>
        </div>
      </div>


    </div>

      <!------------ right panel ------------>
      <div id="right_panel">
        <!-- coins -->
        <coinList v-if="multisig.address && multisig.address.coins.length" :coins="multisig.address.coins" :show_load_more="show_load_more && multisig.address.coins.length >= pagesize"
                    @showMore="showMore()" />
      </div>


    <!-- confirm signing -->
    <selectModal :prop="modal" @selectionDone="signPayment2" @close="modal.dialog=false">
      <q-input v-model="passphrase" :label="$t('Wallet Password')" autofocus style="max-width:400px"
                    :type="showpassphrase ? 'text' : 'password'" >
        <template v-slot:after> 
            <q-icon :name="showpassphrase ? 'visibility_off' : 'visibility'" class="cursor-pointer" @click="showpassphrase ^= true" />
        </template>
      </q-input>
    </selectModal>

    <!-- delete payment dialog-->
    <selectModal :prop="delete_modal" @selectionDone="delete_payment2" @close="delete_modal.dialog=false" />

    <addPubkey v-if="dialog" :scriptName="'addr_desc: ' + multisig.name" @walletSelected="msig_set_pubkey" @close="dialog=false" />


  </div>
</template>

<style scoped>

.payment {
  display: grid;
  grid-template-columns: 80px 1fr 110px; 
}

.signers {
  display: grid;
  border: 1px solid #ddd;
  grid-template-columns: 120px 5fr 30px;
}

.signers_h {
  display: grid;
  border: 1px solid #ddd;
  grid-template-columns: 120px 5fr 80px;
}

.signers .align_left {
  text-align: left;
}


</style>

<script>
import Vue from 'vue'
import addPubkey from 'src/components/addPubkey'
import selectModal from 'src/components/Modal'
let bitcoin = require('bitcoinjs-lib')
let bip39 = require('bip39')
let bip32 = require('bip32')
import gql from 'graphql-tag'
import recipients from 'src/components/recipients'
import tooltip from "src/components/tooltip.vue"
import coinList from 'src/components/coinList'
import { Decimal } from 'decimal.js'
import { send } from 'src/mixins/send'
import send_btn from 'src/components/send_btn'

export default {
  name: 'MultiSig',
  data() {
    return {
      updateKey: 0, // refreshes components
      utxos: [],
      sendingamount: 0,
      totalSelected: 0,
      is_use_total_balance_active: false,
      manual_utxo_selection: false,
      dialog: false,
      selectedRow: 0,
      // payments
      payheaders: [
        { name: 'satoshis', sortable: false, width:"20%" },
        { name: 'concept',  align: 'left', sortable: false, width:"65%"},
        { name: 'created',  align: 'right', sortable: false, width:"15%" },
      ],
      recipients: [],
      valid: false,
      noEmpty: [ v => !!v || this.$t("Ficred") ],
      total_fee: 0,
      concept: '',
      icon: 0,
      tx_bytes: 0,
      // modalDialog
      modal: { title:"confirm_signing", subtitle:'by_signing_you_accept_sending', buttons:this.$store.getters['misc/yes_no_buttons'], dialog:false },
      delete_modal: { title:"confirm_del_pay", subtitle:'', buttons:this.$store.getters['misc/yes_no_buttons'], dialog:false },
      deletePay: null,
      signPubkey: {}, // saved for post Modal confirmation
      signPay: {},     // idem
      passphrase: '',
      showpassphrase: 'false',
      page: 0,
      pagesize: 15,
      show_load_more: true,
      addressSubscribed: false,
      module: 'multisig',
    }
  },
  mixins: [send],
  components: {
    addPubkey,
    selectModal,
    recipients,
    tooltip,
    coinList,
    send_btn,
  },
  mounted() {    
    //this.$toastAlerts(this.$route.params.id)
  },
  beforeDestroy() {
    this.$apollo.queries.multisig.stop()
  },
  watch: {
    'multisig.address'(val) {
      const self = this
      //console.log("watch multisig.address")
      this.utxos = this.$addressUtxos(val)
      if(!val || this.addressSubscribed) return
      this.addressSubscribed = true
       // newCoin
      this.$apollo.queries.multisig.subscribeToMore({
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
          scriptId: val._id,      
        }, // newCoin
        updateQuery: ( { multisig }, { subscriptionData }) => {// console.log("multisig:", multisig)
          const self = this
          const newCoin = subscriptionData.data.newCoin
          //console.log("multisig._id newCoin:", newCoin)
          newCoin.__typename = "Coin"
          newCoin.pending_payment = null
          //console.log('newCoin in multisig.Id', newCoin)
          if(!!newCoin.addressConfirmedBalance || !!newCoin.addressUnconfirmedBalance) {
            Vue.set(multisig.address, 'balance', newCoin.addressConfirmedBalance)
            Vue.set(multisig.address, 'unconfirmedBalance', newCoin.addressUnconfirmedBalance)
          } 
          // coins
          if(!!multisig.address.coins.length) { 
            let pos
            if(self.$userSetting('group-utxos-by-tx'))
              pos = multisig.address.coins.findIndex(coin => coin.tx == newCoin.tx)
            else
              pos = multisig.address.coins.findIndex(coin => coin._id == newCoin._id)
            //console.log("previous coin pos:", pos, this.$userSetting('group-utxos-by-tx'))
            if(pos == -1) { // add at the beginning
              Vue.set(multisig.address, 'coins', [newCoin, ...multisig.address.coins] )
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
            //console.log("confirmed utxo -> upsert")
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
            Vue.prototype.$arrayUpsert(multisig.address.confirmed_utxos, utxo, (elem, i, array) => elem._id == newCoin._id)
          } else { // spent(unconfirmed or confirmed) -> remove
            let confirmed_utxos = multisig.address.confirmed_utxos.filter( utxo => utxo._id != newCoin._id.slice(0, -1))
            Vue.set(multisig.address, "confirmed_utxos", confirmed_utxos)
          }
          return { multisig }       
        },
      })
    },
  },
  created() {
  },
  computed: {
    alerts() {
      return this.$store.getters['user/alerts']
    },
    multisigs() {
      return this.$store.getters['user/multisigs']
    },
    available_funds() {
      if(!this.multisig.address) return 0
      return this.multisig.address.confirmed_utxos.reduce((balance, utxo) => balance + utxo.value, 0)
    },
    item_icon() {
      if(!!this.multisig.thirdpartyUserId) return 'statics/img/escrow.svg'
      return 'statics/img/multisig.svg'
    },
    item_desc() {
      if(!!this.multisig.thirdpartyUserId) return this.$t("My Escrow")
      return this.$t("My Joint Wallet")
    },
    addr_desc() {
      if(!!this.multisig.thirdpartyUserId) return this.$t("Escrow")
      return this.$t("Joint Wallet")
    },
  },
  methods: {
    go_to_send() {
      if(!this.multisig.address || !this.multisig.address.balance) {
        this.$toastError('There are no available funds in this Join Wallet')
        return
      }
      if(!this.available_funds) {
        this.$toastError('There are no available funds in this Join Wallet')
        this.$toastError('There might be pending payments')
        return
      }
      this.$go_to(`/multisigs/send/${this.$route.params.id}`)
    },
    async msig_set_pubkey(address) { // signer links address. called by emit event in selectAddress component
      console.log(" address._id:",  address._id)
      this.dialog = false
      this.multisig.signers[this.selectedRow].addressId = address._id
      // set pubkey
      const msigId = this.multisig._id
      console.log("msigId:", msigId)
      const data = await this.$apolloClient().mutate({
        mutation: gql`mutation multisigSetPubkey($multisigId: ID!, $addressId: String!) {
          multisigSetPubkey(multisigId: $multisigId, addressId: $addressId)
        }`,
        variables: {
          multisigId: msigId,
          addressId: address._id,
        },
      }).then(({data}) => data.multisigSetPubkey)
      if(!data) {} // error
      console.log("data.multisigSetPubkey:", data)
    },
    // signPayment2
    async signPayment2(btnIndex) { 
      const self = this
      this.modal.dialog = false
      if( (this.passphrase.length && this.passphrase.length == 0) || btnIndex == 1) return // empty pass or option "No" selected.
      let pay = this.signPay // saved previously by signPayment1 function (below)
      console.log("pay:", pay)
      let signer = this.signPubkey // saved previously by signPayment1 function (below)
      console.log("signerrrrr:", signer)
      let data = await this.$apolloClient().query({
        query: gql`query ($_id: String!) {
          address(_id: $_id) {
            _id
            index
            wallet {
              _id
              mnemonic
              path
              created
            }
          }
        }`,
        variables: {
          _id: signer.addressId
        },
      }).then( ({data}) => data.address )
      //console.log("data.wallet:", data.wallet)      
      const keyPair = this.$getAddressKeypair(data.wallet, data.index, this.passphrase)
      let psbt = bitcoin.Psbt.fromBase64(pay.tx)
      psbt.signAllInputs(keyPair)
      const signature = psbt.toBase64()
      const signedCount = this.signedCount(pay) // don't move from this line
      console.log("signedCount:", signedCount)
      this.$apolloClient().mutate({
        mutation: gql`mutation multisigPaymentSign($multisigId: ID!, $msigpayId: ID!, $signer: SignerInput!) {
          multisigPaymentSign(multisigId: $multisigId, msigpayId: $msigpayId, signer: $signer) {
            signedOk
            tx_id
          }
        }`,
        variables: {
          multisigId: pay.multisigId,
          msigpayId: pay._id,
          signer: { userId: signer.userId, nick: signer.nick, signature },
        },
      }).then( ( { data } ) => {
        const result = data.multisigPaymentSign
        console.log("multisigPaymentSign result:", result)
        if(!!result.signedOk)
          this.$toastSuccess('Operation successful')
        // payment sent
        if(!!result.tx_id) {
          self.$toast.success("Payment sent!")
          const multisig = self.multisig
          const multisigId = multisig._id
          console.log("multisig:", multisig, multisigId)
          // delete & create alerts
          let usersId = new Set() // uses a set so usersId repeated are not handled twice
          multisig.signers.forEach( async function(signer, i) { // check that every row has userId
            if(!usersId.has(signer.userId)) { 
              //await self.$deleteAlert(multisigId, 3)
              //await self.$deleteAlert(multisigId, 2)
              await self.$newAlert(signer.userId, 4, multisig._id, multisig.name)
              usersId.add(signer.userId)
            }
          })
          console.log("multisig _id related payment:", pay)
          self.$postprocess(pay.collection, result.tx_id, JSON.parse(pay.data))
        }

        // ALERTS
        /*let usersId = new Set() // a set removes repeated usersId
        this.multisig.signers.forEach((signer, i) => {
          if(!usersId.has(signer.userId)) {
            if(signer.userId != this.$store.getters['user/_id'])
              this.$newAlert(signer.userId, 3, this.multisig._id, this.multisig.name, this.$store.getters['user/nick'], pay._id)             
            usersId.add(signer.userId)
          }
        })*/
        // send payment
        //console.log("this.multisig.M:", this.multisig.M, "signedCount:", signedCount)
        /*if(this.multisig.M == signedCount + 1 ) { // payment signed => send. "-1" cause we haven't add ed the signer yet (in subscription)
          //console.log("has all signaturess - ----------------------------------------------------")
          //console.log("recreating psbt to send payment")
          psbt = bitcoin.Psbt.fromBase64(pay.tx);
          const signatures = pay.signers.filter(s => !!s.signature).map(s => bitcoin.Psbt.fromBase64(s.signature))
          psbt.combine(...signatures, bitcoin.Psbt.fromBase64(signature))
          //console.log("finalizing all inputs")
          psbt.finalizeAllInputs();
          //console.log("creating tx for broadcasting")
          const tx = psbt.extractTransaction()
          const size = tx.virtualSize()
          console.log("real tx virtualSize:", size)
          const tx_id =  tx.getId() // save to db.
          // build and broadcast to the Bitcoin RegTest network
          const tx_hex = tx.toHex()
          //console.log("pay._id:", pay._id )
          this.$apolloClient().mutate({
            mutation: gql`mutation broadcastTx($tx_id: String!, $tx_hex: String!, $txextrainfo: TxExtraInfo!, $collection: String, $scriptId: ID, $pay_id: ID) {
              broadcastTx(tx_id: $tx_id, tx_hex: $tx_hex, txextrainfo: $txextrainfo, collection: $collection, scriptId: $scriptId, pay_id: $pay_id)
            }`,
            variables: {
              tx_id,
              tx_hex,
              txextrainfo: { concept: pay.concept, icon: pay.icon, nicks: pay.nicks, sender: pay.sender },
              collection: 'msigpayment',
              scriptId: pay.multisigId,
              pay_id: pay._id,
            },
          }).then( async function({data}) {
            self.$toast.success("Payment sent!")
            const multisig = self.multisig
            const multisigId = multisig._id
            console.log("multisig:", multisig, multisigId)
            // delete & create alerts
            let usersId = new Set() // uses a set so usersId repeated are not handled twice
            multisig.signers.forEach( async function(signer, i) { // check that every row has userId
              if(!usersId.has(signer.userId)) { 
                //await self.$deleteAlert(multisigId, 3)
                //await self.$deleteAlert(multisigId, 2)
                await self.$newAlert(signer.userId, 4, multisig._id, multisig.name)
                usersId.add(signer.userId)
              }
            })
            console.log("multisig _id related payment:", pay)
            self.$postprocess(pay.collection, tx_id, JSON.parse(pay.data))
          }).catch((error) => {
            self.$toast.error("Payment error!")
            console.log("error broadcastTx:", error)
          }) 
        }*/
      }).catch((error) => {
        console.error("mutation broadcastTx error", error)  // eslint-disable-line no-console
      })
    },
    signPayment1(signer, pay) { // show confirmation window -> sign2 above
      if(pay.broadcasted) return
      if(signer.userId != this.$userId() || this.isSigner(!signer.userId) || !!this.hasSigned(signer, pay)) return 
      this.signPubkey = signer
      this.signPay = pay
      this.modal.dialog = true
    },
    delete_payment1(pay) {
      this.deletePay = pay
      this.delete_modal.dialog = true
    },
    delete_payment2(btnIndex) {
      this.delete_modal.dialog = false
      if(btnIndex == 1) return // option "No" selected.
      let pay = this.deletePay // saved previously by signPayment1 function (below)

      this.$apolloClient().mutate({
        mutation: gql`mutation deleteMultisigPayment($multisigId: ID!, $msigpayId: ID!) {
          deleteMultisigPayment(multisigId: $multisigId, msigpayId: $msigpayId)
        }`,
        variables: {
          multisigId: this.multisig._id,
          msigpayId: pay._id
        },
      }).then( ({data}) => {
        //console.log("deleteMultisigPayment result:", data.deleteMultisigPayment)
        const msigpayId = data.deleteMultisigPayment
        // Alerts
        /*if(!msigpayId) {} // gestion error !!!
        let usersId = new Set( this.multisig.signers.map(s => s.userId) ) // uses a set so usersId repeated are not handled twice
        usersId.add(this.multisig.creatorId) // in case creator is not signer
        usersId.forEach( userId => {
          this.$newAlert(userId, 5, this.multisig._id, this.multisig.name)             
        })*/
      }).catch((error) => {
        console.error("mutation deleteMultisigPayment error", error)  // eslint-disable-line no-console
      })
    },
    disableMenu(signer, pay) { // when not allow to sign a transaction
      if(signer.userId != this.$store.getters['user/_id']) return true
      return this.hasSigned(signer, pay)
    },
    hasSigned(signer, pay) {
      return pay.signers && pay.signers.some((s) => s.userId == signer.userId)
    },
    signedCount(pay) { // how many signers have signed
      if(pay.signers) return pay.signers.length
      return "0"
    },
    isSigner(signerId) {
      return this.$store.getters['user/_id'] == signerId;
    },
    hasPubkey(n) {
      return !!this.multisig.signers[n].addressId // true unless: null undefined 0 "" (the empty string) false NaN
    },
    openSelectedAddressDialog(row) {
      if(!this.$store.getters['user/defaultAddress']) {
        this.$toastError("You haven't created a wallet yet!")
        return
      }
      console.log("openSelectedAddressDialog")
      this.selectedRow = row
      this.dialog = true
    },
    showMore () {
      this.page++
      // Fetch more data and transform the original result
      this.$apolloClient().queries.multisig.fetchMore({
        variables: {
          _id: this.$route.params.id,
          paging: { page: this.page, pagesize:this.pagesize }
        },
        // Transform the previous result with new data
        updateQuery: ( { multisig }, { fetchMoreResult } ) => {
          const more_coins = fetchMoreResult.multisig.address.coins
          //console.log("more_coins:", more_coins)
          if(!more_coins.length || more_coins.length < this.pagesize) this.show_load_more = false
          more_coins.forEach( c => {
            const pos = multisig.address.coins.findIndex((elem, i, array) => elem._id == c._id)
            if(pos == -1) 
              multisig.address.coins.push(c)
          })
          return { multisig }
        },
      })
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
          thirdpartyUserId
          creatorId
          scriptAddressId
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
              pending_payment
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
            sender
            created
            multisigId
            broadcasted
            tx
            signers {
              userId
              nick
              signature
            }
            collection
            data
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
      subscribeToMore: [
        { // newMultisigPayment
          document: gql`subscription newMultisigPayment($multisigId: ID!) {
            newMultisigPayment(multisigId: $multisigId) {
              _id
              satoshis
              concept
              icon
              nicks
              sender
              utxos {
                _id
                utxo_tx
              }
              created
              multisigId
              broadcasted
              tx
              signers {
                userId
                nick
              }
              collection
              data
            }
          }`,
          variables() {
            return {
              multisigId: this.$route.params.id,
            }
          },
          fetchPolicy: 'network-only', // newMultisigPayment
          updateQuery: function( { multisig }, { subscriptionData })  { console.log("multisig.address.coins:", multisig.address.coins)
            const newMultisigPayment = subscriptionData.data.newMultisigPayment
            console.log('newMultisigPayment subscriptionData.data.newMultisigPayment', newMultisigPayment)
            if(multisig.payments) {
              const pos = multisig.payments.findIndex(pay => pay._id == newMultisigPayment._id)
              if(pos == -1) { // add at the beginning
                multisig.payments.splice(0, 0, newMultisigPayment)
              } else { // replace
                multisig.payments.splice(pos, 1, newMultisigPayment)
              }
            } ; console.log("0 0 00 0 ", newMultisigPayment.utxos)
            newMultisigPayment.utxos.forEach ( u => {
              console.log("----------------------- utxo:", u) // payment utxos
              let coin
              if(this.$userSetting('group-utxos-by-tx'))
                coin = this.$arrayFind(multisig.address.coins, (elem, i, array) => elem.tx == u.utxo_tx)
              else
                coin = this.$arrayFind(multisig.address.coins, (elem, i, array) => elem._id == u._id)
              if(!!coin) {
                //console.log("coin:", coin)
                //console.log("newMultisigPayment:", newMultisigPayment)
                Vue.set(coin, 'pending_payment', newMultisigPayment._id)
              } else { console.log("coin not found in showing list")}
              // remove utxo from payment's utxos
              this.$arrayRemove(multisig.address.confirmed_utxos, (elem, i, array) => elem._id == u._id)
            })
            this.utxos = this.$addressUtxos(this.multisig.addres)
            return { multisig }
          },
        },
        { // paymentDeleted
          document: gql`subscription paymentDeleted($scriptId: ID!) {
            paymentDeleted(scriptId: $scriptId) {
              paymentId,
              freed_utxos {
                _id # database id
                utxo_tx
                utxo_n
                utxo_time
                utxo_concept
                utxo_icon
                value
              }
            }
          }`,
          variables() {
            return {
              scriptId: this.$route.params.id,
            }
          }, // paymentDeleted
          updateQuery: function( { multisig }, { subscriptionData }) {
            console.log("previousResult:", multisig)
            console.log('paymentDeleted subscriptionData.data.paymentDeleted', subscriptionData.data.paymentDeleted)
            const paymentDeleted = subscriptionData.data.paymentDeleted
            // remove payment
            Vue.set(multisig, 'payments', multisig.payments.filter( pay => pay._id != paymentDeleted.paymentId) )
            // remove coin.pending_payment
            multisig.address.coins.forEach( coin => { // add to coinList
              console.log("  coin.pending_payment:", coin.pending_payment)
              console.log("paymentDeleted.paymentId:", paymentDeleted.paymentId)
              if(coin.pending_payment == paymentDeleted.paymentId) {
                console.log("coin with pending payment:", paymentDeleted.paymentId)
                Vue.set(coin, 'pending_payment', null)
              }
            })
            for(const utxo of paymentDeleted.freed_utxos) { // add freed_utxos
              multisig.address.confirmed_utxos.push( utxo )
            }
            this.utxos = this.$addressUtxos(this.multisig.addres)
            return { multisig }
          },
        },
        { // New Address
          document: gql`subscription newAddress($parentId: ID!) {
            newAddress(parentId: $parentId) {
              _id
              name
              balance
              unconfirmedBalance
            }
          }`,
          variables() {
            return {
              parentId: this.$route.params.id,
            }
          },
          updateQuery: ( { multisig }, { subscriptionData }) => {
            console.log("previousResult:", multisig)
            console.log('newAddress subscriptionData.data.newAddress', subscriptionData.data.newAddress)
            Vue.set(multisig, 'scriptAddressId', subscriptionData.data.newAddress._id)
            Vue.set(multisig, 'address', subscriptionData.data.newAddress)
            multisig.address.confirmed_utxos = []
            multisig.address.coins = []
            return { multisig }
          },
        },
        { // scriptPubkeySet
          document: gql`subscription scriptPubkeySet($scriptId: ID!) {
            scriptPubkeySet(scriptId: $scriptId) {
              userId
              addressId
            }
          }`,
          variables() {
            return {
              scriptId: this.$route.params.id,
            }
          },
          updateQuery: ( { multisig }, { subscriptionData }) => {
            const scriptPubkeySet = subscriptionData.data.scriptPubkeySet
            //console.log("previousResult:", multisig)
            console.log('scriptPubkeySet:', scriptPubkeySet)
            multisig.signers.some( s => {
              if(s.userId == scriptPubkeySet.userId) {
                Vue.set(s, 'addressId', scriptPubkeySet.addressId)
                return true
              }
              return false
            })
            return { multisig }
          },
        },
        { // paymentSigned
          document: gql`subscription paymentSigned($scriptId: ID!) {
            paymentSigned(scriptId: $scriptId) {
              userId
              nick
              signedId
              signature
            }
          }`,
          variables() {
            return {
              scriptId: this.$route.params.id,
            }
          }, // paymentSigned
          updateQuery: ( { multisig }, { subscriptionData }) => {
            const paymentSigned = subscriptionData.data.paymentSigned
            //console.log("previousResult:", multisig)
            console.log('paymentSigned:', paymentSigned)
            multisig.payments.some( p => {
              //console.log("p.signers:", p.signers)
              //console.log("p._id:", p._id, "paymentSigned.signedId:", paymentSigned.signedId, "!!p.signers:", !!p.signers)
              if(p._id == paymentSigned.signedId) { // found payment
                if(!p.signers || !p.signers.length) {
                  Vue.set(p, 'signers', [ { __typename: 'Signer', userId: paymentSigned.userId, nick: paymentSigned.nick, signature: paymentSigned.signature } ] )
                } else {
                  const pos = p.signers.findIndex((elem, i, array) => elem.userId == paymentSigned.userId)
                  if(pos == -1) 
                    p.signers.push( { __typename: 'Signer', userId: paymentSigned.userId, nick: paymentSigned.nick, signature: paymentSigned.signature } )
                }
                return true
              }
              return false
            })
            return { multisig }
          },
        },
        {  // tx broadcasted
          document: gql`subscription txBroadcasted($scriptId: ID!) {
            txBroadcasted(scriptId: $scriptId) {
              paymentId,
              freed_utxos {
                _id # database id
                utxo_tx
                utxo_n
                utxo_time
                utxo_concept
                utxo_icon
                value
              }
            }
          }`,
          variables() {
            return {
              scriptId: this.$route.params.id,
            }
          }, // txBroadcasted
          updateQuery: function( { multisig }, { subscriptionData }) {
            //console.log("previousResult:", multisig)
            //console.log('txBroadcasted subscriptionData.data.txBroadcasted', subscriptionData.data.txBroadcasted)
            const txBroadcasted = subscriptionData.data.txBroadcasted
            multisig.payments.some( pay => {
              if(pay._id == txBroadcasted.paymentId) {
                Vue.set(pay, 'broadcasted', true)
                return true
              }
              return false
            })
            multisig.address.coins.forEach( coin => { // add to coinList
              console.log("  coin:", coin)
              if(coin.pending_payment == txBroadcasted.paymentId) {
                console.log("coin with pending payment:", txBroadcasted.paymentId)
                Vue.set(coin, 'pending_payment', null)
              }
            })
            return { multisig }
          }, 
        },
      ],
    },
  },
  provide: function () {
    return { 
      feesHandler: this.feesHandler,
      toggle_utxo: this.toggle_utxo,
      update_selected_utxos: this.update_selected_utxos,
      set_use_total_balance: this.set_use_total_balance,
      set_recipients: this.set_recipients, // called when mounting "recipients". this.recipients is always updated.
    }
  },
}
</script>
