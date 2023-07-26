<template>
  <div style='display:flex'> 
    <div vif="!fixed" style="margin-top:10px">
      <q-checkbox color="success" v-model="mili" hide-details style="transform:translate(0px,0px)" />
      <span>milliş</span>
    </div>
    <q-input v-model="amount" type="text" :placeholder="unit.label2" :readonly="!!fixed && !!value"  
                :hint=" !mili ? amount : amount/1000 | formatFiat($fiat())"
                dense style="margin-left:15px;max-width:130px" :style="{ backgroundColor: $no_empty(amount) }"  >   <!--input accepts only numbers -->
        <template slot:after>
          <span>{{ unit.label }}</span>
        </template>
    </q-input>
    <slot />
  </div> 
</template>

<script>

export default {
  data() {
    return {
      amount: null,
      units: [
        {label:'ş', value:0, label2:'satoshis'},
        {label:'milliş', value:1, label2: "milisats"},
      ],
      unit: {label:'ş', value:0, label2:'satoshis'},
      noEmpty: [ v => !!v || this.$t("Field required") ],
      mili: false,
    }
  },
  props: {
    value: Number,
    mili_: Boolean,
    fixed: Boolean,
    inFiat: String,
  },
  components: {
  },
  mounted() {// console.log("-----4 4 4 4 4 4 4 4 4 4 4 btcAmount:", this.amount, typeof this.amount) // this.amount=0.03
    if(!this.mili_)
        this.unit = this.units[0]
    else
        this.unit = this.units[1]

      if(!this.value) return
      /*let val = this.amount
      if(this.unit.value == 0)
        val = val/100000000
      else if(this.unit.value == 1)
        val = val/100000
      console.log("val:", val)
      this.amount = val*/
      this.amount = this.value ///100000000
      //this.amount_updated(this.amount, this.unit)
  },
  watch: {
    value(val) {// console.log("4 4 4 4 4 4 4 4 4 4 4 btcAmount: ", val, typeof val)
      if(!!val) {// console.log("'4 '4 '4 '4 '4 '4 '4 btcAmount changing amount:", val)
        this.amount = val/100000000
        this.unit = this.units[0]
        return // !!! remove in recipients emit
      }
      //this.amount_updated(val, this.unit)
    },
    mili(val) { console.log("unit:", val)
      this.unit = this.units[ !!val ? 1 : 0 ]
      this.amount_updated(this.amount, val)
    },
    amount(val) {// console.log(" 3 3 3 3 3 3 3 3 3 3 3 btcAmount:", val, typeof val)
      if(!!this.fixed & !!this.value) return
      this.amount_updated(val, !!this.mili)
    }
  },
  computed: {
  },
  inject: [ 'amount_updated' ],
}

</script>