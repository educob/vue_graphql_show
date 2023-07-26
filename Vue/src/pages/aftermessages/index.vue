<template>
<div id="board_no_headers">

  <!---------- Left panel ---------->
  <div class="panel" id="left_panel" style="position:relative">
    <span class="title" >{{ $t("After Message to be sent") }}</span>
    <div v-if="!!myaftermessages && !!myaftermessages.length" style="`max-height:calc(100vh - ${!$isThirdparty() ? '415px' : '350px'});overflow-y:auto`">
      <div v-for="aftermessage in myaftermessages" :key="aftermessage._id" class="card" >
        <div class="aftermessage" @click="view_aftermessage(aftermessage)">
          <div>
            <img :src="`statics/img/${icon(aftermessage)}.svg`" width="35" height="35" class="lightblue" />
          </div>
          <div class="rows2">
            <div class="vcenter">
              <span class="text" >{{ aftermessage.name }}</span>
            </div>
            <div class="vcenter">
              <span class="text" >{{ aftermessage.beneficiaryNick }}</span>
            </div>
          </div>
        <!--  <img  src="statics/img/inheritance.svg" width="25" height="25" />  -->   
        </div>
      </div>
    </div>
    <img v-else style="margin-top:20px" src="statics/img/empty_box.svg" width="100" height="100" class="center lightblue"/>
    
    <!-- + aftermessage button -->
    <div style="position:absolute;bottom:0">
      <div @click="init_new_aftermessage('aftermessage')" class="button" style="min-height:55px;">
        <img src="statics/img/plus.svg" width="25" height="25" style="min-margin-right:-8px" />
        <img src="statics/img/aftermessage.svg" width="40" height="40"/>
        <span class="text" style="margin-right:15px">{{ $t($serviceTitle('aftermessage')) }}</span>
      </div>

      <!-- + 3prt aftermessage 
      <div v-if="!$isThirdparty()" style="min-height:80px" />
      <div v-if="!$isThirdparty()" @click="init_new_aftermessage(aftermessage3party)" class="button" style="position:absolute;bottom:0;left:10px;min-height:55px">
        <img src="statics/img/plus.svg" width="25" height="25" style="min-margin-right:-8px" />
        <img src="statics/img/aftermessage_3party.svg" width="40" height="40"/>
        <span class="text" style="margin-right:15px">{{ $t($serviceTitle('aftermessage3party)) }}</span>
      </div>-->
    </div>
  </div>

  <!------------ right panel ------------>
  <div class="panel" id="right_panel">
    <span class="title">{{ $t("Received After Messages") }}</span>
    <div v-if="!!theiraftermessages && !!theiraftermessages.length" style="height:calc(100vh - 350px);overflow-y:auto">
      <div v-for="aftermessage in theiraftermessages" :key="aftermessage._id" class="card" >
        <div class="aftermessage" @click="view_aftermessage(aftermessage)">
          <div>
            <img src="statics/img/aftermessage.svg" width="35" height="35" class="lightblue" />
          </div>
          <div class="rows2">
            <div class="vcenter">
              <span class="text">{{ aftermessage.name }}</span>
            </div>
            <div class="vcenter">
              <span class="text">{{aftermessage.senderNick }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    <img v-else style="margin-top:20px" src="statics/img/empty_box.svg" width="100" height="100" class="center lightblue" />
  </div> 

  <!-- New aftermessage dialog -->
  <div class="dialog" :style="{ display: newDialog }">
    <div class="dialog-content" style="min-width:350px;max-height:calc(100vh - 100px);overflow-y:auto" >
      <div style="display:flex">
        <q-icon :name="`img:statics/img/${$serviceIcon(service.value)}.svg`" size="md" style="transform:translate(0px,-5px)" class="lightblue" />
        <p class="title1">{{ service.title }}</p>
      </div>

      <!-- name -->
      <div style="">
        <span class="title3" style="margin-left:0px;margin-top:10px">{{ $t("Name") }}:</span>
        <q-input v-model="name" :label="$t('after_message_name')" dense  style="width:320px"  
                        rounded outlined :bg-color="$no_empty(name)" autofocus/>
      </div>

      <!-- beneficiary -->
      <div style="margin-top:15px;margin-bottom:15px">
        <span class="title3" style="margin-left:0px;margin-top:10px">{{ $t("Beneficiary") }}:</span>
        <addressEmailFavorite :onlyUsers="true" :key="updateKey" :noFavorite="true" />
      </div>

      <!--password -->
      <div style="margin:15px 5px 0 0px">
        <div style="margin-bottom:5px">
          <span class="title3" style="margin-left:0px;margin-top:10px">{{ $t("Password") }}:</span>
        </div>
        <span class="title3" style="margin-left:0px" >{{ $t("give_pass_2_beneficiary") }} </span><br/>
        <span class="subtitle" style="margin-left:0px" >{{ $t("suggestion_ask_the_pass") }}</span><br/>
        <q-input v-model="password" :label="$t('Message Password')" dense style="margin-top:15px"
                   rounded outlined :bg-color="$no_empty(password)"  />
      </div>

      <!-- message -->
      <div style="margin-top:20px;margin-bottom:20px">
        <span class="title3" style="margin-left:0px;margin-top:10px">{{ $t("Message") }}:</span>
        <q-input v-model="message" type="textarea" :label="$t('Message')" autogrow rounded outlined :bg-color="$no_empty(message)" style="margin-top:10px" />
      </div>
      
      <!-- activation conditions -->
      <div v-if="service.name == 'aftermessage'">
        <span class="title3" style="margin-left:0px;margin-top:10px">{{ $t("Activation Condition") }}:</span>
        <q-select v-model="activation_condition" :options='activation_conditions' :label="$t('Select Activation Condition')" 
                  dense style="margin-bottom:20px;width:330px" />

        <!-- time triggered -->
        <div v-if="activation_condition.value==1">
          <timetrigger @update_timetrigger="update_timetrigger" :timetrigger="1" />
        </div>     

        <!-- specific time -->
        <div v-if="activation_condition.value==2" style="margin-top:20px;margin-left:8px;margin-bottom:10px" class="click" @click="showDatePicker = !showDatePicker">
          <div style="display:flex;">
            <img src="statics/img/calendar.svg" width="25" height="25" class="lightblue" />
            <span style="margin-left:10px">{{ date_text }}</span>
          </div>
          <datepicker v-if="!!showDatePicker" v-model="date_i" @input="datePicked(date_i)" :noPast="true" :firstDayOfWeek="$userSetting('1stDayOfWeek')" style="margin-top:10px;margin-left:10px" />            
        </div> 
      </div>

      <select3party v-if="service.name=='aftermessage3party'" @selected="select_3party" :hideOptions="!!thirdpartyUserId" />
    
      <!-- create button -->
      <div class="button" @click="save" style="display:flex;margin-top:20px;margin-left:10px" >
        <img src="statics/img/save.svg" width="30" height="30" />
        <span class="" style="margin-left:10px;margin-right:10px">{{ $t("Save") }}</span>
      </div>
    </div>
  </div>

  <!-- view dialog-->
  <div v-if="aftermessage" class="dialog" v-bind:style="{ display: viewDialog }">
    <div class="dialog-content" style="min-width:350px" >

      <div style="display:flex">
        <img src="statics/img/aftermessage.svg" width="25" height="25" class="lightblue" />
        <span class="title1">{{ $t("After Message") }}</span>
      </div>

      <!-- name -->
      <div style="margin:5px 0 20px 0">
        <span class="title3" style="margin-left:0px">{{ $t("Name") }}:</span>
        <span class="title">{{ aftermessage.name }}</span>
      </div>

      <!-- beneficiary -->
      <div v-if="aftermessage.mine" style="">
        <span class="title3" style="margin-left:0px">{{ $t("Beneficiary") }}:</span>
        <div>
          <span v-if="aftermessage.mine" class="text" style="">{{ aftermessage.beneficiaryNick }}</span>
          <span v-else  class="text">{{ aftermessage.senderNick }}</span>
        </div>
      </div>

      <!-- see creator -->
      <div v-else style="margin:10px 0 5px 0;display:flex">
        <span class="title3" style="margin-left:0px">Sender:</span>
        <span v-if="aftermessage.mine" class="text" style="margin-top:-3px">{{ aftermessage.beneficiaryNick }}</span>
        <span  class="text"style="margin-top:-3px">{{ aftermessage.senderNick }}</span>
      </div>

      <!--password -->
      <div v-if="!decrypted && aftermessage.thirdpartyUserId != $userId()" style="margin:0 5px 0 0px">
        <q-input v-model="password" :label="$t('Message Password')" dense  style="width:320px" outlined rounded
            @keydown.enter.prevent="decrypt" :bg-color="$no_empty(password)" autofocus >
          <template v-if="!aftermessage.mine" slot:after>
            <q-btn size="sm" @click="decrypt" color="primary" style="" icon="mdi-download" />
          </template>
        </q-input>
      </div>
        <span class="title3" style="margin-left:0px;margin-top:10px">{{ $t("Beneficiary") }}:</span>
      <addressEmailFavorite v-if="aftermessage.mine && !decrypted && aftermessage.thirdpartyUserId != $userId()" :onlyUsers="true" :key="updateKey" :noFavorite="true" />
      <div v-if="liam && aftermessage.mine && !decrypted" class="button" @click="decrypt" style="display:flex;margin-top:20px;margin-left:10px" >
        <img src="statics/img/unlock.svg" width="30" height="30" />
        <span class="" style="margin-left:10px;margin-right:10px">{{ $t("See") }}</span>
      </div>

      <!-- message -->
      <div v-if="!!decrypted" style="margin-bottom:20px">
        <q-input v-model="decrypted" outlined type="textarea" :label="$t('Message')" autogrow :readonly="!aftermessage.mine || !decrypted" />
      </div>
      <!-- btn update message -->
      <div v-if="!!aftermessage.mine && decrypted != decrypted_copy" class="button" @click="update_message" style="display:flex;margin-top:20px;margin-left:10px" >
        <img src="statics/img/save.svg" width="30" height="30" />
        <span class="" style="margin-left:10px;margin-right:10px">{{ $t("Save") }}</span>
      </div>

      <!-- user message -->
      <div v-if="!aftermessage.thirdpartyUserId">
        <!-- type -->
        <div style="margin-top:20px">
          <div>
            <span class="title3" style="margin-right:10px;color:primary">{{ $t("Activation Condition") }}: </span><br/>
          </div>
        </div>

        <!-- time trigger -->
        <div v-if="aftermessage.type==1 && aftermessage.mine && !aftermessage.parentId" style="margin-top:5px;">
          <span style="margin-right:10px;color:primary">{{ activation_condition_text(1) }}</span>
          <timetrigger @update_timetrigger="update_timetrigger" :timetrigger="aftermessage.timetrigger" :fixed="true" />
        </div>

        <!-- day of year -->
        <div v-if="aftermessage.type == 2" style="margin-top:5px;display:flex">
          <span class="" style="margin-right:10px;color:primary">{{ activation_condition_text(2) }}:</span>
          <span>{{ aftermessage.date.substr(0, 10) }}</span>
        </div>  
      </div>
      
      <!-- thirdparty -->
      <div v-else style="margin-top:20px">
        <span class="title2">{{ $t("Third Party Service Provider") }}:</span><br/>
        <div class="fr-image click" style="padding-right:10px;margin-top:10px">
          <span @click="$emit('selected', tp)">{{ aftermessage.thirdparty.companyName }}</span>
          <img src="statics/img/thirdparty.svg" width="25" height="25" @click="thirdparty=aftermessage.thirdparty" style="justify-self;margin-left:10px" class="lightblue" />
        </div>
      </div>

      <!-- delete aftermessage -->
      <div v-if="aftermessage.mine" class="button" @click="init_remove(aftermessage)" style="display:flex;margin-top:15px;margin-left:10px;filter:none" >
        <img src="statics/img/bin_red.svg" width="30" height="30"/>
        <span class="vcenter" style="margin-left:10px;margin-right:10px">{{ $t("delete") }}</span>
      </div>
  
    </div>
  </div>
  <confirm v-if="showActivate" @confirmed="activate" @close="showActivate=false" title="Confirm After Message Delivery" subtitle="Do you want to send this After Message" />

  <confirm v-if="showDelete" @confirmed="remove" @close="showDelete=false" title="Confirm Deletion" subtitle="Do you want to delete this After Message" />


  <show3party :thirdparty="thirdparty" />


</div>
</template>

<script>
import Vue from 'vue'
import gql from 'graphql-tag'
import addressEmailFavorite from "src/components/addressEmailFavorite"
import timetrigger from "src/components/timetrigger"
import send_btn from 'src/components/send_btn'
import datepicker from 'src/components/datepicker'
import confirm from 'src/components/confirm'
import select3party from "src/components/select3party"
import show3party from 'src/components/show3party'

export default {
  data() {
    return {
      noEmpty: [ v => !!v || this.$t("Field required") ],
      newDialog: 'none',
      viewDialog: 'none',
      name: null,
      beneficiaryId: null,
      beneficiaryNick: null,
      liam: null,
      password: null,
      message: null,
      timetrigger: 1,
      aftermessage: null,
      decrypted: null,
      decrypted_copy: null,
      updateKey: 0,
      activation_conditions: [
        { label: this.activation_condition_text(1), value: 1 },
        { label: this.activation_condition_text(2), value: 2 }
      ],
      activation_condition: { label: null, value: 0 },
      showDatePicker: false,
      date_text: this.$t('Choose date'),
      date: new Date(),
      date_i: '',
      showDelete: false,
      showActivate: false,
      service: null,
      new_title: null,
      thirdpartyUserId: null,
      thirdpartyName: null,
      companyName: 0,
      canClose: true,
      thirdparty: null,
      // service payment
    }
  },
  components: {
    addressEmailFavorite,
    timetrigger,
    send_btn,
    datepicker,
    confirm,
    select3party,
    show3party,
  },
  watch: {
    activation_condition: {
      handler(val) {// console.log("typeeeeee:", val.value)
        if(val.value == 1) { // week
        } else { // specific date
          this.showDatePicker = true
        }
      },
      deep: true
    },
  },
  computed: {
    alerts() {
      return this.$store.getters['user/alerts']
    },
    serviceId() {
      return this.service.value
    },
    myaftermessages() {// console.log("myaftermessages")
      const all = this.$store.getters['user/aftermessages']
      return all.filter(am => am.senderId == this.$userId() || am.thirdpartyUserId == this.$userId()).map(am => { am.mine = true; return am })
    },
    theiraftermessages() {
      const all = this.$store.getters['user/aftermessages']
      return all.filter(am => am.senderId != this.$userId() && am.thirdpartyUserId != this.$userId())
    },
  },
  beforeMount() {
    const self = this
    this.onDoNotClose = function() {
      self.canClose = false
    }
    this.$root.$on('doNotClose', this.onDoNotClose)
    this.onCanClose = function() {
      self.canClose = true
    }
    this.$root.$on('canClose', this.onCanClose)
    this.onEsc = function() {
      if(!self.canClose) return

      if(!!self.thirdparty) 
        self.thirdparty = null
      else {
        self.newDialog = self.viewDialog = 'none'
        self.resetform()
      }
    }
    this.$root.$on('esc', this.onEsc)
    // new event
    this.onNew = function() { console.log("newwww")
      self.service = this.$serviceByValue(this.$route.params.type || 1)
      self.newDialog = 'block'
    }
    this.$root.$on('new', this.onNew)
  },
  beforeDestroy() {
    this.$root.$off('esc', this.onEsc)
    this.$root.$off('new', this.onNew)
  },
  mounted() {
    if(!!this.$route.params.new) //this.newDialog = 'block'
      this.init_new_aftermessage(this.$serviceByValue(this.$route.params.type || 1).name)
  },
  methods: {
    activation_condition_text(type) {
      if(type == 1) return this.$t('time_2_send_since_last_login')
      if(type == 2) return this.$t("Specific Date")
    },
    save() {
      if(!this.$checkInput(this.name, "please_fill_%", "Name")) return
      if(!this.$checkInput(this.beneficiaryId, "please_fill_%", "Beneficiary")) return
      if(!this.$checkInput(this.password, "please_fill_%", "Password")) return
      if(!this.$checkInput(this.message, "please_fill_%", "Message")) return
      if(this.service.name == 'aftermessage') { // user am
        if(!this.$checkInput(this.activation_condition.value, "please_fill_%", "Activation Condition")) return
      } else { // third party
        if(!this.$checkInput(this.thirdpartyUserId, "please_fill_%", "Third Party Service Provider")) return
      }
      let key = this.$nHash(this.liam + this.password)
      const cryptext = this.$encrypt(this.message, key)
      this.$apolloClient().mutate({ 
        mutation: gql`mutation ($name: String!, $beneficiaryId: String!, $beneficiaryNick: String!, $senderNick: String!, $message: String!, $type: Int!, $date: DateTime!, $timetrigger: Int!, $thirdpartyUserId: String, $thirdpartyName: String) {
          saveAftermessage(name:$name, beneficiaryId: $beneficiaryId, beneficiaryNick: $beneficiaryNick, senderNick: $senderNick, message:$message, type: $type, date: $date, timetrigger: $timetrigger, thirdpartyUserId: $thirdpartyUserId, thirdpartyName: $thirdpartyName) {
            _id
          }
        }`,
        variables: {
          name: this.name,
          beneficiaryId: this.beneficiaryId,
          beneficiaryNick: this.beneficiaryNick,
          senderNick: this.$store.getters['user/nick'], // beneficiaryNick
          message: cryptext,
          type: this.activation_condition.value,
          date: this.date,
          timetrigger: this.timetrigger,
          thirdpartyUserId: this.thirdpartyUserId,
          thirdpartyName: this.thirdpartyName,
        },
      }).then(({data}) => {
        if(!data) return
        this.newDialog = 'none'
        const _id = data.saveAftermessage._id
        this.$toastSuccess("Message saved")
        const all = this.$store.getters['user/aftermessages']
        const aftermessages = [ { _id, name: this.name, senderId: this.$userId(), beneficiaryId: this.beneficiaryId, beneficiaryNick: this.beneficiaryNick, message: cryptext, timetrigger: this.timetrigger, created: new Date(), thirdpartyUserId: this.thirdpartyUserId }, ...all ]
        this.$store.commit('user/aftermessages', aftermessages)
        this.resetform()
      })
    },
    resetform() {
      this.name = this.password  = this.message = this.decrypted = this.decrypted_copy = null
      this.thirdpartyUserId = this.thirdpartyName = null
      this.updateKey++
    },
    select_3party(tp) {
      if(!!this.thirdpartyUserId) {
        this.thirdpartyUserId = null
      } else
        this.thirdpartyUserId = tp.userId
        this.thirdpartyName = tp.companyName
    },
    icon(am) {
      if(!am.thirdpartyUserId) return 'aftermessage'
      return 'aftermessage_3party'
    },
    async init_new_aftermessage(name) {
      const service = this.$service(name)
      const paidService = await this.$paidService(service.value)
      //if(this.$blockchain != 'mainnet' || !!paidService) { // service is paid
      if( (!this.$isMainnet() && !this.$isRegtest()) || !!paidService) { // service is paid
        this.serviceId = service.value
        this.newDialog = 'block'
      } else { // service not paid
        this.$root.$emit('servicePay', service)
      }
    },
    // recipient compoment
    address_email_to_updated(bapp_user) {  console.log("this.aftermessage:", this.aftermessage)
      if(!!this.aftermessage && !!bapp_user.userId && bapp_user.userId != this.aftermessage.beneficiaryId) {
        this.$toastError('Wrong User')
        this.input = null
        this.liam = null
        this.updateKey++
        return
      }
      this.beneficiaryNick = bapp_user.nick
      this.beneficiaryId = bapp_user.userId
      this.liam = bapp_user.liam
    },
    update_timetrigger(timetrigger) {
      this.timetrigger = timetrigger
    },
    view_aftermessage(aftermessage) {
        this.aftermessage = aftermessage
      if(aftermessage.thirdpartyUserId == this.$userId() && aftermessage.status == 0) {
        this.showActivate = true
      } else {
        this.updateKey++
        this.viewDialog = 'block'
      }
    },
    decrypt() {
      this.decrypted = this.decrypted_copy = null
      try {// console.log("this.aftermessage.message:", this.aftermessage.message, "pass:", this.password)
        const liam = this.$userId() == this.aftermessage.senderId ? this.liam : this.$liam()
        let key = this.$nHash(liam + this.password)
        this.decrypted = this.decrypted_copy = this.$decrypt(this.aftermessage.message, key)
      } catch(error) {
        this.$toastError('Wrong password')
      }
    },
    update_message() {
      if(!this.$checkInput(this.decrypted, "please_fill_%", "Message")) return
      if(!this.$checkInput(this.liam, "please_fill_%", "Beneficary")) return
      let key = this.$nHash(this.liam + this.password)
      const cryptext = this.$encrypt(this.decrypted, key)
      this.$apolloClient().mutate({ 
        mutation: gql`mutation ($_id: ID!, $message: String!) {
          updateAftermessage(_id:$_id, message:$message)
        }`,
        variables: {
          _id: this.aftermessage._id,
          message: cryptext,
        },
      }).then(({data}) => {
        if(!data) return
        this.$toastSuccess("Message saved")
        let all = this.$store.getters['user/aftermessages']
        all = this.$clone(all)
        const am = all.find((elem, i, array) => elem._id == this.aftermessage._id)
        am.message = cryptext
        this.$store.commit('user/aftermessages', all)
        this.decrypted_copy = this.decrypted
      })
    },
    datePicked(date) {// console.log("date:", date, "---------------")
      const year = date.substring(0, 4)
      const day = date.substring(8, 10)
      const month = parseInt(date.substring(5, 7))
      this.date_text = `${day}-${this.$month_text(month-1)}-${year}`
      console.log("year:", year, "month:", month, "day:", day)
      this.showDatePicker = false
    },
    set_date(day, monthIndex, year) {// console.log("setting day:", day, "monthIndex:", monthIndex)
      this.date = new Date(year, monthIndex, day)
      console.log("dateeee:", this.date)
    },
    init_remove(aftermessage) {
      this.aftermessage = aftermessage
      this.showDelete = true
    },
    remove() {
      this.showDelete = false  
      this.$apolloClient().mutate({ 
        mutation: gql`mutation ($_id: ID!) {
          deleteAftermessage(_id:$_id)
        }`,
        variables: {
          _id: this.aftermessage._id,
        },
      }).then(({data}) => {
        if(!data) return
        this.$toastSuccess("Message saved")
        let all = this.$store.getters['user/aftermessages']
        all = this.$clone(all)
        this.$arrayRemove(all, (elem, i, array) => elem._id == this.aftermessage._id)
        this.$store.commit('user/aftermessages', all)
        this.aftermessage = null
      })
    },
    activate() {
      this.showActivate = false  
      this.$apolloClient().mutate({ 
        mutation: gql`mutation ($_id: ID!) {
          activateftermessage(_id:$_id)
        }`,
        variables: {
          _id: this.aftermessage._id,
        },
      }).then(({data}) => {
        if(!data.activateftermessage) return
        this.$toastSuccess("After Message Sended")
        const am = this.$clone(this.aftermessage)
        am.status = 1
        this.$store.commit('user/upsert', { what: 'aftermessages', input: am } )
        this.aftermessage = null
      }).catch((error) => {
        this.$toastError("User is active")
      })
    },
  },
  provide: function () {
    return {
      address_email_to_updated: this.address_email_to_updated,
      update_timetrigger: this.update_timetrigger,
      set_date: this.set_date,
    }
  },
}
</script>

<style>

.aftermessage {
  display: grid;
  grid-template-columns: 50px 1fr 100px 25px;
  cursor:pointer;
}

</style>