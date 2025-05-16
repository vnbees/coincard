import AsyncStorage from '@react-native-async-storage/async-storage';

export interface MoneyRecord {
  id: number;
  recipient: string;
  amount: number;
  imageUri: string;
  createdAt: string;
  hashtags?: string[];
}

const STORAGE_KEY = '@money_records';
const HASHTAGS_STORAGE_KEY = '@hashtags';
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
    return;
  }

  isInitializing = true;

  try {
    const records = await AsyncStorage.getItem(STORAGE_KEY);
    if (!records) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    }
  } catch (error) {
    console.error('Error initializing storage:', error);
    throw error;
  } finally {
    isInitializing = false;
  }
};

export const saveRecord = async (record: Omit<MoneyRecord, 'id'>): Promise<void> => {
  try {
    const records = await getAllRecords();
    const newId = await getNextId();
    const newRecord = { ...record, id: newId };
    records.push(newRecord);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (error) {
    console.error('Error saving record:', error);
    throw error;
  }
};

export const getAllRecords = async (): Promise<MoneyRecord[]> => {
  try {
    const records = await AsyncStorage.getItem(STORAGE_KEY);
    const parsedRecords = records ? JSON.parse(records) : [];
    return parsedRecords;
  } catch (error) {
    console.error('Error getting records:', error);
    throw error;
  }
};

export const searchRecords = async (query: string): Promise<MoneyRecord[]> => {
  try {
    const records = await getAllRecords();
    const filteredRecords = records.filter(record => 
      record.recipient.toLowerCase().includes(query.toLowerCase())
    );
    return filteredRecords;
  } catch (error) {
    console.error('Error searching records:', error);
    throw error;
  }
};

export const getAllHashtags = async (): Promise<string[]> => {
  try {
    const hashtags = await AsyncStorage.getItem(HASHTAGS_STORAGE_KEY);
    const parsedHashtags = hashtags ? JSON.parse(hashtags) : [];
    return parsedHashtags;
  } catch (error) {
    console.error('Error getting hashtags:', error);
    return [];
  }
};

export const saveHashtags = async (hashtags: string[]): Promise<void> => {
  try {
    // Remove duplicates and empty tags
    const uniqueHashtags = [...new Set(hashtags.filter(tag => tag.trim() !== ''))];
    await AsyncStorage.setItem(HASHTAGS_STORAGE_KEY, JSON.stringify(uniqueHashtags));
  } catch (error) {
    console.error('Error saving hashtags:', error);
    throw error;
  }
};

export const addNewHashtags = async (newHashtags: string[]): Promise<void> => {
  try {
    const existingHashtags = await getAllHashtags();
    const filteredNewTags = newHashtags.filter(tag => tag.trim() !== '');
    const allHashtags = [...existingHashtags, ...filteredNewTags];
    // Remove duplicates
    const uniqueHashtags = [...new Set(allHashtags)];
    await saveHashtags(uniqueHashtags);
  } catch (error) {
    console.error('Error adding new hashtags:', error);
    throw error;
  }
};

const DatabaseService = {
  initDatabase,
  saveRecord,
  getAllRecords,
  searchRecords,
  getAllHashtags,
  saveHashtags,
  addNewHashtags,
};

export default DatabaseService;