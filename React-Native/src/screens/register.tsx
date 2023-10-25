import { Box, Button, Center, HStack, Text,  } from 'native-base';
import { Modal, Vibration, Pressable, View, ImageBackground, ProgressViewIOSBase } from 'react-native';
import React, { useState }  from 'react';
import { useDispatch } from 'react-redux';
const sha256 = require("js-sha256")
import { Storage } from '../utils/Storage';
import { modal, toast, buttons } from '../utils/styles';
import { Screens } from '../navigation/types';
import { callMother } from '../utils/util';
import { H1 } from '../components/H1';
import { NumericKeyboard } from '../components/NumericKeyboard';
import '../languages'
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-root-toast';
import { Toaster } from '../components/Toaster'

export const RegisterScreen = ( { navigation, route } ) => {
  const { t } = useTranslation()
  const [pin, setPin] = React.useState<number[]>([]);
  const [ isModalVisible, setModalVisible ] = useState(true);

  const hideModal = () => { 
    Vibration.vibrate(15)
    setModalVisible(false); 
  };

  const { email } = route.params;

  const updatePin = async ( pin_: number[] ) => { 
    setPin( [ ...pin_ ] )
  }

  const back = () => {
    navigation.navigate(Screens.EMAIL);
  }

  const next = async () => {
    Vibration.vibrate(15)
    const pinS = pin.join("")
    const pinHash = sha256(pinS)

    const body = `mutation { appLogin ( email: "${email.toLowerCase()}", pin256: "${pinHash}" ) {
      token
      client {
        _id
        name
        surname
      }
      thirdparty {
        _id
        name
        web
        email
        phone
        logoUrl
        address
        network
      }
    } }`
    const response = await callMother('appLogin', body)
    if(!response) {
      // log ???
      Toast.show(<Toaster { ...toast.error } message={ t("Wrong Email/PIN") } />, toast.conf);
      return
    }
    const { token, client, thirdparty } = response
    if(!!token) {
      await Storage.set('email', email);
      await Storage.set('nick', `${client.name} ${client.surname}`);
      await Storage.set('token', token);
      await Storage.setThirdparty(thirdparty);
      navigation.navigate(Screens.SETPIN);
    }
  };

  return (
    <ImageBackground source={require('../assets/img/dark_background.png')} style={{width: '100%', height: '100%', justifyContent:'center', alignItems: 'center'}}>
      <Box safeArea p="2" alignItems="center" w="90%" maxW="290">
        <H1 text="Enter the pin" color="#d0d0d0"/>
        <NumericKeyboard updatePin={updatePin}  />
        
        {/* back, next button s*/}
        <View style={ buttons.view }>
          <Button onPress={back} style={{ ...buttons.button, ...buttons.cancel }}>
            <Text style={ buttons.text }> {'Back'}</Text>
          </Button>
          <Button isDisabled={pin.length < 6} onPress={next} style={{ ...buttons.button, ...buttons.ok }}>
            <Text style={ buttons.text }>{'Next'}</Text>
          </Button>
        </View>
      </Box>

      {/* Popup */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => {
          hideModal();
        }}>
        <View style={modal.centeredView}>
          <View style={modal.modalView}>
            <Text style={modal.modalTitle}>Enter the PIN received by email</Text>
            <Text style={modal.modalText}>You must have received an email with a PIN for the Bitcoin Inheritance Solution.</Text>
            <Text style={modal.modalText}>This is a one time use PIN.</Text>
            <Pressable onPress={() => hideModal()} style={[modal.button, modal.buttonClose]} >
              <Text style={modal.textStyle}>{ t('Understood') }</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      
    </ImageBackground>
  );

};
  