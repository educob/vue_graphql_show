module.exports = {
  'sanity test': function(browser) {
    let btc_address
    browser
      .url('http://localhost:8080/regtest')
      login(browser, 'john201@gmail.com', 'tonto')
      new_wallet(browser, 'wallet 2', 'pass111', false)
      //login(browser, 'john2@gmail.com', 'tonto', 'Automatic Test')
      
      get_text(browser, '.addressId', 'btc_addr')
      faucet(browser, 'btc_addr', 2)
      mine(browser, 3)
      browser.pause(500)

      browser.waitForElementVisible('.addressId', 5000) // wait to be in send.js
      .click("#right_btn")  // send
      for(let i=0; i<20; i++) {
      //browser.click(".wallet_0") // go to 1st wallet
        send_wallet(browser, 'john@gmail.com', 0.00014 + count*0.0001, 'Automatic Test: '+count )
        mine(browser, 1)
        browser.pause(300)
        count++
      }
      browser.pause(2000000)
      //new_wallet(browser, 'wallet', 'pass111')
      //get_text(browser, '.addressId', 'btc_addr')
      //faucet(browser, 'btc_addr')
      mine(browser, 1)
      // end
      browser.pause(2000000)
      .end()
    }
  }

let vars = {}
let count = 0

function send_wallet(browser, recipient, amount, concept) {
  browser.waitForElementVisible('.addressTo', 15000) // wait .addressTo
  .setValue(".addressTo", recipient) // recipient
  .setValue(".btcAmount", amount) // amount
  .setValue(".concept", concept) // concept 
  .click(".send_btn")  // send_btn
  .waitForElementVisible('.passphrase', 1000) // wait .addressTo
  .setValue(".passphrase", 'pass111') // amount
  .click(".modal_btn_0")
}

function register(browser, user, pass) {
  browser.waitForElementVisible('#user_btn', 10000) // wait login button
  .pause(3000)
  .click("#user_btn") // click login button
  .waitForElementVisible('.login_email', 10000)
  .click("#register_tab") // click login button
  .waitForElementVisible('.register_cb1', 1000)
  .pause(500)
  .click(".register_cb1") // click register cb 1
  .click(".register_cb2") // click register cb 2
  .click(".register_accept") // click accept terms
  .setValue(".register_email", user) // email
  .setValue(".register_pass", pass) // pass
  .setValue(".register_confirm_pass", pass) // confirm pass
  .click(".register_submit") // click 
  .waitForElementVisible('.login_submit', 3000)
  .click(".login_submit") // click
  .waitForElementVisible('#layout', 5000) 
  .assert.urlContains(`/wallets`) // wallets page 
}


function login(browser, user, pass) {
  browser.waitForElementVisible('#user_btn', 10000) // wait login button
  .pause(3000)
  .click("#user_btn") // click login button
  .waitForElementVisible('.login_email', 8000)
  .setValue(".login_email", user) // email
  .setValue(".login_password", pass) // pass
  .click(".login_submit") // click 
  .waitForElementVisible('#layout', 5000) 
  .assert.urlContains(`/wallets`) // wallets page 
}

function mine(browser, num) {
  browser.waitForElementNotVisible('.dialog-content', 5000) 
  for(let i=0; i<num; i++) 
    browser.click(".mine_btn") // click mine
}

function faucet(browser, addr, num=1) {
  // faucet
  for(let i=0; i<num; i++) {
    browser.click(".faucet_btn") // click faucet
    .waitForElementVisible('.faucet_addr', 1000) 
    .perform(function () {
      browser.setValue(".faucet_addr", vars[addr]) // btc-address 
    })      
    .waitForElementVisible('.modal_btn_0', 1000) 
    .click(".modal_btn_0") // click faucet
  }
}

function get_text(browser, elem, var_name) {
  browser.getText(elem, function(result) { 
    vars[var_name] = result.value
    console.log(var_name, ":", result.value)
  })
}

function new_wallet(browser, name, pass, skip_1st_step=false ) {
  if(!skip_1st_step)
    browser.click(".new_wallet_btn") // click new Wallet popup
    browser
    .waitForElementVisible('#new_wallet_dialog', 3000) 
    .setValue(".wallet_name", name) // email
    .setValue(".wallet_pass", pass) // pass 
    .click(".wallet_pass_set") // click wallet pass set
    .waitForElementVisible('.new_wallet_save', 5000)
    .click(".new_wallet_save") // click save wallet
}
