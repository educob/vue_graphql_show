<template>
  <div style="">

      <!-- address_email_to -->
      <div class="fr-image" style="margin-right:20px">
        <addressEmailFavorite :onlyUsers="onlyUsers" :value="addressEmailTo" :fixedInput="!!fixedInput" />
        <slot name="minus"></slot>
      </div>

      <!-- amount -->
      <div style='display:flex'> 
        <fiatInput :value="amount" :currency_value="currency" :key="updateKey" :fixedInput="!!fixedInput" :hideCurrency="recipient.index > 0"/>
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
import fiatInput from "src/components/fiatInput"

export default {
  data() {
    return {
      recipient: {
        nick: '',
        address: '',
        is_bapp_user: false,
        userId: '',
        amount: null,
        currency: null,
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
    addressEmailTo: String,
    amount: Number,
    currency:  String,
    fixedInput: Boolean,
  },
  components: {
    selectModal,
    addressEmailFavorite,
    fiatInput,
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
    currency(val) {//console.log("recipient watch amount:", val, typeof val)
      if(!val) return
      this.updateKey++
    },
  },
  methods: {
    // recipient compoment
    address_email_to_updated(address_email_to) {
      this.recipient.nick = address_email_to.nick
      this.recipient.address = address_email_to.address
      this.recipient.is_bapp_user = address_email_to.is_bapp_user
      this.recipient.userId = address_email_to.userId
      this.recipient_updated()
    },    // recipient compoment
    update_currency_input(currency) {
      this.recipient.currency = currency
      this.recipient_updated()
    },
    amount_updated(amount, currency) {// console.log("- - - - - recipient amount_updated:", amount, unit)
      this.recipient.amount = amount
      this.recipient.currency = currency
      this.recipient_updated()
    }
  },
  inject: [ 'add_recipient', 'recipient_updated' ],
  provide: function () {
    return {
      address_email_to_updated: this.address_email_to_updated,
      amount_updated: this.amount_updated,
      update_currency_input: this.update_currency_input,
    }
  },
}

</script>