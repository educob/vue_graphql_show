import React, { useState } from 'react';
import { Button, Modal, StyleSheet, Text, TouchableOpacity, View, Pressable } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState, store } from '../store/store';

import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import { AuthStackNavigatorParamList, MainStackNavigatorParamList, Screens } from './types';
import { SplashScreen } from '../screens/splash';
import { EmailScreen } from '../screens/email';
import { RegisterScreen } from '../screens/register';
import { PassphraseScreen } from '../screens/passphrase';
import { SetPinScreen } from '../screens/setPin';
import { LoginScreen } from '../screens/login';
// main navigation
import { HomeScreen } from '../screens/home';
import { InheritanceScreen } from '../screens/inheritance';
import { SendScreen } from '../screens/send';

import MenuSVG from '../assets/img/menu.svg';
import BellButton from '../components/BellButon'
// 
import { setInheritances, setLogged } from '../store/user/slice';
import { Storage } from '../utils/Storage';

const AuthStack = createNativeStackNavigator<AuthStackNavigatorParamList>();
const AuthStackNavigator = () => {
  return (
    <AuthStack.Navigator>
      <AuthStack.Group screenOptions={{ headerShown: false }} >
        <AuthStack.Screen name={Screens.SPLASH} component={SplashScreen} />
        <AuthStack.Screen name={Screens.EMAIL} component={EmailScreen} />
        <AuthStack.Screen name={Screens.REGISTER} component={RegisterScreen} />
        <AuthStack.Screen name={Screens.SETPIN} component={SetPinScreen} />
        <AuthStack.Screen name={Screens.PASSPHRASE} component={PassphraseScreen} />
        <AuthStack.Screen name={Screens.LOGIN} component={LoginScreen} />
      </AuthStack.Group>
    </AuthStack.Navigator>
  );
};

const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    backgroundColor: '#c4c4c4',
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    marginTop: 'auto',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  modalOption: {
    fontSize: 16,
    paddingVertical: 8,
  },
});

// to be removed ???
function resetInheritances() {
}

function useModalMenu() {
  const [modalVisible, setModalVisible] = useState(false);

  const toggleModal = () => setModalVisible(!modalVisible);

  const ModalMenu = (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={toggleModal}
    >
      <TouchableOpacity
        style={styles.modalBackground}
        activeOpacity={1}
        onPress={toggleModal}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Menu</Text>
          <TouchableOpacity onPress={() => resetInheritances() }>
            <Text style={styles.modalOption}>Reset Inheritances</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => store.dispatch(setLogged(false))} >
            <Text style={styles.modalOption}>Log Out</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => {} } style={{ marginBottom:20 }}>
            <Text style={styles.modalOption}>Reset Storage</Text>
          </TouchableOpacity>
          <Button onPress={toggleModal} title="Close" />
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return [ModalMenu, toggleModal];
}

const sharedScreenOptions = ({ navigation }) => {
  const [isAnimating, setIsAnimating] = useState(true);
  const [ModalMenu, toggleModal] = useModalMenu();

  const showNotification = () => {
    setIsAnimating(false)
    console.log("show notification")
  }

  return {
    headerStyle: {
      backgroundColor: '#222',
    },
    headerTintColor: '#e4e4e4',
    headerTitleStyle: {
      //fontWeight: 'bold',
    },
    headerRight: () => (
      <>
      <Pressable onPress={showNotification} style={{ marginLeft: 15 }}>
        <BellButton isAnimating={isAnimating} />
        </Pressable>
        {/* menu */}
        <Pressable onPress={toggleModal} style={{ marginLeft: 15 }}>
          <MenuSVG width={30} height={30} />
        </Pressable>
        {ModalMenu}
      </>
    ),
  };
};

const screenOptions = {
  headerStyle: { 
    backgroundColor: '#7886ad' 
  },
  headerTintColor: '#e4e4e4',
  headerTitleStyle: { 
    color: '#e4e4e4' 
  }
}

const MainStack = createNativeStackNavigator<MainStackNavigatorParamList>();
const MainStackNavigator = () => (
  <MainStack.Navigator>
    <MainStack.Group screenOptions={{ ...screenOptions }} >
      <MainStack.Screen name={Screens.HOME} component={HomeScreen} options={{ title: 'Your Inheritances' }} />
      <MainStack.Screen name={Screens.INHERITANCE} component={InheritanceScreen} />
      <MainStack.Screen name={Screens.SEND} component={SendScreen} />
    </MainStack.Group>
  </MainStack.Navigator>
);

export const MainNavigator = () => {
  const logged = useSelector((state: RootState) => state.user.logged);

  return (
    <NavigationContainer>
      {!logged ? <AuthStackNavigator /> : <MainStackNavigator />}
    </NavigationContainer>
  );
};
