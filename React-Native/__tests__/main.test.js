const {remote} = require('webdriverio');
const util = require('../src/test/util')

// adb shell dumpsys  window displays | grep bitpass



const capabilities = {
  platformName: 'Android',
  'appium:automationName': 'UiAutomator2',
  'appium:deviceName': 'Android',
  'appium:appPackage': 'xxx',
  'appium:appActivity': 'xxx',
};

const wdOpts = {
  host: 'localhost',
  port: 4723,
  logLevel: 'info',
  capabilities,
  sessionId: 'xxx'
};

(async function runTest() {
  //await util.fundAddress("mgXPaXAQKfTyPPashbGSzKbdooVA1CQhme")
  //const balance = await util.getAddressBalance("mgXPaXAQKfTyPPashbGSzKbdooVA1CQhme")
  //console.log("balance:", balance) ; return
  //await util.mine(5)
  //const utxos = await util.getAddressUtxos("mgXPaXAQKfTyPPashbGSzKbdooVA1CQhme")
  //console.log("utxos:", utxos) ; return

  const clientId = '648c2c28fc5fca71ef0ca06d'
  const clientEmail = 'regtestclient@gmail.com'
  const pin1 = [1, 2, 3, 4, 5, 6]
  const pin2 = [6, 5, 4, 3, 2, 1]
  const driver = await remote(wdOpts);
  try {    
    inherintance2beneficiaries(driver, clientId, clientEmail, pin1, pin2)
    //inherintance2benefadded3benef(driver, clientId, clientEmail, pin1, pin2)
  } finally {
    await driver.pause(1000);
    //await driver.deleteSession();
  }

})().catch(console.error);

async function inherintance2benefadded3benef(driver, clientId, email, pin1, pin2) {
  const regtestRestoreCode = 'U2FsdGVkX19vlvDozLMRiCQGf2fq6LUjvPLd0wIScNkyspoPy7yzb9IQxeT7CRmyg6QuGxd8X/2Hcit4j3FBzVQq3fckDXI+BHh+v/agrMIgYV20FkFQyPdBZg0Qf6JTOR6ifU/2dmoAxzkwJu3vsDi1K6OxjOD780jMyblljvqBFp0qcSYb+Pc5cBux82fokds9xT2VCOyykjjWIhMP6qdz4ZFmWf/GFDIRUyj59Wk='
  await util.resetAppPin(clientId)
  const name = 'Inheritance 2->3 benef'
  const percentages = [9, 91]
  const  beneficiaries = util.getBeneficiaries(percentages)
  const { _id, logEntryId } = await util.createInheritance(clientId, name, beneficiaries )
  await driver.pause(7000)
  await driver.$('//*[@text="Welcome"]').waitForDisplayed(5000, false)
  await register(driver, email, pin1, pin2 )
  //await createAccount(driver, 'safeandeffective1')
  await restoreAccount(driver, regtestRestoreCode, 'safeandeffective1')
  //const noInheritances = await driver.$('//*[@text="You have no inheritances"]')
  //console.assert(noInheritances.getText() === 'You have no inheritances', '"You have no inheritances" not found.');
  await driver.pause(4000)
  // accept new inheritance
  await acceptInheritanceChanges(driver)
  await driver.pause(2000)
  // fund scriptAddressId
  const faucet = await driver.$("~faucet")
  await faucet.click();
  await driver.pause(4500)
  // add extra beneficiary
  const addr = util.getRandomAddresses(1)
  const newBeneficiary = {
    name: 'Beneficiary',
    surname: 'New',  
    email: "beneficiary_new@gmail.com",
    phone: "+3-555-55-55",
    percentage: 20,
    bitcoinAddress: util.getRandomAddresses(1)
  }
  beneficiaries.push(newBeneficiary)
  beneficiaries[0].bitcoinAddress = util.getRandomAddresses(1)
  beneficiaries[1].percentage = 71
  console.log("New beneficiaries:", beneficiaries)
  const updatedInheritance = await util.updateInheritance(_id, clientId, name, beneficiaries)
  // await driver.$('//android.widget.TextView[contains(@text, "Next")]');

  await driver.pause(7000)

  await acceptInheritanceChanges(driver)
  await driver.pause(2000)

  await util.clientDeceased(clientId)
  await driver.pause(500)

  const inheritances = await util.getInheritances(clientId)

  for(const inheritance of inheritances) {
    const tx_hex = util.sing2HeirsTx(inheritance)
    const broadcasted = await util.broadcastTx(tx_hex)
    console.log("broadcasted:", broadcasted)
  }
  
  await driver.pause(4500)

  for(const inheritance of inheritances) {
    const balances = []
    for(const benef of inheritance.beneficiaries) {
      const balance = await util.getAddressBalance(benef.bitcoinAddress)
      balances.push(balance.confirmed)
      console.log(`${benef.name}(${benef.percentage}): ${JSON.stringify(balance)}`)
    }
    const ok = util.checkAmountsPercentage(balances, [9, 71, 20])
    if(!!ok) 
      console.log("Heir transaction ✅")
    else {
      console.log("Heir transaction 💩 💩 💩 💩")
      console.log("Rercentages:", percentages)
      console.log("Received:", balances)
    }
  }

}

