<template >
  <div style="padding-left:4px;margin-right:2px"> <!-- bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4 bc1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3qccfmv3 -->    
    <recipient v-for="i in recipientsNum" :key="i" :onlyUsers="onlyUsers"  :amount="!!value && !!value[i-1] && !!value[i-1].amount ? value[i-1].amount : null" 
              :addressEmailTo="!!value && !!value.length ? value[i-1].addressEmailTo : null"  :fixedInput="fixedInput" 
                :currency="!!value && !!value.length ? value[i-1].currency : null" style="margin-bottom:2px">
      <template #minus>
        <!-- recipient - -->
        <q-btn v-if="!value && i>1 && i == recipients.length" flat round @click.native="removeRecipient(i-1)" color="red" icon="mdi-minus" >
          <q-tooltip>Remove recipient</q-tooltip>
        </q-btn>
      </template>
      <!-- recipient +1 -->
      <template #plusone>
        <q-btn v-if="!value && recipients.length == recipientsNum && recipients[i-1].last_recipient && !!recipients[i-1].address && !!recipients[i-1].amount" flat round 
              @click.native="addRecipient" color="primary" style="transform:translate(0px,5px);" icon="mdi-plus-one" >
          <q-tooltip>{{ $t("add_recipient") }}</q-tooltip>
        </q-btn>
      </template>
    </recipient>
    
    <!-- donation -->
    <q-card v-if="!nodonation" style="height:50px">
      <q-card-section style="display:flex">
        <q-icon name="img:statics/img/donate.svg" size="sm" style="margin-left:-5px;;;transform:translate(0px,-10px)" class="lightblue" />
        <q-input dense v-model="donation" :label="$t('Donation Amount')" style="max-width:100px;margin-left:10px;;transform:translate(0px,-10px)"
            onkeypress="return (event.charCode >= 48 && event.charCode <= 57) || event.charCode == 46 || event.charCode == 0 " />
      </q-card-section>
    </q-card>
  </div>
</template>

<script>
import gql from 'graphql-tag'
import coinList from 'src/components/coinList'
import recipient from 'src/components/recipientFiat'
import Vue from 'vue'

export default {
  data() {
    return {
      recipientsNum: 1,
      recipients: [],
      sendingamount: 0,
      noEmpty: [ v => !!v || this.$t("Field required") ],
      donation: 0,
    }
  },
  props: {
    value: Array,
    onlyUsers: Boolean,
    fixedInput: Boolean,
    nodonation: Boolean,
  },
  components: {
    recipient,
  },
  mounted() {// console.log("mounted fixedInput:", this.fixedInput, "this.value", this.value)
    if(!!this.value) {// console.log("recipients mounted value:", this.value)
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
    donation: {
      handler: function (val) {
        if(!isNaN(this.donation) && parseFloat(this.donation) > 0) { console.log("5 5 5 5 5 5donation updated")
        } else this.donation = 0
        //console.log("* * * * * * * * * * *this.donation:", this.donation)
        this.recipient_updated()
      },
      deep: true
    },
  },
  methods: {
    recipient_updated() {// console.log("recipient_updated:", this.recipients)
      this.sendingamount = this.donation     
      this.recipients.forEach((r, ii) => {
        this.sendingamount += r.amount
      })
      this.set_recipients(this.recipients, this.donation, this.sendingamount)
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
      this.set_recipients(this.recipients, this.donation, this.sendingamount) //, true)
      this.recipients.forEach(r => console.log("nick2222:", r.nick))
    },
    add_recipient(recipient) {// console.log("6 6 6 6 6 6 recipient:", recipient, this.value)
      this.recipients.forEach(r => r.last_recipient = false)
      this.recipients.push(recipient)
      recipient.last_recipient = true
      recipient.index = this.recipients.length - 1
      if(!!this.value && this.value.length) {// console.log("5 5 5 5 5 5 setting amount to recpient:", typeof this.value[recipient.index].amount)
        recipient.amount = this.value[recipient.index].amount
      }
      this.set_recipients(this.recipients, this.donation, this.sendingamount)
    },
  },
  inject: ['set_recipients' ],

  provide: function () {
    return { 
      add_recipient: this.add_recipient,
      recipient_updated: this.recipient_updated // when changing recipient address/email/frequent_name
    }
  },
}

</script>