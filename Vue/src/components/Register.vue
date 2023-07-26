<template>
  <div >
    <q-input :label="$t('Email')" v-model="email" :rules="emailRules" dense class="register_email" tabindex="1"/>
    <q-input :label="$t('Nick')" v-model="nick" dense tabindex="2" style="margin-bottom:15px" />
    <q-input :label="$t('Password')" v-model="password" :rules="passwordRule" class="register_pass"
                  dense :type="showpassword ? 'text' : 'password'" tabindex="3">
      <template v-slot:after>
        <q-icon :name="showpassword ? 'visibility_off' : 'visibility'" class="cursor-pointer" @click="showpassword ^= true" />
      </template>
    </q-input>
    <q-input :label="$t('Confirm Password')" v-model="confirm_password" :rules="passwords_match" 
              :type="showpassword ? 'text' : 'password'" class="register_confirm_pass" tabindex="4"/>

    <!-- register button -->
    <div class="button register_submit" @click="register"  style="display:flex;margin-top:35px;margin-left:10px"tabindex="5"  >
      <img src="statics/img/ok.svg" width="25" height="25" />
      <span class="vcenter" style="margin-left:10px;margin-right:10px">{{ $t("Register") }}</span>
    </div>

    <!-- terms dialog -->
    <div class="dialog" :style="{ display: registerDialog }" style="z-index:3001" >
      <div class="dialog-content" style="max-width:calc(100vh - 100px);text-align: left" >
        <span>Dear Bapper,</span><br /><br />
        <span style="color:#008CB4">Welcome to Bapp!</span><br /><br />
        <span>We would like to personally thank you for your trust in Bapp - the first world's Bitcoin User Interface for real humans.</span><br /><br />
        <span>At </span><span style="color:#008CB4">Bapp</span><span> we believe that savvy pioneers like yourself should maximize the value of their assets by having access to the most innovating tools to manage your Bitcoin.</span><br /><br />
        <span style="color:#008CB4">Bapp</span><span> is dedicated to providing the easiest platform for Bitcoin and at the center of everything we do is you - our valued user.</span><br /><br />
        <span>We are just starting with this first version of our anonymous and non custodial solution, so we ask you to be gentle but firm, giving us your feedback to improve Bapp until you are fully satisfied. If you subscribe to our Newsletter at bapp.plus you will be able to know more about Bitcoin and </span><span style="color:#008CB4">Bapp.</span>
        <span> We will never link your email with your </span><span style="color:#008CB4">Bapp</span><span> user, so you'll always will be anonymous for us. </span><br /><br />
        <!--<span>In the meantime, you can get started using our products with these </span>
        <u><span style="color: #00a3d8;">three easy steps</span></u><u> </u> to getting your Bitcoins in your Bapp Account. </span><br /><br />-->
        <span>Without further ado, I wish you a warm welcome and best of luck with your investments.</span>
        <div>Kind Regards, </div>
        <div style="margin-top:10px"><em><span style="color: #00a3d8;">The Founders at </span><span style="color:#008CB4">Bapp</span></em></div>
        <div tyle="display:flex">
          <q-checkbox color="success" v-model="cb1" hide-details class="register_cb1" />
          <span style="color: #5f5f5f;">{{ $t("by_click_I_acceipt") }} </span><u><span style="color: #00a3d8;">
          <a href="../statics/landing/terms_and_conditions.html" target="_blank"> {{ $t("bapp_terms_cond") }}</a></span></u>
        </div>
        <div tyle="display:flex">
          <q-checkbox color="success" v-model="cb2" hide-details class="register_cb2" />
          <span style="color: #5f5f5f;">{{ $t("by_click_I_acceipt") }} </span><u><span style="color: #00a3d8;">
          <a href="../statics/landing/privacy_and_cookies.html" target="_blank"> {{ $t("Bapp_priv_cookies") }}</a></span></u>
        </div>

        <div style="display:flex">
          <div class="button register_accept" @click="accept"  style="display:flex;margin-top:35px;margin-left:10px" >
            <img src="statics/img/ok.svg" width="25" height="25" />
            <span class="vcenter" style="margin-left:10px;margin-right:10px">{{ $t("Accept") }}</span>
          </div>

          <div class="button" @click="accept"  style="display:flex;margin-top:35px;margin-left:10px" >
            <img src="statics/img/close_red.svg" width="25" height="25" style=";filter:none" />
            <span class="vcenter" style="margin-left:10px;margin-right:10px">{{ $t("Decline") }}</span>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script>
import gql from 'graphql-tag'
import { sha256 } from "js-sha256"

export default {
  data: () => ({
    registerDialog: 'block',
    email: '',
    nick: '',
    password: '',
    confirm_password: '',
    emailRules: [
      v => !!v || 'E-mail is required',
      v => /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(v) || 'E-mail must be valid'
    ],
    passwordRule: [
      v => !!v || 'Password is required. Min. 6 characters',
    ],
    showpassword: false,
    cb1: false,
    cb2: false,
  }),
  props: {
  },
  mounted() {
  },
  computed: {
    passwords_match() {
      return [
        v => !!v || 'Password confirmation is required',
        (v) => v == this.password || 'Passwords must match' 
      ]
    }
  },
  methods: {
    async register() {
      if(!this.$isEmail(this.email)) {
        this.$toastError("Email is not correct")
        return
      }
      if(!this.$checkInput(this.nick, "please_fill_%", "Nick")) return
      if(this.nick == this.email.toLowerCase().split("@")[0]) {
        this.$toastError("Nick cannot be the same as the email name")
        return
      }
      if(this.password.length < 5) {
        this.$toastError("Password must be at least 5 character long")
        return
      }
      if(this.password != this.confirm_password) {
        this.$toastError("Both password must be the same")
        return
      }
      await this.$register(this.email, this.nick, this.password)
    },
    accept() {
      if(!this.cb1) {
        this.$toastInfo("You must accept Bapp Terms & Conditions")
        return
      }
      if(!this.cb2) {
        this.$toastInfo("You must accept Bapp Privacy Policy & Cookies")
        return
      }
      this.registerDialog='none'
    },
    decline() {
      this.registerDialog = 'none'
      this.$emit('declined')
    }
  },
};
</script>

<style scoped>
  a {  text-decoration: none }  
</style> 