async function inherintance2beneficiaries(driver, clientId, email, pin1, pin2) {
  const regtestRestoreCode = 'U2FsdGVkX19vlvDozLMRiCQGf2fq6LUjvPLd0wIScNkyspoPy7yzb9IQxeT7CRmyg6QuGxd8X/2Hcit4j3FBzVQq3fckDXI+BHh+v/agrMIgYV20FkFQyPdBZg0Qf6JTOR6ifU/2dmoAxzkwJu3vsDi1K6OxjOD780jMyblljvqBFp0qcSYb+Pc5cBux82fokds9xT2VCOyykjjWIhMP6qdz4ZFmWf/GFDIRUyj59Wk='
  await util.installApp(clientId)
  const percentages = [9, 91]
  const beneficiaries = util.getBeneficiaries(percentages)
  await util.createInheritance(clientId, 'Test Simple Inheritance', beneficiaries )
  await driver.pause(7000)
  await driver.$('//*[@text="Welcome"]').waitForDisplayed(5000, false)
  await register(driver, email, pin1, pin2 )
  await createAccount(driver, 'safeandeffective1')
  //await restoreAccount(driver, regtestRestoreCode, 'safeandeffective1')

  await driver.pause(2000)
  //const noInheritances = await driver.$('//*[@text="You have no inheritances"]')
  //console.assert(noInheritances.getText() === 'You have no inheritances', '"You have no inheritances" not found.');
  await driver.pause(6000)
  // accept new inheritance
  await acceptInheritanceChanges(driver)
  await driver.pause(2000)
  // fund scriptAddressId
  const faucet = await driver.$("~faucet")
  await faucet.click();

  // await driver.$('//android.widget.TextView[contains(@text, "Next")]');

  await driver.pause(5000)
  await util.clientDeceased(clientId)
  await driver.pause(2500)

  const inheritances = await util.getInheritances(clientId)

  for(const inheritance of inheritances) {
    const tx_hex = util.sing2HeirsTx(inheritance)
    const broadcasted = await util.broadcastTx(tx_hex)
    console.log("broadcasted:", broadcasted)
  }
  
  await driver.pause(4500)

  for(const inheritance of inheritances) {
    const balances = []
    for(const benef of inheritance.beneficiaries) {
      const balance = await util.getAddressBalance(benef.bitcoinAddress)
      balances.push(balance.confirmed)
      console.log(`${benef.name}(${benef.percentage}): ${JSON.stringify(balance)}`)
    }
    const ok = util.checkAmountsPercentage(balances, percentages)
    if(!!ok) 
      console.log("Heir transaction ✅")
    else {
      console.log("Heir transaction 💩 💩 💩 💩")
      console.log("Rercentages:", percentages)
      console.log("Received:", balances)
    }
  }

}

async function register(driver, email, pin1, pin2) {
  // email
  await driver.$('//*[@text="Welcome"]').waitForDisplayed(5000, false)
  await populateField(driver, 'email', email)
  const next = await driver.$('//*[@text="Next"]');
  await next.click();
  await driver.pause(1000)
  // register (pin)
  await enterPin(driver, pin1, true )
  // set pin
  await enterPin(driver, pin2, true )
  await driver.pause(1000)
}

async function enterPin(driver, pin, understood=false) {
  if(!!understood) {
    const understood = await driver.$('//*[@text="Understood"]');
    await understood.click();
    await driver.pause(200)
  }
  for(const num of pin) {
    const number = await driver.$(`//*[@text="${num}"]`);
    await number.click();
    await driver.pause(100)
  }
  await driver.pause(500)
  const next = await driver.$('//*[@text="Next"]');
  await next.click();
  await driver.pause(100)
}

async function populateField(driver, id, value) {
  const field = await driver.$(`~${id}`);
  field.setValue(value);
  await driver.pause(200)
}

async function createAccount(driver, passphrase,) {
  const create = await driver.$('//*[@text="Create Account"]');
  await create.click();
  await driver.pause(1200)
  // understood popup
  const understood = await driver.$('//*[@text="Understood"]');
  await understood.click();
  await driver.pause(200)
  // passphrase
  await populateField(driver, 'passphrase', passphrase)
  await driver.pause(200)
  // button create
  const create2 = await driver.$('//*[@text="Create"]');
  await create2.click();
  await driver.pause(200)
}

async function restoreAccount(driver, restorecode, passphrase,) {
  const create = await driver.$('//*[@text="Restore Account"]');
  await create.click();
  await driver.pause(1200)
  // understood popup
  const understood = await driver.$('//*[@text="Understood"]');
  await understood.click();
  await driver.pause(200)
  // restore code
  await populateField(driver, 'restorecode', restorecode)
  await driver.pause(200)
  // passphrase
  await populateField(driver, 'passphrase', passphrase)
  await driver.pause(200)
  // button create
  const create2 = await driver.$('//*[@text="Restore"]');
  await create2.click();
  await driver.pause(200)
}

async function acceptInheritanceChanges(driver) {
  console.log("Getting Accept Button")
  const accept1 = await driver.$(`~accept`);
  await accept1.click();
  await driver.pause(500)
  
  console.log("Getting Accept2 Button")
  const accept2 = await driver.$(`~accept2`);
  await accept2.click();
  await driver.pause(1000)
}



  // await driver.pause(15000)
  // const number6 = await driver.$('//*[@text="6"]');
  // await number6.click();
  // $('~username').setValue("shamique");
  // $("~loginstatus").waitForDisplayed(11000);
  // const status = $("~loginstatus").getText();
  //  expect(status).to.equal('fail');
