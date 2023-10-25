import { StyleSheet } from 'react-native';

export const buttons = StyleSheet.create({
  view: {
    flexDirection: 'row', 
    alignItems: 'center',
    marginTop: 25,
    paddingBottom: 15
  },
  button: {
    borderRadius: 10,
    margin: 10,
    width: 150,
    height: 60
  },
  ok: {
    backgroundColor: "#65b557",
  },
  cancel: {
    backgroundColor: "#b55757",
  },
  close: {
    backgroundColor: '#888',
  },
  text: {
    fontSize: 20,
    color: 'white',
    fontWeight: 'bold',
    //fontFamily: 'Futura XBlk BT Extra Black' it doesn't work ???
  }
})

export const buttonImage = StyleSheet.create({
  pressable:{
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#65b557',
    alignSelf: 'baseline',
    paddingLeft:35,
    paddingRight: 35,
    borderRadius: 10,
    marginTop: 25
  },
  img: {
    width:40,
    height:40,
    fill:"#fff",
    marginRight:10
  },
  text: {
    fontSize: 20,
    color: "#fff",
    fontWeight:"bold"
  }
})

export const balanceCSS = StyleSheet.create({
  big: {
    marginTop: 10,
    color: "#65b557",
    fontSize: 22,
    fontWeight:"600",
  },
  small: {
    color: "#65b557",
    fontSize: 17,
    fontWeight:"600",
  },
})

export const toast = StyleSheet.create({
  ok: {
    borderRadius: 10,
    backgroundColor: "#65b557",
  },
  error: {
    borderRadius: 10,
    backgroundColor: "#b55757",
  },
  conf: {
    duration: 2000,
    shadow: false,        
    backgroundColor: 'transparent'
  },
  confLong: {
    duration: 10000,
    shadow: false,        
    backgroundColor: 'transparent'
  }
})

export const notification = StyleSheet.create({
  view: {
    backgroundColor: '#d8c691',
    paddingTop: 15,
    borderRadius: 10
  },
  h1: {
    marginTop: 5,
    marginBottom: 15,
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 22,
    color: '#161b28'
  },
  h2: {
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    fontSize: 20,
    color: '#161b28'
  },
  h3: {
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 18,
    color: '#161b28'
  },
  text: {
    color: '#161b28',
    fontSize: 15,
  },
  small: {
    color: '#161b28',
    fontSize: 13,
  },
  name: {
    color: '#161b28',
    flex: 1,
    borderBottomColor: '#888',
    borderBottomWidth: 1,
    marginBottom: 5,
    fontWeight: 'bold'
  },
  buttonsView: {
    flexDirection: 'row', 
    alignItems: 'center',
    marginTop: 25,
    paddingBottom: 15
  },
  button: {
    borderRadius: 10,
    margin: 10,
    width: 150,
    height: 60
  },
  buttonAccept: {
    backgroundColor: '#65b557',
  },
  buttonReject: {
    backgroundColor: '#b55757',
  },
  buttonClose: {
    backgroundColor: '#888',
  },
  buttonText: {
    fontSize: 20,
    color: 'white',
    fontWeight: 'bold'
  }

});

export const inheritance  = StyleSheet.create({
  name:  {
    marginBottom: 10,
    textAlign: 'center',
    fontSize: 20,
    color: '#e4e4e4'
  },
});

export const inheritancesCSS = StyleSheet.create({
  name: {
    color: '#cbb26b',
    fontSize: 22,
  },
  text: {
    color: '#e4e4e4',
    fontSize: 15,
  },
  small: {
    color: '#e4e4e4',
    fontSize: 13,
  },
  date: {
    color: '#f1b7ee',
    fontSize: 15,
  },
})



export const beneficiary = StyleSheet.create({
  h2: {
    marginBottom: 10,
    textAlign: 'center',
    fontSize: 20,
    color: '#e4e4e4'
  },
  text: {
    color: '#e4e4e4',
    fontSize: 15,
  },
  small: {
    color: '#e4e4e4',
    fontSize: 13,
  },
  name: {
    color: '#d8c691',
    fontSize: 18,
    flex: 1,
    borderBottomColor: '#888',
    borderBottomWidth: 1,
    marginBottom: 5,
  },
  percentage:  {
    color: '#d8c691',
    fontSize: 16,
  },
  address: {
    color: '#b6c2de',
    fontSize: 13,
  },
})

export const modal = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)'
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  button: {
    borderRadius: 10,
    padding: 10,
    elevation: 2,
  },
  buttonOpen: {
    backgroundColor: '#F194FF',
  },
  buttonClose: {
    backgroundColor: '#2196F3',
  },
  textStyle: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 18,
  },
  modalText: {
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 17,
  },
  modalTitle: {
    marginBottom: 15,
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 17,
  },
  h1: {
    marginBottom: 15,
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 22,
    color: '#b55757'
  },
  h2: {
    marginBottom: 15,
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 20,
    color: 'gray.400'
  },
  text: {
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 17,
  },
});