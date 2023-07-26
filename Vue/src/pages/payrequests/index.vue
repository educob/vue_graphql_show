<template>
<div id="board_no_headers">

  <!---------- Left panel ---------->
  <div class="panel" id="left_panel" style="position:relative">
    <span class="title" style="padding:10px">{{ $t("My Payment Requests") }}</span>
    <div v-if="!!payrequests && !!payrequests.length">
      <payrequests :payrequests="payrequests" />
    </div>
    <div v-else style="margin-top:40px">
      <img src="statics/img/empty_box.svg" width="100" height="100" class="center lightblue"/>
    </div>
      <!-- + button -->
      <div style="height:95px">
      <div @click="newpayrequestDialog='block'" class="button" style="position:absolute;bottom:5px;height:55px">
        <img src="statics/img/plus.svg" width="25" height="25" style="margin-top:10px;margin-right:-8px" />
        <img src="statics/img/paymentrequest.svg" width="40" height="40"/>
        <span class="text" style="margin-right:15px;margin-top:10px">{{ $t("New Pay Request") }}</span>
      </div>
    </div>
  </div>

  <!------------ right panel ------------>
  <div class="panel" id="right_panel" >
    <plans @new="newpayrequestDialog='block'" />
  </div>

  <!-- New payrequest dialog -->
  <div class="dialog" :style="{ display: newpayrequestDialog }" >
    <div class="dialog-content"  style="padding-left:40px;padding-right:40px">
      <div style="display:flex;margin-bottom:20px">
        <q-icon name="img:statics/img/paymentrequest.svg" size="md" class="lightblue" />
        <span class="title1" >{{ $t("New Pay Request") }}</span>
      </div>

      <!-- Title -->
      <div style="margin:0 5px 10 0px">
        <q-input v-model="title" :label="$t('Title')" dense  style="width:350px" autofocus :style="{ backgroundColor: $no_empty(title) }" />
      </div>

      <!-- label -->
      <div style="margin:0 5px 0 0px">
        <q-input v-model="label" :label="$t('Label')" dense  style="width:350px"  :style="{ backgroundColor: $no_empty(label) }" />
      </div>

      <!-- payer -->
      <div style="margin-bottom:10px;margin-top:10px">
        <span class="title2" style="margin-left:0px">{{ $t("Bapp_user_paying_payrequest", { name: $app_name() }) }}</span>
        <recipient :onlyUsers="true" style="margin-bottom:4px;margin-top:10px;max-width:350px" :key="update_key" />
      </div>

      <!-- recipient address -->
      <div style=':5px;margin-bottom:0px' class="click">  <!-- show wallet/address selector -->
        <span class="title2" style="margin-left:0">{{ $t("Receiving Address") }}</span>
        <div style="display:flex">
          <img @click="walletsModal.dialog=true" src="statics/img/qrcode.svg" class="lightblue " width="20" height="20"/>
          <q-tooltip><span>{{ $t("Receiving Bitcoin Address") }}</span></q-tooltip>
          <q-input v-model="pay2address" :label="$t('Receiving Bitcoin Address')" :style="{ backgroundColor: $no_empty(pay2address) }"
                  style=";min-width:300px" dense />
        </div>
      </div>

      <!-- create button -->
      <div class="button" @click="save" style="display:flex;margin-top:35px;margin-left:10px" >
        <img src="statics/img/paymentrequest.svg" width="30" height="30"/>
        <span class="vcenter" style="margin-left:10px;margin-right:10px">{{ $t("Send") }}</span>
      </div>

    </div>
  </div>

  <!-- pay2address payrquest -->                 <!-- remove :dialgo -->
  <selectWalletAddress v-if="walletsModal.dialog" :asDialog="true" @addressSelected="addressSelectedHandler" :wallets="$store.getters['user/wallets']" 
            @close="walletsModal.dialog=false" />

</div>
</template>

