
<template>
  <div class="addrs" >
    <div v-for="address in wallet.addresses" :key="address._id" @click="addressSelected(address)" class="card addr click">

      <div class="rows" style="margin-left:5px">
        <span >{{ address.name }}</span>
        <span style="font-size:0.9em;color:gray" >{{ address._id }}</span>
      </div>
      <div class="rows">
        <span class="balance1" >{{ address.balance  | formatSatoshis }}</span>
        <span class="balance1" >{{ address.balance  | formatFiat($fiat()) }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import gql from 'graphql-tag'

  export default {
    data () {
      return {
      }
    },
    props: {
      wallet: Object,
    },
    computed: {
    },
    methods: {
      addressSelected(address) {
        this.$emit('addressSelected', address) // sends addressId to where component is used.
      },
    },
  }
</script>
