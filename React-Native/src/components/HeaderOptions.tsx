import React, { useState } from 'react';
import { Button, Modal, StyleSheet, Text, TouchableOpacity, View, Pressable } from 'react-native';
import { store } from '../store/store';


import MenuSVG from '../assets/img/menu.svg';
import BellButton from './BellButon'
// 
import { setInheritances, setLogged } from '../store/user/slice';
import { Storage } from '../utils/Storage';


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


function useModalMenu() {
  const [modalVisible, setModalVisible] = useState(true);

  React.useEffect(() => {
    //console.log("useEffect:", modalVisible);
  }, [modalVisible]);

  const toggleModal = () => {
    console.log("toggleModal")
    setModalVisible(!modalVisible);
    console.log("modalVisible:", modalVisible)
  }

  const ModalMenu = (
    <Modal
      key={modalVisible.toString()}
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

export const HeaderOptions= () => {
  const [isAnimating, setIsAnimating] = useState(true);
  const [ModalMenu, toggleModal] = useModalMenu();

  const setHeaderOptions = (navigation) => {
    navigation.setOptions({
      headerStyle: {
        backgroundColor: '#222',
      },
      headerTintColor: '#e4e4e4',
      headerTitleStyle: {},
      headerRight: () => (
        <>
          <Pressable onPress={() => {setIsAnimating(false)}} style={{ marginLeft: 15 }}>
            <BellButton isAnimating={isAnimating} />
          </Pressable>
          <Pressable onPress={toggleModal} style={{ marginLeft: 15 }}>
            <MenuSVG width={30} height={30} />
          </Pressable>
          {ModalMenu}
        </>
      ),
    });
  };

  return setHeaderOptions;
};
