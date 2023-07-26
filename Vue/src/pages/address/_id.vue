b<template>
  <div v-if="!!address" id="board_single_header">

    <div id="buttons">
      <!-- middle button -->
      <div v-if="wallet && !!wallet.balance" @click="send()" class="button" id="right_btn" >
        <img src="statics/img/send.svg" width="25" height="25" />
        <div>
          <span>{{ $t("Send BTC") }}</span>
        </div>
      </div>
      <div v-else id="right_btn">
        <send_btn />
      </div>

    </div>

    <!---------- Header ---------->
    <div class="header" id="header" >
      <img class="logo" src="statics/img/wallet.svg" />
      <div class="rows" style="width:fit-content">
        <!-- address -->
        <div style="max-height:40px">
          <div style="display:flex;height:35px;margin-top:10px;margin-bottom:10px">
            <img src="statics/img/qrcode.svg" width="20"  height="20" style="margin-top:8px;margin-right:3px" />
            <q-btn v-if="!editName" flat dense @click="setAddressName" no-caps >
              <span class="text" style="margin-top:3px;font-size:20px">{{ address.name }}</span>
              <q-icon name="mdi-border-color" size="xs" style="color:#ccc;margin-top:3px" />
            </q-btn>        
            <q-input v-else :label="$t('Name')" v-model="address_name" @keyup.enter="setAddressName" autofocus dense style="transform:translate(0px,-7px);padding-left:15px"
                maxlength="35">
              <template slot:after>
                <div>
                  <img @click="setAddressName" width="25" height="25" src="statics/img/enter_key.svg" class="click" />
                </div>
              </template>
            </q-input>
          </div>  
        </div>
       <!-- <p class="desc" style="margin-left:-35px;height:15px;color:gray;font-size:20px"> {{ $t("Current Balance") }} </p> -->
        <!-- balance -->
        <div style="display:flex;" class="hcenter">
          <span class="amount" style="font-size:20px;">{{ address.balance | formatSatoshis }}</span> 
          <span v-if="!!address.unconfirmedBalance" class="amount" style="font-size:16px;margin-left:5px">({{ address.unconfirmedBalance | formatSatoshis }})</span>
        </div>
        <!-- unconfirmed balance -->
        <div v-if="$fiat()" style="display:flex" class="hcenter">
          <span class="fiat" style="color:gray;font-size:20px">{{ address.balance | formatFiat($fiat(), true)}}</span>
          <span v-if="!!address.unconfirmedBalance" class="fiat" style="color:gray;font-size:16px">({{ address.unconfirmedBalance | formatFiat($fiat(), true)}})</span>
        </div>
      </div>
    </div>
    
    <!---------- Left panel ---------->
    <div class="panel" id="left_panel" style="position:relative">
      <p class="title">My Bitcoin Address</p>
      <!-- wallet name -->
      <div style="display:flex">
        <div style="display:inline-block">
          <div style="display:flex">
            <div v-if="wallet" style="display:flex;margin:5px 0 0 10px">
              <span class="title2" style="margin-left:0px">Wallet:</span>
              <q-btn flat dense @click="$go_to(`/wallets/${wallet._id}`)" no-caps  >
                  <span class="text">{{ wallet.name }}</span>
              </q-btn>
            </div>
          </div>  
        </div>
        <q-space />
        <!-- default address btn -->
        <q-icon v-if="default_address == $route.params.id" color="green" name="mdi-download" size="sm" style="margin-top:5px">
          <q-tooltip>
            <span>{{ $t("Default Bitcoin Recipient Address") }}</span>
          </q-tooltip>
        </q-icon>
        <q-icon v-else @click="setDefaultAddress" flat round name="mdi-download" size="sm" style="color:#aaa;cursor:pointer;margin-top:5px">
          <q-tooltip>
            <span>{{ $t("Set as Default Bitcoin Recipient Address") }}</span>
          </q-tooltip>
        </q-icon>
      </div>
      <!-- qr code -->
      <div style="display:flex;justify-content:center">
        <qrcode :value="address._id" :options="{ size: 350 }" style="margin-left:-5px" />
      </div>
      <div style='display: flex'>
        <q-btn flat dense v-clipboard:copy="address._id" color="primary" icon="mdi-content-copy" >
          <q-tooltip>{{ $t("Copy address") }}</q-tooltip>
        </q-btn>
        <span style="margin:5px;color:gray;font-size:0.8em" class="addressId">{{ address._id }}</span>
      </div>
      <!-- legacy show private key -->
      <div v-if="!!address.pkCypher" @click="showPrivateKeyModal.dialog=true" style='display: flex' class="click" >
        <q-btn flat dense color="primary" icon="mdi-key" style="margin-top:-5px" />
        <span style="margin:5px;color:gray" >{{ $t("Show Private Key") }}</span>
      </div>
    </div>

    <!------------ right panel ------------>
    <div id="right_panel">
      <!-- coins -->
      <coinList v-if="address && address.coins.length" :coins="address.coins" :show_load_more="show_load_more && address.coins.length >= pagesize"
                   @showMore="showMore()" />
    </div>

    <!-- check legacy password / ask for passphrase -->
    <dialogg v-if="showPrivateKeyModal.dialog" :prop="showPrivateKeyModal" @selectionDone="show_privatekey" @close="showPrivateKeyModal.dialog=false;passphrase=null">
      <q-input v-model="passphrase" :label="$t('Wallet Password')" autofocus :append-icon="showpassphrase ? 'mdi-eye-off' : 'mdi-eye'" class="passphrase"
                    :type="showpassphrase ? 'text' : 'password'" @click:append="showpassphrase ^= true" dense style="max-width:650px">
        <template v-slot:after>
          <q-icon :name="showpassphrase ? 'visibility_off' : 'visibility'" class="cursor-pointer" @click="showpassphrase ^= true" />
        </template>
      </q-input>
    </dialogg>

    <!-- show mnemonic -->
    <div v-if="privatekey" class="dialog" :style="{ display: 'block' }" >
      <div class="dialog-content">
        <div style="display:flex">
        <img src="statics/img/wallet.svg" height="35" width="35" class="lightblue" />
        <span class="title1">{{ this.wallet.name }}</span>
        </div>
        <div style="margin-top:10px">
          <span class="title2">{{ $t("Private Key") }}</span>
        </div>
        <div style="display:flex">
          <q-btn v-clipboard:copy="privatekey" flat round  color="primary" icon="mdi-content-copy" />
          <span>{{ privatekey }}</span>
        </div>
      </div>
    </div>

  </div>
