<template v-if="available_funds">
  <div style="padding-left:4px;margin-right:2px"> <!-- bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4 bc1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3qccfmv3 -->    
    <recipient v-for="i in recipientsNum" :key="i" :onlyUsers="onlyUsers"  :amount="!!recipients[i-1] && !!recipients[i-1].amount ? recipients[i-1].amount : 0" 
              :addressEmailTo="!!value && !!value.length ? value[i-1].addressEmailTo : null"  :fixedInput="fixedInput" style="margin-bottom:2px">
      <template #minus>
        <!-- recipient - -->
        <q-btn v-if="!value && i>1 && i == recipients.length" flat round @click.native="removeRecipient(i-1)" color="red" icon="mdi-minus" >
          <q-tooltip>Remove recipient</q-tooltip>
        </q-btn>
      </template>
      <!-- recipient +1 -->
      <template #plusone>
        <q-btn v-if="!value && recipients.length == recipientsNum && recipients[i-1].last_recipient && !!recipients[i-1].address && !!recipients[i-1].satoshis" flat round 
              @click.native="addRecipient" color="primary" style="transform:translate(0px,5px);" icon="mdi-plus-one" >
          <q-tooltip>{{ $t("add_recipient") }}</q-tooltip>
        </q-btn>
      </template>
    </recipient>
    
    <!-- donation -->
    <div v-if="!nodonation" style="height:50px;margin-left:7px">
      <div style="display:flex">
        <q-icon name="img:statics/img/donate.svg" size="sm" style="margin-left:-5px;transform:translate(0px,-10px)" class="lightblue"/>
        <q-input dense v-model="donation.amount" :label="$t('Donation Amount')" style="max-width:100px;margin-left:10px;;transform:translate(0px,-10px)"
            onkeypress="return (event.charCode >= 48 && event.charCode <= 57) || event.charCode == 46 || event.charCode == 0 " />
        <q-select dense v-model="donation.unit" :options='units' style="max-width:60px;transform:translate(0px,-10px)" />
        <span v-if="!donation.amount" style="color:gray;;margin-top:10px;margin-left:5px">{{ $t("donate_to_%", { name: $app_name() } ) }}</span>
        <span v-else style="color:var(--light-blue);margin-top:10px"> &nbsp;{{ donationSatoshis | formatFiat($fiat()) }}</span>
      </div>
    </div>
  </div>
</template>

<script>
let bip39 = require('bip39')
let bip32 = require('bip32')
import gql from 'graphql-tag'
import fees from 'src/components/fees'
import coinList from 'src/components/coinList'
import recipient from 'src/components/recipient'
import Vue from 'vue'

