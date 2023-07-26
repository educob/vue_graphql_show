<template>
  <div v-if="payrequests" class="coinList" >
    <!-- header -->
    <div class="card payment highlight">
      <div class="rows" style="margin-left:-20px" >
        <span class="created">{{ $t("Created") }}</span>
        <span style="color:#4c7f56">{{ $t("Paid") }}</span><!-- green -->
      </div>
      <div class="rows" style="justify-self:start">
        <span style="color:gray">{{ $t("Title") }}</span>
        <span style="color:gray">{{ $t("Label") }}</span>
      </div>
      <div class="rows">
        <span style="color:gray">{{ $t("Payer") }}</span>
        <span style="text-align:right;color:#4c7f56">{{ $t("Amount") }}</span>
      </div>
    </div>
    <!-- rows -->
    <div v-for="pay in payrequests" :key="pay._id" class="card payment">
      <div class="rows" > <!-- green -->
        <span style="color:#B676B1;font-size:0.9em">{{ pay.created | formatDate }}</span>
        <span v-if="pay.paid" style="color:#4c7f56;font-size:0.9em">{{ pay.paid | formatDate }}</span>  
      </div>
      <!-- column 2 -->
      <div class="rows" style="justify-self:start" >
            <span style="color:gray">{{ pay.title }}</span>
            <span style="color:gray">{{ pay.label }}</span>
      </div>
      <!-- column 3 -->
      <div class="rows" style="" >
        <span class="color_text(pay)" style="float:right">{{ pay.nick }}</span>
        <badge :b_class="color_class(pay)" :text="$options.filters.formatSatoshis(pay.satoshis)" />
      </div>
    </div>

  </div>
</template>

<style scoped>

.payment {
  display: grid;
  grid-template-columns: 90px 1fr 100px;
  justify-items: start;
  padding:7px 10px 7px 10px;  
}


</style>

<script>
import gql from 'graphql-tag'
import badge from "./badge.vue"

export default {
  name: 'payrequests',
  data() {
    return {
    }
  },
  props: {
    payrequests: Array,
  },
  components: {
    badge,
  },
  methods: {
    pay_color(pay) {
      if(pay.userId == this.$userId() && !pay.paid) return 'black' // creator
      return 'white'
    },
    color_class(pay) {
      if(pay.userId == this.$userId()) { // creator
        if(!!pay.paid) return 'green'
        return 'lite_green'
      } else { // payer
        if(!!pay.paid) return 'red'
        return 'pink'
      }
    },
  },
  
}
</script>
