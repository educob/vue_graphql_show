import EncryptedStorage from 'react-native-encrypted-storage';

let storage = EncryptedStorage;

export const Storage = {

  // email, pin, passphrase, inheritances

  // String values
  async set(name: string, value: string): Promise<void> {
    await storage.setItem(name, value);
  },

  async get(name: string): Promise<string | null> {
    return storage.getItem(name);
  },

  // Boolean
  async setBool(name: string, value: boolean): Promise<void> {
    storage.setItem(name, JSON.stringify(value));
  },

  async getBool(name: string): Promise<boolean> {
    const res = await storage.getItem(name) || 'false';
    return JSON.parse(res)
  },

  // Number
  async setNumber(name: string, value: number): Promise<void> {
    storage.setItem(name, JSON.stringify(value));
  },

  async getNumber(name: string): Promise<number | null> {
    const res = await storage.getItem(name) || '0'
    return JSON.parse(res)
  },

  // Inheritances
  async getInheritances() {
    const inheritances = await storage.getItem('inheritances') || JSON.stringify({})
    return JSON.parse(inheritances)
  },

  async setInheritances(inheritances: any) {
    await storage.setItem('inheritances', JSON.stringify(inheritances))
  },

  // Thirdparty
  async getThirdparty() {
    const thirdparty = await storage.getItem('thirdparty') || JSON.stringify({})
    return JSON.parse(thirdparty)
  },

  async setThirdparty(thirdparty: any) {
    await storage.setItem('thirdparty', JSON.stringify(thirdparty))
  },
  

  async delete(name: string): Promise<void> {
    await storage.removeItem(name)
  },


  async clear(): Promise<void> {
    await storage.clear();
  }

};