export default {
  data() {
    return {
      units: [
        {label:'฿', value:0},
        {label:'mili฿', value:1},
        {label:'ş', value:2},
      ],
      recipientsNum: 1,
      recipients: [],
      sendingamount: 0,
      noEmpty: [ v => !!v || this.$t("Field required") ],
      donation: { amount: 0, unit: {label:'฿', value:0} },
      donationSatoshis: 0,
      left_over_balance: 0, // fixed amount is when a recipient has a use_total_balance
    }
  },
  props: {
    value: Array,
    available_funds: Number,
    total_fee: Number,
    onlyUsers: Boolean,
    fixedInput: Boolean,
    nodonation: Boolean,
  },
  components: {
    recipient,
  },
  mounted() {// console.log("mounted fixedInput:", this.fixedInput, "this.value", this.value)
    if(!!this.value) { console.log("recipients mounted value:", this.value)
      this.recipientsNum = this.value.length
    }
  },
  watch: {
    recipients:  {
      handler: function (val) {// console.log("recipients watch this.fixedInput:", this.fixedInput, "this.value:", this.value)
        if(!this.value || !this.value.length) return
        if(val.length == this.value.length) {
          this.recipient_updated()
        }
      },
      deep: true
    },
    total_fee(val) {
      this.recipient_updated()
    },
    available_funds(val) {
      this.recipient_updated()
    },
    donation: {
      handler: function (val) {
        if(!isNaN(this.donation.amount) && parseFloat(this.donation.amount) > 0) { console.log("5 5 5 5 5 5donation updated")
          this.donationSatoshis = this.$toSatoshis(this.donation.amount, this.donation.unit.value)
        } else this.donationSatoshis = 0
        console.log("* * * * * * * * * * *this.donation.amount:", this.donation.amount, "this.donationSatoshis:", this.donationSatoshis)
        this.recipient_updated()
      },
      deep: true
    },
    isComplete(val) {
      if(!!this.use_total_balance) return
      if(!!val)
        this.recipient_updated()
    }
  },
  methods: {
    recipient_updated() {// console.log("A A A A A A A A recipients recipient_updated")
      if(!this.available_funds) return
      this.sendingamount = this.donationSatoshis
      const i = this.use_total_balance_index()
      if(i != -1) {// console.log("0 0 0 0 0 0 0 0 0 0use total balance:", i) // use_total_balance
        let fee = this.update_selected_utxos()
        //console.log("C C C C C C fee:", fee, i)
        this.recipients[i].satoshis = 0
        let subtotal = this.recipients.reduce((acc, val) => acc + (val.satoshis ? val.satoshis : 0), 0)
        subtotal += this.donationSatoshis
        if(subtotal + fee  > this.available_funds) {
          this.$toastError("Not enough funds")
          this.set_recipients(null, this.donationSatoshis, this.sendingamount) //, false)
          return 
        }
        // use total balance amount
        this.left_over_balance = this.available_funds - subtotal - fee // - fees !!!
        //console.log("left_over_balance:", this.left_over_balance, "available:", this.available_funds, "subtotal:", subtotal, "fees:", fee)
        this.recipients[i].satoshis = this.left_over_balance
        //console.log(".amount before setting use balance =============:", this.recipients[i].amount, this.recipients[i].satoshis)
        this.recipients[i].amount = this.left_over_balance/100000000 // this.$satoshis2btc(this.recipients[i].satoshis) // ???
        this.recipients[i].satoshis = this.left_over_balance
        //console.log(".amount after setting use balance =============:", this.recipients[i].amount, this.recipients[i].satoshis)
        this.sendingamount = this.available_funds - fee
        //console.log("sendingamount:", sendingamount, "total_fee:", fee, "avaiable_funds:", this.available_funds)
      } else {// console.log("1 1 1 1 1 1 1 not total balance") // not use total balance
        this.recipients.forEach((r, ii) => {
          //console.log("rrrrrrrrr:", r.amount, r.value)
          //const sats = this.$toSatoshis(r.amount, r.unit.value) ;  console.log("* * * * * recipient: ", ii, r.amount, sats,  "unit:", r.unit.value, "stas:", sats)
          //this.recipients[ii].satoshis = sats
          this.sendingamount += r.satoshis //sats
          //console.log("  2 2 2 2 2 satoshis:", ii, r.satoshis)
        })
        if(this.sendingamount + this.total_fee > this.available_funds) {
          console.log("sendingamount:", this.sendingamount, "total_fee:", this.total_fee, "avaiable_funds:", this.available_funds)
          this.$toastError("Not enough funds")
        }
      }
      this.set_recipients(this.recipients, this.donationSatoshis, this.sendingamount)
      //console.log("after calling sendingamount:", this.sendingamount, this.total_fee)
    }, 
    async toggle_use_total_balance(i) {
      const before = this.recipients[i].use_total_balance
      // there can only be one
      //this.$pp("before toggle:", this.recipients)
      this.recipients.forEach(r => { r.use_total_balance = r.amount = false })
      //this.$pp("after toggle:", this.recipients)
      this.recipients[i].use_total_balance = !before // now to watch code
      this.set_use_total_balance(this.recipients[i].use_total_balance) ; console.log("toggle_use_total_balance")
      this.recipient_updated()
    },  
    use_total_balance_index() {
      return this.recipients.findIndex((elem, i, array) => !!elem.use_total_balance)
    },
    addRecipient() { // +1 icon
      this.recipientsNum += 1 // it will be populatd by this.set_recipient
    },
    removeRecipient(i) { console.log("removing: ", i)
      this.recipients.forEach(r => console.log("nick:", r.nick))
      this.recipients.splice(i, 1)
      this.recipientsNum -= 1
      this.recipients.forEach((r, idx) => {
        r.last_recipient = false
        r.index = idx
      })
      this.recipients[this.recipients.length - 1].last_recipient = true
      this.update_selected_utxos()
      this.set_recipients(this.recipients, this.donationSatoshis, this.sendingamount) //, true)
      this.recipients.forEach(r => console.log("nick2222:", r.nick))
    },
    // called from recipient compoment
    add_recipient(recipient) {// console.log("6 6 6 6 6 6 recipient:", recipient, this.value)
      this.recipients.forEach(r => r.last_recipient = false)
      this.recipients.push(recipient)
      recipient.last_recipient = true
      recipient.index = this.recipients.length - 1
      if(!!this.value && this.value.length) {// console.log("5 5 5 5 5 5 setting amount to recpient:", typeof this.value[recipient.index].amount)
        recipient.amount = this.value[recipient.index].amount/100000000
        recipient.satoshis = this.$toSatoshis(recipient.amount, 0)
      }
      this.set_recipients(this.recipients, this.donationSatoshis, this.sendingamount) //, false)
      //console.log("this.recipients.length:", this.recipients.length, "this.value.length:", this.value.length)
    },
  },
  inject: [ 'update_selected_utxos', 'set_recipients', 'set_use_total_balance' ],

  provide: function () {
    return { 
      add_recipient: this.add_recipient,
      toggle_use_total_balance: !!this.set_use_total_balance ? this.toggle_use_total_balance : null,
      recipient_updated: this.recipient_updated // when changing recipient address/email/frequent_name
    }
  },
}

</script>