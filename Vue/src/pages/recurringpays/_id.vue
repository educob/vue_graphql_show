<template>
<div v-if="recurringpay" id="board2">

  <div id="buttons" >
    <!-- right button -->
    <send_btn  id="right_btn"/>

  </div>

  <!---------- Left panel ---------->
  <div class="panel" id="left_panel" style="position:relative">
    
  <span class="title" >{{ $t("My Recurring Payment") }}</span>

  <div style="margin-top:10px;margin-left:5px;display:flex">
    <q-icon :name="`img:statics/svg/${recurringpay.icon}`" class="miniIcon" flat round color="primary" />
    <span style="margin-left:10px">{{ recurringpay.concept}}</span>
  </div>

    <!-- type -->
    <div style="margin-top:10px;display:flex">
      <span style="margin-right:10px;color:primary">{{ $t("Frequency") }}: </span>
      <span style="margin-right:10px;color:primary">{{ $recurringpay_type(recurringpay.type) }}</span>
    </div>

    <!-- day of week -->
    <div v-if="recurringpay.type == 1" style="margin-top:10px;display:flex">
      <span style="margin-right:10px;color:primary">{{ $t("Day of Week") }}: </span>
      <span>{{ $day_of_week(recurringpay.day) }}</span>
    </div>

    <!-- day of month -->
    <div v-if="recurringpay.type == 2" style="margin-top:10px;display:flex">
      <span style="margin-right:10px;color:primary">{{ $t("Day of Month") }}: </span>
      <span>{{ recurringpay.day }}</span>
    </div>

    <!-- day of year -->
    <div v-if="recurringpay.type == 3" style="margin-top:10px;display:flex">
      <span style="margin-right:10px;color:primary">{{ $t("Day of Month") }}</span>
      <span>{{ recurringpay.day }} {{ recurringpay.month }}</span>
    </div>    

    <!-- recipients  -->
    <div style="max-width:400px;margin-top:10px">
      <div><!-- header -->
        <div style="display:flex;margin-bottom:5px">
          <span  style="color:gray">{{ $t("Recipients") }}</span>
          <q-space />
          <span style="color:gray">{{ $t("Amount") }}</span>
        </div>
        <q-separator />
      </div><!-- recipients list -->
      <div v-for="(rec, i) in recurringpay.recipients" :key="rec._id" style="margin-top:5px">
        <div style="display:grid;grid-template-columns:1fr 90px">
          <span class="ellipsis" style="margin-top:3px;font-size:0.95em ">{{ rec }}</span>
          <div class="rows">
            <span class="balance1" style="margin-right:0px">{{ recurringpay.satoshis[i] | formatSatoshis }}</span>
            <span class="balance2" style="margin-right:0px">{{ recurringpay.satoshis[i] | formatFiat($fiat()) }}</span>
          </div>
        </div>
        <q-separator />
      </div>
      <div><!-- total -->
        <div style="display:flex;margin-bottom:5px">
        <q-space />
        <span style="color:gray;margin-top:5px">Total amount:</span>
        <div class="rows" style="color:gray;margin-left:20px;font-size:15 px">
          <span >{{ recurringpay.total | formatSatoshis }}</span>
          <span >{{ recurringpay.total | formatFiat($fiat()) }}</span>
        </div>
        </div>
        <q-separator />
      </div>
    </div>

    <!-- edit Recurring Payment -->
    <div class="button" @click="deleteModal.dialog=true" style="display:flex;margin-top:35px;margin-left:10px" >
      <img src="statics/img/edit.svg" width="30" height="30"/>
      <span class="vcenter" style="margin-left:10px;margin-right:10px">{{ $t("edit") }}</span>
    </div>

    <!-- delete Recurring Payment -->
    <div class="button" @click="deleteModal.dialog=true" style="display:flex;margin-top:35px;margin-left:10px" >
      <img src="statics/img/bin_red.svg" width="30" height="30" style=";filter:none" />
      <span class="vcenter" style="margin-left:10px;margin-right:10px">{{ $t("delete") }}</span>
    </div>

  </div>

    <!------------ right panel ------------>
  <div id="right_panel">
    <!-- payments -->
    <coinList v-if="recurringpay && recurringpay.payments.length" :coins="payments" :hide_confirmation="true" :show_load_more="show_load_more && recurringpay.payments.length >= pagesize"
                  @showMore="showMore()" />
  </div>


