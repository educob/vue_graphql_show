import { Box, Button, Center, Input, Text, VStack, FormControl } from 'native-base';
import { Modal, ScrollView, Pressable, View, ImageBackground, Dimensions, Vibration } from 'react-native';
import React, { useState, useEffect, useRef }  from 'react';
import { modal, notification, toast, balanceCSS, inheritancesCSS, buttonImage } from '../utils/styles'
import '../languages'
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-root-toast';
import { Toaster } from '../components/Toaster'
import { Fees, Utxo } from 'src/store/types';
import Slider from '@react-native-community/slider';
import { Float, Int32 } from 'react-native/Libraries/Types/CodegenTypes';
//import { Camera } from 'react-native-vision-camera';
//import { useScanBarcodes, BarcodeFormat } from 'vision-camera-code-scanner';
import sb from "satoshi-bitcoin"
import { getFees, getTxParameters, getAddressUTXOs, createInheritanceScript,
          buildTestatorTx, signTestatorPayment, isAddress, broadcastTx, checkBalance } from '../utils/bitcoin'
import { useSelector } from 'react-redux';
import SendSVG from '../assets/img/pay.svg'
import { Screens} from '../navigation/types';
import ScanQrSVG from '../assets/img/scanqr.svg';

import {logger} from 'react-native-logs';

const log = logger.createLogger();


