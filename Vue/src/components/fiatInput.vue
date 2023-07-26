<template>
  <div style='display:flex;margin-left:5px'> 
    <q-input v-model.number="amount" type="text" :readonly="!!fixedInput" :label="$t('Amount')" :placeholder="$t('Dot for decimals')"
    onkeypress="return (event.charCode >= 48 && event.charCode <= 57) || event.charCode == 46 || event.charCode == 0 " dense
            style="max-width:130px" :style="{ backgroundColor: $no_empty(amount) }"  /><!--input accepts only numbers -->
    <slot />
    <q-select v-if="!hideCurrency" dense v-model="currency" :options='$currencies' :readonly="!!fixedInput" style="width:60px;margin-left:5px" />
  </div> 
</template>

<script>

export default {
  data() {
    return {
      amount: null,
      currency: null,
      noEmpty: [ v => !!v || this.$t("Field required") ],
    }
  },
  props: {
    value: Number,
    currency_value: String,
    fixedInput: Boolean,
    hideCurrency: Boolean,
  },
  components: {
  },
  mounted() {
    this.amount = this.value
    this.currency = this.currency_value
    if(!this.currency)
      this.currency = this.$userOpt('currency') || 'USD'
  },
  watch: {
    value(val) {// console.log("4 4 4 4 4 4 4 4 4 4 4 btcAmount: ", val, typeof val)
      if(!!val) {// console.log("'4 '4 '4 '4 '4 '4 '4 btcAmount changing amount:", val)
        this.amount = val
      }
    },    
    currency_value(val) {// console.log("4 4 4 4 4 4 4 4 4 4 4 btcAmount: ", val, typeof val)
      if(!!val) {// console.log("'4 '4 '4 '4 '4 '4 '4 btcAmount changing amount:", val)
        this.currency = val
      }
    },
    amount(val) {// console.log(" 3 3 3 3 3 3 3 3 3 3 3 btcAmount:", val, typeof val)
      if(!!this.fixedInput) return
      this.amount_updated(val, this.currency)
    },
    currency(val) {// console.log("currency:", val)
      if(!!this.fixedInput) return
      this.amount_updated(this.amount, val)
    },
  },
  computed: {
  },
  inject: [ 'amount_updated' ],
}

</script>