<template>
<div style="min-width:475px">
  <div> 
    <img src="statics/img/bitcoin.svg" style="transform:translate(0px,5px)" width="35" height="35" class="lightblue" />
    <span class="title" style="margin-left:10px">{{ $t("Exchange Rate") }}</span>

    <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(150px, 1fr) );margin-top:10px">
        <span v-for="(fiat, i) in fiats" :key="i" class="balance1">{{ 100000000 | formatFiat(fiat) }}</span>
    </div>

    <div id="chart" style="margin-top:20px">
      <apexchart height="350" :options="barsOptions" :series="series" width="100%"></apexchart>
    </div>

    <div id="chart2" style="margin-top:20px">
      <apexchart height="350" :options="ticksOptions" :series="ticks" width="100%"></apexchart>
    </div>

  </div>
</div>
</template>

<script>
import Vue from 'vue'

export default {
  data () {
    return {
      barsOptions: {
        chart: {
          type: 'candlestick',
          height: 350
         },
        title: {
          text: 'Daily Chart US$',
          align: 'left',
          style: {
            color: 'black',
          }
         },
        xaxis: {
          type: 'datetime',
          labels: {
            style: {
              colors: 'black'
            }
          }
         },
        yaxis: {
          tooltip: {
            enabled: true,
           },
          labels: {
            style: {
              colors: 'black'
            },
           }
         },
       },
       // ticks
       ticksOptions: {
        chart: {
          type: 'line',
          height: 350
        },
        title: {
          text: 'Ticks US$',
          align: 'left',
          style: {
            color: 'black',
          }
         },
        xaxis: {
          type: 'datetime',
          tooltip: {
            enabled: false,
           },
          labels: {
            style: {
              colors: 'black'
            }
          }
         },
        yaxis: {
          tooltip: {
            enabled: false,
          },
          labels: {
            style: {
              colors: 'black'
            },
           }
         },
       },
    }
  },
  computed: {
    series() {
      const bars = this.$store.getters['misc/bars'] || []
      const series = [ { data: 
        bars.map(b => {
          return { x: b.day, y: [ b.open, b.high, b.low, b.close] }
        })
      }]
      return series
    },
    fiats() {
      const fiats =  this.$store.getters['misc/fiat']
      const langs = [ 'USD', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD' ]
      return langs.map(l => { return { label: l, value: fiats[l] } })
    },
    ticks() {
      const ticks = this.$store.getters['misc/ticks']
      const series = [ { name: 'ticks', data: ticks } ]
      return series
    }
  },
  methods: {
    
  }
}
</script>

<style >

 .apexcharts-tooltip {
    color: black;
  }
  
</style>