export const SendScreen = ( { navigation, route } ) => {
  const { t } = useTranslation()
  const { inheritanceId } = route.params;

  const inheritance = useSelector((state) => state.user.inheritances[inheritanceId]);

  const [ balance, setBalance ] = useState(0);

  const [ isModalVisible, setModalVisible ] = useState(false);

  const [bitcoinAddress, setBitcoinAddress] = useState<string>('');
  const [btcAmount, setBtcAmount] = useState<Float>(0);
  const [total, setTotal] = useState<string>('0');
  const [utxos, setUtxos] = useState<Array<Utxo>>([]);

  const [fees, setFees] = useState<Fees>([]);
  const [fee, setFee] = useState<Int32>(0); 
  const [txFee, setTxFee] = useState<Int32>(0); 


  // notification
  const [ isConfirmSendVisible, setConfirmSendVisible ] = useState(false);

  const [sliderValue, setSliderValue] = useState(1);

  // truncated btc address
  const [truncatedAddress, setTruncatedAddress] = useState('')
  const screenWidth = Dimensions.get('window').width;

  /*const [frameProcessor, barcodes] = useScanBarcodes([BarcodeFormat.QR_CODE], {
    checkInverted: true,
  });*/

  const addrRef = useRef(null);
  const amountRef = useRef(null)

  React.useEffect(() => {
    if(!!addrRef.current)
    addrRef.current.focus();
    feesJob()
  }, []);

  useEffect(() => {
    //setUtxos([{"addressId": "tb1qayzqr84k6ml067kfpme66dx9tfjc35je7ngqxlwlhnexckvd94xq7yf5k0", "confirmations": 4, "confirmed": 1685524926, "hash": "f80d3efd738c23f361bccbf030cdb508c7f699b51c6a694b1a88f6c0d68027b9", "height": 2436065, "output_n": 1, "value": 8000}, {"addressId": "tb1qayzqr84k6ml067kfpme66dx9tfjc35je7ngqxlwlhnexckvd94xq7yf5k0", "confirmations": 4, "confirmed": 1685524926, "hash": "86ef6ba505d5bc716f24a37d6ee5e560ffcad9397d4fe4fcbd6bf98e93b51d21", "height": 2436065, "output_n": 1, "value": 9319}]) ; return    
    getAddressUTXOs(inheritance.scriptAddressId
    ).then( (utxos_) => {
      //console.log("send getAddressUTXOs utxos 🎉 🎉 🎉:", JSON.stringify(utxos_, null, 4))
      setUtxos(utxos_)
    }).catch((error) => {
      console.log("getAddressUTXOs error 💩 💩 💩 💩 💩:", error)
    })
  }, [inheritance]);

  useEffect(() => {
    const balance_ = utxos.reduce( (acc, u) => acc + u.value, 0)
    setBalance(balance_)
  }, [utxos]);

  useEffect(() => {
    if(fees.low == 0) return
    if(sliderValue == 0) setFee(fees.low)
    else if(sliderValue == 1) setFee(fees.medium)
    else if(sliderValue == 2) setFee(fees.high)
  }, [fees]);
  

  // slider/btcAmount change: update fee, total
  useEffect( () => {
    if(fees.low == 0) return
    let fee_ = fees.low
    if(sliderValue == 1) fee_ = fees.medium
    else if(sliderValue == 2) fee_ = fees.high
    setFee(fee_)
    if(!isAddress(bitcoinAddress)) return
    if(!btcAmount) return
    const satoshis = sb.toSatoshi(btcAmount)
    const recipients = [ { address: bitcoinAddress, satoshis } ]
    //console.log("recipients:", recipients)
    const scriptType = 'SCRIPT:108-74'  
    const { tx_fee } = getTxParameters(utxos, recipients, scriptType, fee_, inheritance.scriptAddressId)
    setTxFee(tx_fee)
    const total_ = btcAmount + sb.toBitcoin(tx_fee)
    //console.log("total_:", total_, ". balance:", balance, total_ > balance)
    if(total_ > sb.toBitcoin(balance)) {
      Toast.show(<Toaster { ...toast.error } message={ t("Not enough funds") } />, toast.conf )
      return
    }
    setTotal(total_.toFixed(8))
  }, [sliderValue, btcAmount])


  const send = async () => {// console.log("send called")
    Vibration.vibrate(15)
    if(!bitcoinAddress) {
      Toast.show(<Toaster { ...toast.error }  message={ t('Bitcoin Address is empty') } />, toast.conf )
      return
    }
    if(!isAddress(bitcoinAddress)) {
      Toast.show(<Toaster { ...toast.error }  message={ t('Wrong Bitcoin Address') } />, toast.conf )
      return
    }
    if(!btcAmount) {
      Toast.show(<Toaster { ...toast.error }  message={ t('Bitcoin amount is empty') } />, toast.conf )
      return
    }
    if(total > sb.toBitcoin(balance)) {
      Toast.show(<Toaster { ...toast.error } message={ t("Not enough funds") } />, toast.conf )
      return
    }

    const satoshis = sb.toSatoshi(btcAmount)
    const recipients = [ { address: bitcoinAddress, satoshis } ]
    //console.log("recipients:", recipients)
    const scriptType = 'SCRIPT:108-74'  
    const { selectedUtxos, change } = getTxParameters(utxos, recipients, scriptType, fee, inheritance.scriptAddressId)
    const { keypair, output, witness } = await createInheritanceScript(inheritance)
    //console.log("createInheritanceScript scriptAddressId:", scriptAddressId)
    const psbt = buildTestatorTx(selectedUtxos, output, witness, recipients, change, inheritance.scriptAddressId)
    //console.log("psbt:", JSON.stringify(psbt, null, 4))
    const tx_hex = signTestatorPayment (psbt, keypair)
    console.log("tx_hex:", tx_hex)
    const res = await broadcastTx(tx_hex)
    //console.log("send res:", res)
    if(!!res.error) {
      log.debug(`Send error: 💩 💩 💩 💩: ${res.error}`)
      Toast.show(<Toaster { ...toast.error }  message={ res.error } />, toast.conf )
    } else {      
      navigation.navigate( Screens.INHERITANCE, { inheritanceId } )
      Toast.show(<Toaster { ...toast.ok }  message={ t("Operation Successful\nLeave the app open.\nUnconfirmed transaction") } />, toast.confLong )
        // remove selected utxos from utxos list
      checkBalance()
    }
  };

  const handleSetBitcoinAmount = (btcAmount: Float) => { //console.log("btcAmount:", btcAmount, typeof btcAmount)
    setBtcAmount(parseFloat(btcAmount));
  }

  const feesJob = async () => { //setFees({"high": 44, "low": 15, "medium": 29}) ; return
    const fees_ = await getFees()
    //console.log("fees_:", fees_)
    setFees(fees_)
    
    setTimeout(async function() {
      feesJob()
    }, 60000);
  }

  const handleSetBitcoinAddress = (bitcoinAddress: string) => {// console.log("handleSetBitcoinAddress called:", bitcoinAddress)
    setBitcoinAddress(bitcoinAddress)
    setTruncatedAddress('');
    if(!!bitcoinAddress && !isAddress(bitcoinAddress)) {
      Toast.show(<Toaster { ...toast.error } message={ t("Wrong Bitcoin Address") } />, toast.conf )
      return
    }
    if(!!bitcoinAddress) { // 66 character takes 660px. copy imsg is 60px. 
      const skipLetters = Math.floor( (bitcoinAddress.length*10 - screenWidth +20 )/20)
      if(!skipLetters) return
      const middle = Math.floor(bitcoinAddress.length/2)
      const newText =
      bitcoinAddress.slice(0, middle - skipLetters) + '...' + bitcoinAddress.slice(middle + skipLetters)
      setTruncatedAddress(newText);
    }
  }


  // camera
  const [hasPermission, setHasPermission] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  const requestCameraPermission = async () => {
    // Request permission to access the camera
    const status = 0 //await Camera.requestCameraPermission();
      setHasPermission(status === 'authorized');
      setShowCamera(status === 'authorized');
  };

  const onSuccess = e => {
    //setScanned(true);
    console.log(`QR code data: ${e.data}`);
  };

  return (
    <ImageBackground source={require('../assets/img/dark_background.png')} style={{ width: '100%', height: '100%'}} >
      {showCamera && (
      {/*  <QRCodeScanner
          onRead={onSuccess}
          reactivate={true}
          reactivateTimeout={5000}
      /> */}
      )}
      {!showCamera && (
      <Center >
        <VStack alignItems='center' style={{ width: '100%'}}>
          {/* Show QR, Balance */}
          <Box safeArea p="2" style={{ width: '80%'}}>
            <Center marginTop={5}>
              <Text style={ [ { marginBottom: 10 }, inheritancesCSS.name ] }>{ inheritance.name }</Text>
              <Text style={ balanceCSS.big }>{`${sb.toBitcoin(balance)} BTC`}</Text>
              <Text color='gray.400'>Balance</Text>
              <View style={{ marginTop: 20, width: '100%' }}>
                <Text style={{ fontSize: 20, color: '#e4e4e4', marginBottom: 10 }}>Recipient Bitcoin Address</Text>
                {/* camera 
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Button onPress={requestCameraPermission} width={39} style={{ marginRight:10, backgroundColor: 'transparent' }}>
                    <ScanQrSVG width={30} height={30} fill="#ccc" style={{ maxWidth: '90%', marginLeft: 10, marginRight: 20 }} />
                  </Button>
                  <Text numberOfLines={1} style={{ color: '#ccc' }}>Scan QR Code</Text>
                </View>
      */}
                <FormControl>
                    <Input onChangeText={handleSetBitcoinAddress} ref={addrRef} color="#d0d0d0" fontSize={14} borderRadius={10} />
                </FormControl>
                { !!truncatedAddress && (
                  <Text numberOfLines={1} style={{ color: '#ccc', borderBottomWidth: 1, borderBottomColor: '#d0d0d0', height:25 }}>{truncatedAddress}</Text>
                )}
              </View>
              {/* btc amount */}
              <View style={{ marginTop: 20, width: '100%' }}>
                <Text style={{ fontSize: 20, color: '#e4e4e4' }}>Bitcoin Amount</Text>
                <FormControl style={{ marginTop: 10 }}>
                    <Input keyboardType="numeric" onChangeText={handleSetBitcoinAmount} ref={amountRef} color="#d0d0d0" fontSize={17} borderRadius={10} />
                </FormControl>
              </View>
              {/* Slider */}
              <View style={{ marginTop: 20, width: '100%' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 15, color: '#e4e4e4', width: 150}}>Network Fees</Text>
                  { txFee > 0 && (
                    <Text style={{ fontSize: 13, color: '#e4e4e4'}}>{ txFee } Satoshis</Text>
                  ) }
                </View>
                <View style={{ flexDirection: 'row' }}>
                  <Slider
                    value={sliderValue}
                    onValueChange={setSliderValue}
                    step={1}
                    minimumValue={0}
                    maximumValue={2}
                    maximumTrackTintColor='white'
                    minimumTrackTintColor='red'
                    style={{ width: 150 }} />
                  <Text color='gray.300'>{fee} </Text>
                  <Text color='gray.300'>Satoshis/byte</Text>
                </View>
              </View>
              {/* total */}
              { btcAmount > 0 && (
                <View style={{ flexDirection: 'row', width: '100%', marginTop: 15 }}>                
                  <Text color='white' style={{ marginRight: 10 }}>Total </Text>
                  <Text color='gray.300'>{total} </Text>
                  <Text color='gray.300'>BTC</Text>
                </View>
              )}
              {/* Send button */}
              <Center>
                <Pressable onPress={ send } style={ buttonImage.pressable }>                  
                  <SendSVG { ...buttonImage.img } />
                  <Text { ...buttonImage.text }>  {'Send'}</Text>
                </Pressable>
              </Center>
            </Center>          

            {/* confirm send popup */}
            <Modal
              animationType="slide"
              transparent={true}
              visible={isConfirmSendVisible}
              onRequestClose={() => {
                () => setConfirmSendVisible(false);
              }}>
              <ScrollView>
                <View style={modal.centeredView}>
                  <View style={modal.modalView}>
                    <Text style={modal.h1}>{ t('Confirm sending') }</Text>
                    <View style={ notification.buttonsView} >
                      <Button onPress={() => setConfirmSendVisible(false)} style={{ ...notification.button, ...notification.buttonClose }}>
                        <Text fontSize={20} color="white" fontWeight="bold"> {'Close'}</Text>
                      </Button>
                      <Button onPress={send} style={{ ...notification.button, ...notification.buttonAccept }} >
                        <Text style={modal.textStyle}>{ t('Send') }</Text>
                      </Button>
                    </View>
                  </View>
                </View>
              </ScrollView>
            </Modal>

          </Box>
        </VStack>
      </Center>
      )}
    </ImageBackground>
  );

};
  