</template>

<script>
import gql from 'graphql-tag'
import coinList from 'src/components/coinList'
import Vue from 'vue'
import send_btn from 'src/components/send_btn'
import dialogg from 'src/components/dialog'

export default {
  name: 'Address',
  data() {
    return {
      address_name: '',
      editName: false,
      queryAdded: false,
      page: 0,
      pagesize: 15,
      show_load_more: true,
      showPrivateKeyModal: { title:"Check Password", subtitle:"Enter wallet password", buttons:this.$store.getters['misc/yes_no_buttons'], dialog:false, width:300 },             
      passphrase: '',
      showpassphrase: false,
      privatekey: null,
    }
  },
  components: {
    coinList,
    send_btn,
    dialogg,
  },
  computed: {
    wallet() {
      if(!this.address) return
      const wallets = this.$store.getters['user/wallets']
      //console.log("wallets:", wallets)
      if(!wallets.length) return null
      const wallet = wallets.find((w, i, array) => w._id == this.address.parentId)
      //console.log("wallet:", wallet)
      this.$store.commit('misc/db', { name: 'wallet' , value: wallet })
      return wallet || null
    },
    default_address() {
      return this.$store.getters['user/defaultAddress']
    }
  },
  beforeMount() {
    const self = this
    this.onEsc = function() {
      self.privatekey = null
    }
    this.$root.$on('esc', this.onEsc)
  },
  watch: {
  },
  methods: {
    show_privatekey(btnIndex) {      
      if(btnIndex == 1) {
        this.passphrase = ''
        return
      }
      try {
        this.privatekey = this.$decryptLegacy(this.address.pkCypher, this.passphrase)
        this.$toastSuccess("Password is OK")
        this.showPrivateKeyModal.dialog=false
        this.passphrase = ''
       } catch(error) {
        this.$toastError('Wrong password')
      }
    },
    send() {
      if(!this.wallet.balance) {
        this.$toastError("There are no funds in the wallet")
        return
      }
      this.$go_to(`/wallets/send/${this.wallet._id}`)
    },
    setAddressName() {
      if(!this.editName) { // 1st click
        this.address_name = this.address.name
      } else {
        this.$apolloClient().mutate({ // mut. setAddressName
          mutation: gql`mutation setAddressName($_id: String!, $name: String!) {
            setAddressName(_id: $_id, name:$name) 
          }`,
          variables: {
            _id: this.$route.params.id,
            name: this.address_name
          },
        }).then( (result) => {
          if(result.data.setAddressName) {
            this.address.name = this.address_name
            this.$toastSuccess("Address name updated successfully.")
          }
        }).catch((error) => {
          console.error("mutation setAddressName error", error)  // eslint-disable-line no-console
        })
      }
      this.editName = !this.editName
    },
    setDefaultAddress() {
      console.log("setdefaultAddress") // 
      this.$apolloClient().mutate({ 
        mutation: gql`mutation setUserDefaultAddress($addressId: String!) {
          setUserDefaultAddress(addressId: $addressId) 
        }`,
        variables: {
          addressId: this.address._id,
        },
      }).then( ({data}) => { console.log("data.setUserDefaultAddress:", data.setUserDefaultAddress, this.address._id)
        if(data.setUserDefaultAddress) {
          this.$store.commit("user/defaultAddress", this.address._id)
          this.$toastSuccess("Operation successful")
        }
      }).catch((error) => {
        console.error("mutation setUserDefaultAddress error", error)  
      })
    },
    showMore () {
      this.page++
      // Fetch more data and transform the original result
      this.$apollo.queries.address.fetchMore({
        variables: {
          _id: this.$route.params.id,
          paging: { page: this.page, pagesize:this.pagesize }
        },
        // Transform the previous result with new data
        updateQuery: ( { address }, { fetchMoreResult } ) => {
          const more_coins = fetchMoreResult.address.coins
          //console.log("more_coins:", more_coins)
          if(!more_coins.length || more_coins.length < this.pagesize) this.show_load_more = false
          more_coins.forEach( c => {
            const pos = address.coins.findIndex((elem, i, array) => elem._id == c._id)
            if(pos == -1) 
              address.coins.push(c)
          })
          return { address }
        },
      })
    },
  },
  apollo: {
    $client() { return this.$apolloClientName() },
    address: { // address query.
      query: gql`query ($_id: String!, $paging: Paging!, $bytx: Boolean) {
        address(_id: $_id) {
          _id
          name
          balance
          unconfirmedBalance
          parentId
          index
          pkCypher
          coins(paging: $paging, bytx: $bytx) {
            _id
            time
            height
            value
            concept
            icon
            nicks
            sender
            tx
          }
        }
      }`,
      variables() {
        return {
          _id: this.$route.params.id,
          paging: { page: 0, pagesize: this.pagesize },
          bytx: !!this.$userSetting('group-utxos-by-tx')
        }
      },
      fetchPolicy: 'network-only',
      subscribeToMore: [{ // newCoin
        document: gql`subscription newCoin($scriptId: String!) {
          newCoin(scriptId: $scriptId) {
            _id
            time
            height
            value
            concept
            icon
            nicks
            sender
            addressConfirmedBalance
            addressUnconfirmedBalance
            tx
          }
        }`,
        variables () {
          return {
            scriptId: this.$route.params.id,
          }
        },
        updateQuery: function( { address }, { subscriptionData }) {
          const self = this
          const newCoin = subscriptionData.data.newCoin
          console.log('newCoin address._id newCoin', newCoin)
          newCoin.__typename = "Coin"
            if(!!newCoin.addressConfirmedBalance || !!newCoin.addressUnconfirmedBalance) {
            Vue.set(address, 'balance', newCoin.addressConfirmedBalance)
            Vue.set(address, 'unconfirmedBalance', newCoin.addressUnconfirmedBalance)
          }
          if( !!address.coins ) { // coinList
            let pos
            if(self.$userSetting('group-utxos-by-tx'))
              pos = address.coins.findIndex(coin => coin.tx == newCoin.tx)
            else
              pos = address.coins.findIndex(coin => coin._id == newCoin._id)
            if(pos == -1) { // add at the beginning
              Vue.set(address, 'coins', [newCoin, ...address.coins] )
            } else { // replace or add value
              const coin = address.coins[pos]
              if(self.$userSetting('group-utxos-by-tx')) {
                coin.value += newCoin.value
                coin.height = newCoin.height
              } else  
                self.$mergeObjs(coin, newCoin)
            }
          } else { // 1st payment
            Vue.set(address, 'coins', [newCoin] )
          }
          return { address }
        },
      },
      ],
    },
  },
}

</script>
