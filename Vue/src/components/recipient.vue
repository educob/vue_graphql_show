<template>
  <div style="">

      <!-- address_email_to -->
      <div class="fr-image" style="margin-right:20px">
        <addressEmailFavorite :onlyUsers="onlyUsers" :value="addressEmailTo" :fixedInput="!!fixedInput" />
        <slot name="minus"></slot>
      </div>

      <!-- amount -->
      <div style='display:flex'> 
        <btcAmount :value="amount" :key="updateKey" :fixedInput="!!fixedInput"  /> <!-- :key="amount" /> -->
        <!-- use_total_balance -->
        <div v-if="!fixedInput && !!set_use_total_balance"  style="margin-top:10px;margin-left:5px;" >
          <q-btn flat dense round @click="toggle_use_total_balance(recipient.index)"  :icon="!recipient.use_total_balance ? 'mdi-radiobox-blank' : 'mdi-radiobox-marked'" :style="!recipient.use_total_balance ? 'color:gray' : 'color:red'" />    
          <span style=";color:gray">Use Total Balance</span>
        </div>
        <q-space />
        <slot name="plusone"></slot>
      </div>

  </div>
</template>

<script>
import gql from 'graphql-tag'
import { sha256 } from "js-sha256"
import selectModal from "./Modal"
import addressEmailFavorite from "./addressEmailFavorite"
import btcAmount from "src/components/btcAmount"

export default {
  data() {
    return {
      recipient: {
        nick: '',
        address: '',
        is_bapp_user: false,
        userId: '',
        amount: null,
        unit: {label:'฿', value:0},
        satoshis: 0,
        use_total_balance: false,
        last_recipient: false,
        index: 0,
      },
      noEmpty: [ v => !!v || this.$t("Field required") ],
      frequent_nick: '',
      frequent_userId: '',
      newFrequentModal: { title:"User\'s Nick", text:"", buttons:this.$store.getters['misc/set_button'], dialog:false },
      current_frequents: [],
      updateKey: 0,
    }
  },
  props: {
    onlyUsers: Boolean,
    amount: Number,
    addressEmailTo: String,
    fixedInput: Boolean,
  },
  components: {
    selectModal,
    addressEmailFavorite,
    btcAmount,
  },
  created() {// console.log(" 7 7 7 7 7 calling add_recipient:", this.recipient)
    this.add_recipient(this.recipient)
  },
  computed: {
    frequents() {
      return this.$store.getters['user/frequent_nicks']
    },
  },
  watch: {
    amount(val) {//console.log("recipient watch amount:", val, typeof val)
      if(!val) return
      this.updateKey++      
    },
  },
  methods: {
    // recipient compoment
    address_email_to_updated(address_email_to) { console.log("update_address_email")
      this.recipient.nick = address_email_to.nick
      this.recipient.address = address_email_to.address
      this.recipient.is_bapp_user = address_email_to.is_bapp_user
      this.recipient.userId = address_email_to.userId
      this.recipient_updated()
    },
    amount_updated(amount, unit) {// console.log("- - - - - recipient amount_updated:", amount, unit)
     console.log("amount_updated")
      if(!!this.use_total_balance) return
      this.recipient.satoshis = this.$toSatoshis(amount, unit.value)
      this.recipient_updated()
    }
  },
  inject: [ 'toggle_use_total_balance', 'add_recipient', 'recipient_updated', 'set_use_total_balance' ],
  provide: function () {
    return {
      address_email_to_updated: this.address_email_to_updated,
      amount_updated: this.amount_updated,
    }
  },
}

</script>