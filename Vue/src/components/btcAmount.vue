<template>
  <div style='display:flex'> 
    <q-input v-model="amount" type="text" :readonly="!!fixedInput && !!value" :label="$t('Amount')" :placeholder="$t('Dot for decimals')" 
            :hint="$toSatoshis(amount, unit.value) | formatFiat($fiat())"
            onkeypress="return (event.charCode >= 48 && event.charCode <= 57) || event.charCode == 46 || event.charCode == 0 " dense rounded outlined 
            style="max-width:130px" :bg-color="$no_empty(amount)"  >   <!--input accepts only numbers -->
        <template slot:after>
          <span>BTC</span>
        </template>
    </q-input>
    <slot />
    <!--<q-select dense v-model="unit" :options='units' :readonly="!!fixedInput" style="width:60px;margin-left:5px" />-->
  </div> 
</template>

<script>

export default {
  data() {
    return {
      amount: null,
      units: [
        {label:'BTC', value:0},
        //{label:'mili BTC', value:1},
        {label:'şats', value:2},
      ],
      unit: {label:'BTC', value:0},
      noEmpty: [ v => !!v || this.$t("Field required") ],
    }
  },
  props: {
    value: Number,
    fixedInput: Boolean,
    inFiat: String,
  },
  components: {
  },
  mounted() {// console.log("-----4 4 4 4 4 4 4 4 4 4 4 btcAmount:", this.amount, typeof this.amount) // this.amount=0.03
      if(!this.value) return
      /*let val = this.amount
      if(this.unit.value == 0)
        val = val/100000000
      else if(this.unit.value == 1)
        val = val/100000
      console.log("val:", val)
      this.amount = val*/
      this.amount = this.value ///100000000
  },
  watch: {
    value(val) {// console.log("4 4 4 4 4 4 4 4 4 4 4 btcAmount: ", val, typeof val)
      if(!!val) {// console.log("'4 '4 '4 '4 '4 '4 '4 btcAmount changing amount:", val)
        this.amount = val/100000000
        this.unit = this.units[0]
      }
    },
    unit(val) { console.log("unit:", val)
      this.amount_updated(this.amount, val)
    },
    amount(val) {// console.log(" 3 3 3 3 3 3 3 3 3 3 3 btcAmount:", val, typeof val)
      if(!!this.fixedInput & !!this.value) return
      if(!!parseFloat(val))        
        this.amount_updated(parseFloat(val), this.unit)
    }
  },
  computed: {
  },
  inject: [ 'amount_updated' ],
}

</script>