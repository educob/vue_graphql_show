<template>
  <div style="max-height:55px" >
    <div class="line1" >
      <q-btn @click="showQr(addr._id)"  color="primary" style="margin-left:-3px" round flat dense  icon="mdi-qrcode"  >
        <q-tooltip>Show Bitcoin Address QR code</q-tooltip>
      </q-btn>
      <!-- address name -->
      <q-btn v-if="addr && !editName" flat dense @click="setName" no-caps style="width:fit-content;height:1.5em;margin-left:-10ps" >
        <div style="display:flex;white-space:nowrap">
          <span >{{ name }}</span>
          <q-icon name="mdi-border-color" size="xs" style="color:#ccc;margin-left:3px;margin-top:2px" />
        </div>
      </q-btn>
      <q-input v-else :label="$t('Name')" v-model="name" @keyup.enter="setName" autofocus dense style="max-height:23px">
        <template slot:after>
          <q-btn size="sm" @click="setName" color="primary" style="" icon="img:statics/img/enter_key.svg" />
        </template>
      </q-input>
      <!-- balance -->
      <span style="color:var(--light-blue);font-size:1.3em;margin-right:10px;margin-top:1px;text-align:right">{{ addr.balance + addr.unconfirmedBalance | formatSatoshis }}</span>
      <!-- set default address -->
      <q-icon v-if="default_address == addr._id" color="green" name="mdi-download" size="sm" style="margin-top:5px">
        <q-tooltip>
          <span>{{ $t("Default Bitcoin Recipient Address") }}</span>
        </q-tooltip>
      </q-icon>
      <q-icon v-else @click="setDefaultAddress" flat round name="mdi-download" size="sm" style="color:#aaa;cursor:pointer;margin-top:5px">
        <q-tooltip>
          <span>{{ $t("Set as Default Bitcoin Recipient Address") }}</span>
        </q-tooltip>
      </q-icon>
    </div><!-- copy / address -->
    <div class="line2">
      <q-btn v-clipboard:copy="addr._id" flat round color="primary" icon="mdi-content-copy" style="transform:translate(-8px,-15px)" >
        <q-tooltip>{{ $t("Copy Bitcoin Address") }}</q-tooltip>
      </q-btn>
      <q-btn flat dense @click="$go_to(`/address/${addr._id}`)" style="text-transform: none;width:fit-content;font-size:0.8em;transform:translate(0px,-15px)" :label="addr._id" />
      <div />
    </div>

    <!-- show qr code -->
    <dialogg v-if="showQrModal.dialog" :prop="showQrModal" @close="showQrModal.dialog=false" >
      <span style="font-size:0.9em">{{addr._id}}</span><br/><br/>
      <div style="display:flex;justify-content:center;margin-bottom:20px">
        <qrcode :value="addr._id" :options="{ size: 200 }" style="transform:translate(0px,-15px);margin-bottom:-30px" />
      </div>
    </dialogg>
    
  </div>
</template>

<script>
import gql from 'graphql-tag'
import dialogg from 'src/components/dialog'

export default {
  
  data() {
    return {
      name: '',
      editName: false,
      showQrModal:  { title:'Addres QR Code', text:'', buttons:[], dialog:false },
    }
  },
  props: {
    addr: [Object],
  },
  components: {
    dialogg,
  },
  mounted() {
    this.name = this.addr.name
  },
  computed: {
    default_address() {
      return this.$store.getters['user/defaultAddress']
    }
  },
  methods: {
    showQr(addressId) {
      console.log("showing:", addressId)
      this.showQrModal.dialog=true
    },
    setName() {
      if(!this.editName) { // 1st click
        //this.name = this.addr.name
      } else {
        this.$apolloClient().mutate({ // mut. setAddressName
          mutation: gql`mutation setAddressName($_id: String!, $name: String!) {
            setAddressName(_id: $_id, name:$name) 
          }`,
          variables: { 
            _id: this.addr._id,
            name: this.name
          },
        }).then( ( {data} ) => {
          if(data.setAddressName) {
            this.$toastSuccess("Address name updated successfully.")
          }
        }).catch((error) => {
          console.error("mutation setAddressName error", error)  
        })
      }
      this.editName ^= true
    },
    setDefaultAddress() {
      console.log("setdefaultAddress") // 
      this.$apolloClient().mutate({
        mutation: gql`mutation setUserDefaultAddress($addressId: String!) {
          setUserDefaultAddress(addressId: $addressId) 
        }`,
        variables: {
          addressId: this.addr._id,
        },
      }).then( ({data}) => {
        if(data.setUserDefaultAddress) {
          this.$store.commit("user/defaultAddress", this.addr._id)
          this.$toastSuccess("Operation successful")
        }
      }).catch((error) => {
        console.error("mutation setUserDefaultAddress error", error)  
      })
    },
  },
}
</script>

<style scoped>


.line1 {
  display: grid;
  grid-template-columns: 40px 1fr 1fr 30px;
}

.line2 {
  display: grid;
  grid-template-columns: 30px 1fr auto;
  margin-bottom:-15px;
  margin-top:5px
}

</style>
