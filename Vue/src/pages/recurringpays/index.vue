<style>
.recurrinpay {
  display: grid;
  grid-template-columns: 50px 1fr 120px;
  cursor:pointer;
  padding:10px;
}
</style>

<template>
<div id="board_no_headers" >
  <!---------- Left panel ---------->
  <div class="panel" id="left_panel" style="position:relative">
    <div v-if="!recurringpay" >
      <span class="title" >{{ $t("My Recurring Payments") }}</span>
      <div v-if="!!recurringpays && !!recurringpays.length">
        <div v-for="recurringpay in recurringpays" :key="recurringpay._id" class="card recurrinpay" @click="show_detail(recurringpay)" >
          <img src="statics/img/time.svg" style="margin-right:10px" width="35" height="35" class="lightblue" />
          <div class="ellipsis">
            <div class="rows">
              <div style="display:flex">
                <img :src="`statics/svg/${recurringpay.icon}`" style="" width="25" height="25" style="filter:none" />
                <span class="text" style="margin-left:5px">{{ recurringpay.concept }}</span>
              </div>
              <div>
                <span v-if="recurringpay.nicks && recurringpay.nicks.length==1" v-html="recurringpay.nicks[0]" class="ellipsis" />   
                <tooltip v-else :text="recurringpay.nicks"  />
              </div>    
            </div>
          </div>
          <!-- 3 column --> 
          <div class="rows vcenter">
            <span class="text2">{{ $recurringpay_type(recurringpay.type) }}</span>
            <span class="date" >{{ recurringpay.nextDate | formatDate }}</span>
          </div>
        </div>
      </div>
      <img v-else style="margin-top:20px" src="statics/img/empty_box.svg" width="100" height="100" class="center lightblue"/>
      <!-- + button -->
      <div style="min-height:80px"></div>
      <div @click="new_recurringpay" class="button" style="position:absolute;bottom:5px;left:10px;min-height:55px">
        <img src="statics/img/plus.svg" width="25" height="25" style="margin-top:10px;margin-right:-8px" />
        <img src="statics/img/time.svg" width="40" height="40"/>
        <span class="text" style="margin-right:15px;margin-top:10px ">{{ $t("New Recurring Payment") }}</span>
      </div>
    </div>
    <!-- detail -->
    <div v-else >
      <div style="display:flex">
        <q-btn  color="primary" @click="recurringpay = null" icon="img:statics/img/left_arrow.svg" size="sm" />
        <span class="title" >{{ $t("My Recurring Payment") }}</span>
      </div>

      <div style="margin-top:10px;margin-left:5px;display:flex">

        <img :src="`statics/svg/${recurringpay.icon}`" style="" width="25" height="25" style="filter:none" />
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
        <span>{{ format_date(recurringpay) }}</span>
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
        <div v-for="(nick, i) in recurringpay.nicks" :key="nick._id" style="margin-top:5px">
          <div style="display:grid;grid-template-columns:1fr 110px">
            <span class="ellipsis" style="margin-top:3px">{{ nick }}</span>
            <div class="rows" style="justify-self:end" >
              <div style="display:flex" >
                <span class="balance1" style=""> {{ recurringpay.amounts[i] }}</span>&nbsp;
                <span class="balance1" style="margin-left:0;font-size:0.95em"> {{ recurringpay.currency }} </span>
              </div>
              <span class="balance2" style="margin-right:0px">{{ $fiat2btc(recurringpay.amounts[i], recurringpay.currency) | formatSatoshis }}</span>
            </div>
          </div>
          <q-separator />
        </div>
        <!-- total -->
        <div style="display:flex;margin-bottom:5px">
          <q-space />
          <span style="color:gray;margin-top:5px">Total amount:</span>
          <div class="rows" style="color:gray;margin-left:20px;font-size:15 px">
            <div style="display:flex" >
              <span style="">{{ recurringpay.total }}</span>&nbsp;
              <span  style="margin-left:0;font-size:0.95em"> {{ recurringpay.currency }} </span>
            </div>
            <span >{{ $fiat2btc(recurringpay.total, recurringpay.currency) | formatSatoshis }}</span>
          </div>
        </div>
      </div>

      <!-- edit Recurring Payment -->
      <div class="button" @click="edit(recurringpay)" style="display:flex;margin-top:35px;margin-left:10px" >
        <img src="statics/img/edit.svg" width="30" height="30"/>
        <span class="vcenter" style="margin-left:10px;margin-right:10px">{{ $t("edit") }}</span>
      </div>

      <!-- delete Recurring Payment -->
      <div class="button" @click="deleteModal.dialog=true" style="display:flex;margin-top:35px;margin-left:10px" >
        <img src="statics/img/bin_red.svg" width="30" height="30" style=";filter:none" />
        <span class="vcenter" style="margin-left:10px;margin-right:10px">{{ $t("delete") }}</span>
      </div>
    </div>

  </div>

  <!------------ right panel ------------>
  <div :class="!recurringpay ? 'panel' : ''" id="right_panel" >
      <plans v-if="!recurringpay" @new="recurringPayDialog='block'" />
    <coinList v-else :coins="payments" :hide_confirmation="true" 
                :show_load_more="show_load_more && (recurringpay.payments && recurringpay.payments.length >= pagesize)"   @showMore="showMore()" />
  </div>

  <!-- New/edit Recurring Payment dialog -->
  <div class="dialog" v-bind:style="{ display: recurringPayDialog }">
    <div class="dialog-content" style="min-width:450px" >
      <!-- header -->
      <div style="display:flex">
        <img src="statics/img/time.svg" width="35" height="35" style="transform:translate(0px,-10px)" class="lightblue" />
        <p class="title1">{{ title }}</p>
      </div>

      <!-- type -->
      <div style="margin:0 5px 5px 5px;display:flex">
        <span style="transform:translate(0px,10px);margin-right:10px">{{ $t("Frequency") }}</span>
        <q-select v-model="type" :options="types" dense style="width:150px" />
      </div>  

      <!-- day of week -->
      <div v-if="type.value == 1" style="margin:0 5px 5px 5px;display:flex">
        <span style="transform:translate(0px,10px);margin-right:10px">{{ $t("Day of Month") }}</span>
        <q-select v-model="day_of_week" :options="days_of_week" dense style="width:120px" />
      </div>  

      <!-- day of month -->
      <div v-if="type.value == 2" style="margin:0 5px 5px 5px;display:flex">
        <span style="transform:translate(0px,10px);margin-right:10px">{{ $t("Day of Month") }}</span>
        <q-select v-model="day_of_month" :options='$range(1,31)' dense style="width:60px" />
      </div>

      <!--  date of year -->
      <div v-if="type.value == 3" style="margin-top:20px;margin-left:8px;margin-bottom:10px" class="click" @click="showDatePicker = !showDatePicker">
        <div style="display:flex;">
          <img src="statics/img/calendar.svg" width="25" height="25" class="lightblue" />
          <span style="margin-left:10px">{{ day_of_year }}</span>
        </div>
        <datepicker v-if="!!showDatePicker" v-model="date" style="transform:translate(10px,5px);width:50px" 
                    @input="datePicked(date)" :firstDayOfWeek="$userSetting('1stDayOfWeek')" :noyear="true" />    
      </div>      

      <!-- icon -->
      <div style="display:flex;margin-top:10px">
        <img :src="`statics/svg/${icon}`" class="icon" @click="showIconSelector=true" 
                    style="transform:translate(0px,-5px);filter:none;margin-right:10px" />
        <div class="vcenter">
          <span >{{ $t("Select Icon") }}</span>
        </div>
      </div>

      <!-- concept -->
      <div style="margin:0 5px 10px 10px;display:flex">
        <q-input v-model="concept" :label="$t('Concept')" dense  style="width:350px"  :style="{ backgroundColor: $no_empty(concept) }" class="concept" />
      </div>

      <!-- recipients  -->
      <span class="title2">Pay to:</span>
      <div style="max-width:400px">
        <recipientsFiat :value="recipients_value" :nodonation="true" :key="updateKey"/>
      </div>

      <!-- create button -->
      <div class="button" @click="save" style="display:flex;margin-top:25px;margin-left:10px" >
        <img src="statics/img/save.svg" width="25" height="25"/>
        <span class="vcenter" style="margin-left:10px;margin-right:10px">{{ $t("Save") }}</span>
      </div>     
    </div>
  </div>


  <!-- delete -->
  <selectModal :prop="deleteModal" @selectionDone="deleteRecurringPay" @close="deleteModal.dialog=false" />

  <iconSelector v-if="showIconSelector" @close="showIconSelector=false" />