</div>
</template>

<script>
import gql from 'graphql-tag'
import selectModal from 'src/components/Modal'
import coinList from 'src/components/coinList'
import send_btn from 'src/components/send_btn'

export default {
  data() {
    return {
      page: 0,
      pagesize: 15,
      show_load_more: true,
      deleteModal: { title:"Delete RecurringPay Payment", subtitle:"", buttons:this.$store.getters['misc/yes_no_buttons'], dialog:false },
    }
  },
  components: {
    selectModal,
    coinList,
    send_btn,
  },
  watch: {
  },
  computed: {
    payments() {
      return this.recurringpay.payments.map(p => {  return { time: p.time, value: p.satoshis, _id: p._id, icon: this.recurringpay.icon, concept: this.recurringpay.concept} })
    }
  },
  methods: {
    deleteRecurringPay(btnIdx) {
      this.deleteModal.dialog = false
      if(btnIdx == 1) return
      const _id = this.recurringpay._id
      this.$apolloClient().mutate({
        mutation: gql`mutation deleteRecurringPay($_id: ID!) {
          deleteRecurringPay(_id: $_id) {
            _id
          }
        }`,
        variables: {
          _id
        },
      }).then( ({data}) => {
        $go_to(`/recurringpays` )
      }).catch((error) => {
        console.log("error:", error)
        this.$toastError("deleteRecurringPay error", error)
      })
    },
    showMore () {
      this.page++
      // Fetch more data and transform the original result
      this.$apollo.queries.recurringpay.fetchMore({
        variables: {
          _id: this.$route.params.id,
          paging: { page: this.page, pagesize:this.pagesize }
        },
        // Transform the previous result with new data
        updateQuery: ( { recurringpay }, { fetchMoreResult } ) => {
          const more_payments = fetchMoreResult.recurringpay.payments
          //console.log("more_payments:", more_payments)
          if(!more_payments.length || more_payments.length < this.pagesize) this.show_load_more = false
          more_payments.forEach( c => {
            const pos = recurringpay.payments.findIndex((elem, i, array) => elem._id == c._id)
            if(pos == -1) 
              recurringpay.payments.push(c)
          })
          return { recurringpay }
        },
      })
    },
  },  
  apollo: {
    $client() { return this.$apolloClientName() },
    recurringpay: {
      query: gql`query ($_id: ID!, $paging: Paging!) {
        recurringpay(_id: $_id) {
          _id
          concept
          icon
          type
          day
          month
          created
          recipients
          satoshis
          total
          payments(paging: $paging) {
            _id
            time
            satoshis
          }
        }
      }`,
      variables() {
        return {
          _id: this.$route.params.id,
          paging: { page: 0, pagesize: this.pagesize }
        }
      },
      fetchPolicy: 'network-only',
      skip () {
        return !this.$route.params || !this.$route.params.id
      },
      subscribeToMore: [
        { // New RecurringPayment
          document: gql`subscription newRecurringPayment($scriptId: ID!){
            newRecurringPayment(scriptId: $scriptId) {
              _id
              time
              satoshis
            }
          }`,
          variables() {
            return {
              scriptId: this.$route.params.id,
            }
          },
          updateQuery: function( { recurringpay }, { subscriptionData }) { 
            const newPayment = subscriptionData.data.newRecurringPayment
            console.log('newPayment subscriptionData.data.newPayment', newPayment)
            if(recurringpay.payments) {
              const pos = recurringpay.payments.findIndex(pay => pay._id == newPayment._id)
              if(pos == -1) { // add at the beginning
                recurringpay.payments.splice(0, 0, newPayment)
              } else { // replace
                recurringpay.payments.splice(pos, 1, newPayment)
              }
            } else {
              recurringpay.payments = [ newPayment ]
            }
            return { recurringpay }
          },
        },
      ]
    },
  },
}
</script>