import { Box, Button, Center, Text, VStack } from 'native-base';
import { Modal, ScrollView, Pressable, View, ImageBackground, Dimensions, Vibration } from 'react-native';
import React, { useState, useEffect }  from 'react';
import Clipboard from '@react-native-community/clipboard';


import { H1 } from '../components';
import { Storage } from '../utils/Storage';
import { modal, notification, beneficiary, toast, inheritancesCSS, balanceCSS, buttonImage } from '../utils/styles';
import { callMother } from '../utils/util'
import { store } from '../store/store'
import '../languages'
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-root-toast';
import { Toaster } from '../components/Toaster'
import { setInheritance, setDeceased } from '../store/user/slice'
import { Screens} from '../navigation/types';
import sb  from "satoshi-bitcoin"
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';


import QRCode from 'react-native-qrcode-svg';

import { formatDate } from '../utils/util'

import QrSVG from '../assets/img/qrcode.svg';
import CopySVG from '../assets/img/copy.svg';
import SendSVG from '../assets/img/pay.svg'
import FaucetSVG from '../assets/img/faucet.svg'

import { fundTestAddress, createHeirsPsbt, isPsbtPending } from '../utils/bitcoin'
const sha256 = require("js-sha256")

export const InheritanceScreen = ( { navigation, route } ) => {
  const { t } = useTranslation()
  const { inheritanceId } = route.params

  const inheritance = useSelector((state) => state.user.inheritances[inheritanceId]);

  const [ showQR, setShowQR ] = useState(false);

  // truncated btc address
  const [truncatedAddress, setTruncatedAddress] = useState('')

  // notification
  const [ isAcceptModalVisible, setAcceptModalVisible ] = useState(false);
  const [ isRejectModalVisible, setRejectModalVisible ] = useState(false);


  const [ isDeceasedModalVisible, setDeceasedModalVisible ] = useState(false);

  const screenWidth = Dimensions.get('window').width;

  const deceased = useSelector((state: RootState) => state.user.deceased)

  useEffect(() => {
    setDeceasedModalVisible(deceased)
  }, [deceased])


  const [ showFaucet, setShowFaucet ] = useState(false);

  useEffect( () => {
    if(!!inheritance?.scriptAddressId) { // 66 character takes 660px. copy imsg is 60px. 
      const skipLetters = Math.floor( (660 - screenWidth*0.85  - 40)/20)
      const newText =
      inheritance.scriptAddressId.slice(0, 33 - skipLetters) + '...' + inheritance.scriptAddressId.slice(33 + skipLetters);
      setTruncatedAddress(newText);
      if(['Regtest', 'Testnet'].includes(inheritance.network) && !inheritance.balance && !inheritance.unconfirmed)
        setShowFaucet(true)
    }
    // dump inheritance
    if(!!inheritance) {
      const copy = JSON.parse(JSON.stringify(inheritance))
      delete copy.kp
      delete copy.beneficiaries
      console.log("useEffect inheritance:", JSON.stringify(copy, null, 4))

    // modify inheritance detail
    return
    const copy2  = JSON.parse(JSON.stringify(inheritance))
    copy2.psbtUpdate = 'Fri Jun 09 2023 12:01:50 GMT+0100'
    store.dispatch(setInheritance( copy2 ));
    const inheritances = store.getState().user.inheritances
    //Storage.setInheritances(inheritances)

    }
  }, [inheritance])

  const accept = async () => { //console.log("accept called")
    Vibration.vibrate(15)
    const copy = JSON.parse(JSON.stringify(inheritance))
    copy.beneficiaries = copy.proposedBeneficiaries // new beneficiaries needed in createHeirsPsbt
    const psbt = await createHeirsPsbt(copy)
    copy.psbt = null
    copy.psbtHash = null // if psbt==null, then psbtHash also is null
    if(!!psbt) { //
      copy.psbt = psbt.toBase64()
      copy.psbtHash = sha256(copy.psbt)
      copy.psbtUpdate = (new Date()).toString()
      //console.log("new copy.psbt:", copy.psbt)
      console.log("new copy.psbtHash:",  copy.psbtHash, copy.psbtUpdate)
    }
    const token = store.getState().user.token
    const logEntryId = inheritance?.logEntryId
    const psbtValue = copy.psbt === null ? null : `"${copy.psbt}"`;
    const body = `mutation { acceptInheritanceUpdate ( logEntryId: "${logEntryId}", psbt: ${psbtValue}, token: "${token}" ) }`
    console.log("body:", body)
    const response = await callMother('acceptInheritanceUpdate', body)
    if(!response) {
      // log ???
      Toast.show(<Toaster { ...toast.error } message={ t("Something went wrong") } />, toast.conf )
      return
    }
    delete copy.proposedBeneficiaries
    delete copy.logEntryId // notification is removed from app
    delete copy.beneficiariesChanges
    store.dispatch(setInheritance( copy ))
    await Storage.setInheritances(store.getState().user.inheritances)
    setAcceptModalVisible(false)
    Toast.show(<Toaster { ...toast.ok }  message={ t("Operation Successful") } />, toast.confLong )
  }

  const reject = async () => {
    Vibration.vibrate(15)
    const token = store.getState().user.token
    const logEntryId = inheritance?.logEntryId
    const body = `mutation { rejectInheritanceUpdate ( logEntryId: "${logEntryId}"token: "${token}" ) }`
    const response = await callMother('rejectInheritanceUpdate', body)
    if(!response) {
      // log ???
      Toast.show(<Toaster { ...toast.error } message={ t("Something went wrong") } />, toast.conf )
      return
    }
    const copy = JSON.parse(JSON.stringify(inheritance))
    delete copy.proposedBeneficiaries
    delete copy.logEntryId // notification is removed from app
    delete copy.beneficiariesChanges
    store.dispatch(setInheritance( copy ))
    await Storage.setInheritances(store.getState().user.inheritances)
    setRejectModalVisible(false)
    Toast.show(<Toaster { ...toast.ok }  message={ t("Operation Successful") } />, toast.confLong )
  }

  const copyAddress = (addressId: string, name=null, surname=null) => {
    Vibration.vibrate(15);
    Clipboard.setString(addressId)
    let nick = 'Inheritance\n '
    if(!!name) 
      nick = `${name} ${surname}'s\n`
    const message = `${nick} ${t("Bitcoin Address copied")}`
    console.log("message:", message)
    Toast.show(<Toaster { ...toast.ok } message={ message } />, toast.conf )
  }

  // send
  const send = () => {
    Vibration.vibrate(15);
    navigation.navigate( Screens.SEND, { inheritanceId } )
  }


  // test
  const faucet = () => { 
    setShowFaucet(false)
    Vibration.vibrate(15);
    fundTestAddress(inheritance.scriptAddressId, 2100)
    Toast.show(<Toaster { ...toast.ok } message={ t("Wait 10-20 minutes for confirmation.") } />, toast.conf )
  }


  const hideDeceasedModal = () => {
    setDeceasedModalVisible(false)
    store.dispatch(setDeceased( false ))
  }


  return (
    <ImageBackground source={require('../assets/img/dark_background.png')} style={{width: '100%', height: '100%'}}>
      <ScrollView>
        <Center w="100%">
          <VStack alignItems='center' space={2} mt={7} width='100%'>
            <Text style={ [ inheritancesCSS.name ] }>{ inheritance.name }</Text>
            {/* QR code */}
              { !!inheritance?.beneficiaries?.length && ( <>
                <Center >
                  <Text style={ balanceCSS.big }>{`${sb.toBitcoin(inheritance.balance)} BTC`} </Text>
                  { !!inheritance.unconfirmed && (
                    <Text style={{ color: inheritance.unconfirmed > 0 ? '#65b557' : '#d47979' }}>{`( ${sb.toBitcoin(inheritance.unconfirmed || 0)} BTC )`}</Text>
                  )}
                  <Text color='gray.400'>Balance</Text>
                </Center>
                { !showQR ? (
                <Button onPress={() => setShowQR(true)} style={{ backgroundColor: 'transparent' }} >
                  <QrSVG width={30} height={30} fill="#ccc"  />
                </Button>
                ) : (
                <Center>
                  <Pressable onPress={() => setShowQR(false)}>
                    <QRCode  value={inheritance?.scriptAddressId} size={200} />
                  </Pressable>
                </Center>
                ) }
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Button onPress={ () => copyAddress(inheritance!.scriptAddressId)} width={39} style={{ marginRight:10, backgroundColor: 'transparent' }}>
                    <CopySVG width={30} height={30} fill="#ccc" style={{ maxWidth: '90%', marginRight: 20 }} />
                  </Button>
                  <Text numberOfLines={1} style={{ color: '#b6c2de' }} accessibilityLabel="address" >{truncatedAddress}</Text>
                </View>
                </>
              )}

              {/* psbt Update */}
              { isPsbtPending(inheritance) && ( <>
                <Center marginTop={3}>
                  <View style={{ ...notification.view, width: Math.min(screenWidth * 0.9, 500) }} >
                  <Text style={notification.h1}>{ t('Do not close/minimize the app.') }</Text>  
                    <Text style={notification.h3}>{ t('Unconfirmed transaction') }</Text>  
                  </View>
                </Center>
                </>
              ) }

              {/* notification */}
              { inheritance?.logEntryId && !isPsbtPending(inheritance) && ( <>
                <Center marginTop={3}>
                  <View style={{ ...notification.view, width: Math.min(screenWidth * 0.9, 500) }} >
                    <Center>
                      <Text style={notification.h1}>{ t('Inheritance Changes') }</Text>       
                      {inheritance.beneficiariesChanges && (
                        <View>
                          {/* Removed */}
                          {inheritance.beneficiariesChanges.removed && (
                            <View>
                              <Text style={notification.h3}>Removed Beneficiaries</Text>
                              { inheritance.beneficiariesChanges.removed.map((benef) => ( 
                                <View key={benef.bitcoinAddress} style={{ marginTop:3 }}>
                                  <View >
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                      <Text style={ [ notification.name ] }>{benef.name } { benef.surname }</Text>
                                      <Text style={ [ notification.text ] }>{benef.percentage}% </Text>
                                    </View>
                                    <View >
                                      <Text style={notification.text}>{ benef.phone }. { benef.email }</Text>
                                    </View>
                                  </View>
                                  <View style={{ paddingLeft: 5, paddingRight: 10 }}>
                                    <Text style={notification.small}>{ benef.bitcoinAddress }</Text>
                                  </View>
                                </View>
                              ) ) }
                            </View>
                          ) }
                          {/* Added */}
                          { inheritance.beneficiariesChanges.added && (
                            <View>
                              <Text style={notification.h3}>Added Beneficiaries</Text>
                              { inheritance.beneficiariesChanges.added.map((benef) => ( 
                                <View key={benef.bitcoinAddress} style={{ marginTop:3 }}>
                                  <View >
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                      <Text style={ [ notification.name ] }>{benef.name } { benef.surname }</Text>
                                      <Text style={ [ notification.text ] }>{benef.percentage}% </Text>
                                    </View>
                                    <View >
                                      <Text style={notification.text}>{ benef.phone }. { benef.email }</Text>
                                    </View>
                                  </View>
                                  <View style={{ paddingLeft: 5, paddingRight: 10 }}>
                                    <Text style={notification.small}>{ benef.bitcoinAddress }</Text>
                                  </View>
                                </View>
                              ) ) }
                            </View>
                          )}
                          {/* Changes */}
                          { inheritance?.beneficiariesChanges?.changed && (
                            <View style={{ marginTop: 10 }}>
                              <Text style={notification.h3}>Beneficiaries Changed</Text>
                              { inheritance.beneficiariesChanges.changed.map((benefChange) => ( 
                              <View key={benefChange.beneficiary} style={{ marginTop:3 }}>
                              <Text style={ [ { borderBottomColor: '#888', borderBottomWidth: 1 }, notification.text ] }>{benefChange.beneficiary }</Text>
                                { benefChange.changes.map((change) => (
                                  // return something here
                                  <View key={change} >
                                    <Text style={ [ notification.small ] }>    { change }</Text>
                                  </View>
                                ))}
                              </View>

                              ) ) }
                            </View>
                          ) }
                        </View>
                      ) }
                      { inheritance.proposedBeneficiaries && (
                        <View style={{ marginTop: 10 }}>
                          {/* Show Proposed Beneficaries list */}
                          <Text style={notification.h3}>Proposed Beneficiaries</Text>
                          { inheritance.proposedBeneficiaries.map((benef) => ( 
                            <View key={benef.bitcoinAddress} style={{ marginTop:3 }}>
                              <View >
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                  <Text style={ [ notification.name ] }>{benef.name } { benef.surname }</Text>
                                  <Text style={ [ notification.text ] }>{benef.percentage}% </Text>
                                </View>
                                <View >
                                  <Text style={notification.text}>{ benef.phone }. { benef.email }</Text>
                                </View>
                              </View>
                              <View style={{ paddingLeft: 5, paddingRight: 10 }}>
                                <Text style={notification.small}>{ benef.bitcoinAddress }</Text>
                              </View>
                            </View>
                          ) ) }
                        </View>
                      ) }
                      {/* Accept / Reject */}
                      <View style={ notification.buttonsView} >
                        <Button onPress={() => setRejectModalVisible(true)} style={{ ...notification.button, ...notification.buttonReject }}>
                          <Text style={ notification.buttonText } accessibilityLabel="reject">{'Reject'}</Text>
                        </Button>
                        <Button  onPress={() => setAcceptModalVisible(true)} style={{ ...notification.button, ...notification.buttonAccept }}>
                          <Text style={ notification.buttonText } accessibilityLabel="accept" >{'Accept'}</Text>
                        </Button>
                      </View>
                    </Center>
                  </View>
                </Center>
                </>
              )}          
              {/* current beneficiaries */}
              { !!inheritance.beneficiaries.length && (
                <View width='90%' marginTop={15}>
                  <Text style={beneficiary.h2}>Beneficiaries</Text>
                  { inheritance.beneficiaries.map((benef) => ( 
                    <Pressable onPress={ () => copyAddress(benef.bitcoinAddress, benef.name, benef.surname)} key={benef.bitcoinAddress} >
                      <View style={{ marginTop:3 }}>
                        <View style={{ paddingLeft: 5, paddingRight: 5, justifyContent: 'space-between' }}>
                          <View style={{ marginTop:5, flexDirection: 'row' }}>
                            <Text style={ [ beneficiary.name ] }>{benef.name } { benef.surname }</Text>
                            <Text style={ [ beneficiary.percentage ] }>{benef.percentage}% </Text>
                          </View>
                          <View >
                            <Text style={beneficiary.small}>{ benef.phone }. { benef.email }</Text>
                          </View>
                        </View>
                        <View style={{ paddingLeft: 5, paddingRight: 10 }}>
                          <Text style={ beneficiary.address}>{ benef.bitcoinAddress }</Text>
                        </View>
                      </View>
                    </Pressable>
                  ) ) }
                </View>
              ) }
              { !!inheritance.psbtUpdate && (
              <View style={{ flexDirection: 'row', marginTop:15 }} >
                      <Text style={ [ inheritancesCSS.text ] }>{ t('Last Transaction update') }</Text>
                      <Text style={ [ inheritancesCSS.date ] }>  { formatDate(inheritance.psbtUpdate) } </Text>
              </View>
              ) }
              {/* Send BTC */}
              { !!inheritance?.balance && !isPsbtPending(inheritance) && (
                <Center>
                  <Pressable onPress={ send } style={ buttonImage.pressable }>                  
                    <SendSVG { ...buttonImage.img } />
                    <Text { ...buttonImage.text }>  {'Send'}</Text>
                  </Pressable>
                </Center>
              )}

              {/* faucet */}
              { !!showFaucet && (
                <Center>
                  <Pressable onPress={ faucet } style={ [ buttonImage.pressable, { backgroundColor: '#d8c691' } ] } accessibilityLabel="faucet" >   
                    <FaucetSVG { ...buttonImage.img} fill='black' />
                    <Text { ...buttonImage.text } color='black'>Faucet</Text>
                  </Pressable>                  
                </Center> 
              )}
            </VStack>

            {/* Accept Notification popup */}
            <Modal
              animationType="slide"
              transparent={true}
              visible={isAcceptModalVisible}
              onRequestClose={() => { () => setAcceptModalVisible(false); }}>
              <View style={modal.centeredView}>
                <View style={modal.modalView}>
                  <Text style={modal.h1}>{ t('Accept Inheritance Changes') }</Text>
                  <Button onPress={accept} style={{ ...notification.button, ...notification.buttonAccept }} accessibilityLabel="accept2" >
                    <Text style={ notification.buttonText}>{ t('Accept') }</Text>
                  </Button>
                  <Button onPress={() => setAcceptModalVisible(false)} style={{ ...notification.button, ...notification.buttonClose }} marginTop={5}>
                    <Text style={ notification.buttonText}> {'Close'}</Text>
                  </Button>
                </View>
              </View>
            </Modal>


            {/* Reject Notification popup */}
            <Modal
              animationType="slide"
              transparent={true}
              visible={isRejectModalVisible}
              onRequestClose={() => {() => setRejectModalVisible(false); }} >
              <View style={modal.centeredView}>
                <View style={modal.modalView}>
                  <Text style={modal.h1}>{ t('Reject Inheritance Changes') }</Text>
                  <Button onPress={ reject } style={{ ...notification.button, ...notification.buttonReject }} accessibilityLabel="reject2">
                      <Text fontSize={20} color="white" fontWeight="bold"> {'Reject'}</Text>
                    </Button>
                  <Button onPress={() => setRejectModalVisible(false)} style={{ ...notification.button, ...notification.buttonClose }} >
                    <Text style={modal.textStyle}>{ t('Close') }</Text>
                  </Button>
                </View>
              </View>
            </Modal>

          {/* Client is deceased */}
          <Modal
            animationType="slide"
            transparent={true}
            visible={isDeceasedModalVisible}
            onRequestClose={ hideDeceasedModal }>
              <View style={modal.centeredView}>
                <View style={modal.modalView}>
                  <Text style={modal.modalTitle}>{ t(`You have been declared dead`) }</Text>
                  <Pressable onPress={ hideDeceasedModal } style={ [modal.button, modal.buttonClose] } >
                    <Text style={modal.textStyle}>{ t('Understood') }</Text>
                  </Pressable>
                </View>
              </View>
          </Modal>

        </Center>
      </ScrollView>
    </ImageBackground>
  );

};
  