</div>
</template>

<script>
import gql from 'graphql-tag'
import selectEntry from 'src/components/selectEntry'
import plans from 'src/components/plansOverview'
import recipientsFiat from 'src/components/recipientsFiat'
import selectModal from 'src/components/Modal'
import { sendFiat } from 'src/mixins/sendFiat'
import send_btn from 'src/components/send_btn'
import iconSelector from 'src/components/iconSelector'
import datepicker from 'src/components/datepicker'
import moment from 'moment'
import coinList from 'src/components/coinList'
import tooltip from "src/components/tooltip.vue"

export default {
  data() {
    return {
      title: null,
      types: [
        { label: this.$recurringpay_type(1), value: 1 },
        { label: this.$recurringpay_type(2), value: 2 },
        { label: this.$recurringpay_type(3),  value: 3 },
      ],
      type: { label: this.$recurringpay_type(1),  value: 1 },
      days_of_week: [
        { label: this.$day_of_week(1), value: 1 },
        { label: this.$day_of_week(2), value: 2 },
        { label: this.$day_of_week(3),  value: 3 },
        { label: this.$day_of_week(4),  value: 4 },
        { label: this.$day_of_week(5),  value: 5 },
        { label: this.$day_of_week(6),  value: 6 },
        { label: this.$day_of_week(0),  value: 0 },
      ],
      day_of_week: { label: this.$day_of_week(1), value: 1 },
      day_of_month: 1,
      date: '',
      day: 1, 
      month:0,
      day_of_year: this.$t('Choose date'),
      concept: '',
      icon: '0.svg',
      noEmpty: [ v => !!v || this.$t("Field required") ],
      recipients: [],
      sendingamount: 0,
      module: 'recurringpay',
      recurringPayDialog: false,
      showIconSelector: false,
      showDatePicker: false,
      recurringpay: null,
      page: 0,
      pagesize: 15,
      show_load_more: true,
      deleteModal: { title:"Delete RecurringPay Payment", subtitle:"", buttons:this.$store.getters['misc/yes_no_buttons'], dialog:false },
      recipients_value: null,
      updateKey: 0,
      edit_started: false,
    }
  },
  components: {
    selectModal,
    recipientsFiat,
    selectEntry,
    send_btn,
    plans,
    iconSelector,
    datepicker,
    coinList,
    tooltip,
  },
  mixins: [sendFiat],
  watch: {
    type: {
      handler(val) {// console.log("typeeeeee:", val.value)
        if(!!this.edit_started) {
          this.edit_started = false
          return
        }
        if(val.value == 1) { // week
          this.day = this.day_of_week.value
          this.month = 0
        } else if(val.value == 2) { // month
          this.day = this.day_of_month
          this.month = 0
        } else { // year
          this.day = -1
          this.month = -1
          this.showDatePicker = true
        }
      },
      deep: true
    },
    day_of_week: {
      handler(val) {// console.log("watch day of week:", val.value)
        this.day = val.value
      },
      deep: true
    },
    day_of_month(val) {
      this.day = val
    }
  },
  computed: {
    alerts() {
      return this.$store.getters['user/alerts']
    },
    recurringpays() {
      return this.$store.getters['user/recurringpays']
    },
    payments() {// console.log("this.recurringpay.nicks:", this.recurringpay.nicks)
      if(!this.recurringpay || !this.recurringpay.payments) return []
      return this.recurringpay.payments.map(p => {  
        return { 
          _id: p._id, 
          time: p.time, 
          value: -p.satoshis, 
          icon: this.recurringpay.icon, 
          concept: this.recurringpay.concept,
          concept2: p.fiat + p.currency,
          nicks: this.recurringpay.nicks } })
    },
  },
  beforeMount() {
    const self = this
    this.onEsc = function() {
      if(self.recurringPayDialog == 'block')
        self.recurringPayDialog = 'none'
      else
        self.recurringpay = null
    }
    this.$root.$on('esc', this.onEsc)
    // new event
    this.onNew = function() {// console.log("on new recurr")
      self.recurringPayDialog = 'block'
    }
    this.$root.$on('new', this.onNew)
  },
  beforeDestroy() {
    this.$root.$off('esc', this.onEsc)
    this.$root.$off('new', this.onNew)
  },
  mounted() {
    if(!!this.$route.params.new) this.recurringPayDialog = 'block'
    //else if(!!this.$route.params.id)
    //  this.recurringpay = this.$store.getters['user/get']('recurringpays', this.$route.params.id)     
  },
  methods: {
    async new_recurringpay() {
      const service = this.$service('recurringpay')
      const paidService = await this.$paidService(service.value) //; console.log("paidService:", paidService)
      if((!this.$isMainnet() && !this.$isRegtest()) || !!paidService) { // service is paid
      this.title = this.$t("New Recurring Payment")
      this.type = { label: this.$recurringpay_type(1),  value: 1 },
      this.day_of_week = { label: this.$day_of_week(1), value: 1 }
      this.date = ''
      this.icon = '0.svg'
      this.concept = null
      this.recurringPayDialog='block'
      } else { // service not paid
        this.$root.$emit('servicePay', service) 
      }
    },
    show_detail(recurringpay) {
      this.recurringpay = recurringpay
    },
    edit(recurringpay) {// console.log("edit recurringpay:", recurringpay)
      this.edit_started = true
      this.title = this.$t("Editing Recurring Payment")
      if(recurringpay.type == 1) {  // day of week
        this.day_of_week = { label: this.$day_of_week(recurringpay.day),  value: recurringpay.day }
      } else if(recurringpay.type == 2) { // day of month
        this.day_of_month = recurringpay.day
      } else { // day of year
        let now = new Date()
        now = new Date(now.getFullYear(), recurringpay.month, recurringpay.day).toString()
        this.day_of_year = moment(now).format('DD MMM') //`${recurringpay.day}-${this.$month_text(recurringpay.month)}`
        this.date = moment(now).format('YYYY-MM-DD hh:mm:ss')
      }
      this.type = { label: this.$recurringpay_type(recurringpay.type), value: recurringpay.type }
      this.icon = recurringpay.icon
      this.concept = recurringpay.concept
      this.recipients_value = recurringpay.nicks.map((n,i) => { return { addressEmailTo: n, amount: recurringpay.amounts[i], currency: recurringpay.currency } } )
      this.updateKey++
      this.recurringPayDialog='block'
    },
    save() {// console.log("type:", this.type.value, "day:", this.day, "month:", this.month) ;  return
      if(this.type.value == 3 && this.day == -1) {
        this.$toastError("Set a date")
        return
      }
      if(!this.$checkInput(this.concept, "please_fill_%", "Concept")) return
      if (!this.send_valid()) return
      let recipients = this.recipients.map(r => r.address)
      let amounts = this.recipients.map(r => r.amount)
      const nicks = this.$nicks(this.recipients)
      const currency = this.recipients[0].currency
      const input = {
        _id: !!this.recurringpay ? this.recurringpay._id : null,
        concept: this.concept,
        icon: this.icon,
        recipients,
        amounts,
        nicks,
        currency,
        type: this.type.value,
        day: this.day,
        month: this.month,
        total: this.sendingamount,
      }
      this.$apolloClient().mutate({
        mutation: gql`mutation saveRecurringPay($input: RecurringPayInput!) {
          saveRecurringPay(input: $input) {
            _id
          }
        }`,
        variables: {
          input
        },
      }).then( ({data}) => {
        console.log("dataaaa:", data)
        this.recurringPayDialog = 'none'
        input._id = data.saveRecurringPay._id
        this.recurringpay = input
        this.$store.commit('user/upsert', { what: 'recurringpays', input } )
      }).catch((error) => {
        console.error("mutation saveRecurringPay error", error)  // eslint-disable-line no-console
      })
    },
    format_date(recurringpay) {
      const now = new Date()
      const datee = new Date(now.getFullYear(), recurringpay.month, recurringpay.day)
      return moment(datee).format('DD MMM')
    },
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
        this.recurringpay = null
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
    datePicked(date) {// console.log("datePicked:", date, "---------------")
      const day = date.substring(8, 10)
      const month = parseInt(date.substring(5, 7))
      this.day_of_year = `${day}-${this.$month_text(month-1)}`
      this.showDatePicker = false
    }, // called by calendar.
    set_date(day, monthIndex, year) {// console.log("set_date day:", day, "month:", monthIndex, year) // console.log("setting day:", day, "monthIndex:", monthIndex)
      this.day = day
      this.month = monthIndex
    },
    set_icon(icon) {
      this.icon = icon
    },
  },apollo: {
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
          nicks
          amounts
          total
          currency
          payments(paging: $paging) {
            _id
            time
            satoshis
            fiat
            currency
          }
        }
      }`,
      variables() {
        return {
          _id: this.recurringpay._id,
          paging: { page: 0, pagesize: this.pagesize }
        }
      },
      fetchPolicy: 'network-only',
      skip () {
        return !this.recurringpay
      },
      subscribeToMore: [
        { // New RecurringPayment
          document: gql`subscription newRecurringPayment($scriptId: ID!){
            newRecurringPayment(scriptId: $scriptId) {
              _id
              time
              satoshis
              fiat
              currency
            }
          }`,
          variables() {
            return {
              scriptId: this.recurringpay._id,
            }
          },
          skip () {
            return !this.recurringpay
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
  provide: function () {
    return { 
      feesHandler: null,
      toggle_utxo: null,
      update_selected_utxos: this.update_selected_utxos,
      set_use_total_balance: null,
      set_recipients: this.set_recipients, // called when mounting "recipients". this.recipients is always updated.
      set_icon: this.set_icon,
      set_date: this.set_date,
    }
  },
}
</script>

