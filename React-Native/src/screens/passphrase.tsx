import {Box, Button, Text, Center, FormControl, HStack, Input, VStack} from 'native-base';
import React, { useState, useEffect} from 'react';
import { Modal, Vibration, Pressable, View, ImageBackground } from 'react-native';
import {H1, H2} from '../components';
import {Storage} from '../utils/Storage';
import {passphraseScreenNavigationProp, Screens} from '../navigation/types';
import { useDispatch } from 'react-redux';
import { setLogged } from '../store/user/slice';
import { store } from '../store/store'
import { modal, toast, buttons } from '../utils/styles';
import '../languages'
import { useTranslation } from 'react-i18next';

import { sendEmail, encrypt, decrypt } from '../utils/util'
import { generateMnemonic, checkMnemonic } from '../utils/bitcoin'
import Toast from 'react-native-root-toast';
import { Toaster } from '../components/Toaster'
import { init, runJobs } from '../utils/core';


export const PassphraseScreen = ( { navigation } ) => {
  const { t } = useTranslation()
  const dispatch = useDispatch();
  
  const passphraseMinLen = 16

  // create
  const [showCreateModal, setShowCreateModal] = useState(false);
  const hideCreateModal = () => { 
    Vibration.vibrate(15)
    setShowCreateModal(false); 
  };
  const [isCreating, setIsCreating] = useState(false);

  // restore
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const hideRestoreModal = () => { setShowRestoreModal(false); };
  const [isRestoring, setIsRestoring] = useState(false);

  const [cypherMnemonic, setCypherMnemonic] = useState<string>('')
  const [passphrase, setPassphrase] = useState<string>('');
  const [isPassphraseValid, setIsPassphraseValid] = useState(false);

  const initCreating = () => {
    Vibration.vibrate(15)
    setIsCreating(true)
    setShowCreateModal(true)
  }

  const initRestoring = () => {
    Vibration.vibrate(15)
    setIsRestoring(true)
    setShowRestoreModal(true)
  }

  const back = () => {
    Vibration.vibrate(15)
    setIsCreating(false)
    setIsRestoring(false)
    setCypherMnemonic('')
    setPassphrase('')
  }

  const handlesetPassphrase = (passphrase: string) => {
    setPassphrase(passphrase)
    let hasDigit = /\d/;
    let hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;
    const valid = passphrase.length >= passphraseMinLen && hasDigit.test(passphrase) //&& hasSpecialChar.test(passphrase);
    setIsPassphraseValid(valid);
  }

  const handlesetMnemonic = (cypherMnemonic: string) => {
    setCypherMnemonic(cypherMnemonic)
  }

  const create = async () => {
    Vibration.vibrate(15)
    const mnemonic = generateMnemonic()
    const restoreCode = encrypt(mnemonic, passphrase) 
    console.log("restoreCode:", restoreCode)
    await Storage.set('mnemonic', mnemonic)
    await Storage.set('passphrase', passphrase)

    if(!store.getState().app.isEmulator) {
      const email = await Storage.get('email')
      await sendEmail( email, 'BitPass Restore Code', restoreCode )
    }
    await init()
    dispatch(setLogged(true))
  };

  const restore = async () => {
    Vibration.vibrate(15)
    let mnemonic
    try {
     mnemonic = decrypt(cypherMnemonic, passphrase)
    } catch(err) {
    }
    const isValid = checkMnemonic(mnemonic)
    if(!isValid) { 
      Toast.show(<Toaster { ...toast.error } message={ t("Wrong Restore Code/Password") } />, toast.conf);
      return
    }
    console.log("mnemonic:", mnemonic)
    await Storage.set('mnemonic', mnemonic)
    await Storage.set('passphrase', passphrase)
    await init()
    const email = await Storage.get('email')
    dispatch(setLogged(true))
  }

  return (
    <ImageBackground source={require('../assets/img/dark_background.png')} style={{width: '100%', height: '100%', justifyContent:'center', alignItems: 'center'}}>
      <Center w="100%" h="100%">
        <Box flex="0.85" justifyContent="center" p="2" py="8" w="90%" maxW="290">
          <VStack space={5}  alignItems='center'>
          {/* initial */}
            { (!isCreating && !isRestoring) && ( <>
            <Text fontSize={25} color="#d0d0d0">{'Create a new Account'}</Text>
            <Button size='lg' backgroundColor="#3CB371" onPress={initCreating} borderRadius={10}>
              <Text fontSize={25} color="white">{'Create Account'}</Text>
            </Button>   
            <Text fontSize={25} color="#d0d0d0" mt={10}>{'Restore an old Account'}</Text>
            <Button size='lg' backgroundColor="#3CB371" onPress={initRestoring} borderRadius={10}>
              <Text fontSize={25} color="white">{'Restore Account'}</Text>
            </Button>  
            </> ) }
            {/* enter mnemonic */}
            { !!isRestoring && ( <>
              <H2 text="Enter your Restore Code"  />
              <FormControl style={{ backgroundColor: 'yellow.500', borderRadius: 10 }}>
                  <Input onChangeText={handlesetMnemonic}  color="#d0d0d0" fontSize={17}  borderRadius={10} accessibilityLabel="restorecode"/>
              </FormControl>
              </> ) }
            {/* enter passphrase */}
            { (isCreating || isRestoring) && ( <>
              <H2 text="Enter your Password"  />
              <FormControl style={{ backgroundColor: 'yellow.500', borderRadius: 10 }}>
                  <Input onChangeText={handlesetPassphrase}  color="#d0d0d0" fontSize={17}  borderRadius={10} accessibilityLabel="passphrase"/>
              </FormControl>
            </> ) }

            <View style={ buttons.view }>
              {/* back button */}
              { (isCreating || isRestoring) && ( <>
                    <Button onPress={back} style={{ ...buttons.button, ...buttons.cancel }} >
                      <Text style={ buttons.text }> {'Back'}</Text>
                    </Button>  
                </> ) }

              {/* create button */}
                { !!isCreating && ( <>
                    <Button isDisabled={!isPassphraseValid} onPress={create} style={{ ...buttons.button, ...buttons.ok }} >
                      <Text style={ buttons.text }>{'Create'}</Text>
                    </Button>     
                </> ) }

              {/* restore button */}
              { !!isRestoring && ( <>
                    <Button isDisabled={!isPassphraseValid} onPress={restore} style={{ ...buttons.button, ...buttons.ok }} >
                    <Text style={ buttons.text }>{'Restore'}</Text>
                    </Button>     
                </> ) }

            </View>

          </VStack>
        </Box>


          {/* Create Popup */}
          <Modal
            animationType="slide"
            transparent={true}
            visible={showCreateModal}
            onRequestClose={() => {
              hideCreateModal();
            }}>
              <View style={modal.centeredView}>
              <View style={modal.modalView}>
                <Text style={modal.modalTitle}>{ t('Enter a password.') }</Text>
                <H1 text={ t('Important! You must remember the password') } color="#f00" />
                <Text style={modal.modalText} mt="2" >If you lose the password you won't be able to recreate your inheritances plans when you reinstall the app.</Text>
                <Text style={modal.modalText} mt="2" >{ t('The password must be 16 characters long including numbers') }</Text>
                <Text style={modal.modalText} mt="2" >{ t('And email will be created with the Restore Code') }</Text>
                <Pressable onPress={() => hideCreateModal()} style={[modal.button, modal.buttonClose]} >
                  <Text style={modal.textStyle}>{ t('Understood') }</Text>
                </Pressable>
              </View>
            </View>
          </Modal>


          {/* Restpre Popup */}
          <Modal
            animationType="slide"
            transparent={true}
            visible={showRestoreModal}
            onRequestClose={() => {
              hideRestoreModal();
            }}>
            <View style={modal.centeredView}>
              <View style={modal.modalView}>
                <Text style={modal.modalTitle}>{ t('Paste the Restore Code.') }</Text>
                <Text style={modal.modalText} mt="2" >{ t('The restore code was created when the app was first installed') }</Text>
                <Text style={modal.modalText} mt="2" >{ t('You should have it in your email') }</Text>
                <Pressable onPress={() => hideRestoreModal()} style={[modal.button, modal.buttonClose]} >
                  <Text style={modal.textStyle}>{ t('Understood') }</Text>
                </Pressable>
              </View>
            </View>
          </Modal>

      </Center>
    </ImageBackground>
  );
};
