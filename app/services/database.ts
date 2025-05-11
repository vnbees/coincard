import AsyncStorage from '@react-native-async-storage/async-storage';

export interface MoneyRecord {
  id: number;
  recipient: string;
  amount: number;
  imageUri: string;
  createdAt: string;
}

const STORAGE_KEY = '@money_records';
let isInitializing = false;
let currentId = 1;

const getNextId = async (): Promise<number> => {
  try {
    const records = await getAllRecords();
    if (records.length === 0) return 1;
    const maxId = Math.max(...records.map(record => record.id));
    return maxId + 1;
  } catch (error) {
    console.error('Error getting next ID:', error);
    return currentId++;
  }
};

export const initDatabase = async (): Promise<void> => {
  if (isInitializing) {
    console.log('Database initialization already in progress');
    return;
  }

  isInitializing = true;

  try {
    console.log('Initializing storage...');
    const records = await AsyncStorage.getItem(STORAGE_KEY);
    if (!records) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    }
    console.log('Storage initialized successfully');
  } catch (error) {
    console.error('Error initializing storage:', error);
    throw error;
  } finally {
    isInitializing = false;
  }
};

export const saveRecord = async (record: Omit<MoneyRecord, 'id'>): Promise<void> => {
  try {
    console.log('Saving record:', record);
    const records = await getAllRecords();
    const newId = await getNextId();
    const newRecord = { ...record, id: newId };
    records.push(newRecord);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    console.log('Record saved successfully');
  } catch (error) {
    console.error('Error saving record:', error);
    throw error;
  }
};

export const getAllRecords = async (): Promise<MoneyRecord[]> => {
  try {
    console.log('Fetching all records...');
    const records = await AsyncStorage.getItem(STORAGE_KEY);
    const parsedRecords = records ? JSON.parse(records) : [];
    console.log(`Found ${parsedRecords.length} records`);
    return parsedRecords;
  } catch (error) {
    console.error('Error getting records:', error);
    throw error;
  }
};

export const searchRecords = async (query: string): Promise<MoneyRecord[]> => {
  try {
    console.log('Searching records with query:', query);
    const records = await getAllRecords();
    const filteredRecords = records.filter(record => 
      record.recipient.toLowerCase().includes(query.toLowerCase())
    );
    console.log(`Found ${filteredRecords.length} matching records`);
    return filteredRecords;
  } catch (error) {
    console.error('Error searching records:', error);
    throw error;
  }
};

const DatabaseService = {
  initDatabase,
  saveRecord,
  getAllRecords,
  searchRecords,
};

export default DatabaseService;