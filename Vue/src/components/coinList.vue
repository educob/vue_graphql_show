<template>
<div class="coinlist">

  <span class="title" style="">{{ $t("Transactions List") }}</span>

  <div v-if="coins && coins.length && lastBlock && lastBlock.height > 0" style="overflow-y:auto;max-height:calc(100vh - 310px);" >
    <div class="card coin highlight">
      <div class="rows2" >
        <span>{{ $t("Conf") }}.</span>
        <span>{{ $t("Icon") }}</span>
      </div>
      <div class="vcenter">
        <span>{{ $t("Concept") }}</span>
        <div>
          <span>{{ $t("Sender") }}/{{ $t("Recipients") }}</span>
        </div>
      </div>
      <div class="rows2">
        <span>{{ $t("Amount") }}</span>
        <span>{{ $t("Date") }}</span>
      </div>
    </div>

    <!-- coins -->
    <div v-for="coin in coins" :key="coin._id" class="card coin" style="max-with:100%" >
      <!-- column 1 -->
      <div class="rows">
        <div v-if="!hide_confirmation" class="badge">    
          <div :class="confirmations(coin.height) == '0' ? 'yellow' : 'blue'" :text-color="confirmations(coin.height) == '0' ? 'black' : 'white'" 
                  :style="confirmations(coin.height) >= 100000 ? 'font-size:0.8em' : ''" style="justify-self:center" >{{ confirmations(coin.height) }}</div>
        </div>   
        <img :src="`statics/svg/${coin.icon || '0.svg'}`" width="25" height="25" style="filter:none;justify-self:center"  />                           
      </div>
      <!-- column 2 -->
      <div class="vcenter ellipsis">
        <div style="display:flex">
          <span v-if="coin.concept">{{ coin.concept }}&nbsp;</span>
          <span v-else style="color:gray">{{ $t("External Deposit") }}&nbsp;</span>
          <q-space />
          <span style="margin-right:20px">{{ coin.concept2 }}&nbsp;</span>
        </div>
        <div v-if="coin.value > 0 && coin.sender" v-html="coin.sender" class="ellipsis" tyle="font-size:0.9em;"/>   <!-- utxo -->
        <div v-else-if="!!coin.nicks"> <!-- spend -->
          <tooltip :text="coin.nicks" /> 
        </div>
        <div v-else>&nbsp;</div>
      </div>
      <!-- column 3 -->
      <div>
        <div @click="explorer(coin.tx)" style="display:flex;float:right" class="click">
          <q-tooltip  :offset="[10, 10]">
              <img src="statics/img/blockchain.svg" width="25" height="25" style="margin-right:5px" class="lightblue" />
              <span style="font-size:18px">{{ $t("Watch transaction in Blockchain Explorer")}}</span>
          </q-tooltip>
          <img v-if="!!coin.pending_payment" src="statics/img/sand_clock.svg" style="margin-top:7px" width="20" height="20" />
          <q-chip :color="coin.value > 0 && !hide_confirmation ? 'green' : 'red'" dark style="margin-right:0px;float:right"
                   >
            {{ coin.value  | formatSatoshis }}
          </q-chip>
        </div>
        <span class="date">{{ coin.time | formatDate }}</span>
      </div>
    </div>

    <!-- footer -->
    <div class="card coin highlight">
      <div></div>
      <div class="vcenter">
        <span>{{ $t("Showing % Transactions", { txs: coins.length }) }}</span>
      </div>
      <div v-if="show_load_more" >
        <span style="margin-right:10px">{{ $t("More") }}</span>
        <q-btn round color="primary" @click="$emit('showMore')  " icon="mdi-fast-forward" size="sm" />
      </div>
    </div>

  </div>
  <img v-else style="margin-top:20px" src="statics/img/empty_box.svg" width="100" height="100" class="center lightblue"/>
</div>
</template>


<script>
import gql from 'graphql-tag'
import tooltip from "src/components/tooltip.vue"

export default {
  name: 'coinList',
  data() {
    return {
      headers: [
        { name:'time' }, // sortable: false,  align: 'left',
        { name:'height' },
        { name:'value' },
      ],
    }
  },
  props: {
    coins: Array,
    hide_confirmation: Boolean,
    show_load_more: Boolean,
  },
  components: {
    tooltip,
  },
  created: function () {
  },
  mounted() {
  },
  computed: {
  },
  methods: {
    /*mouseover(event) {
      //console.log("event:", event.clientX, event.clientY) // pageX, screenX
    },*/
    confirmations(height) { 
      if(!height ) return "0"
      return (this.lastBlock.height - height + 1)
    },
    explorer(tx) {
      if(this.$blockchain == 'regtest') {
        this.$toast.info("No explorer for regest")
        return
      }
      const explorers = { mainnet: 'https://www.blockchain.com/btc/tx/', testnet: 'https://www.blockchain.com/btc-testnet/tx/' }
      const url = `${explorers[this.$blockchain]}${tx}`
      console.log("url:", url)
      window.open(url)
    },
  },
  apollo: {
    $client() { return this.$apolloClientName() },
    lastBlock: { // lastBlock query
      query: gql`query lastBlock  {
        lastBlock {
          height
          time
        }
      }`,
      fetchPolicy: 'network-only',      
      subscribeToMore: [{ // new Block
        document: gql`subscription newBlock {
          newBlock {
            height
            time
          }
        }`,
        updateQuery: function( { lastBlock }, { subscriptionData })  {
          const newBlock = subscriptionData.data.newBlock
          //console.log("subscripcion lastBlock:", newBlock)
          this.$store.commit("misc/lastBlock", newBlock) // used for smartcontract path timing (to block path in the future)
          this.$toastInfo("New block mined")
          return { lastBlock: newBlock }
        },
      }],
    },
  },
}
</script>
