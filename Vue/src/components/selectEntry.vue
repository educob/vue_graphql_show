<template> <!-- select and go -->
  <div>
    <div v-for="entry in entries" :key="entry._id" class="card" style="position:relative;padding:5px;background-color:var(--main-bg-color)">
      <div style="display:flex;padding:5px" @click="$go_to(`/${path}/${entry._id}`)" class="click">
        <img :src="`statics/img/${icon_(entry)}`" style="margin-top:5px" width="35" height="35" class="lightblue" />
        <q-icon v-if="$checkAlert(alerts, entry._id)" name="img:statics/img/bell_red.svg" size="xs" class="bell lightblue" />
        <div style="width:100%">          
          <div :style="noBalance ? 'margin-top:10px' : 'margin-bottom:-10px'" >
            <span v-if="$checkAlert(alerts, entry._id)" class="text"> {{ entry.name }}</span>
            <span v-else class="text" style="font-size:18px">{{ entry.name }}</span><br/>
            <div v-if="!noBalance" style="display:flex">
              <span v-if="!!entry.address" class="balance1">{{ entry.address.balance  + entry.address.unconfirmedBalance| formatSatoshis }}
                <!--<q-tooltip>1฿ = 100,000,000Ş (satoshis)</q-tooltip>-->
              </span>
              <span v-else class="balance1">{{ entry.balance  + entry.unconfirmedBalance | formatSatoshis }}
                <!--<q-tooltip>1฿ = 100,000,000Ş (satoshis)</q-tooltip>-->
              </span>
              <q-space />
              <span v-if="!!entry.address" class="balance1">{{ entry.address.balance + entry.address.unconfirmedBalance | formatFiat($fiat()) }}</span>
              <span v-else class="balance1">{{ entry.balance  + entry.unconfirmedBalance| formatFiat($fiat()) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data () {
    return {
    }
  },
  props: {
    path: String,
    entries: Array,
    alerts: Array,
    icon: String,
    tpIcon: String,
    noBalance: Boolean,
  },
  mounted() {
  },
  methods: {
    alerts_entry_count(entryId) {
      if(!this.alerts) return 0
      return this.alerts.reduce( (acc, a) => { return acc +  (a.entryId == entryId ? 1 : 0) }, 0)
    },
    icon_(entry) {
      if(!!entry.thirdpartyUserId) return this.tpIcon
      return this.icon
    }
  }
}
</script>