<script>
import Vue from 'vue'
import gql from 'graphql-tag'
import selectEntry from 'src/components/selectEntry'
import plans from 'src/components/plansOverview'
import recipient from 'src/components/recipient'
import selectWalletAddress from 'src/components/selectWalletAddress'
import send_btn from 'src/components/send_btn'
import { send } from 'src/mixins/send'
import payrequests from 'src/components/payrequests'

export default {
  data() {
    return {
      valid: false,
      title: '',
      label: '',
      recipient: {},
      payerId: '',
      pay2address: '',
      satoshis: 0,
      noEmpty: [ v => !!v || this.$t("Field required") ],
      walletsModal: { title:"Select Recipient Address", subtitle:"", buttons:this.$store.getters['misc/close_button'], dialog:false },
      module: 'payrequest',
      newpayrequestDialog: 'none',
      subscribed: {},
      update_key: 0,
    }
  },
  components: {
    selectWalletAddress,
    recipient,
    selectEntry,
    plans,
    payrequests,
    send_btn,
  },
  mixins: [send],
  watch: {
    /*recipient:  {
      handler: function (val) {// console.log("index payrequest recipient val:", val)
        this.recipientsFormValid = false
        if(!!val.address && !!val.satoshis)
          this.recipientsFormValid = true
      },
      deep: true
    },*/
  },
  computed: {
    alerts() {
      return this.$store.getters['user/alerts']
    },
  },
  beforeMount() {
    const self = this
    this.onEsc = function() {
      if(!!self.walletsModal.dialog) return
      self.newpayrequestDialog = 'none'
      self.update_key++
    }
    this.$root.$on('esc', this.onEsc)
    // new event
    this.onNew = function() {
      self.newpayrequestDialog = 'block'
    }
    this.$root.$on('new', this.onNew)
  },
  beforeDestroy() {
    this.$root.$off('esc', this.onEsc)
    this.$root.$off('new', this.onNew)
  },
  mounted() {
    if(!!this.$route.params.new) this.newpayrequestDialog = 'block'
  },
  methods: {
    save() { console.log("save llmado")
      if(!this.$checkInput(this.title, "please_fill_%", "Title")) return
      if(!this.$checkInput(this.label, "please_fill_%", "Label")) return
      if(!this.recipientsFormValid) {
        this.$toastError("please_fill_%", { name: 'Payer' })
        return
      }
      if(!this.$isAddress(this.pay2address, this.$bitcoin_network())) {
        this.$toastError("please_fill_%", { name: 'Address' })
        return
      }
      let addresses = this.recipients.map(r => r.address)
      let satoshis = this.recipients.map(r => r.satoshis)
      if(!!this.donation.satoshis) {
        console.log("this.donation:", this.donation)
        addresses.push(this.$store.getters['misc/donation_address'])
        satoshis.push(this.donation.satoshis)
      }
      this.$apolloClient().mutate({
        mutation: gql`mutation savePayrequest($input: PayrequestInput!) {
          savePayrequest(input: $input) {
            _id
          }
        }`,
        variables: {
          input: {
            title: this.title,
            label: this.label,
            payerId: this.recipient.userId,
            nick: this.recipient.nick,
            satoshis: this.recipient.satoshis,
            pay2address: this.pay2address,
          }
        },
      }).then( ({data}) => {
        this.newpayrequestDialog = 'none'
        this.$go_to("/payrequests")
        this.title=null
        this.label=null
        this.update_key++
      }).catch((error) => {
        console.error("mutation savePayrequest error", error)  // eslint-disable-line no-console
      })
    },
    form_valid() {
      if(!this.title.trim().length) return false
      if(!this.label.trim().length) return false
      if(!this.recipient.address) return false
      if(!this.recipient.satoshis) return false
      if(!this.$isAddress(this.pay2address, this.$bitcoin_network())) return false
      return true
    },
    addressSelectedHandler([wallet, address]) {
      this.walletsModal.dialog = false
      this.pay2address = address._id
      //this.$setUserOpt('change-address', this.pay2address)
    },
    add_recipient(recipient) {
      this.recipient = recipient
    },
    recipient_updated() {
      // no need to do anything. satoshis already here.
    },
  },
  apollo: {
    $client() { return this.$apolloClientName() },
    payrequests: {
      query: gql`query {
        payrequests {
          _id
          title
          label
          userId
          payerId
          nick
          satoshis
          pay2address
          created
          paid
          tx_id
        },
      }`,
      fetchPolicy: 'network-only',
      result({ data, loading, networkStatus }) { 
        const self = this
        if(!data.payrequests) return
        if(this.subscribed['payrequests']) { console.log("result data:", data); return }
        this.subscribed['payrequests'] = true
        this.$store.commit('user/payrequests', this.$clone(data.payrequests))
        this.$apollo.queries.payrequests.subscribeToMore({ // NEW Pay Request
          document: gql`subscription ($userId: String!) {
            newPayrequest(userId: $userId) {
              _id
              title
              label
              userId
              payerId
              nick
              satoshis
              pay2address
              created
              paid
              tx_id         
            }
          }`,
          variables: {
            userId: self.$userId()
          }, // newPayrequest
          updateQuery: ( { payrequests }, { subscriptionData }) => { 
            const newPayrequest = subscriptionData.data.newPayrequest
            console.log("updateQuery newPayrequest:", newPayrequest)
            const pos = payrequests.findIndex(pay => pay._id == newPayrequest._id)
            if(pos == -1) { // new. add at the beginning
              payrequests.splice(0, 0, newPayrequest)
            } else { // replace
              payrequests.splice(pos, 1, self.$mergeObjs(payrequests[pos], newPayrequest))
            }
            self.$store.commit('user/payrequests', self.$clone(payrequests))
            console.log("end of updateQuery")
            return { payrequests }
          },
        }) // payrequestDeleted
        this.$apollo.queries.payrequests.subscribeToMore({ 
          document: gql`subscription payrequestDeleted($userId: String!) {
            payrequestDeleted(userId: $userId) {
              _id
            }
          }`,
          variables:{
            userId: self.$userId()
          }, // payrequestDeleted
          updateQuery: ( { payrequests }, { subscriptionData }) => {
            const payrequestDeleted = subscriptionData.data.payrequestDeleted
            console.log("updateQuery payrequestDeleted:", payrequestDeleted)
            if(!!payrequestDeleted._id) {
              console.log("payrequests before: ", payrequests.length)
              payrequests = payrequests.filter( p => p._id != payrequestDeleted._id)
              console.log("payrequests after: ", payrequests.length)
            }      
            self.$store.commit('user/payrequests', payrequests)
            return { payrequests }
          },
        }) // payrequest paid
        this.$apollo.queries.payrequests.subscribeToMore({ 
          document: gql`subscription payrequestPaid($userId: String!) {
            payrequestPaid(userId: $userId) {
              _id
              tx_id
              paid
            }
          }`,
          variables: {
            userId: self.$userId()
          }, // payrequest paids
          updateQuery: function( { payrequests }, { subscriptionData } )  {
            const payrequestPaid = subscriptionData.data.payrequestPaid
            console.log('payrequestPaid:', payrequestPaid)
            const payrequest = payrequests.find((elem, i, array) => elem._id == payrequestPaid._id)
            payrequest.tx_id = payrequest.tx_id
            payrequest.paid = payrequestPaid.paid
            self.$store.commit('user/payrequests', self.$clone(payrequests))
            return { payrequests }
          },
        })
      },
    },
  },
  provide: function () {
    return { 
      add_recipient: this.add_recipient,
      recipient_updated: this.recipient_updated,
      toggle_use_total_balance: null,
      set_use_total_balance: null,
    }
  },
}
</script>

<style>

</style>